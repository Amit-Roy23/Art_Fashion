"use client";
import { useSyncExternalStore } from "react";

type Theme = "noir" | "ivory";
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme) || "noir";
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("aurum-theme", t);
  } catch {}
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getTheme,
    () => "noir",
  );
}

/** Validated categorical chart colours per theme (SVG fills can't read CSS variables). */
export function useChartColors() {
  return useTheme() === "ivory" ? ["#a8741f", "#1f6fa8"] : ["#bd8a30", "#3d95d4"];
}
