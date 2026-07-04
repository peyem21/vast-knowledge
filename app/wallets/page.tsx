"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrackedWallet,
  addTrackedWallet,
  getTrackedWallets,
  removeTrackedWallet,
} from "@/lib/smartmoney/wallets";
import { FeedEntry } from "@/lib/smartmoney/feed";
import { WalletCandidate } from "@/lib/smartmoney/discover";
import { ageFromMs, compactUsd, shortAddr } from "@/lib/format";

const CHAINS = ["solana", "ethereum", "base", "bsc", "arbitrum"];
const REFRESH_MS = 60_000;

interface FeedResponse {
  configured: boolean;
  source: string;
  entries: FeedEntry[];
}

interface DiscoverResponse {
  configured: boolean;
  source: string;
  sampledTokens?: string[];
  candidates: WalletCandidate[];
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [chain, setChain] = useState("solana");
  const [addr, setAddr] = useState("");
  const [label, setLabel] = useState("");
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [discover, setDiscover] = useState<DiscoverResponse | null>(null);
  const [discovering, setDiscovering] = useState(false);

  useEffect(() => {
    setWallets(getTrackedWallets());
  }, []);

  const runDiscover = useCallback(async () => {
    setDiscovering(true);
    setDiscover(null);
    try {
      const res = await fetch(`/api/smart-money/discover?chain=${chain}`);
      setDiscover((await res.json()) as DiscoverResponse);
    } catch {
      setDiscover(null);
    } finally {
      setDiscovering(false);
    }
  }, [chain]);

  const load = useCallback(async () => {
    const current = getTrackedWallets();
    if (!current.length) {
      setFeed({ configured: true, source: "", entries: [] });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/smart-money/feed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chain, wallets: current }),
      });
      setFeed((await res.json()) as FeedResponse);
    } catch {
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }, [chain]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load, wallets]);

  const add = () => {
    if (!addr.trim()) return;
    setWallets(addTrackedWallet(addr, label));
    setAddr("");
    setLabel("");
  };

  const labelFor = useMemo(() => {
    const map = new Map(wallets.map((w) => [w.address, w.label]));
    return (a: string) => map.get(a) ?? shortAddr(a);
  }, [wallets]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-[#9aa0ad] hover:text-white">
          ← Radar
        </Link>
        <div className="flex flex-wrap gap-1.5">
          {CHAINS.map((c) => (
            <button
              key={c}
              onClick={() => setChain(c)}
              className={`rounded-lg border px-2.5 py-1 text-xs capitalize transition ${
                chain === c
                  ? "border-accent bg-accent/20 text-white"
                  : "border-border bg-panel text-[#9aa0ad] hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <header className="mb-5">
        <h1 className="text-xl font-semibold">🐋 Smart Money Feed</h1>
        <p className="text-sm text-[#9aa0ad]">
          Track wallets you trust and see which tokens they&apos;re buying — ranked
          by how many are piling into the same one.
        </p>
      </header>

      {/* Wallet manager */}
      <section className="mb-6 rounded-xl border border-border bg-panel p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="Wallet address"
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm outline-none placeholder:text-[#666c7a] focus:border-accent"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 text-sm outline-none placeholder:text-[#666c7a] focus:border-accent sm:w-48"
          />
          <button
            onClick={add}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
          >
            Track
          </button>
        </div>
        {wallets.length === 0 ? (
          <p className="text-sm text-[#666c7a]">
            No wallets tracked yet. Add the addresses of traders whose moves you
            want to follow.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {wallets.map((w) => (
              <span
                key={w.address}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-2 py-1 text-xs"
              >
                <span className="text-[#c9ccd6]">{w.label}</span>
                <span className="font-mono text-[#666c7a]">{shortAddr(w.address)}</span>
                <button
                  onClick={() => setWallets(removeTrackedWallet(w.address))}
                  className="text-[#666c7a] hover:text-down"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Discovery */}
      <section className="mb-6 rounded-xl border border-border bg-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">🔍 Discover smart wallets</div>
            <div className="text-xs text-[#9aa0ad]">
              Scans today&apos;s biggest gainers and finds wallets that show up as a
              top holder in more than one of them.
            </div>
          </div>
          <button
            onClick={runDiscover}
            disabled={discovering}
            className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {discovering ? "Scanning…" : "Discover"}
          </button>
        </div>

        {discover && !discover.configured && (
          <p className="text-sm text-[#9aa0ad]">
            Needs a <code className="text-accent">BIRDEYE_API_KEY</code> — see the
            README.
          </p>
        )}

        {discover && discover.configured && (
          <>
            {discover.sampledTokens && discover.sampledTokens.length > 0 && (
              <p className="mb-2 text-[11px] text-[#666c7a]">
                Sampled: {discover.sampledTokens.join(", ")}
              </p>
            )}
            {discover.candidates.length === 0 ? (
              <p className="text-sm text-[#666c7a]">
                No wallet showed up as a top holder in 2+ of today&apos;s gainers.
                Try again later, or on a different chain.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {discover.candidates.slice(0, 10).map((c) => {
                  const tracked = wallets.some((w) => w.address === c.wallet);
                  return (
                    <div
                      key={c.wallet}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-[#c9ccd6]">
                            {shortAddr(c.wallet)}
                          </span>
                          <span className="rounded bg-up/20 px-1.5 py-0.5 text-[10px] font-semibold text-up">
                            {c.tokenCount} winners
                          </span>
                        </div>
                        <div className="truncate text-[11px] text-[#666c7a]">
                          {c.hits.map((h) => h.tokenSymbol).join(", ")}
                          {c.avgPercentage != null &&
                            ` · avg ${c.avgPercentage.toFixed(1)}% held`}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setWallets(addTrackedWallet(c.wallet, `Smart #${c.tokenCount}`))
                        }
                        disabled={tracked}
                        className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs text-[#9aa0ad] hover:text-white disabled:opacity-40"
                      >
                        {tracked ? "Tracked" : "+ Track"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* Feed */}
      {feed && !feed.configured ? (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-[#c9ccd6]">
          <p className="mb-1 font-medium">Smart-money feed needs a data provider.</p>
          <p className="text-[#9aa0ad]">
            Add a <code className="text-accent">BIRDEYE_API_KEY</code> to your
            environment to pull each wallet&apos;s recent trades. See the README.
          </p>
        </div>
      ) : (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wider text-[#666c7a]">
              Tokens smart money is buying
            </div>
            {loading && <span className="text-xs text-[#666c7a]">Refreshing…</span>}
          </div>

          {!feed || feed.entries.length === 0 ? (
            <div className="rounded-xl border border-border bg-panel p-8 text-center text-sm text-[#9aa0ad]">
              {wallets.length === 0
                ? "Track some wallets to build your feed."
                : "No recent smart-money activity for these wallets on this chain."}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {feed.entries.map((e) => (
                <FeedRow key={e.chainId + e.tokenAddress} entry={e} labelFor={labelFor} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function FeedRow({
  entry,
  labelFor,
}: {
  entry: FeedEntry;
  labelFor: (a: string) => string;
}) {
  const net = entry.netUsd;
  return (
    <Link
      href={`/token/${entry.chainId}/${entry.tokenAddress}`}
      className="rounded-xl border border-border bg-panel p-3 transition hover:border-accent/60"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{entry.tokenSymbol}</span>
          {entry.buyers.length >= 2 && (
            <span className="rounded bg-up/20 px-1.5 py-0.5 text-[10px] font-semibold text-up">
              {entry.buyers.length} buyers 🔥
            </span>
          )}
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium tabular-nums ${net >= 0 ? "text-up" : "text-down"}`}>
            {net >= 0 ? "+" : ""}
            {compactUsd(net)} net
          </div>
          <div className="text-[11px] text-[#666c7a]">{ageFromMs(entry.lastActivity)} ago</div>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-[#9aa0ad]">
        {entry.buyers.slice(0, 5).map((w) => (
          <span key={w} className="rounded bg-up/10 px-1.5 py-0.5 text-up">
            ↑ {labelFor(w)}
          </span>
        ))}
        {entry.sellers.slice(0, 3).map((w) => (
          <span key={w} className="rounded bg-down/10 px-1.5 py-0.5 text-down">
            ↓ {labelFor(w)}
          </span>
        ))}
      </div>
    </Link>
  );
}
