// Auto sign-out after a period without activity (live mode). Shared by the browser and the server.
import type { Role, Settings } from "./types";

export const AUTO_LOGOUT_DEFAULT = { minutes: 15, karigars: false };
export const AUTO_LOGOUT_CHOICES = [0, 5, 10, 15, 30, 60, 120];

export const autoLogoutOf = (s: Settings) => s.autoLogout ?? AUTO_LOGOUT_DEFAULT;

/** Idle limit in ms for this role, or 0 when it doesn't apply. */
export function idleLimitMs(s: Settings, role: Role) {
  const a = autoLogoutOf(s);
  if (!a.minutes || (role === "KARIGAR" && !a.karigars)) return 0;
  return a.minutes * 60_000;
}

export const minutesText = (m: number) =>
  m < 60 || m % 60 ? `${m} minute${m === 1 ? "" : "s"}` : `${m / 60} hour${m === 60 ? "" : "s"}`;
