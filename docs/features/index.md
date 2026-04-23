# Feature Docs Index

This section is the product source of truth for user-visible behavior.

Use these pages when you need to answer:

- What should a workspace do right now?
- Which rules are intentional product rules?
- Which source files own the behavior?
- What should not regress?

## Current Priorities

These feature areas are the most important to keep aligned with source:

- [Home Feed](/features/home-feed)
- [App Shell](/features/app-shell)
- [Content Workspace](/features/content-workspace)
- [Audience Workspace](/features/audience-workspace)
- [Bookmarks Workspace](/features/bookmarks-workspace)
- [Read Workspace](/features/read-workspace)
- [Pricing Workspace](/features/pricing-workspace)
- [News Sources](/features/news-sources)

## Cross-Feature Rules

Some current product rules affect multiple workspaces at once:

- Home feed visibility is capped by plan.
  - `Free`: 30 cards
  - `Plus`: 100 cards
- AI filter scope must match the feed cards the user can actually see.
- Starting a Home sync should exit stale FORO Filter state before presenting refreshed feed data.
- Home sync should not consume feed quota until durable feed-history state has hydrated.
- RSS normal sync should suppress duplicates durably.
- Clearing the Home feed intentionally resets RSS seen-state.
- Article reader should reuse cached Thai translation for repeated RSS reads when possible.
- Audience recommendations should remain actionable and readable, not just raw handles.

## Using These Docs In PRs

If a PR changes any of the following, update the corresponding feature page in the same PR:

- visible behavior
- business rules
- plan limits
- loading or empty states
- error handling the user can see
- integration expectations that shape UX

## Related Pages

- [Docs Governance](/process/docs-governance)
- [Architecture Overview](/architecture/overview)
- [Docs Status](/status/)
