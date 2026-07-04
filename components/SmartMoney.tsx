"use client";

import { useEffect, useState } from "react";
import { SmartMoneyData } from "@/lib/smartmoney/types";
import { ageFromMs, compact, compactUsd, pct, shortAddr } from "@/lib/format";

const EXPLORERS: Record<string, { acct: string; tx: string }> = {
  solana: { acct: "https://solscan.io/account/", tx: "https://solscan.io/tx/" },
  ethereum: { acct: "https://etherscan.io/address/", tx: "https://etherscan.io/tx/" },
  base: { acct: "https://basescan.org/address/", tx: "https://basescan.org/tx/" },
  bsc: { acct: "https://bscscan.com/address/", tx: "https://bscscan.com/tx/" },
  arbitrum: { acct: "https://arbiscan.io/address/", tx: "https://arbiscan.io/tx/" },
};

/**
 * Smart-money panel for the token detail page. Fetches holder concentration
 * and recent whale trades from /api/smart-money. Shows a setup hint when no
 * data provider (Birdeye) key is configured, so the page still works without one.
 */
export default function SmartMoney({
  chain,
  address,
}: {
  chain: string;
  address: string;
}) {
  const [data, setData] = useState<SmartMoneyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/smart-money?chain=${chain}&address=${address}`)
      .then((r) => r.json())
      .then((d: SmartMoneyData) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [chain, address]);

  const exp = EXPLORERS[chain];

  return (
    <section className="rounded-xl border border-border bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">🐋 Smart money</h2>
        {data?.source && data.source !== "none" && (
          <span className="text-[11px] uppercase tracking-wider text-[#666c7a]">
            via {data.source}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-[#9aa0ad]">Loading holder &amp; whale data…</p>
      ) : !data || !data.configured ? (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm text-[#c9ccd6]">
          <p className="mb-1 font-medium">Whale tracking is off.</p>
          <p className="text-[#9aa0ad]">
            Add a <code className="text-accent">BIRDEYE_API_KEY</code> to your
            environment to see top holders, supply concentration, and recent
            whale trades here. See the README.
          </p>
        </div>
      ) : data.error ? (
        <p className="text-sm text-down">Couldn&apos;t load smart-money data: {data.error}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Concentration summary */}
          <div className="grid grid-cols-2 gap-2">
            <Metric
              label="Holders"
              value={data.holderCount != null ? compact(data.holderCount) : "—"}
            />
            <Metric
              label="Top 10 supply"
              value={data.top10Percent != null ? pct(data.top10Percent) : "—"}
              warn={(data.top10Percent ?? 0) > 50}
            />
          </div>

          {/* Top holders */}
          {data.holders.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-wider text-[#666c7a]">
                Top holders
              </div>
              <div className="flex flex-col gap-1">
                {data.holders.slice(0, 8).map((h) => (
                  <div
                    key={h.owner + h.rank}
                    className="flex items-center justify-between text-sm"
                  >
                    <a
                      href={exp ? exp.acct + h.owner : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#c9ccd6] hover:text-accent"
                    >
                      {h.rank}. {shortAddr(h.owner)}
                    </a>
                    <span className="tabular-nums text-[#9aa0ad]">
                      {compact(h.amount)}
                      {h.percentage != null && (
                        <span className="ml-1 text-[#666c7a]">
                          ({h.percentage.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Whale trades */}
          {data.trades.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-wider text-[#666c7a]">
                Recent whale trades (&gt;$1K)
              </div>
              <div className="flex flex-col gap-1">
                {data.trades.slice(0, 8).map((t, i) => (
                  <div
                    key={t.txHash + i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`rounded px-1 text-[10px] font-semibold uppercase ${
                          t.side === "buy" ? "bg-up/20 text-up" : "bg-down/20 text-down"
                        }`}
                      >
                        {t.side}
                      </span>
                      <a
                        href={exp && t.txHash ? exp.tx + t.txHash : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[#9aa0ad] hover:text-accent"
                      >
                        {shortAddr(t.owner)}
                      </a>
                    </span>
                    <span className="flex items-center gap-2 tabular-nums">
                      <span className={t.side === "buy" ? "text-up" : "text-down"}>
                        {compactUsd(t.volumeUsd)}
                      </span>
                      <span className="text-[11px] text-[#666c7a]">
                        {ageFromMs(t.timestamp)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.holders.length === 0 && data.trades.length === 0 && (
            <p className="text-sm text-[#9aa0ad]">
              No holder or whale-trade data available for this token.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg p-2.5">
      <div className="text-[11px] uppercase tracking-wider text-[#666c7a]">{label}</div>
      <div className={`mt-0.5 text-sm font-medium tabular-nums ${warn ? "text-down" : ""}`}>
        {value}
        {warn && <span className="ml-1 text-[10px]">⚠ concentrated</span>}
      </div>
    </div>
  );
}
