# Feed and Search Architecture

## Feed Architecture

Home feed now behaves as two related pipelines rather than one generic "fetch everything again" loop.

### RSS pipeline

```mermaid
flowchart TD
  A["Subscribed RSS sources"] --> B["Fetch RSS items"]
  B --> C["Build stable RSS fingerprint"]
  C --> D["Check RSS seen registry"]
  D --> E["Keep only unseen items"]
  E --> F["Merge with new X posts"]
  F --> G["Sort by created_at across sources"]
  G --> H["Take first 20 for initial sync"]
  H --> I["Queue overflow for Load more"]
  I --> J["Run RSS article enrichment later in background"]
```

Operational notes:

- RSS uses durable duplicate suppression during normal sync.
- The RSS seen registry is reset when the user intentionally clears Home feed.
- That reset allows previously seen RSS items to surface again after clear.
- RSS does not own a reserved slot count in the first render window; it competes on timestamp with X posts.
- `/api/article` enrichment is intentionally outside the initial sync critical path.

### X pipeline

```mermaid
flowchart TD
  A["Watchlist / Post list scope"] --> B["Checkpoint-based advanced search"]
  B --> C["New candidate posts"]
  C --> D["Check X seen registry"]
  D --> E["Merge with new RSS posts"]
  E --> F["Sort by created_at across sources"]
  F --> G["Take first 20 for initial sync"]
  G --> H["Queue overflow for Load more"]
  H --> I["Refresh visible-card stats by tweet id"]
```

Operational notes:

- X discovery and X stat refresh are separate concerns.
- Advanced search is used for new-post discovery.
- Tweet-id lookup is used to refresh engagement metrics for cards already visible on Home.
- If a tweet already exists, it should update the existing card rather than create a duplicate.
- Clearing Home feed does not reset X checkpoints or X seen state.
- Mixed X plus RSS lists must preserve global chronological ordering before truncating to the first sync window.

## Search Relationship

Search and Home are related but not identical:

- Search is an explicit research workflow.
- Home is a monitoring workflow.

That distinction matters for cost and UX:

- Home should prioritize cheap incremental discovery and light stat refresh.
- Search can justify broader and more expensive retrieval when the user is actively researching a topic.

## Plan-Limited Feed Surface

The Home surface is intentionally plan-limited:

- `Free`: 30 visible cards
- `Plus`: 100 visible cards

There is also an initial sync processing window:

- First sync pass: up to `20` newly merged cards
- Overflow: stored in pending state and exposed via `Load more`

AI filter must use the same capped visible set. This prevents a mismatch where the UI shows one scope but the model processes another.

## Initial Sync Critical Path

The initial Home sync should complete in this order:

1. Fetch X and RSS candidates
2. Dedupe and merge
3. Sort all new items by `created_at`
4. Take the first `20`
5. Summarize that first window with the fast non-reasoning feed model
6. Render cards

Non-critical follow-up work should happen after that:

- RSS article image enrichment via `/api/article`
- Thai backfill retries for posts that failed the first pass
- Additional cards via `Load more`

## Key Files

- `src/hooks/useHomeFeedWorkspace.ts`
- `src/services/RssService.ts`
- `src/services/TwitterService.ts`
- `src/utils/appUtils.ts`
