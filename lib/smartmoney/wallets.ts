"use client";

/**
 * Client-managed list of "smart-money" wallets to track, persisted in
 * localStorage. Kept client-side (like the watchlist) so the feed works with
 * no backend/DB — the wallet list is sent to the feed API on each request.
 */

export interface TrackedWallet {
  address: string;
  label: string;
}

const KEY = "vk:smartWallets";

export function getTrackedWallets(): TrackedWallet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TrackedWallet[]) : [];
  } catch {
    return [];
  }
}

function save(wallets: TrackedWallet[]): TrackedWallet[] {
  window.localStorage.setItem(KEY, JSON.stringify(wallets));
  return wallets;
}

export function addTrackedWallet(address: string, label: string): TrackedWallet[] {
  const addr = address.trim();
  if (!addr) return getTrackedWallets();
  const current = getTrackedWallets();
  if (current.some((w) => w.address === addr)) return current;
  return save([...current, { address: addr, label: label.trim() || short(addr) }]);
}

export function removeTrackedWallet(address: string): TrackedWallet[] {
  return save(getTrackedWallets().filter((w) => w.address !== address));
}

function short(a: string): string {
  return a.length <= 12 ? a : `${a.slice(0, 4)}…${a.slice(-4)}`;
}
