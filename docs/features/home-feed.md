# Home Feed

## Goal

Home Feed is the primary monitoring workspace in Foro. It should answer one question quickly:

`What changed across the sources I care about, and which items deserve attention right now?`

The Home experience is responsible for:

- syncing X posts from the active watchlist or selected post list
- syncing RSS items from subscribed sources
- deduplicating items so the feed stays readable and cost-efficient
- letting the user sort, filter, open, bookmark, or send a source into content creation
- running AI filter across the visible feed set for the current plan

## Current Product Rules

### Feed composition

- Home can contain both X cards and RSS cards.
- The active post list changes which watchlist handles and RSS sources are in scope.
- Card rendering is handled in the Home view, while orchestration lives in `src/hooks/useHomeFeedWorkspace.ts`.

### Plan-based Home limits

- Home now has a hard visible-card ceiling per plan:
  - `Free`: 30 cards
  - `Plus`: 100 cards
- `Load more` stops once the plan ceiling is reached.
- AI filter uses the same visible-card scope. It does not run on a hidden larger set.

### RSS duplicate policy

- RSS items use a stable RSS fingerprint to identify repeats.
- During normal sync, an item already seen from the same RSS source should not come back as a new card.
- This protects the user from re-reading old articles and protects the system from repeated translation and AI work.

### RSS clear behavior

- `Clear feed` is an intentional reset for RSS history.
- Clearing Home feed also clears the RSS seen registry.
- After that reset, older RSS items are allowed to appear again on the next sync.

### X sync policy

- X feed is optimized for two separate jobs:
  - discover newly published posts
  - refresh stats for cards already visible on Home
- New-candidate discovery uses checkpoint-based advanced search.
- Engagement refresh for existing cards uses tweet-id lookups for visible cards only.
- If an incoming X post already exists in the feed, the system should update the existing card rather than create a new one.

### X clear behavior

- Clearing Home feed does not reset X checkpoints or X seen state.
- This is intentional so a post-clear sync focuses on newly discovered items instead of paying to reprocess old cards that are no longer visible.

### Post list filtering

- Post-list membership is normalized for both X handles and RSS source ids.
- This prevents false empty states where a selected post list appears empty only because the stored key shape differs.

## Main User Flow

1. The user opens Home.
2. The user syncs feed data for the active watchlist or post list.
3. The system merges incoming X and RSS items into the current feed state.
4. The user can sort, bookmark, open a reader, or attach a source to content creation.
5. The user can run AI filter against the visible feed for the current plan.
6. The user can clear the feed, with RSS and X using different reset semantics as described above.

## AI Filter Contract

- AI filter should feel like an analysis layer on top of Home, not a separate data source.
- It must evaluate the exact visible feed set the user is currently allowed to work with.
- If the visible feed is capped by plan, the AI filter must respect that same cap.
- AI filter results should preserve citations, reasoning context, and card traceability.

## Important Edge Cases

### User clears feed

- RSS history resets and old RSS items may reappear.
- X history does not reset and the next X sync remains cost-aware.

### User selects a post list

- Feed scope must reflect the selected post list consistently for both X and RSS.
- If the list has matching sources, Home must not show a false empty state caused by inconsistent normalization.

### User keeps syncing without clearing

- RSS should continue to suppress old items from the same source.
- X should continue to discover new posts and refresh stats for visible cards without turning old posts into newly added cards.

## File Ownership

- `src/App.tsx`
- `src/components/HomeView.tsx`
- `src/hooks/useHomeFeedWorkspace.ts`
- `src/services/RssService.ts`
- `src/services/TwitterService.ts`
- `src/utils/appUtils.ts`

## When This Doc Must Be Updated

Update this page whenever a change affects:

- sync behavior
- dedupe behavior
- clear/reset behavior
- plan-based card limits
- AI filter scope
- post-list feed membership semantics

## Change Log

- 2026-04-12: documented durable RSS dedupe, RSS reset-on-clear behavior, X checkpoint plus visible-card stat refresh flow, post-list normalization fixes, and Home plan caps (`Free 30 / Plus 100`)
