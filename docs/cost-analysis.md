# Cost Analysis for Billing Design

> Updated: April 12, 2026
> Scope: current codebase in this repository

## Executive Summary

Foro cost is currently driven mainly by:

1. `xAI`
2. `twitterapi.io`
3. `Tavily`

Recent product changes materially affect Home-feed cost behavior:

- RSS duplicate suppression reduces repeated downstream work.
- Reopening the same RSS article should reuse cached translation instead of paying again.
- X feed now separates expensive new-post discovery from cheaper targeted stat refresh for visible cards.
- Home feed is capped by plan:
  - `Free`: 30 cards
  - `Plus`: 100 cards

## High-Value Billing Rule

Do not treat "one Home sync" as a flat unit.

Current Home cost depends on:

- how many new X posts were discovered
- how many visible X cards had stats refreshed
- how many RSS items were genuinely new
- whether article translation had to run or could use cache

## Current Home Feed Cost Model

### RSS cost behavior

- During normal sync, old RSS items from the same source are suppressed by durable seen-state.
- This reduces repeat translation and repeat AI processing.
- If the user clears Home feed, RSS seen-state is intentionally reset and older items may reappear.

Billing implication:

- normal sync should be cheaper and cleaner over time
- post-clear sync may legitimately reprocess older RSS items again

### X cost behavior

Home X behavior is now split into two jobs:

1. discover new posts
2. refresh stats for visible cards

This matters because advanced search is a poor tool for "just refresh the numbers on cards I already know about."

Current design intent:

- use advanced search for newly discovered X items
- use tweet-id lookup for visible-card stat refresh
- avoid paying broad search cost to re-fetch old posts just to update engagement counters

## Cost Comparison Logic

### Old approach

- advanced search returns a mixed set of new and old posts
- the system pays for everything returned
- old posts may be useful only because their stats changed

### New approach

- advanced search focuses on new candidates
- tweet-id lookup refreshes only visible cards
- the system pays for:
  - new posts
  - the subset of visible cards that actually need stat refresh

### Practical savings shape

Savings depend on how many visible cards are refreshed.

Typical direction:

- if visible-card refresh is small relative to old posts returned by search, savings are meaningful
- if the system refreshes as many cards as broad search would have returned anyway, savings collapse

The previously discussed rule of thumb still applies:

- refreshing only visible cards can often reduce Home-feed X cost by roughly `30%` to `50%`
- the exact number depends on how many new posts exist and how many visible cards are refreshed

## Article Translation Cost Control

Article-reader translation now has a product-level caching expectation:

- first open may incur translation cost
- reopening the same RSS article should prefer durable cached Thai output

Billing implication:

- article translation should be measured separately from Home sync
- repeated reader opens for the same article should trend toward zero marginal translation cost after cache warm-up

## Plan-Limited AI Filter Scope

Home AI filter should be costed against the same capped visible set the user can actually see:

- `Free`: 30 cards
- `Plus`: 100 cards

This is important because model cost grows with the number of cards sent into the prompt.

## Recommended Metering Additions

If billing becomes productized, store at least:

- `home_sync.new_x_posts`
- `home_sync.visible_x_stat_refresh_count`
- `home_sync.new_rss_items`
- `reader.translation_cache_hit`
- `reader.translation_cache_miss`
- `ai_filter.visible_card_count`

These metrics will let the team explain why Home cost changed and whether optimization work is actually helping.
