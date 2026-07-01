# Vast Knowledge — On-chain Alpha Radar

A web app for spotting **trending tokens and heating narratives on-chain
before the crowd**. Built web-first (responsive + installable PWA) so you can
research on desktop and glance on mobile.

> Not financial advice. This is a research/monitoring tool — always DYOR.

## What it does (MVP)

- **Trending token screener** — live table of tokens that are being promoted
  and traded right now, ranked by 24h volume, with price changes (1h/24h),
  liquidity, market cap, age, and a "NEW" flag for launches under 24h old.
- **Narrative tracker** — tokens are auto-tagged into narratives (AI, DePIN,
  Memes, Dogs/Cats, RWA, DeFi, Gaming, Politics, …) and aggregated into a
  "heating narratives" strip so you can see which *theme* is pumping, not just
  individual coins. Click a narrative to filter the table.
- **Watchlist** — star tokens to track (stored locally in your browser).
- **Alerts** — set rules (price change 1h/24h, volume surge, new launch) scoped
  to your watchlist, a narrative, or any token. Rules are evaluated in the
  browser on every refresh and fire a **native notification** plus an in-app
  feed. No backend required.
- **Filters** — search, min-liquidity tiers, "fresh launches only", sort by
  volume / price change / liquidity / market cap / newest.
- **Multi-chain ready** — Solana (default), Ethereum, Base, BSC, Arbitrum.
- **Auto-refresh** every 30s.

## Why web-first (and not native mobile yet)

The heavy lifting here is research dashboards — dense tables and charts that
shine on desktop. A responsive web app installs to the home screen as a PWA
and can send push notifications, covering most of the mobile benefit at a
fraction of the cost and with no app-store friction. If it gains traction,
the same React code can be wrapped for native later (React Native / Capacitor).

## Data sources

Currently uses **DexScreener's free public API** (no key required):

- `token-boosts/top` &amp; `token-boosts/latest` — what's being promoted (hype proxy)
- `latest/dex/tokens/{addresses}` — live price/volume/liquidity per token

All calls go through a server route (`/api/tokens`) so we can add API keys,
caching, and rate-limit handling without exposing anything to the browser.

> **Network note:** the server needs outbound access to `api.dexscreener.com`.
> On a normal machine this just works. In sandboxed/CI environments with an
> egress allowlist, add `api.dexscreener.com` to the allowed hosts — otherwise
> the screener will render but show no tokens (it fails gracefully to an empty
> state rather than erroring).

**Upgrade path:** drop in a paid alpha API (Birdeye, Helius, Moralis) for
holder counts, smart-money flows, and richer trending signals. The data layer
in `lib/dexscreener.ts` is isolated to make this a localized change.

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- Tailwind CSS
- Server-side API proxy with edge caching

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build      # production build
npm run typecheck  # type-check only
```

## Project structure

```
app/
  page.tsx              # landing → renders the dashboard
  layout.tsx            # metadata, PWA manifest, viewport
  api/tokens/route.ts   # server proxy: trending tokens + narrative summary
  token/[chain]/[address]/page.tsx  # token detail: live chart, stats, socials
components/
  Dashboard.tsx         # state, chain switcher, auto-refresh
  TokenTable.tsx        # the screener table
  NarrativeStrip.tsx    # narrative heat cards
  Filters.tsx           # search / sort / liquidity / fresh / watchlist
components/
  AlertsPanel.tsx       # alert rule builder + trigger feed (drawer)
lib/
  dexscreener.ts        # DexScreener client + token normalization
  narratives.ts         # keyword-based narrative tagging
  narrativeSummary.ts   # per-narrative aggregation
  watchlist.ts          # localStorage watchlist
  alerts.ts             # alert rules, evaluation, browser notifications
  format.ts             # number/price/age formatting
  types.ts              # shared types
```

## Roadmap ideas

- [x] Price/volume alerts with browser notifications (client-side)
- [ ] Server-side alert evaluation + web-push (fire when no tab is open)
- [ ] Smart-money / whale wallet tracking (needs a paid API)
- [x] Token detail page with embedded chart and recent trades
- [ ] Holder growth & distribution metrics
- [ ] LLM-based narrative classification (replace keyword tagging)
- [ ] Wallet connect for a personalized "my bags vs. the market" view
