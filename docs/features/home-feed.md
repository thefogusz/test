# Home Feed

## Purpose

The Home Feed is the default workspace. It gives users a fast, scannable watchlist-driven stream of posts, plus AI-assisted filtering and summary generation for the current feed selection.

## Current Behavior

- Opens by default through `activeView = "home"` in `src/App.tsx`.
- Renders the main feed via `HomeView` and `FeedCard`.
- Uses persisted watchlist, post lists, and subscribed sources to decide what content should appear.
- Supports sync, sort toggles, AI quick filters, custom AI filter prompts, bookmark actions, and article drill-in.
- Keeps read/archive-related state outside this screen, but can hand off articles into reader and content creation flows.

## User Flow

1. User lands on Home.
2. User syncs or refreshes the feed.
3. User scans cards, sorts by engagement/view, or applies AI filters.
4. User opens an article, bookmarks it, or sends a source into content creation.

## Core Rules

- The Home Feed is list-context aware. If a post list is active, the feed reflects that list context.
- AI filter presets are persistent and should survive reloads.
- Sync and filter actions should preserve stable UI feedback through loading and status messages.
- Deleting feed items is reversible through undo until the local session state is replaced.

## UI States

- Loading: sync in progress or feed bootstrapping.
- Success: cards render with sort/filter controls.
- Empty: no feed items available yet for the selected context.
- Filtered: AI summary and filtered-result indicators are visible.
- Error: handled through status messaging and the content error boundary pattern.

## Main Files

- `src/App.tsx`
- `src/components/HomeView.tsx`
- `src/components/FeedCard.tsx`
- `src/hooks/useHomeFeedWorkspace.ts`
- `src/hooks/usePostLists.ts`
- `src/hooks/useWatchlist.ts`

## Dependencies

- Persistent storage via `usePersistentState` and `useIndexedDbState`
- Feed fetching and normalization services
- Post list membership state
- AI filter modal and summary generation flow

## Out of Scope

- Pricing and plan selection
- Audience search
- News source subscription management

## Change Log

- 2026-04-09: Added living feature documentation baseline.
