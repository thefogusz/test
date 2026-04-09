# Content Workspace

## Purpose

The Content Workspace is where users search, review source material, and generate publishable content from selected research and article inputs.

## Current Behavior

- Opens under `activeView = "content"` and uses `contentTab` to switch between search and create modes.
- Search mode collects and filters source material before generation.
- Create mode uses attached sources, prompts, and AI generation flows to produce structured content.
- The workspace shares state with summaries, article reader modal, lists, and saved source attachments.

## User Flow

1. User enters the Content Workspace.
2. User searches for topics or reviews prepared source material.
3. User opens an item for deeper reading when needed.
4. User moves to create mode and generates content from selected context.

## Core Rules

- Search and creation are separate but connected tabs; switching tabs should not lose intentional user context.
- Attached source state is persisted so users can continue drafting after navigation or refresh.
- AI generation should respect the current plan and usage gating from billing.
- Search summaries and generated drafts must reflect the current selection, not stale prior results.

## UI States

- Loading: search or generation is in progress.
- Search Results: matching items and summary blocks are visible.
- Empty Search: no results found for the current query.
- Create Draft: source context is attached and generation controls are available.
- Error: surfaced through status messaging and guarded UI states.

## Main Files

- `src/App.tsx`
- `src/components/ContentWorkspace.tsx`
- `src/components/CreateContent.tsx`
- `src/components/ArticleReaderModal.tsx`
- `src/hooks/useSearchWorkspace.ts`
- `src/services/GrokService.ts`

## Dependencies

- Billing usage checks
- Search orchestration hooks
- AI generation services
- Stored source attachments

## Out of Scope

- Watchlist feed sync behavior
- Pricing plan management UI
- RSS source subscription browsing

## Change Log

- 2026-04-09: Added living feature documentation baseline.
