import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchTokenDetail } from "@/lib/dexscreener";
import { ageFromMs, compactUsd, isFresh, pct, price } from "@/lib/format";
import SmartMoney from "@/components/SmartMoney";

export const revalidate = 30;

export default async function TokenPage({
  params,
}: {
  params: { chain: string; address: string };
}) {
  const detail = await fetchTokenDetail(params.chain, params.address);
  if (!detail) notFound();

  const totalTxns = (detail.buys24h ?? 0) + (detail.sells24h ?? 0);
  const buyPct = totalTxns > 0 ? ((detail.buys24h ?? 0) / totalTxns) * 100 : 50;
  const embed = `https://dexscreener.com/${detail.chainId}/${detail.pairAddress}?embed=1&theme=dark&info=0`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[#9aa0ad] hover:text-white"
      >
        ← Back to radar
      </Link>

      <header className="mb-5 flex flex-wrap items-center gap-3">
        {detail.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={detail.imageUrl}
            alt=""
            className="h-12 w-12 rounded-full bg-panel object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-panel text-sm text-[#666c7a]">
            {detail.symbol.slice(0, 3)}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{detail.symbol}</h1>
            <span className="text-sm text-[#9aa0ad]">{detail.name}</span>
            {isFresh(detail.pairCreatedAt) && (
              <span className="rounded bg-up/20 px-1.5 py-0.5 text-[10px] text-up">
                NEW
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs uppercase tracking-wider text-[#666c7a]">
            {detail.chainId}
            {detail.dexId ? ` · ${detail.dexId}` : ""}
            {detail.quoteSymbol ? ` · ${detail.symbol}/${detail.quoteSymbol}` : ""}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-semibold tabular-nums">
            {price(detail.priceUsd)}
          </div>
          <div className={`text-sm ${(detail.priceChange24h ?? 0) >= 0 ? "text-up" : "text-down"}`}>
            {pct(detail.priceChange24h)} (24h)
          </div>
        </div>
      </header>

      {/* Momentum row */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Change label="5m" value={detail.priceChange5m} />
        <Change label="1h" value={detail.priceChange1h} />
        <Change label="6h" value={detail.priceChange6h} />
        <Change label="24h" value={detail.priceChange24h} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Live chart + smart money */}
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-border bg-panel">
            <div className="relative aspect-[16/10] w-full">
              <iframe
                src={embed}
                title={`${detail.symbol} chart`}
                className="absolute inset-0 h-full w-full"
                style={{ border: 0 }}
                loading="lazy"
              />
            </div>
          </div>

          <SmartMoney chain={detail.chainId} address={detail.address} />
        </div>

        {/* Stats sidebar */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Liquidity" value={compactUsd(detail.liquidityUsd)} />
            <Stat label="Volume 24h" value={compactUsd(detail.volume24h)} />
            <Stat label="Market cap" value={compactUsd(detail.marketCap)} />
            <Stat label="FDV" value={compactUsd(detail.fdv)} />
            <Stat label="Vol 6h" value={compactUsd(detail.volume6h)} />
            <Stat label="Pair age" value={ageFromMs(detail.pairCreatedAt)} />
          </div>

          {/* Buy/sell pressure */}
          <div className="rounded-xl border border-border bg-panel p-3">
            <div className="mb-2 flex justify-between text-xs text-[#9aa0ad]">
              <span className="text-up">{detail.buys24h ?? 0} buys</span>
              <span className="text-down">{detail.sells24h ?? 0} sells</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-down/40">
              <div className="h-full bg-up" style={{ width: `${buyPct}%` }} />
            </div>
            <div className="mt-1 text-center text-[11px] text-[#666c7a]">
              24h trades · {buyPct.toFixed(0)}% buys
            </div>
          </div>

          {detail.narratives.length > 0 && (
            <div className="rounded-xl border border-border bg-panel p-3">
              <div className="mb-2 text-xs uppercase tracking-wider text-[#666c7a]">
                Narratives
              </div>
              <div className="flex flex-wrap gap-1">
                {detail.narratives.map((n) => (
                  <span key={n} className="rounded bg-bg px-2 py-0.5 text-xs text-[#9aa0ad]">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          <LinksBlock title="Links" links={[{ label: "DexScreener", url: detail.url }, ...detail.websites]} />
          {detail.socials.length > 0 && <LinksBlock title="Socials" links={detail.socials} />}

          <div className="rounded-xl border border-border bg-panel p-3 text-[11px] text-[#666c7a]">
            <div className="mb-1 uppercase tracking-wider">Contract</div>
            <div className="break-all font-mono text-[#9aa0ad]">{detail.address}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Change({ label, value }: { label: string; value: number | null }) {
  const up = (value ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-border bg-panel p-2 text-center">
      <div className="text-[11px] uppercase tracking-wider text-[#666c7a]">{label}</div>
      <div className={`text-sm font-medium tabular-nums ${value == null ? "text-[#9aa0ad]" : up ? "text-up" : "text-down"}`}>
        {pct(value)}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-2.5">
      <div className="text-[11px] uppercase tracking-wider text-[#666c7a]">{label}</div>
      <div className="mt-0.5 text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function LinksBlock({ title, links }: { title: string; links: { label: string; url: string }[] }) {
  if (!links.length) return null;
  return (
    <div className="rounded-xl border border-border bg-panel p-3">
      <div className="mb-2 text-xs uppercase tracking-wider text-[#666c7a]">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {links.map((l) => (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border bg-bg px-2 py-1 text-xs capitalize text-[#9aa0ad] hover:border-accent hover:text-white"
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
