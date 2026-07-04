import Link from "next/link";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="" className="h-8 w-8" />
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Vast Knowledge
            </h1>
            <span className="rounded-full border border-border bg-panel px-2 py-0.5 text-xs text-[#9aa0ad]">
              On-chain Alpha Radar
            </span>
          </div>
          <p className="text-sm text-[#9aa0ad]">
            Trending tokens &amp; heating narratives — stay ahead of the crowd.
          </p>
        </div>
        <Link
          href="/wallets"
          className="rounded-lg border border-border bg-panel px-3 py-1.5 text-sm text-[#9aa0ad] hover:text-white"
        >
          🐋 Smart Money Feed
        </Link>
      </header>
      <Dashboard />
    </main>
  );
}
