export function compactUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function price(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1) return `$${n.toFixed(3)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  // Show significant digits for sub-cent meme prices.
  return `$${n.toPrecision(3)}`;
}

export function compact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

export function shortAddr(a: string | null | undefined): string {
  if (!a) return "—";
  if (a.length <= 12) return a;
  return `${a.slice(0, 4)}…${a.slice(-4)}`;
}

export function pct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function ageFromMs(createdAtMs: number | null | undefined): string {
  if (!createdAtMs) return "—";
  const diff = Date.now() - createdAtMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

/** Tokens younger than this are flagged as fresh launches. */
export const FRESH_LAUNCH_MS = 24 * 60 * 60 * 1000;

export function isFresh(createdAtMs: number | null | undefined): boolean {
  return !!createdAtMs && Date.now() - createdAtMs < FRESH_LAUNCH_MS;
}
