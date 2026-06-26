"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NarrativeSummary, TokenRow } from "@/lib/types";
import { getWatchlist, toggleWatch } from "@/lib/watchlist";
import NarrativeStrip from "./NarrativeStrip";
import TokenTable from "./TokenTable";
import Filters, { FilterState, SortKey } from "./Filters";

const CHAINS = [
  { id: "solana", label: "Solana" },
  { id: "ethereum", label: "Ethereum" },
  { id: "base", label: "Base" },
  { id: "bsc", label: "BSC" },
  { id: "arbitrum", label: "Arbitrum" },
];

const REFRESH_MS = 30_000;

interface ApiResponse {
  chain: string;
  tokens: TokenRow[];
  narratives: NarrativeSummary[];
  generatedAt: number;
  error?: string;
}

const DEFAULT_FILTERS: FilterState = {
  query: "",
  narrative: null,
  minLiquidity: 0,
  freshOnly: false,
  watchlistOnly: false,
  sort: "volume24h",
};

export default function Dashboard() {
  const [chain, setChain] = useState("solana");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    setWatchlist(getWatchlist());
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tokens?chain=${chain}`);
      const json = (await res.json()) as ApiResponse;
      if (json.error) throw new Error(json.error);
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [chain]);

  useEffect(() => {
    setLoading(true);
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const onToggleWatch = useCallback((address: string) => {
    setWatchlist(toggleWatch(address));
  }, []);

  const visibleTokens = useMemo(() => {
    if (!data) return [];
    const q = filters.query.trim().toLowerCase();
    let rows = data.tokens.filter((t) => {
      if (filters.narrative && !t.narratives.includes(filters.narrative)) return false;
      if (filters.minLiquidity && (t.liquidityUsd ?? 0) < filters.minLiquidity) return false;
      if (filters.freshOnly) {
        const fresh = t.pairCreatedAt && Date.now() - t.pairCreatedAt < 24 * 3600 * 1000;
        if (!fresh) return false;
      }
      if (filters.watchlistOnly && !watchlist.includes(t.address)) return false;
      if (q && !`${t.name} ${t.symbol}`.toLowerCase().includes(q)) return false;
      return true;
    });
    rows = sortRows(rows, filters.sort);
    return rows;
  }, [data, filters, watchlist]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {CHAINS.map((c) => (
            <button
              key={c.id}
              onClick={() => setChain(c.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                chain === c.id
                  ? "border-accent bg-accent/20 text-white"
                  : "border-border bg-panel text-[#9aa0ad] hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-[#9aa0ad]">
          {loading
            ? "Loading…"
            : data
              ? `${data.tokens.length} tokens · updated ${new Date(
                  data.generatedAt
                ).toLocaleTimeString()}`
              : ""}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
          {error}
        </div>
      )}

      <NarrativeStrip
        narratives={data?.narratives ?? []}
        active={filters.narrative}
        onSelect={(n) =>
          setFilters((f) => ({ ...f, narrative: f.narrative === n ? null : n }))
        }
      />

      <Filters
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        watchlistCount={watchlist.length}
      />

      <TokenTable
        tokens={visibleTokens}
        watchlist={watchlist}
        onToggleWatch={onToggleWatch}
        loading={loading && !data}
      />
    </div>
  );
}

function sortRows(rows: TokenRow[], sort: SortKey): TokenRow[] {
  const val = (t: TokenRow): number => {
    switch (sort) {
      case "volume24h":
        return t.volume24h ?? 0;
      case "priceChange24h":
        return t.priceChange24h ?? -Infinity;
      case "priceChange1h":
        return t.priceChange1h ?? -Infinity;
      case "liquidityUsd":
        return t.liquidityUsd ?? 0;
      case "marketCap":
        return t.marketCap ?? 0;
      case "newest":
        return t.pairCreatedAt ?? 0;
      default:
        return 0;
    }
  };
  return [...rows].sort((a, b) => val(b) - val(a));
}
