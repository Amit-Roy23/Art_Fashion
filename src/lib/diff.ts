// Change sets between two versions of the DB. The browser runs a business
// operation locally (immer keeps unchanged records as the same objects), sends
// only the records that changed, and the server saves exactly those.
import type { DB, Settings } from "./types";

export const ARRAY_KEYS = ["users", "customers", "orders", "pieces", "artisans", "workOrders", "jobWorks", "deliveries", "challans", "activity"] as const;
export type ArrayKey = (typeof ARRAY_KEYS)[number];
/** Lists the app keeps newest-first (operations unshift into them); the others append. */
export const NEWEST_FIRST: ReadonlySet<ArrayKey> = new Set(["customers", "orders", "workOrders", "jobWorks", "deliveries", "challans", "activity"]);

type Entity = { id: string };

export interface Diff {
  arrays: Partial<Record<ArrayKey, { upsert: Entity[]; remove: string[] }>>;
  settings?: Settings;
  counters?: Record<string, number>;
}

export function computeDiff(prev: DB, next: DB): Diff {
  const diff: Diff = { arrays: {} };
  for (const key of ARRAY_KEYS) {
    const a = (prev[key] ?? []) as Entity[];
    const b = (next[key] ?? []) as Entity[];
    if (a === b) continue;
    const before = new Map(a.map((x) => [x.id, x]));
    const upsert = b.filter((x) => before.get(x.id) !== x);
    const after = new Set(b.map((x) => x.id));
    const remove = a.filter((x) => !after.has(x.id)).map((x) => x.id);
    if (upsert.length || remove.length) diff.arrays[key] = { upsert, remove };
  }
  if (prev.settings !== next.settings) diff.settings = next.settings;
  if (prev.counters !== next.counters) diff.counters = next.counters;
  return diff;
}

export const isEmptyDiff = (d: Diff) => !Object.keys(d.arrays).length && !d.settings && !d.counters;

/** Applies a change set, keeping each array's order (new records go where the operation put them). */
export function applyDiff(db: DB, diff: Diff, order?: DB): DB {
  const out = { ...db };
  for (const key of ARRAY_KEYS) {
    const ch = diff.arrays[key];
    if (!ch) continue;
    const up = new Map(ch.upsert.map((x) => [x.id, x]));
    const gone = new Set(ch.remove);
    const current = (db[key] ?? []) as Entity[];
    const reference = (order?.[key] ?? null) as Entity[] | null;
    let list: Entity[];
    if (reference) {
      // follow the order of the version that produced the change
      const byId = new Map(current.map((x) => [x.id, x]));
      list = reference.filter((x) => !gone.has(x.id)).map((x) => up.get(x.id) ?? byId.get(x.id) ?? x);
    } else {
      const seen = new Set<string>();
      list = current.filter((x) => !gone.has(x.id)).map((x) => (seen.add(x.id), up.get(x.id) ?? x));
      const fresh = ch.upsert.filter((x) => !seen.has(x.id));
      list = NEWEST_FIRST.has(key) ? [...fresh, ...list] : [...list, ...fresh];
    }
    (out as Record<string, unknown>)[key] = list;
  }
  if (diff.settings) out.settings = diff.settings;
  if (diff.counters) out.counters = diff.counters;
  return out;
}
