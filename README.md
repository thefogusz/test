# Foro App

React + Vite application with an Express edge server for API proxying, AI integration, and state persistence.

## UI Design Guide

Use `DESIGN.md` as the UI source of truth before changing FORO screens, components, or styling. It captures the current dark command-center direction, color tokens, typography, component rules, responsive behavior, and agent prompts for keeping future UI work on-brand.

## Product Docs

Use the VitePress docs in `docs/` as the living source of truth for product behavior and architecture.

- Feature behavior lives in `docs/features/`
- Product tradeoffs live in `docs/decisions/`
- Docs workflow lives in `docs/process/docs-governance.md`

When a PR changes user-facing behavior, business rules, workflow steps, or UI states, update the matching docs page in the same PR.

แนวคิดนี้มีไว้เพื่อให้ทีม dev เปิด docs แล้วเข้าใจ "ของที่ระบบทำจริงตอนนี้" ได้โดยไม่ต้องไล่หา context จากแชตหรือ PR เก่า

### Docs status dashboard

Use the docs status generator to see which feature docs are current, which ones are behind source changes, and which app views still need coverage.

```bash
npm run docs:status
```

The dashboard is rendered at `/status/` inside the VitePress site and is regenerated automatically before `docs:dev`, `docs:build`, and `docs:preview`.

### Docs changelog and draft suggestions

The docs site also includes:

- `/changelog/` for a readable timeline of tracked feature changes from Git
- `/drafts/` for suggested docs follow-up based on the current branch or working tree

These are generated automatically together with the docs site.

### Serving docs with the app

Production builds now include both the app and the docs site. The Express server serves the app at `/test` and Foro Docs at `/test/docs/`.

If you need the in-app "Foro Docs" button to point somewhere else, set `VITE_FORO_DOCS_URL`.

## What Changed

This codebase now supports two persistence modes:

- `browser`
  Uses `localStorage` for lightweight UI preferences and IndexedDB for larger cached collections.
- `backend`
  Routes the same app state through Express state APIs so the frontend is no longer hard-coupled to browser-only storage.

The frontend state hooks now use a shared persistence adapter instead of calling `localStorage` and IndexedDB directly. That makes it possible to move to a real backend store without rewriting feature code.

## Architecture

- `src/hooks/usePersistentState.ts`
  UI-oriented persisted state backed by the persistence adapter.
- `src/hooks/useIndexedDbState.ts`
  Durable collection state backed by the same adapter.
- `src/lib/persistence/client.ts`
  Frontend persistence driver selector and read/write/delete contract.
- `server.cjs`
  Express server with proxy routes plus backend state APIs.
- `server/lib/appStateStore.cjs`
  Server-side store abstraction. Current implementations: `file`, `memory`.
- `server/lib/config.cjs`
  Environment loading and runtime configuration.

## Persistence Modes

### 1. Browser Mode

Default mode. No extra setup needed.

```env
VITE_APP_PERSISTENCE_DRIVER=browser
```

Behavior:

- Lightweight state is stored in `localStorage`
- Large collections are stored in IndexedDB
- Existing browser data keeps working as before

### 2. Backend Mode

Use this when you want the UI designed around backend persistence rather than browser-only state.

```env
VITE_APP_PERSISTENCE_DRIVER=backend
VITE_APP_STATE_NAMESPACE=foro-dev
INTERNAL_API_SECRET=your-internal-token
VITE_INTERNAL_API_SECRET=your-internal-token
APP_STATE_STORAGE=file
APP_STATE_FILE=.data/app-state.json
```

Behavior:

- Frontend reads and writes app state through `/api/state/:namespace/:key`
- Existing browser state is used as the migration source when backend state is empty
- Feature code does not need to know whether storage is local or remote

## Server State API

These endpoints are used by the frontend when `VITE_APP_PERSISTENCE_DRIVER=backend`.

- `GET /api/state/:namespace/:key`
- `PUT /api/state/:namespace/:key`
- `DELETE /api/state/:namespace/:key`

Current store implementations:

- `APP_STATE_STORAGE=file`
  Persists app state to a JSON file on the server.
- `APP_STATE_STORAGE=memory`
  Keeps app state in memory only.

For real production at scale, replace the file/memory store behind `server/lib/appStateStore.cjs` with a database-backed implementation. The frontend contract can remain unchanged.

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run start
```

## Quality Checks

```bash
npm run typecheck
npm run lint
npm run docs:build
```
