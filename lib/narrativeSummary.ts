import { NarrativeSummary, TokenRow } from "./types";

/**
 * Aggregates token rows into per-narrative summaries so we can see which
 * themes are heating up (by volume) rather than just individual tokens.
 */
export function summarizeNarratives(rows: TokenRow[]): NarrativeSummary[] {
  const byNarrative = new Map<string, TokenRow[]>();

  for (const row of rows) {
    for (const n of row.narratives) {
      const list = byNarrative.get(n) ?? [];
      list.push(row);
      byNarrative.set(n, list);
    }
  }

  const summaries: NarrativeSummary[] = [];
  for (const [narrative, tokens] of byNarrative) {
    const totalVolume24h = sum(tokens, (t) => t.volume24h);
    const totalLiquidity = sum(tokens, (t) => t.liquidityUsd);

    // Liquidity-weighted average so tiny pools don't dominate the signal.
    let weighted = 0;
    let weight = 0;
    for (const t of tokens) {
      const w = t.liquidityUsd ?? 0;
      if (t.priceChange24h != null && w > 0) {
        weighted += t.priceChange24h * w;
        weight += w;
      }
    }
    const avgPriceChange24h = weight > 0 ? weighted / weight : 0;

    const topSymbols = [...tokens]
      .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
      .slice(0, 4)
      .map((t) => t.symbol);

    summaries.push({
      narrative,
      tokenCount: tokens.length,
      totalVolume24h,
      totalLiquidity,
      avgPriceChange24h,
      topSymbols,
    });
  }

  summaries.sort((a, b) => b.totalVolume24h - a.totalVolume24h);
  return summaries;
}

function sum<T>(arr: T[], pick: (t: T) => number | null): number {
  return arr.reduce((acc, t) => acc + (pick(t) ?? 0), 0);
}
