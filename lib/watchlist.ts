"use client";

const KEY = "vk:watchlist";

/** Reads watchlisted token addresses from localStorage. */
export function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isWatched(address: string): boolean {
  return getWatchlist().includes(address);
}

/** Toggles a token in the watchlist and returns the updated list. */
export function toggleWatch(address: string): string[] {
  const current = getWatchlist();
  const next = current.includes(address)
    ? current.filter((a) => a !== address)
    : [...current, address];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
