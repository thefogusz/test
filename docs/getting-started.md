# Getting Started

This guide is for developers opening the repo for the first time and wanting an accurate picture of the current system quickly.

## Fastest Orientation Path

Read these files in order:

1. `src/main.tsx`
2. `src/App.tsx`
3. `src/components/AppWorkspaceRouter.tsx`
4. `src/hooks/useHomeFeedWorkspace.ts`
5. `src/hooks/useSearchWorkspace.ts`
6. `server/app.cjs`

That path gives you the app entrypoint, workspace routing, the two biggest interaction flows, and the server boundary.

## Mental Model

Foro is one app that combines several workflows:

- collect signal from watchlists and subscribed RSS sources
- research and read content through a normalized article pipeline
- search and summarize posts with AI assistance
- generate Thai-first content from prompts or attached sources
- persist user state locally or through backend state APIs

In simple terms:

```text
React UI
  -> hooks orchestrate workspace behavior
  -> services call internal API routes
  -> Express server proxies upstream providers or stores state
  -> results return to persisted app state
  -> UI renders per workspace
```

## Workspaces

The active app shell routes between:

- `home`
- `content`
- `read`
- `audience`
- `bookmarks`
- `pricing`

Most cross-workspace state is coordinated in `src/App.tsx`.

## Frontend Notes

- Persistence uses shared hooks such as `usePersistentState` and `useIndexedDbState`.
- `AppWorkspaceRouter.tsx` lazy-loads most workspaces.
- UI history is mirrored into browser history state so back/forward navigation restores workspace state.
- Home feed, search, bookmarks, read archive, lists, watchlist, and attached content sources are all part of the main application state graph.

## Server Notes

The Express app currently provides:

- state storage APIs at `/api/state/:namespace/:key`
- RSS proxying at `/api/rss`
- X/Twitter upstream proxying at `/api/twitter/*`
- xAI proxying at `/api/xai/*`
- Tavily search proxying at `/api/tavily/search`
- article extraction at `/api/article`
- Stripe checkout APIs at `/api/billing/*`
- static serving for `/test` and `/test/docs`

The main implementation entrypoint is `server/app.cjs`. `server.cjs` only starts the server.

## Docs Workflow

Before docs dev/build/preview, the repo generates:

- docs status data
- docs changelog data
- docs draft suggestions

That means these commands are the normal docs workflow:

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

## Useful Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run docs:status
```

## What To Read Next

- [Features Index](/features/)
- [Architecture Overview](/architecture/overview)
- [Frontend Architecture](/architecture/frontend)
- [Feed Search Architecture](/architecture/feed-search)
- [AI Pipeline](/architecture/ai-pipeline)
