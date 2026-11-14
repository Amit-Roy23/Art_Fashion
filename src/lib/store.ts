"use client";
// Client-side database. Two modes:
//  • demo – the backend (/api/seed) generates sample data; every change is kept in this
//           browser's IndexedDB so each visitor gets a private sandbox (tabs stay in sync).
//  • live – the server has MONGODB_URI set: real logins, and every change is saved to
//           MongoDB (see live.ts). The screen updates instantly; saving happens behind it.
import { useSyncExternalStore } from "react";
import { produce, setAutoFreeze } from "immer";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { toast } from "sonner";
import { OpError, withIdTape, type Ctx } from "./ops";
import * as live from "./live";
import type { DB, Role, User } from "./types";
import { DB_VERSION } from "./version";
import { DEMO_ADDRESSES } from "./demo-addresses";

setAutoFreeze(false);

const DB_KEY = "lj-bms-db-v1";
const SESSION_KEY = "lj-bms-session";

export interface State {
  db: DB | null;
  userId: string | null;
  /** login / setup only happen in live mode */
  status: "idle" | "loading" | "ready" | "error" | "login" | "setup";
  error?: string;
  mode: "demo" | "live";
  /** live: changes not yet saved to the server */
  pending: number;
  /** live: last save attempt failed (offline / server down) */
  offline: boolean;
  /** live: message shown on the sign-in screen (e.g. signed out for inactivity) */
  notice?: string;
}

let state: State = { db: null, userId: null, status: "idle", mode: "demo", pending: 0, offline: false };
const listeners = new Set<() => void>();
const SERVER_STATE: State = { db: null, userId: null, status: "idle", mode: "demo", pending: 0, offline: false };

export const getState = () => state;

export function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => sel(state),
    () => sel(SERVER_STATE),
  );
}

let channel: BroadcastChannel | null = null;
let saving: Promise<unknown> = Promise.resolve();

// Writes are chained so they land in order; each one is the full snapshot.
function persist(db: DB) {
  saving = saving
    .then(() => idbSet(DB_KEY, db))
    .then(() => channel?.postMessage("sync"))
    .catch(() => toast.error("Couldn't save to this browser's storage — changes will be lost on reload."));
}

async function fetchSeed(): Promise<DB> {
  const res = await fetch("/api/seed", { cache: "no-store" });
  if (!res.ok) throw new Error(`Seed API responded ${res.status}`);
  return res.json();
}

export async function boot() {
  if (state.status !== "idle" && state.status !== "error") return;
  setState({ status: "loading" });
  try {
    const mode = await live.detect();
    if (mode) return; // live mode: live.ts finished booting
  } catch (e) {
    setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
    return;
  }
  try {
    let userId: string | null = null;
    try {
      userId = localStorage.getItem(SESSION_KEY);
    } catch {}
    let db: DB | undefined;
    try {
      db = await idbGet<DB>(DB_KEY);
    } catch {}
    if (db && db.version === 2) {
      // v3 only changed the company GSTIN — keep the visitor's data, replace the old placeholder
      if (db.settings.company.gstin === "19ABCPL1234M1Z8") db.settings.company.gstin = "29AHUPL9170B1ZV";
      db.version = 3;
    }
    if (db && db.version === 3) {
      // v4 added customer addresses (for address labels) — fill them in for the demo customers
      db.customers.forEach((c) => !c.address && DEMO_ADDRESSES[c.phone] && Object.assign(c, DEMO_ADDRESSES[c.phone]));
      db.version = 4;
    }
    if (db && db.version === 4) {
      // v5 added customer GSTINs (required on address labels) — fill them in for the demo customers
      db.customers.forEach((c) => !c.gstin && DEMO_ADDRESSES[c.phone] && (c.gstin = DEMO_ADDRESSES[c.phone].gstin));
      db.version = 5;
    }
    if (db && db.version === 5) {
      // v6: printed documents carry only the Arts & Fashion brand — drop the old placeholder email
      if (db.settings.company.email === "orders@layekjewels.in") db.settings.company.email = "";
      db.version = 6;
      try {
        await idbSet(DB_KEY, db);
      } catch {}
    }
    if (!db || db.version !== DB_VERSION) {
      // first visit, or demo data saved by an older version of the app
      db = await fetchSeed();
      try {
        await idbSet(DB_KEY, db);
      } catch {}
    }
    if (userId && !db.users.some((u) => u.id === userId)) userId = null;
    setState({ db, userId, status: "ready" });
    if (typeof BroadcastChannel !== "undefined" && !channel) {
      channel = new BroadcastChannel("lj-bms");
      channel.onmessage = async () => {
        const fresh = await idbGet<DB>(DB_KEY).catch(() => undefined);
        if (fresh) setState({ db: fresh });
      };
    }
  } catch (e) {
    setState({ status: "error", error: e instanceof Error ? e.message : String(e) });
  }
}

export async function resetDemo() {
  const db = await fetchSeed();
  try {
    await idbDel(DB_KEY);
  } catch {}
  setState({ db, userId: db.users.some((u) => u.id === state.userId) ? state.userId : null });
  persist(db);
}

export function login(userId: string) {
  try {
    localStorage.setItem(SESSION_KEY, userId);
  } catch {}
  setState({ userId });
}

export function logout() {
  if (state.mode === "live") return live.signOut();
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
  setState({ userId: null });
}

/**
 * Run a business operation against the DB. Validation errors become toasts;
 * returns the operation's result, or undefined when it failed.
 */
export function act<R>(fn: (draft: DB, ctx: Ctx) => R, success?: string): R | undefined {
  const db = state.db;
  if (!db) return undefined;
  const user = db.users.find((u) => u.id === state.userId);
  const ctx: Ctx = { now: new Date().toISOString(), by: user?.name ?? "System" };
  let result: R | undefined;
  const ids: string[] = [];
  try {
    const next = produce(db, (draft: DB) => {
      result = withIdTape(ids, false, () => fn(draft, ctx));
    });
    if (next !== db) {
      setState({ db: next });
      if (state.mode === "live") live.enqueue(fn, ctx, ids);
      else persist(next);
    }
    if (success) toast.success(success);
    return result;
  } catch (e) {
    toast.error(e instanceof OpError ? e.message : "Something went wrong — please try again.");
    if (!(e instanceof OpError)) console.error(e);
    return undefined;
  }
}

/** Current DB snapshot for event handlers (outside React render). */
export function getDB(): DB {
  if (!state.db) throw new Error("DB not loaded");
  return state.db;
}

/** Like act() for operations without a return value; true when it succeeded. */
export function run(fn: (draft: DB, ctx: Ctx) => void, success?: string): boolean {
  return (
    act((d, c) => {
      fn(d, c);
      return true as const;
    }, success) === true
  );
}

export function useDB(): DB {
  const db = useStore((s) => s.db);
  if (!db) throw new Error("DB not loaded");
  return db;
}

export function useUser(): User | null {
  const db = useStore((s) => s.db);
  const userId = useStore((s) => s.userId);
  return db?.users.find((u) => u.id === userId) ?? null;
}

export function can(db: DB, role: Role | undefined, perm: string) {
  if (role === "OWNER") return true;
  if (!role || role === "KARIGAR") return false;
  return !!db.settings.permissions[perm]?.[role];
}

export function useCan(perm: string) {
  const db = useStore((s) => s.db);
  const user = useUser();
  return !!db && can(db, user?.role, perm);
}
