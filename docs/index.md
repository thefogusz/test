# Start Here

This docs site is the fastest way to understand how Foro behaves right now.

If you are new to the repo, use this order:

1. `src/main.tsx`
2. `src/App.tsx`
3. [Feature Docs](/features/)
4. [Feed and Search Architecture](/architecture/feed-search)
5. [Cost Analysis](/cost-analysis)

## Current Product Snapshot

The most important current product rules are:

- Home feed is plan-capped:
  - `Free`: 30 cards
  - `Plus`: 100 cards
- AI filter runs on the same visible Home scope as the current plan allows.
- RSS uses durable duplicate suppression during normal sync.
- Clearing Home feed intentionally resets RSS history, so older RSS items may appear again after a clear.
- X sync separates new-post discovery from visible-card stat refresh.
- Reopening the same RSS article should reuse cached Thai translation.
- Audience recommendation cards should present Thai recommendation reasoning clearly.

## Where To Look By Topic

- Home sync, RSS/X feed behavior:
  - [Home Feed](/features/home-feed)
  - [Feed and Search Architecture](/architecture/feed-search)
- Content creation and reader behavior:
  - [Content Workspace](/features/content-workspace)
- Audience discovery behavior:
  - [Audience Workspace](/features/audience-workspace)
- Plan limits and upgrade surface:
  - [Pricing Workspace](/features/pricing-workspace)
- Billing and provider cost tradeoffs:
  - [Cost Analysis](/cost-analysis)

## Why These Docs Matter

Use docs pages as product truth, not just as onboarding notes.

When behavior changes in code, the matching docs page should change in the same commit or PR so the team can understand the system without reverse-engineering it from chat history.
