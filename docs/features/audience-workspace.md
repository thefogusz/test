# Audience Workspace

## Goal

Audience Workspace helps the user discover who to watch next and move those targets into watchlist management with minimal friction.

It supports three discovery modes:

- AI-driven target discovery
- manual account lookup
- RSS/news-source browsing

## Current Product Rules

### AI recommendation cards

- AI recommendation cards should read like guided recommendations, not raw account dumps.
- Each recommendation should include a meaningful explanation of why the person is relevant.
- The explanation should be understandable to a Thai-speaking product user.

### Thai recommendation fallback

- If upstream reasoning is weak, generic, or not usable as Thai recommendation copy, the UI generates a Thai fallback explanation.
- The fallback should still anchor the recommendation in the active search topic.

### Recommendation card layout

- Recommendation cards should prioritize clarity over density.
- The recommendation reason should be visually prominent, not tiny text lost in the middle of the card.
- The profile block, topic hint, credibility signals, and add-to-watchlist action should feel like one deliberate recommendation card.

### Watchlist actions

- Adding a recommended account to watchlist must still respect plan and capacity rules.
- Audience discovery is not allowed to bypass shared watchlist limits.

## Main User Flow

1. The user opens Audience Workspace.
2. The user chooses AI, manual, or source discovery.
3. The system returns account or source candidates.
4. The user reviews recommendation context.
5. The user adds relevant accounts or sources to the next monitoring workflow.

## Important Edge Cases

### Weak AI reasoning

- If the upstream reasoning is not presentable, the app must still show a clear Thai recommendation summary.
- The card should never collapse into just account metadata without explaining why the person matters.

### Mixed identity formats

- Audience results can come from different lookup modes.
- The add-to-watchlist action must preserve the same semantics regardless of whether the candidate came from AI search or manual search.

## File Ownership

- `src/components/AudienceWorkspace.tsx`
- `src/hooks/useAudienceSearch.ts`
- `src/hooks/useWatchlist.ts`

## When This Doc Must Be Updated

Update this page whenever a change affects:

- AI recommendation-card copy
- audience-card layout or hierarchy
- add-to-watchlist gating
- the relationship between AI/manual/source tabs

## Change Log

- 2026-04-12: documented Thai fallback reasoning and redesigned recommendation-card expectations for AI audience discovery
