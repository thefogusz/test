# Feature Docs

Feature pages are the product source of truth for user-visible behavior in Foro.

Use them to answer:

- what the feature is supposed to do right now
- which rules are intentional product rules
- which files own the behavior
- which edge cases must not regress

## Recently Important Pages

These pages are especially important for the current product behavior:

- [Home Feed](/features/home-feed)
- [Content Workspace](/features/content-workspace)
- [Audience Workspace](/features/audience-workspace)
- [Pricing Workspace](/features/pricing-workspace)
- [Read Workspace](/features/read-workspace)
- [News Sources](/features/news-sources)

## Current Cross-Feature Themes

Several recent product changes now span multiple features:

- Home feed plan caps:
  - `Free`: 30 cards
  - `Plus`: 100 cards
- AI filter scope follows the same Home-feed cap as the visible feed.
- RSS now uses durable duplicate suppression during normal sync, but clearing Home feed intentionally resets RSS history.
- X feed now separates new-post discovery from visible-card stat refresh.
- Article-reader translation is expected to reuse durable cached results when reopening the same RSS article.
- Audience recommendation cards now require usable Thai recommendation copy.

## Rule For Future PRs

If a PR changes any of the following, update the matching feature doc in the same PR:

- user-visible behavior
- business rules
- plan limits
- loading, empty, or error states
- integration expectations

## Related Docs

- [Docs Governance](/process/docs-governance)
- [Architecture Overview](/architecture/overview)
- [Feed and Search Architecture](/architecture/feed-search)
- [Cost Analysis](/cost-analysis)
