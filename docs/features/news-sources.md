# News Sources

## Purpose

The News Sources feature lets users browse supported RSS sources, filter them by topic or language context, and subscribe sources into their working set.

## Current Behavior

- Implemented in `NewsSourcesTab`.
- Uses the shared RSS catalog as the canonical source registry.
- Supports topic grouping, language-specific featured ordering, and subscription toggling.
- Can also bridge RSS sources into post lists through list member toggling when that action is supplied by the parent view.

## User Flow

1. User opens the News Sources area.
2. User browses featured or topic-based source groups.
3. User subscribes or unsubscribes sources.
4. User optionally adds a source into a post list context.

## Core Rules

- RSS catalog data is the source of truth for available providers and normalized source metadata.
- Featured ordering differs between English and Thai source sets.
- Subscription state is persistent and should survive reloads.
- Source toggle actions must be reversible by repeating the same action.

## UI States

- Catalog browsing: cards and topic filters visible.
- Filtered list: only matching sources shown.
- Empty state: no sources match current filter.
- List assignment menu: source can be attached to one or more post lists.

## Main Files

- `src/components/NewsSourcesTab.tsx`
- `src/config/rssCatalog.ts`
- `src/App.tsx`
- `src/hooks/usePostLists.ts`

## Dependencies

- Persistent subscribed source state
- Post list membership state
- RSS catalog metadata and topic labels

## Out of Scope

- Feed ranking logic after source content has already been fetched
- AI content generation
- Billing and plan gating

## Change Log

- 2026-04-09: Added living feature documentation baseline.
