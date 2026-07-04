"use client";

import { NarrativeSummary } from "@/lib/types";
import { compactUsd, pct } from "@/lib/format";

/**
 * Horizontal strip of narrative "heat" cards. Click one to filter the table
 * to that narrative. Sorted by 24h volume (set by the API).
 */
export default function NarrativeStrip({
  narratives,
  active,
  onSelect,
}: {
  narratives: NarrativeSummary[];
  active: string | null;
  onSelect: (narrative: string) => void;
}) {
  if (!narratives.length) return null;

  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[#666c7a]">
        Heating narratives
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {narratives.map((n) => {
          const isActive = active === n.narrative;
          const up = n.avgPriceChange24h >= 0;
          return (
            <button
              key={n.narrative}
              onClick={() => onSelect(n.narrative)}
              className={`min-w-[150px] shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                isActive
                  ? "border-accent bg-accent/15"
                  : "border-border bg-panel hover:border-accent/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{n.narrative}</span>
                <span className={`text-xs ${up ? "text-up" : "text-down"}`}>
                  {pct(n.avgPriceChange24h)}
                </span>
              </div>
              <div className="mt-1 text-xs text-[#9aa0ad]">
                {compactUsd(n.totalVolume24h)} vol · {n.tokenCount} tokens
              </div>
              <div className="mt-0.5 truncate text-[11px] text-[#666c7a]">
                {n.topSymbols.join(" · ")}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
