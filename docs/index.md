# Start Here

This page is the fastest way to understand the current Foro system without reverse-engineering old PRs or chat logs.

Use it when you need to answer:

- What does the app do right now?
- Which workspaces are active?
- Where should I read next for feature behavior?
- Which docs are product contract versus deeper implementation notes?

## Recommended Reading Order

1. `src/main.tsx`
2. `src/App.tsx`
3. [Getting Started](/getting-started)
4. [Feature Docs](/features/)
5. [Architecture Overview](/architecture/overview)
6. [UX/UI README](/ux-ui-readme)

## Current Product Snapshot

Foro currently ships six top-level workspaces:

- `home`
- `content`
- `read`
- `audience`
- `bookmarks`
- `pricing`

Supporting behavior that matters across the app:

- Home feed visibility is capped by plan.
  - `Free`: 30 cards
  - `Plus`: 100 cards
- AI filter operates on the visible feed scope, not on hidden overflow.
- Starting a new Home sync clears any stale FORO Filter result before showing the latest feed.
- Home sync waits for durable feed-history hydration before it can consume feed quota.
- RSS duplicate suppression is durable during normal sync.
- Clearing the feed intentionally resets RSS seen-state.
- Article reading supports readable extraction and cached Thai translation reuse.
- Billing uses Stripe-backed checkout APIs from the Express server.
- Docs data is generated before docs dev/build/preview so status and changelog pages stay fresh.

## Read By Topic

- App behavior and workspace contract
  - [Feature Docs](/features/)
- High-level system boundaries
  - [Architecture Overview](/architecture/overview)
- Frontend composition and state flow
  - [Frontend Architecture](/architecture/frontend)
- Feed, search, and research flow
  - [Feed Search Architecture](/architecture/feed-search)
- AI generation and research pipeline
  - [AI Pipeline](/architecture/ai-pipeline)
- Upstream services and providers
  - [API Integrations](/api-integrations)
- UI intent and interaction language
  - [UX/UI README](/ux-ui-readme)

## Docs Categories

- `docs/features/`
  - user-visible behavior and feature rules
- `docs/architecture/`
  - system design, boundaries, and internal flows
- `docs/process/`
  - templates and docs governance
- `docs/status/`
  - generated status view showing where docs may trail source changes
- `docs/changelog/`
  - generated change timeline
- `docs/drafts/`
  - generated docs follow-up suggestions

## Maintenance Rule

If a change updates user-facing behavior, plan limits, loading states, error states, or integration expectations, update the relevant docs in the same PR.
