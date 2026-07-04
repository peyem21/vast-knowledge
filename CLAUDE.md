# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev         # dev server at localhost:3000
npm run build       # production build (also type-checks)
npm run typecheck   # tsc --noEmit only
npm run generate:vapid   # prints a fresh VAPID keypair for push alerts (see Environment)
```

There is no test suite and no lint script configured beyond `next lint` (not wired into `npm run lint` as a CI gate). Verify changes with `npm run typecheck` and `npm run build`; both must pass clean before considering a change done.

To exercise an API route manually against a running dev/start server:
```bash
curl "http://localhost:3000/api/tokens?chain=solana"
curl "http://localhost:3000/api/smart-money?chain=solana&address=<mint>"
curl "http://localhost:3000/api/cron/evaluate?secret=$CRON_SECRET"
```

## Environment

Copy `.env.example` to `.env`. Every integration degrades gracefully when its key is absent (empty data / a "not configured" state in the UI) rather than erroring, so the app runs with zero env vars — treat "missing key ⇒ graceful empty state, never a crash" as the standard when adding new external integrations.

- `BIRDEYE_API_KEY` — enables everything under `lib/smartmoney/` (holders, whale trades, wallet feed, discovery). Without it, `getSmartMoneyProvider()` returns `NullProvider` and routes report `configured: false`.
- `VAPID_PUBLIC_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — enables Web Push (background alerts). Generate with `npm run generate:vapid`.
- `CRON_SECRET` — protects `GET /api/cron/evaluate`. Vercel Cron sends it as `Authorization: Bearer $CRON_SECRET` automatically (see `vercel.json`); locally, pass `?secret=`.

**Network dependency to be aware of:** the app calls `api.dexscreener.com` (no key) and, when configured, `public-api.birdeye.so`. In network-sandboxed environments (including some CI/agent sandboxes) these hosts may be egress-blocked — the screener/smart-money panels will render but stay empty. This is an environment limitation, not a bug; don't "fix" it by adding error UI, the graceful-empty-state already handles it.

## Architecture

### Data flow: server-proxied, never direct-from-browser

The browser never calls DexScreener or Birdeye directly. Every external call goes through a Next.js route handler under `app/api/`, which the client fetches instead. This exists so API keys stay server-side and so responses can be cached (`revalidate` / `s-maxage`) across all users of one deployment. When adding a new external data source, follow this pattern: a `lib/` client module that talks to the vendor, wrapped by an `app/api/.../route.ts` that the client fetches — do not fetch third-party APIs from client components.

### The provider pattern (`lib/smartmoney/`)

`lib/smartmoney/provider.ts` defines a `SmartMoneyProvider` interface (`getSmartMoney`, `getWalletActivity`). `lib/smartmoney/birdeye.ts` implements it against Birdeye; `NullProvider` (same file as the interface) is the zero-config fallback. `lib/smartmoney/index.ts#getSmartMoneyProvider()` is the single place that decides which implementation is active (currently: Birdeye if `BIRDEYE_API_KEY` is set, else Null). To add another data vendor (Helius, Nansen, etc.), implement the interface and switch it in that one function — routes and UI components never reference Birdeye directly.

Three features are layered on top of this one interface, in `lib/smartmoney/`:
- `types.ts` — shared shapes (`Holder`, `WhaleTrade`, `SmartMoneyData`).
- `feed.ts` — `buildFeed()`, pure aggregation of one user's tracked-wallet trades grouped by token, ranked by **distinct buyer count** (not raw volume) — this ranking choice is the point of the feature, don't "simplify" it to a volume sort.
- `discover.ts` — `discoverWallets()`, pure cross-referencing of holder lists across several winning tokens to find wallets that repeat across ≥2 winners. Both `feed.ts` and `discover.ts` are plain functions with no I/O, deliberately kept testable/side-effect-free; the `app/api/smart-money/*` routes do the fetching and call into them.
- `wallets.ts` — client-only localStorage CRUD for the user's tracked-wallet list (mirrors `lib/watchlist.ts`'s pattern).

### Alerts: one rule engine, two runtimes

`lib/alertRules.ts` is a pure, environment-agnostic module (`AlertRule`, `collectEvents()`) with no DOM and no storage — it is imported by both:
- the browser (`lib/alerts.ts`, `"use client"`): localStorage rule storage, evaluates against each 30s poll, fires `Notification` API directly.
- the server (`lib/push/evaluate.ts` → `app/api/cron/evaluate/route.ts`): re-evaluates the same rules for every subscribed device via `web-push`, so alerts fire with no tab open.

When changing rule-matching logic (thresholds, new metric types, cooldown behavior), edit `alertRules.ts` only — both runtimes pick it up. Don't duplicate matching logic into `lib/alerts.ts` or `lib/push/evaluate.ts`.

### Push subscription storage is the one deliberately-incomplete piece

`lib/push/store.ts` defines `PushStore` and ships a `FileStore` (JSON file under `.data/`) as the only implementation. This works for local dev and single-instance hosting but **does not persist on serverless** (Vercel's filesystem is ephemeral/read-only). Moving to production on Vercel requires implementing `PushStore` against Vercel KV/Upstash/Postgres and swapping it in `getStore()` — everything else (routes, cron, client sync) is already written against the interface and needs no changes.

### Chain identifiers are DexScreener's chain IDs

Chain values flowing through the app (`"solana"`, `"ethereum"`, `"base"`, `"bsc"`, `"arbitrum"`) are DexScreener's `chainId` strings, used as-is in URLs, API params, and as keys into `EXPLORERS` (in `components/SmartMoney.tsx`) for building block-explorer links. Adding a new chain means adding it to the chain-switcher arrays (`Dashboard.tsx`, `app/wallets/page.tsx`) and to `EXPLORERS`, not inventing a separate internal chain enum.

### Narrative tagging is intentionally simple keyword matching

`lib/narratives.ts` tags tokens by regex-matching keywords in name/symbol/description against a static `NARRATIVE_KEYWORDS` map. This is a known-crude placeholder (see README roadmap: "LLM-based narrative classification") — don't over-engineer this file; the intended upgrade path is to replace the whole matching strategy, not to keep growing the keyword lists indefinitely.
