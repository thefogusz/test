# Foro App

Foro is a React 19 + Vite application for discovering signals from X and RSS, curating a working feed, researching articles, and generating Thai-first content with AI assistance. The repo also contains a VitePress documentation site and an Express server that proxies external APIs, serves the production app, and exposes persistence and billing endpoints.

## What The App Does

- Home workspace syncs a watchlist-driven feed, applies AI filtering, and respects plan-based card limits.
- Content workspace supports search, source-aware drafting, article reading, and AI-assisted content generation.
- Audience workspace finds accounts and manages source subscriptions.
- Read and Bookmarks workspaces keep saved material and generated articles reusable.
- Pricing workspace manages plan state and Stripe checkout flow.

## Current Product Rules

These behaviors are user-facing contract and should be treated as documentation-critical:

- Home feed card visibility is capped by plan.
  - `Free`: 30 cards
  - `Plus`: 100 cards
- AI filter works on the same visible feed scope the user can currently access.
- Starting a new Home sync clears any active FORO Filter result so fresh feed data is not hidden behind an older filtered view.
- Home sync waits for feed-history hydration before consuming feed quota or starting upstream fetches.
- RSS sync uses durable duplicate suppression during normal sync.
- Clearing the Home feed intentionally resets RSS seen-state.
- Reopening the same RSS article should reuse cached Thai translation when available.
- X discovery and stats refresh are handled as separate concerns.

## Architecture At A Glance

Frontend:

- `src/App.tsx` is the orchestration layer for cross-workspace state.
- `src/components/AppWorkspaceRouter.tsx` switches between `home`, `content`, `read`, `audience`, `bookmarks`, and `pricing`.
- State is persisted through shared persistence hooks and IndexedDB/local storage adapters.

Backend:

- `server/app.cjs` creates the Express app.
- `server.cjs` starts the server.
- `/api/state/:namespace/:key` provides backend persistence when enabled.
- `/api/rss`, `/api/twitter`, `/api/xai`, `/api/tavily/search`, and `/api/article` proxy or normalize upstream integrations.
- `/api/billing/*` handles Stripe checkout session creation and status reads.

Docs:

- `docs/` is a VitePress site.
- docs status, changelog, and draft suggestions are generated from repository state before docs dev/build/preview runs.
- production serving exposes the app at `/test` and docs at `/test/docs`.

## Project Structure

```text
src/                  React app, hooks, services, UI workspaces
server/               Express app, config, store, tests
docs/                 VitePress product and architecture docs
scripts/              Docs-data generators and dev helpers
public/               Static assets
dist/                 Built frontend output
```

## Quick Start

```bash
npm install
npm run dev
```

App URL in local dev:

- Vite app: usually `http://localhost:5173`
- Production-style server: `npm run build && npm run start`, then open `http://localhost:3000/test`

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run app dev flow together with docs data/watch helpers |
| `npm run dev:app` | Run the Vite app only |
| `npm run build` | Build the app and docs site |
| `npm run build:app` | Build the frontend only |
| `npm run start` | Start the Express production server |
| `npm run test` | Run server tests |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emit |
| `npm run docs:dev` | Run the docs site with generated data |
| `npm run docs:build` | Build the docs site |
| `npm run docs:status` | Regenerate documentation status data |
| `npm run docs:changelog` | Regenerate docs changelog data |
| `npm run docs:draft` | Regenerate draft suggestions for docs follow-up |

## Environment Notes

Common environment variables used by the current codebase include:

- `INTERNAL_API_SECRET`
- `VITE_INTERNAL_API_SECRET`
- `TWITTER_API_KEY`
- `XAI_API_KEY`
- `TAVILY_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PLUS_PRICE_ID`
- `STRIPE_CHECKOUT_BASE_URL`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `APP_STATE_STORAGE`
- `APP_STATE_FILE`
- `PORT`

See `server/lib/config.cjs` for the runtime contract and defaults.

## Documentation Workflow

Treat docs as a living product contract, not as optional onboarding material.

- Update matching docs in the same PR when user-facing behavior changes.
- Start with `docs/index.md` for the current docs entry point.
- Use `docs/features/` for behavior-level documentation.
- Use `docs/architecture/` for implementation and system boundaries.
- Use `docs/process/docs-governance.md` for the docs maintenance workflow.
- Run `npm run docs:data` or `npm run docs:build` after behavior changes so generated status, changelog, and draft data stay current.

## Verification

Recommended checks after behavior or docs updates:

```bash
npm run lint
npm run typecheck
npm run test
npm run docs:build
```
