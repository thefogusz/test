# Audience Workspace

## Purpose

The Audience Workspace helps users discover accounts, experts, or audience segments worth tracking, then add those results into the watchlist flow.

## Current Behavior

- Opens under `activeView = "audience"`.
- Supports AI-assisted audience search and manual search paths.
- Returns results that can be added directly to the watchlist when plan limits allow.
- Shares watchlist capacity rules with the broader app.

## User Flow

1. User enters the Audience Workspace.
2. User runs AI search or manual search.
3. User reviews returned accounts or audience suggestions.
4. User adds selected results into the watchlist.

## Core Rules

- Watchlist capacity and plan rules apply before an account can be added.
- AI search and manual search should remain distinct enough for debugging and analytics.
- Audience search result actions should use the same add-to-watchlist semantics as other app entry points.

## UI States

- Idle: no search yet.
- Loading: AI or manual search in progress.
- Results: audience cards are visible and actionable.
- Empty: no audience results found.
- Error: surfaced via status messaging or guarded UI states.

## Main Files

- `src/App.tsx`
- `src/components/AudienceWorkspace.tsx`
- `src/hooks/useAudienceSearch.ts`
- `src/hooks/useWatchlist.ts`

## Dependencies

- Billing and watchlist capacity checks
- Audience search hooks and provider integrations
- Shared watchlist state

## Out of Scope

- Home feed rendering
- RSS source subscriptions
- Content generation workflow

## Change Log

- 2026-04-09: Added living feature documentation baseline.
