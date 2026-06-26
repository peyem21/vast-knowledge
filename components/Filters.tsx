"use client";

export type SortKey =
  | "volume24h"
  | "priceChange24h"
  | "priceChange1h"
  | "liquidityUsd"
  | "marketCap"
  | "newest";

export interface FilterState {
  query: string;
  narrative: string | null;
  minLiquidity: number;
  freshOnly: boolean;
  watchlistOnly: boolean;
  sort: SortKey;
}

const SORTS: { key: SortKey; label: string }[] = [
  { key: "volume24h", label: "Volume 24h" },
  { key: "priceChange24h", label: "Change 24h" },
  { key: "priceChange1h", label: "Change 1h" },
  { key: "liquidityUsd", label: "Liquidity" },
  { key: "marketCap", label: "Market cap" },
  { key: "newest", label: "Newest" },
];

const LIQ_TIERS = [
  { value: 0, label: "Any liq." },
  { value: 10_000, label: ">$10K" },
  { value: 50_000, label: ">$50K" },
  { value: 250_000, label: ">$250K" },
];

export default function Filters({
  filters,
  onChange,
  watchlistCount,
}: {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  watchlistCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={filters.query}
        onChange={(e) => onChange({ query: e.target.value })}
        placeholder="Search name or symbol…"
        className="w-44 rounded-lg border border-border bg-panel px-3 py-1.5 text-sm outline-none placeholder:text-[#666c7a] focus:border-accent"
      />

      <select
        value={filters.sort}
        onChange={(e) => onChange({ sort: e.target.value as SortKey })}
        className="rounded-lg border border-border bg-panel px-3 py-1.5 text-sm outline-none focus:border-accent"
      >
        {SORTS.map((s) => (
          <option key={s.key} value={s.key}>
            Sort: {s.label}
          </option>
        ))}
      </select>

      <select
        value={filters.minLiquidity}
        onChange={(e) => onChange({ minLiquidity: Number(e.target.value) })}
        className="rounded-lg border border-border bg-panel px-3 py-1.5 text-sm outline-none focus:border-accent"
      >
        {LIQ_TIERS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <Toggle
        active={filters.freshOnly}
        onClick={() => onChange({ freshOnly: !filters.freshOnly })}
        label="🆕 Fresh <24h"
      />

      <Toggle
        active={filters.watchlistOnly}
        onClick={() => onChange({ watchlistOnly: !filters.watchlistOnly })}
        label={`★ Watchlist (${watchlistCount})`}
      />
    </div>
  );
}

function Toggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
        active
          ? "border-accent bg-accent/20 text-white"
          : "border-border bg-panel text-[#9aa0ad] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
