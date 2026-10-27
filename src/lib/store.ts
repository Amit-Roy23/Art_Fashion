"use client";
// Client-side demo database. The backend (/api/seed) generates the initial
// data; every change is kept in this browser's IndexedDB so each visitor gets a
// private, persistent sandbox. Other tabs of the same browser stay in sync.
import { useSyncExternalStore } from "react";
import { produce, setAutoFreeze } from "immer";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { toast } from "sonner";
import { OpError, type Ctx } from "./ops";
import type { DB, Role, User } from "./types";

setAutoFreeze(false);

const DB_KEY = "lj-bms-db-v1";
const SESSION_KEY = "lj-bms-session";

interface State {
  db: DB | null;
  userId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
}

let state: State = { db: null, userId: null, status: "idle" };
const listeners = new Set<() => void>();
const SERVER_STATE: State = { db: null, userId: null, status: "idle" };

function setState(patch: Partial<State>) {
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
  if (state.status === "loading" || state.status === "ready") return;
  setState({ status: "loading" });
  try {
    let userId: string | null = null;
    try {
      userId = localStorage.getItem(SESSION_KEY);
    } catch {}
    let db: DB | undefined;
    try {
      db = await idbGet<DB>(DB_KEY);
    } catch {}
    if (!db) {
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
  try {
    const next = produce(db, (draft: DB) => {
      result = fn(draft, ctx);
    });
    setState({ db: next });
    persist(next);
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
