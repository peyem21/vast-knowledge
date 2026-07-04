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
- **Smart money / whale tracking** — on each token's page: top holders, supply
  concentration (with a ⚠ flag when the top 10 hold >50%), and recent whale
  trades (>$1K, buy/sell). Powered by a pluggable provider (Birdeye); shows a
  setup hint until a key is added.
- **Smart Money Feed** (`/wallets`) — track a personal list of wallets and see
  which tokens they're buying, **ranked by how many distinct wallets are piling
  into the same token** (the real conviction signal), with net USD flow. Wallet
  list is local to your browser; the feed is aggregated server-side.
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

**Smart money (optional):** the token detail page also pulls **top holders,
supply concentration, and whale trades** from **Birdeye** when a
`BIRDEYE_API_KEY` is set. It's behind a provider interface
(`lib/smartmoney/provider.ts`) so you can swap in Helius/Nansen/etc. Without a
key the panel shows a setup hint — nothing breaks.

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

## Background push alerts (fire when the app is closed)

Client-side alerts only fire while a tab is open. For alerts that reach you
with nothing open, the app also ships a **server-side evaluation + Web Push**
pipeline. It's off until you provide keys.

**Setup:**

1. Generate a VAPID keypair:
   ```bash
   npm run generate:vapid
   ```
2. Copy `.env.example` → `.env` and paste in the printed values, plus a random
   `CRON_SECRET` (any long string) and a `VAPID_SUBJECT` (your `mailto:`).
3. Run the app. Open **🔔 Alerts → Background push → Turn on** and accept the
   notification prompt. Your device's subscription + rules are stored server-side.
4. A scheduled job (`GET /api/cron/evaluate`, protected by `CRON_SECRET`)
   evaluates all rules and pushes new events. Locally you can trigger it:
   ```bash
   curl "http://localhost:3000/api/cron/evaluate?secret=$CRON_SECRET"
   ```

**Deploying (Vercel):** `vercel.json` already schedules the cron every 2
minutes; Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. Add
all env vars in the project settings. **Important:** the default push store is
file-backed (`lib/push/store.ts`), which does **not** persist on serverless —
implement the small `PushStore` interface against **Vercel KV / Upstash /
Postgres** and return it from `getStore()`. Nothing else changes.

## Project structure

```
app/
  page.tsx              # landing → renders the dashboard
  layout.tsx            # metadata, PWA manifest, viewport
  api/tokens/route.ts   # server proxy: trending tokens + narrative summary
  api/push/subscribe/   # register a device's push subscription + rules
  api/push/unsubscribe/ # remove a device's subscription
  api/cron/evaluate/    # scheduled: evaluate rules + send web-push
  api/smart-money/      # top holders + whale trades (via provider)
  api/smart-money/feed/ # aggregate tracked-wallet activity by token
  token/[chain]/[address]/page.tsx  # token detail: live chart, stats, socials
  wallets/page.tsx      # Smart Money Feed: manage wallets + who's-buying-what
components/
  Dashboard.tsx         # state, chain switcher, auto-refresh, push wiring
  TokenTable.tsx        # the screener table
  NarrativeStrip.tsx    # narrative heat cards
  Filters.tsx           # search / sort / liquidity / fresh / watchlist
  AlertsPanel.tsx       # alert rule builder + push toggle + trigger feed
lib/
  dexscreener.ts        # DexScreener client + token normalization
  narratives.ts         # keyword-based narrative tagging
  narrativeSummary.ts   # per-narrative aggregation
  watchlist.ts          # localStorage watchlist
  alertRules.ts         # pure alert model + evaluation (shared client/server)
  alerts.ts             # client: rule storage + browser notifications
  push/                 # server push: store, web-push, evaluate, client helpers
  smartmoney/           # provider interface + Birdeye; feed aggregation; wallets
  format.ts             # number/price/age formatting
  types.ts              # shared types
public/
  sw.js                 # service worker (receives push, opens token page)
```

## Roadmap ideas

- [x] Price/volume alerts with browser notifications (client-side)
- [x] Server-side alert evaluation + web-push (fire when no tab is open)
- [ ] Production push store (Vercel KV / Postgres) + user accounts
- [x] Smart-money / whale tracking on token page (Birdeye: holders + trades)
- [x] Track smart-money wallets → aggregated "who's buying what" feed
- [ ] Auto-discover smart wallets (top holders of past winners) instead of manual
- [x] Token detail page with embedded chart and recent trades
- [ ] Holder growth & distribution metrics
- [ ] LLM-based narrative classification (replace keyword tagging)
- [ ] Wallet connect for a personalized "my bags vs. the market" view
