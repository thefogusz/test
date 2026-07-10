# Audience Recommendation Freshness Design

## Goal

Make the existing "Recommended by FORO" results more reliably current without adding a new screen, control, or user workflow.

## Observed system

The current `discoverTopExpertsStrict` pipeline already does the right foundational work: it discovers a broad candidate set, checks recent X activity, removes low-quality accounts, ranks topic fit, and renders an `Active this week` label. Two implementation settings undermine that promise:

- the Audience query cache remains fresh for six hours;
- only the first ten candidates are rechecked for recent activity, even though the final reranker can consider up to eighteen candidates.

## Chosen design

Keep the current pipeline and UI unchanged. Change only its freshness policy:

1. Revalidate an Audience recommendation query after fifteen minutes instead of six hours.
2. Verify recent activity for every candidate that can reach the final reranking pool (eighteen accounts), rather than only the first ten.
3. Preserve the existing seven-day active requirement, topic-fit ranking, quality filters, and visible `Active this week` label.

The result is not a new recommendation feature. It makes the current recommendation promise more truthful: a new search is less likely to reuse stale data, and every account eligible for the final set has comparable activity evidence.

## Non-goals

- No new page, tab, button, onboarding, or changed navigation.
- No change to plan limits, Stripe, persistence, or the watchlist model.
- No behavioural-profile or implicit-tracking system.
- No relaxation of the current quality and topic-fit gates.

## Data flow

`Audience query` -> existing candidate discovery -> activity verification for up to 18 candidates -> existing quality/topic rerank -> existing six result cards

The only changes are the revalidation interval and the verification-pool size.

## Test strategy

Add regression guards that prove:

- Audience query caching uses a fifteen-minute freshness window.
- The activity verification limit matches the eighteen-candidate reranking pool.
- Existing strict activity and topic-fit gates remain in the discovery pipeline.

Run the focused test, then the complete test suite, lint, typecheck, and production build.

## Success criteria

- Repeating the same recommendation search after more than fifteen minutes calls the current discovery pipeline rather than returning a six-hour-old result.
- Candidates considered by the final reranker have been included in activity verification.
- The Audience UI and its current follow/list actions remain unchanged.
