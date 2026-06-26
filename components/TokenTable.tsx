"use client";

import { TokenRow } from "@/lib/types";
import { ageFromMs, compactUsd, isFresh, pct, price } from "@/lib/format";

export default function TokenTable({
  tokens,
  watchlist,
  onToggleWatch,
  loading,
}: {
  tokens: TokenRow[];
  watchlist: string[];
  onToggleWatch: (address: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-[#9aa0ad]">
        Scanning the chain…
      </div>
    );
  }

  if (!tokens.length) {
    return (
      <div className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-[#9aa0ad]">
        No tokens match your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-panel text-left text-xs uppercase tracking-wider text-[#666c7a]">
            <Th className="w-8"></Th>
            <Th>Token</Th>
            <Th className="text-right">Price</Th>
            <Th className="text-right">1h</Th>
            <Th className="text-right">24h</Th>
            <Th className="text-right">Volume 24h</Th>
            <Th className="text-right">Liquidity</Th>
            <Th className="text-right">Mkt cap</Th>
            <Th className="text-right">Age</Th>
            <Th>Narratives</Th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t) => {
            const watched = watchlist.includes(t.address);
            return (
              <tr
                key={t.address}
                className="border-t border-border transition hover:bg-panel/60"
              >
                <Td>
                  <button
                    onClick={() => onToggleWatch(t.address)}
                    title={watched ? "Remove from watchlist" : "Add to watchlist"}
                    className={`text-base leading-none ${
                      watched ? "text-accent" : "text-[#444b59] hover:text-accent"
                    }`}
                  >
                    {watched ? "★" : "☆"}
                  </button>
                </Td>
                <Td>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:underline"
                  >
                    {t.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.imageUrl}
                        alt=""
                        className="h-6 w-6 rounded-full bg-bg object-cover"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bg text-[10px] text-[#666c7a]">
                        {t.symbol.slice(0, 2)}
                      </span>
                    )}
                    <span className="font-medium text-white">{t.symbol}</span>
                    {isFresh(t.pairCreatedAt) && (
                      <span className="rounded bg-up/20 px-1 text-[10px] text-up">
                        NEW
                      </span>
                    )}
                    {(t.boosts ?? 0) > 0 && (
                      <span className="rounded bg-accent/20 px-1 text-[10px] text-accent">
                        🚀{t.boosts}
                      </span>
                    )}
                  </a>
                </Td>
                <Td className="text-right tabular-nums">{price(t.priceUsd)}</Td>
                <Td className={`text-right tabular-nums ${changeColor(t.priceChange1h)}`}>
                  {pct(t.priceChange1h)}
                </Td>
                <Td className={`text-right tabular-nums ${changeColor(t.priceChange24h)}`}>
                  {pct(t.priceChange24h)}
                </Td>
                <Td className="text-right tabular-nums">{compactUsd(t.volume24h)}</Td>
                <Td className="text-right tabular-nums">{compactUsd(t.liquidityUsd)}</Td>
                <Td className="text-right tabular-nums">{compactUsd(t.marketCap)}</Td>
                <Td className="text-right tabular-nums text-[#9aa0ad]">
                  {ageFromMs(t.pairCreatedAt)}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {t.narratives.map((n) => (
                      <span
                        key={n}
                        className="rounded bg-bg px-1.5 py-0.5 text-[10px] text-[#9aa0ad]"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function changeColor(n: number | null): string {
  if (n == null) return "text-[#9aa0ad]";
  return n >= 0 ? "text-up" : "text-down";
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-3 py-2 font-medium ${className}`}>{children}</th>;
}

function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}
