// Live-mode storage in MongoDB.
//
// Every record of every list lives in its own collection as { _id, doc, seq, rev }:
//   seq  keeps the app's list order (newest-first lists sort by it descending)
//   rev  is the save number that last wrote the record, so clients can fetch only what changed
// Settings and counters are single documents in "kv"; "kv/meta" holds the current save number.
// Saves are serialised with a short lock document, so two people saving at the same moment
// can never interleave, and a save is refused (409) when a record it changes was changed by
// someone else after the version the browser started from.
import { createHash } from "node:crypto";
import { Binary, type Collection, type Db } from "mongodb";
import { ARRAY_KEYS, NEWEST_FIRST, type ArrayKey, type Diff } from "@/lib/diff";
import { baseSettings } from "@/lib/seed";
import { SHIPPER } from "@/lib/shipping";
import type { DB, Settings, User } from "@/lib/types";
import { DB_VERSION } from "@/lib/version";
import { mongo } from "./mongo";
import { cloudinaryConfig, uploadToCloudinary } from "./cloudinary";
import { newId } from "./auth";

type Entity = { id: string };
interface RecordDoc {
  _id: string;
  doc: Entity;
  seq: number;
  rev: number;
}
interface KvDoc {
  _id: string;
  doc?: unknown;
  rev?: number;
  seq?: number;
  until?: number;
  owner?: string;
  createdAt?: string;
}
export interface Credential {
  _id: string;
  hash: string;
  sid: string;
  failed: number;
  lockedUntil: number;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const col = (db: Db, key: ArrayKey) => db.collection<RecordDoc>(`r_${key}`);
const kv = (db: Db) => db.collection<KvDoc>("kv");
export const credentials = (db: Db) => db.collection<Credential>("credentials");
const removed = (db: Db) => db.collection<{ _id: string; key: ArrayKey; id: string; rev: number }>("removed");
const photos = (db: Db) =>
  db.collection<{
    _id: string;
    data: Binary;
    type: string;
    at: string;
    by: string;
  }>("photos");

let indexed = false;
async function ensureIndexes(db: Db) {
  if (indexed) return;
  await Promise.all([
    ...ARRAY_KEYS.map((k) => col(db, k).createIndex({ rev: 1 })),
    col(db, "users").createIndex({ "doc.phone": 1 }),
    removed(db).createIndex({ rev: 1 }),
  ]);
  indexed = true;
}

export async function meta(db: Db) {
  const m = await kv(db).findOne({ _id: "meta" });
  return m ? { rev: m.rev ?? 0, seq: m.seq ?? 0 } : null;
}

// ─────────────────────────────────────────────── reading

function blankDB(): DB {
  return {
    version: DB_VERSION,
    seededAt: new Date().toISOString(),
    settings: baseSettings(),
    users: [],
    customers: [],
    orders: [],
    pieces: [],
    artisans: [],
    workOrders: [],
    jobWorks: [],
    deliveries: [],
    challans: [],
    activity: [],
    counters: {},
  };
}

/** The whole database as the app uses it, at one consistent save number. */
export async function loadAll(): Promise<{ rev: number; db: DB }> {
  const db = await mongo();
  const m = await meta(db);
  if (!m) throw new HttpError(409, "Not set up yet");
  const out = blankDB();
  await Promise.all([
    ...ARRAY_KEYS.map(async (k) => {
      const docs = await col(db, k)
        .find({ rev: { $lte: m.rev } })
        .sort({ seq: NEWEST_FIRST.has(k) ? -1 : 1 })
        .toArray();
      (out as unknown as Record<string, Entity[]>)[k] = docs.map((d) => d.doc);
    }),
    kv(db)
      .findOne({ _id: "settings" })
      .then((s) => s?.doc && (out.settings = s.doc as Settings)),
    kv(db)
      .findOne({ _id: "counters" })
      .then((c) => c?.doc && (out.counters = c.doc as Record<string, number>)),
  ]);
  return { rev: m.rev, db: out };
}

/** Everything saved after `since` (up to `until`), in the shape applyDiff() takes. */
export async function changesSince(since: number, until?: number): Promise<{ rev: number; diff: Diff }> {
  const db = await mongo();
  const m = await meta(db);
  if (!m) throw new HttpError(409, "Not set up yet");
  const top = until ?? m.rev;
  const range = { $gt: since, $lte: top };
  const diff: Diff = { arrays: {} };
  const gone = await removed(db).find({ rev: range }).toArray();
  await Promise.all(
    ARRAY_KEYS.map(async (k) => {
      const docs = await col(db, k)
        .find({ rev: range })
        .sort({ seq: NEWEST_FIRST.has(k) ? -1 : 1 })
        .toArray();
      const rm = gone.filter((g) => g.key === k).map((g) => g.id);
      if (docs.length || rm.length) diff.arrays[k] = { upsert: docs.map((d) => d.doc), remove: rm };
    }),
  );
  const [s, c] = await Promise.all([kv(db).findOne({ _id: "settings" }), kv(db).findOne({ _id: "counters" })]);
  if (s && (s.rev ?? 0) > since && (s.rev ?? 0) <= top) diff.settings = s.doc as Settings;
  if (c && (c.rev ?? 0) > since && (c.rev ?? 0) <= top) diff.counters = c.doc as Record<string, number>;
  return { rev: top, diff };
}

export async function findUser(id: string): Promise<User | null> {
  const db = await mongo();
  return ((await col(db, "users").findOne({ _id: id }))?.doc as User) ?? null;
}

export async function allUsers(): Promise<User[]> {
  const db = await mongo();
  return (await col(db, "users").find({}).toArray()).map((d) => d.doc as User);
}

// ─────────────────────────────────────────────── karigar view

/** A karigar only receives their own work: no customers, values, vendors or other karigars' jobs. */
export function karigarView(full: DB, user: User): DB {
  const wos = full.workOrders.filter((w) => w.artisanId === user.artisanId);
  const pieceIds = new Set(wos.map((w) => w.pieceId));
  const pieces = full.pieces.filter((p) => pieceIds.has(p.id)).map((p) => ({ ...p, valueRs: undefined }));
  const orderIds = new Set(pieces.map((p) => p.orderId));
  const settings = { ...full.settings, vendors: [], permissions: {} };
  return {
    ...full,
    settings,
    users: full.users.filter((u) => u.id === user.id),
    customers: [],
    orders: full.orders.filter((o) => orderIds.has(o.id)).map((o) => ({ ...o, customerId: "" })),
    pieces,
    artisans: full.artisans.filter((a) => a.id === user.artisanId),
    workOrders: wos,
    jobWorks: [],
    deliveries: [],
    challans: [],
    activity: full.activity.filter((a) => a.artisanId === user.artisanId).slice(0, 200),
    counters: {},
  };
}

// ─────────────────────────────────────────────── photos

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

/** Stores one photo (a data: URL) and returns its permanent URL. Same picture → same URL. */
export async function savePhoto(dataUrl: string, by: string): Promise<string> {
  const m = DATA_URL.exec(dataUrl);
  if (!m) throw new HttpError(400, "Photos must be JPEG, PNG or WebP images");
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX_PHOTO_BYTES) throw new HttpError(413, "Photo is too large");
  const id = createHash("sha256").update(bytes).digest("hex").slice(0, 32);
  const cloud = cloudinaryConfig();
  if (cloud) {
    try {
      return await uploadToCloudinary(cloud, dataUrl, id);
    } catch (e) {
      // never lose a photo because the CDN is down or misconfigured: keep it in MongoDB instead
      console.error(e);
    }
  }
  const db = await mongo();
  await photos(db).updateOne(
    { _id: id },
    {
      $setOnInsert: {
        data: new Binary(bytes),
        type: m[1],
        at: new Date().toISOString(),
        by,
      },
    },
    { upsert: true },
  );
  return `/api/photos/${id}`;
}

export async function readPhoto(id: string) {
  const db = await mongo();
  return photos(db).findOne({ _id: id });
}

async function extractPhotos<T>(value: T, by: string): Promise<T> {
  if (typeof value === "string") return (value.startsWith("data:image/") ? await savePhoto(value, by) : value) as T;
  if (Array.isArray(value)) return (await Promise.all(value.map((v) => extractPhotos(v, by)))) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await extractPhotos(v, by);
    return out as T;
  }
  return value;
}

// ─────────────────────────────────────────────── permissions

const allowed = (settings: Settings, user: User, perm: string) =>
  user.role === "OWNER" || (user.role !== "KARIGAR" && !!settings.permissions[perm]?.[user.role]);

/** Settings a non-owner may change while doing their normal work (label sender mobile, tag layout). */
const EVERYDAY_SETTINGS: (keyof Settings)[] = ["shipperMobile", "tag"];

const pick = <T extends object>(from: T, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => k in from).map((k) => [k, (from as Record<string, unknown>)[k]]));

/**
 * Checks a change set against the user's role and returns what may be saved.
 * Karigars can only touch their own work orders: disallowed fields are kept as stored.
 */
async function authorize(db: Db, user: User, diff: Diff, stored: Map<string, Map<string, RecordDoc>>, settings: Settings): Promise<Diff> {
  const deny = (msg: string): never => {
    throw new HttpError(403, msg);
  };
  if (user.role === "OWNER") return diff;
  const out: Diff = { arrays: {} };

  if (diff.settings) {
    if (allowed(settings, user, "settings.manage")) out.settings = diff.settings;
    else {
      const changed = (Object.keys({ ...settings, ...diff.settings }) as (keyof Settings)[]).filter(
        (k) => JSON.stringify(settings[k]) !== JSON.stringify(diff.settings![k]),
      );
      const ok = changed.every((k) => EVERYDAY_SETTINGS.includes(k) || (k === "vendors" && allowed(settings, user, "jobwork.manage")));
      if (!ok || user.role === "KARIGAR") deny("Only the owner can change settings");
      out.settings = diff.settings;
    }
  }
  if (diff.counters) {
    if (user.role === "KARIGAR") deny("Not allowed");
    out.counters = diff.counters;
  }

  for (const key of ARRAY_KEYS) {
    const ch = diff.arrays[key];
    if (!ch) continue;
    const before = stored.get(key)!;
    if (ch.remove.length && (user.role === "KARIGAR" || key === "users")) deny("Not allowed to delete records");

    if (user.role !== "KARIGAR") {
      if (key === "users") {
        if (!allowed(settings, user, "artisans.manage")) deny("Only the owner can manage users");
        for (const u of ch.upsert as User[]) {
          const was = before.get(u.id)?.doc as User | undefined;
          if (u.role !== "KARIGAR" || (was && was.role !== "KARIGAR")) deny("Only the owner can manage staff logins");
        }
      }
      out.arrays[key] = ch;
      continue;
    }

    // karigar
    const upsert: Entity[] = [];
    if (key === "workOrders") {
      for (const w of ch.upsert as DB["workOrders"]) {
        const was = before.get(w.id)?.doc as DB["workOrders"][number] | undefined;
        if (!was || was.artisanId !== user.artisanId) deny("This work order is not assigned to you");
        upsert.push({
          ...was!,
          ...pick(w, ["statusId", "updates", "submittedAt", "submittedWeightMg", "submissionPhotos", "submissionNote"]),
        });
      }
    } else if (key === "pieces") {
      for (const p of ch.upsert as DB["pieces"]) {
        const was = before.get(p.id)?.doc as DB["pieces"][number] | undefined;
        const mine =
          was &&
          (await col(db, "workOrders").findOne({
            "doc.pieceId": p.id,
            "doc.artisanId": user.artisanId,
          }));
        if (!was || !mine) deny("This piece is not assigned to you");
        upsert.push({ ...was!, ...pick(p, ["photos", "currentWeightMg"]) });
      }
    } else if (key === "activity") {
      for (const a of ch.upsert as DB["activity"]) {
        if (before.get(a.id)) deny("Not allowed");
        upsert.push({
          ...a,
          by: user.name,
          artisanId: user.artisanId,
        } as Entity);
      }
    } else if (ch.upsert.length) deny("Not allowed");
    out.arrays[key] = { upsert, remove: [] };
  }
  return out;
}

// ─────────────────────────────────────────────── writing

async function withLock<R>(db: Db, fn: () => Promise<R>): Promise<R> {
  const owner = newId(8);
  const deadline = Date.now() + 12000;
  for (;;) {
    const now = Date.now();
    try {
      const got = await kv(db).findOneAndUpdate(
        {
          _id: "lock",
          $or: [{ until: { $lt: now } }, { until: { $exists: false } }],
        },
        { $set: { until: now + 15000, owner } },
        { upsert: true, returnDocument: "after" },
      );
      if (got?.owner === owner) break;
    } catch (e) {
      // duplicate key: someone else holds the lock
      if ((e as { code?: number }).code !== 11000) throw e;
    }
    if (Date.now() > deadline) throw new HttpError(503, "The server is busy — please try again");
    await new Promise((r) => setTimeout(r, 60 + Math.random() * 120));
  }
  try {
    return await fn();
  } finally {
    await kv(db).updateOne({ _id: "lock", owner }, { $set: { until: 0 } });
  }
}

/** Saves a change set made by `user` against save number `baseRev`. */
export async function commit(user: User, baseRev: number, input: Diff): Promise<{ rev: number; applied: Diff; missed: Diff }> {
  const db = await mongo();
  await ensureIndexes(db);
  for (const k of Object.keys(input.arrays ?? {})) if (!ARRAY_KEYS.includes(k as ArrayKey)) throw new HttpError(400, "Bad change set");
  const diff = await extractPhotos(input, user.name);

  return withLock(db, async () => {
    const m = await meta(db);
    if (!m) throw new HttpError(409, "Not set up yet");
    if (baseRev > m.rev) throw new HttpError(409, "Out of date");

    // records this change touches, as stored now
    const stored = new Map<string, Map<string, RecordDoc>>();
    for (const key of ARRAY_KEYS) {
      const ch = diff.arrays[key];
      const ids = ch ? [...ch.upsert.map((x) => String(x.id)), ...ch.remove] : [];
      const docs = ids.length
        ? await col(db, key)
            .find({ _id: { $in: ids } })
            .toArray()
        : [];
      stored.set(key, new Map(docs.map((d) => [d._id, d])));
      for (const d of docs) if (d.rev > baseRev) throw new HttpError(409, "Someone else changed this record");
    }
    const [s, c] = await Promise.all([kv(db).findOne({ _id: "settings" }), kv(db).findOne({ _id: "counters" })]);
    if (diff.settings && (s?.rev ?? 0) > baseRev) throw new HttpError(409, "Settings were changed by someone else");
    if (diff.counters && (c?.rev ?? 0) > baseRev) throw new HttpError(409, "Numbers were used by someone else");

    const applied = await authorize(db, user, diff, stored, s!.doc as Settings);
    const rev = m.rev + 1;
    let seq = m.seq;

    for (const key of ARRAY_KEYS) {
      const ch = applied.arrays[key];
      if (!ch) continue;
      const before = stored.get(key)!;
      const fresh = ch.upsert.filter((x) => !before.has(x.id));
      // newest-first lists arrive newest first: number them so the first gets the highest seq
      const seqOf = new Map<string, number>();
      (NEWEST_FIRST.has(key) ? [...fresh].reverse() : fresh).forEach((x) => seqOf.set(x.id, ++seq));
      const ops = [
        ...ch.upsert.map((x) => ({
          replaceOne: {
            filter: { _id: x.id },
            replacement: {
              doc: x,
              seq: before.get(x.id)?.seq ?? seqOf.get(x.id)!,
              rev,
            },
            upsert: true,
          },
        })),
        ...ch.remove.map((id) => ({ deleteOne: { filter: { _id: id } } })),
      ];
      if (ops.length)
        await (col(db, key) as Collection<RecordDoc>).bulkWrite(ops as never, {
          ordered: true,
        });
      if (ch.remove.length)
        await removed(db).bulkWrite(
          ch.remove.map((id) => ({
            replaceOne: {
              filter: { _id: `${key}:${id}` },
              replacement: { key, id, rev },
              upsert: true,
            },
          })),
        );
    }
    if (applied.settings) await kv(db).replaceOne({ _id: "settings" }, { doc: applied.settings, rev }, { upsert: true });
    if (applied.counters) await kv(db).replaceOne({ _id: "counters" }, { doc: applied.counters, rev }, { upsert: true });
    await kv(db).updateOne({ _id: "meta" }, { $set: { rev, seq } });

    const missed = baseRev < m.rev ? (await changesSince(baseRev, m.rev)).diff : { arrays: {} };
    return { rev, applied, missed };
  });
}

// ─────────────────────────────────────────────── first-run setup

export async function setupDatabase(owner: User, company: Partial<Settings["company"]>) {
  const db = await mongo();
  await ensureIndexes(db);
  const settings = baseSettings();
  settings.vendors = [];
  settings.company = {
    ...settings.company,
    address: SHIPPER.lines.join(" "),
    phone: owner.phone,
    email: "",
    gstin: SHIPPER.gstin,
    ...company,
  };
  // claims the database; fails if it was already set up
  await kv(db).insertOne({
    _id: "meta",
    rev: 1,
    seq: 1,
    createdAt: new Date().toISOString(),
  });
  await kv(db).replaceOne({ _id: "settings" }, { doc: settings, rev: 1 }, { upsert: true });
  await kv(db).replaceOne({ _id: "counters" }, { doc: {}, rev: 1 }, { upsert: true });
  await col(db, "users").replaceOne({ _id: owner.id }, { doc: owner, seq: 1, rev: 1 }, { upsert: true });
}
