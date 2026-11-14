"use client";
// Live mode: the browser keeps a copy of the database it is allowed to see, runs every
// business operation locally (so the screen updates at once) and saves only the records
// that changed. If someone else saved first, it reloads their changes and runs the
// operation again on top, so nothing is lost and numbers never repeat.
import { produce } from "immer";
import { toast } from "sonner";
import { applyDiff, computeDiff, isEmptyDiff, type Diff } from "./diff";
import { OpError, withIdTape, type Ctx } from "./ops";
import { getState, setState } from "./store";
import type { DB, User } from "./types";
import { idleLimitMs, minutesText } from "./autologout";

type Op = (draft: DB, ctx: Ctx) => unknown;
interface Job {
  fn: Op;
  ctx: Ctx;
  ids: string[];
}

let confirmed: DB | null = null; // the server's data at save number `rev`
let rev = 0;
let me: User | null = null;
const queue: Job[] = [];
let busy = false;
let started = false;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Server responded ${res.status}`);
  return data as T;
}

// ─────────────────────────────────────────────── boot / sign-in

/** Returns true when the server runs in live mode (and finishes booting it). */
export async function detect(): Promise<boolean> {
  let m: { live: boolean; ready?: boolean; user?: User | null; error?: string };
  try {
    m = await api("/api/mode");
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) throw new Error("Can't reach the database — please check the internet and try again.");
    throw new Error("Can't reach the server — please check the internet and try again.");
  }
  if (!m.live) return false;
  setState({ mode: "live" });
  if (!m.ready) setState({ status: "setup" });
  else if (!m.user) setState({ status: "login" });
  else await loadEverything();
  return true;
}

async function loadEverything() {
  const r = await api<{ rev: number; db: DB; user: User }>("/api/db");
  confirmed = r.db;
  rev = r.rev;
  // changes made before an automatic sign-out are kept for the same person, and saved now
  if (queue.length && keptFor !== r.user.id) queue.length = 0;
  keptFor = null;
  me = r.user;
  setState({ db: r.db, userId: r.user.id, status: "ready", error: undefined, notice: undefined });
  start();
  markActive(true);
  if (queue.length) {
    refreshView();
    void pump();
  }
}

export async function signIn(phone: string, secret: string) {
  await api("/api/auth/login", { method: "POST", json: { phone, secret } });
  await loadEverything();
  try {
    localStorage.setItem(SIGNED_IN_KEY, String(Date.now())); // tells other open tabs
  } catch {}
}

export async function setup(input: { key: string; name: string; phone: string; password: string }) {
  await api("/api/setup", { method: "POST", json: input });
  await loadEverything();
}

export async function signOut() {
  if (queue.length && !confirm(`${queue.length} change(s) are not saved yet. Sign out anyway?`)) return;
  await api("/api/auth/logout", { method: "POST" }).catch(() => {});
  location.assign("/");
}

/** Back to the sign-in screen. Unsaved changes are kept and saved if the same person signs in again. */
function expired(notice = "Your session ended — please sign in again.") {
  keptFor = queue.length ? (me?.id ?? null) : null;
  if (!keptFor) queue.length = 0;
  confirmed = null;
  toast.dismiss(IDLE_TOAST);
  setState({ status: "login", db: null, userId: null, pending: queue.length, notice });
}

// ─────────────────────────────────────────────── auto sign-out after inactivity
// Activity = mouse, keyboard, touch or scrolling in any open tab. Background update checks don't count.
// The server enforces the same limit, so a forgotten open tab can't keep a session alive.

const ACTIVITY_KEY = "lj-last-activity";
const SIGNED_IN_KEY = "lj-signed-in";
const IDLE_TOAST = "idle-warning";
let keptFor: string | null = null;
let lastLocal = 0;
let lastTouch = 0;

function lastActivity() {
  let shared = 0;
  try {
    shared = Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {}
  return Math.max(lastLocal, shared);
}

function markActive(force = false) {
  const now = Date.now();
  if (!force && now - lastLocal < 5000) return;
  lastLocal = now;
  toast.dismiss(IDLE_TOAST);
  try {
    localStorage.setItem(ACTIVITY_KEY, String(now));
  } catch {}
  // keep the server-side session alive, at most once a minute
  if (getState().status === "ready" && (force || now - lastTouch > 60_000)) {
    lastTouch = now;
    api("/api/auth/touch", { method: "POST" }).catch((e) => e instanceof ApiError && e.status === 401 && expired());
  }
}

function idleCheck() {
  if (getState().status !== "ready" || !me || !confirmed) return;
  const limit = idleLimitMs(confirmed.settings, me.role);
  if (!limit) return;
  const idle = Date.now() - lastActivity();
  if (idle >= limit) {
    const mins = Math.round(limit / 60_000);
    api("/api/auth/logout", { method: "POST" }).catch(() => {});
    expired(`You were signed out after ${minutesText(mins)} without activity. Please sign in again.`);
  } else if (idle >= limit - 60_000) {
    toast.warning("You will be signed out in 1 minute because of no activity.", {
      id: IDLE_TOAST,
      description: "Move the mouse or tap the screen to stay signed in.",
      duration: 70_000,
    });
  }
}

// ─────────────────────────────────────────────── saving

export function enqueue(fn: Op, ctx: Ctx, ids: string[]) {
  queue.push({ fn, ctx, ids });
  setState({ pending: queue.length });
  void pump();
}

/** Re-runs a queued operation on `db` with the same ids; null when it no longer applies. */
function replay(db: DB, job: Job): DB | null {
  try {
    return produce(db, (d: DB) => {
      withIdTape(job.ids, true, () => job.fn(d, job.ctx));
    });
  } catch (e) {
    toast.error(`Not saved: ${e instanceof OpError ? e.message : "this change no longer applies"}`);
    return null;
  }
}

/** What the screen shows: the server's data plus the changes still waiting to be saved. */
function refreshView() {
  if (!confirmed) return;
  let view = confirmed;
  for (let i = 0; i < queue.length; i++) {
    const next = replay(view, queue[i]);
    if (next) view = next;
    else queue.splice(i--, 1);
  }
  setState({ db: view, pending: queue.length });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pump() {
  if (busy || !confirmed) return;
  busy = true;
  let wait = 1000;
  let conflicts = 0;
  let single = false; // after a refusal, send changes one by one to find the one at fault
  try {
    while (queue.length && confirmed) {
      // send everything waiting as one save (typing in a settings field makes many small changes)
      const base = confirmed;
      const take = single ? 1 : Math.min(queue.length, 25);
      let next = base;
      for (let i = 0; i < take && i < queue.length; i++) {
        const after = replay(next, queue[i]);
        if (after) next = after;
        else queue.splice(i--, 1);
      }
      const count = Math.min(take, queue.length);
      const diff = computeDiff(base, next);
      if (!count || isEmptyDiff(diff)) {
        queue.splice(0, count);
        refreshView();
        continue;
      }
      try {
        const ready = await uploadPhotos(diff);
        const r = await api<{
          rev: number;
          applied: Diff;
          missed: Diff | null;
        }>("/api/sync", {
          method: "POST",
          json: { baseRev: rev, diff: ready },
        });
        const jumped = r.rev > rev + 1;
        confirmed = applyDiff(confirmed, r.applied, next);
        if (r.missed) confirmed = applyDiff(confirmed, r.missed);
        rev = r.rev;
        queue.splice(0, count);
        conflicts = 0;
        wait = 1000;
        single = false;
        if (getState().offline) setState({ offline: false });
        if (jumped && !r.missed) await pull(true);
        refreshView();
      } catch (e) {
        if (e instanceof ApiError && e.status === 409 && conflicts < 5) {
          conflicts++;
          await pull(); // someone else saved first: take their changes, then run these again
          continue;
        }
        if (e instanceof ApiError && e.status === 401) return expired();
        if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
          if (count > 1) {
            single = true;
            continue;
          }
          toast.error(`Not saved: ${e.message}`);
          queue.shift();
          refreshView();
          continue;
        }
        // offline or server trouble: keep the changes and keep trying
        setState({ offline: true });
        await sleep(wait);
        wait = Math.min(wait * 2, 30000);
        if (confirmed && conflicts < 5) await pull().catch(() => {});
      }
    }
  } finally {
    busy = false;
  }
}

/** Stores new photos first (one request each), then sends links instead of image data. */
async function uploadPhotos(diff: Diff): Promise<Diff> {
  const found = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") v.startsWith("data:image/") && found.add(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(diff);
  if (!found.size) return diff;
  const map = new Map<string, string>();
  for (const data of found)
    map.set(
      data,
      (
        await api<{ url: string }>("/api/photos/upload", {
          method: "POST",
          json: { data },
        })
      ).url,
    );
  const swap = (v: unknown): unknown => {
    if (typeof v === "string") return map.get(v) ?? v;
    if (Array.isArray(v)) return v.map(swap);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)]));
    return v;
  };
  return swap(diff) as Diff;
}

// ─────────────────────────────────────────────── other people's changes

async function pull(full = false) {
  if (!confirmed || !me) return;
  if (full || me.role === "KARIGAR") {
    const r = await api<{ rev: number; db: DB; user: User }>("/api/db");
    confirmed = r.db;
    rev = r.rev;
    me = r.user;
  } else {
    const r = await api<{ rev: number; diff: Diff; user: User }>(`/api/db?since=${rev}`);
    confirmed = applyDiff(confirmed, r.diff);
    rev = r.rev;
    me = r.user;
  }
}

async function check() {
  if (busy || queue.length || !confirmed || document.visibilityState !== "visible") return;
  try {
    const r = await api<{ rev: number }>("/api/rev");
    if (r.rev !== rev && !busy && !queue.length) {
      await pull(r.rev < rev);
      refreshView();
    }
    if (getState().offline) setState({ offline: false });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      const limit = me && confirmed ? idleLimitMs(confirmed.settings, me.role) : 0;
      expired(limit && Date.now() - lastActivity() >= limit - 60_000 ? `You were signed out after ${minutesText(Math.round(limit / 60_000))} without activity. Please sign in again.` : undefined);
    }
  }
}

function start() {
  if (started) return;
  started = true;
  setInterval(check, 15000);
  setInterval(idleCheck, 5000);
  const onActivity = () => markActive();
  for (const ev of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"])
    window.addEventListener(ev, onActivity, { passive: true, capture: true });
  // a phone waking up or a tab coming back: check the time at once
  document.addEventListener("visibilitychange", idleCheck);
  window.addEventListener("storage", (e) => {
    // signed in again in another tab: this tab follows
    if (e.key === SIGNED_IN_KEY && getState().status === "login") void loadEverything().catch(() => {});
  });
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", check);
  window.addEventListener("online", () => void pump());
  window.addEventListener("beforeunload", (e) => {
    if (queue.length) e.preventDefault();
  });
}

// ─────────────────────────────────────────────── owner tools

export async function setCredential(userId: string, secret: string) {
  // the user record must be saved before a password can be attached to it
  for (let i = 0; i < 40 && queue.length; i++) await sleep(250);
  await api("/api/users/credential", {
    method: "POST",
    json: { userId, secret },
  });
}

export async function loginList(): Promise<{ id: string; locked: boolean }[]> {
  return (await api<{ users: { id: string; locked: boolean }[] }>("/api/users/credential")).users;
}
