# Cost Analysis for Billing Design

> Updated: April 4, 2026
> Scope: current codebase in this repository
> Purpose: map product features to provider costs so the billing system can be designed correctly

## Executive Summary

This system currently creates external cost from 3 providers:

1. `xAI`
2. `Tavily`
3. `twitterapi.io`

The codebase does **not** currently persist a full usage ledger, so we cannot calculate historical total spend from the repository alone. What we can do is define the full cost model for every feature and every external call path.

Core implementation references:

- [`D:\TEST\server.cjs`](D:\TEST\server.cjs)
- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)
- [`D:\TEST\src\services\TwitterService.ts`](D:\TEST\src\services\TwitterService.ts)
- [`D:\TEST\src\hooks\useSearchWorkspace.ts`](D:\TEST\src\hooks\useSearchWorkspace.ts)
- [`D:\TEST\src\hooks\useHomeFeedWorkspace.ts`](D:\TEST\src\hooks\useHomeFeedWorkspace.ts)
- [`D:\TEST\src\components\CreateContent.tsx`](D:\TEST\src\components\CreateContent.tsx)
- [`D:\TEST\src\App.tsx`](D:\TEST\src\App.tsx)

## Provider Pricing Baseline

Pricing below is the latest pricing verified during this analysis on April 4, 2026.

### xAI

Models used by the codebase:

- `grok-4-1-fast-reasoning`
- `grok-4-1-fast-non-reasoning`

Observed pricing:

- Input text: `$0.20 / 1M tokens`
- Output text: `$0.50 / 1M tokens`

Tool pricing and billing behavior:

- Successful server-side tool calls are billable
- `x_search`: `$5 / 1,000 calls` = `$0.005 / call`
- `view_x_video`: billed when successfully used
- `view_image`: billed when successfully used
- Agentic requests also consume prompt, completion, and reasoning tokens

Sources:

- [xAI API pricing](https://x.ai/api)
- [xAI tool usage details](https://docs.x.ai/developers/tools/tool-usage-details)

### Tavily

Observed pricing:

- Pay-as-you-go: `$0.008 / credit`
- `basic search`: `1 credit` = `$0.008`
- `advanced search`: `2 credits` = `$0.016`

Sources:

- [Tavily docs](https://docs.tavily.com/)
- [Tavily pricing FAQ](https://docs.tavily.com/faq/faq)

### twitterapi.io

Observed pricing:

- Tweets: `$0.15 / 1,000 tweets` = `$0.00015 / tweet`
- Profiles: `$0.18 / 1,000 profiles` = `$0.00018 / profile`

Source:

- [twitterapi.io pricing](https://twitterapi.io/)

## Cost Units to Meter

If we want reliable billing, the system should meter these 5 units explicitly:

1. `xai_input_tokens`
2. `xai_output_tokens`
3. `xai_tool_calls`
4. `tavily_credits`
5. `twitter_units`

Recommended breakdown:

- `twitter_units.tweets_returned`
- `twitter_units.profiles_returned`
- `xai_tool_calls.x_search`
- `xai_tool_calls.view_x_video`
- `xai_tool_calls.view_image`

## Current Proxy Entry Points

The backend proxy confirms the external providers actually used by the app:

- `/api/twitter/*` -> `https://api.twitterapi.io`
- `/api/xai/*` -> `https://api.x.ai`
- `/api/tavily/search` -> `https://api.tavily.com/search`

Reference:

- [`D:\TEST\server.cjs`](D:\TEST\server.cjs)

## Feature Cost Mapping

## 1. Home Feed Sync

Main code path:

- [`D:\TEST\src\hooks\useHomeFeedWorkspace.ts`](D:\TEST\src\hooks\useHomeFeedWorkspace.ts)
- [`D:\TEST\src\services\TwitterService.ts`](D:\TEST\src\services\TwitterService.ts)

Flow:

1. `handleSync` calls `fetchWatchlistFeed`
2. `fetchWatchlistFeed` calls twitterapi.io advanced search in batches of up to 15 handles
3. Returned tweets are translated/summarized with `generateGrokBatch`
4. Some failed summaries may retry with `generateGrokSummary`

Direct external cost:

- twitterapi.io by number of tweets returned
- xAI by summarization tokens

Cost formula:

```text
home_sync_cost
  = (tweets_returned * 0.00015)
  + xai_text_generation_cost
```

Important implementation detail:

- The UI caps immediate display to 20 posts, but upstream fetch may return more than 20 before local slicing.
- This means billing should use actual returned provider units, not displayed UI items.

## 2. Load More Feed

Main code path:

- [`D:\TEST\src\hooks\useHomeFeedWorkspace.ts`](D:\TEST\src\hooks\useHomeFeedWorkspace.ts)

Flow:

1. Uses pending cached tweets first
2. If none remain, fetches another page from twitterapi.io
3. Translates/summarizes the newly loaded posts

Direct external cost:

- twitterapi.io only when another upstream page is fetched
- xAI summarization for newly processed posts

Cost formula:

```text
load_more_cost
  = (additional_tweets_returned * 0.00015)
  + xai_text_generation_cost
```

## 3. AI Filter on Home Feed

Main code path:

- [`D:\TEST\src\hooks\useHomeFeedWorkspace.ts`](D:\TEST\src\hooks\useHomeFeedWorkspace.ts)
- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)

Flow:

1. `agentFilterFeed` uses xAI to classify the feed against the prompt
2. `generateExecutiveSummary` may generate a summary of matched posts

Direct external cost:

- xAI classification pass
- xAI summary pass

Cost formula:

```text
ai_filter_cost
  = xai_filter_tokens_cost
  + xai_summary_tokens_cost
```

## 4. Search Content

Main code path:

- [`D:\TEST\src\hooks\useSearchWorkspace.ts`](D:\TEST\src\hooks\useSearchWorkspace.ts)
- [`D:\TEST\src\services\TwitterService.ts`](D:\TEST\src\services\TwitterService.ts)
- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)

This is the most important feature for billing because one user search can trigger many billable operations.

Typical search pipeline:

1. Optional query expansion with xAI
2. One or more twitterapi.io search calls
3. Optional Tavily search for web context
4. Optional xAI search-plan generation
5. xAI feed filtering / selection
6. xAI executive summary
7. xAI batch translation of result posts

### 4.1 Search Calls Used

Twitter/X-side calls:

- `searchEverything`
- `searchEverythingDeep`

Tavily-side calls:

- `tavilySearch`

xAI-side calls:

- `expandSearchQuery`
- `buildSearchPlan`
- `agentFilterFeed`
- `generateExecutiveSummary`
- `generateGrokBatch`

### 4.2 Search Cost Pattern

Simple search usually costs:

```text
simple_search_cost
  = twitter_search_cost
  + optional_xai_query_expansion
  + xai_filter_cost
  + xai_summary_cost
  + xai_batch_translation_cost
```

Complex or broad search usually costs:

```text
complex_search_cost
  = twitter_search_cost
  + tavily_cost
  + xai_query_expansion_cost
  + xai_search_plan_cost
  + xai_filter_cost
  + xai_summary_cost
  + xai_batch_translation_cost
```

### 4.3 Cost Drivers Inside Search

Major variables:

- number of X pages fetched
- whether Tavily is used
- whether adaptive planning is used
- number of candidate posts sent to xAI
- number of posts translated into Thai

Operational observation:

- search is not a flat-fee action
- billing must be usage-based or credit-based

## 5. Audience AI Discovery

Main code path:

- [`D:\TEST\src\App.tsx`](D:\TEST\src\App.tsx)
- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)

Feature entry:

- `handleAiSearchAudience`
- `discoverTopExpertsStrict`

Flow:

1. X search for active accounts
2. Optional Tavily `basic` search for canonical expert lists when deeper web verification is needed
3. xAI reasoning to select final experts
4. Extra X search may be used to verify recency/activity

Direct external cost:

- twitterapi.io tweet search
- optional Tavily basic search
- xAI reasoning call

Cost formula:

```text
audience_ai_cost
  = twitter_search_cost
  + optional_tavily_basic_cost
  + xai_reasoning_cost
```

## 6. Audience Manual Search

Main code path:

- [`D:\TEST\src\App.tsx`](D:\TEST\src\App.tsx)
- [`D:\TEST\src\services\TwitterService.ts`](D:\TEST\src\services\TwitterService.ts)

Flow:

1. User types a handle
2. `getUserInfo` fetches profile data

Direct external cost:

- twitterapi.io profile lookup

Cost formula:

```text
manual_profile_lookup_cost
  = profiles_returned * 0.00018
```

## 7. Content Generation

Main code path:

- [`D:\TEST\src\components\CreateContent.tsx`](D:\TEST\src\components\CreateContent.tsx)
- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)
- [`D:\TEST\src\services\TwitterService.ts`](D:\TEST\src\services\TwitterService.ts)

This is the second biggest billing area after Search.

### 7.1 Generation Pipeline

Observed pipeline in `handleGenerate`:

1. Optional `fetchTweetById` if input is an X URL
2. Optional Tavily URL resolve if input is an external article URL
3. `normalizeContentIntent`
4. Optional `analyzeXVideoPost`
5. Optional `analyzeXImagePost`
6. `researchAndPreventHallucination`
7. `generateStructuredContentV2`

### 7.2 researchAndPreventHallucination Cost Shape

This function can trigger:

- Tavily advanced search for research query
- Twitter/X top search
- Twitter/X latest search if latest intent is detected
- Tavily advanced search for each attached primary source URL
- xAI fact-sheet generation

So the research stage alone is already a multi-provider billable workflow.

### 7.3 Writer Stage Cost Shape

`generateStructuredContentV2` can trigger:

- xAI content brief generation
- xAI writer draft
- xAI review/evaluation pass
- optional xAI rewrite pass

Streaming does not remove model cost. It only changes delivery mode.

### 7.4 Video/Image Analysis Cost Shape

`analyzeXVideoPost` may use:

- xAI `x_search`
- xAI `view_x_video`
- xAI reasoning tokens

`analyzeXImagePost` may use:

- xAI `x_search`
- xAI `view_image`
- xAI reasoning tokens

### 7.5 Generation Cost Formula

```text
content_generation_cost
  = optional_twitter_lookup_cost
  + optional_tavily_url_resolution_cost
  + xai_intent_normalization_cost
  + optional_xai_video_or_image_analysis_cost
  + research_stage_cost
  + writer_stage_cost
```

Expanded:

```text
research_stage_cost
  = tavily_credits_cost
  + twitter_search_cost
  + xai_fact_sheet_cost

writer_stage_cost
  = xai_brief_cost
  + xai_writer_cost
  + optional_xai_review_cost
  + optional_xai_rewrite_cost
```

## 8. Regenerate Content

Main code path:

- [`D:\TEST\src\components\CreateContent.tsx`](D:\TEST\src\components\CreateContent.tsx)

Flow:

1. Reuses stored `factSheet`
2. Runs `normalizeContentIntent`
3. Runs `generateStructuredContentV2`

Direct external cost:

- xAI intent normalization
- xAI writer pass
- optional xAI review/rewrite

It is cheaper than full content generation because it skips the research stage.

Cost formula:

```text
regenerate_cost
  = xai_intent_normalization_cost
  + writer_stage_cost
```

## Cost Summary by Feature

| Feature | twitterapi.io | Tavily | xAI text tokens | xAI tool calls |
|---|---:|---:|---:|---:|
| Home Sync | Yes | No | Yes | No |
| Load More | Yes | No | Yes | No |
| AI Feed Filter | No | No | Yes | No |
| Search | Yes | Sometimes | Yes | Usually no |
| Audience AI Discovery | Yes | Sometimes | Yes | No |
| Audience Manual Search | Yes | No | No | No |
| Content Generation | Yes or No | Yes | Yes | Sometimes yes |
| Regenerate Content | No | No | Yes | Sometimes yes |

## What the Billing System Should Store

Recommended event schema:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "workspace_id": "uuid",
  "feature": "search",
  "action": "run_search",
  "provider": "xai",
  "provider_unit_type": "input_tokens",
  "provider_units": 12450,
  "unit_cost_usd": 0.0000002,
  "raw_cost_usd": 0.00249,
  "sell_cost_usd": 0.01,
  "currency": "USD",
  "meta": {
    "model": "grok-4-1-fast-reasoning",
    "query": "ai agents",
    "search_depth": "advanced"
  },
  "created_at": "2026-04-04T00:00:00.000Z"
}
```

Minimum fields to store:

- `feature`
- `action`
- `provider`
- `provider_units`
- `provider_unit_type`
- `raw_cost_usd`
- `sell_cost_usd`
- `meta`
- `created_at`

## Recommended Billing Strategies

### Option A: Pass-through + markup

Formula:

```text
sell_price = raw_provider_cost * markup_multiplier
```

Best when:

- enterprise customers need transparency
- usage varies heavily by feature

### Option B: Credit system

Example:

- `1 credit = $0.01 internal value`
- map each provider event into internal credits

Best when:

- UX simplicity matters
- you want one pricing language across all features

### Option C: Hybrid

Example:

- subscription includes monthly credits
- overage billed by raw usage or premium credit burn

Best when:

- you want predictable plans plus scalable overage

## Suggested Internal Metering Formulas

```text
xai_text_cost_usd
  = (input_tokens / 1_000_000 * 0.20)
  + (output_tokens / 1_000_000 * 0.50)

xai_x_search_cost_usd
  = x_search_calls * 0.005

tavily_cost_usd
  = credits_used * 0.008

twitter_tweets_cost_usd
  = tweets_returned * 0.00015

twitter_profiles_cost_usd
  = profiles_returned * 0.00018
```

Composite feature formulas:

```text
search_cost_usd
  = twitter_tweets_cost_usd
  + tavily_cost_usd
  + xai_text_cost_usd
  + xai_x_search_cost_usd

content_cost_usd
  = twitter_tweets_cost_usd
  + tavily_cost_usd
  + xai_text_cost_usd
  + xai_x_search_cost_usd
  + xai_view_media_cost_usd
```

## Important Product/Billing Notes

1. Search and content generation are multi-step workflows, so flat pricing per click will create margin instability unless protected by quotas or credits.
2. UI result count is not equal to provider billable units. Billing must use actual upstream usage.
3. Caching exists in memory in [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts), so repeated requests in the same process may avoid some cost, but this is not durable or auditable.
4. There is no persistent usage ledger yet, so historical billing reconciliation is not possible.
5. API keys are currently present in [`D:\TEST\.env`](D:\TEST\.env). This is a spend-risk and security-risk and should be rotated.

## Recommended Next Implementation Step

To make billing production-ready, implement:

1. provider usage capture
2. raw cost calculation per event
3. internal sell-price calculation
4. durable usage ledger table
5. monthly aggregation per workspace and per user

Suggested tables:

- `usage_events`
- `billing_ledgers`
- `billing_period_rollups`
- `plan_credit_balances`

## Pricing Sources

- [xAI API pricing](https://x.ai/api)
- [xAI tool usage details](https://docs.x.ai/developers/tools/tool-usage-details)
- [Tavily docs](https://docs.tavily.com/)
- [Tavily FAQ](https://docs.tavily.com/faq/faq)
- [twitterapi.io pricing](https://twitterapi.io/)
