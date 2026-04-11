# API Integrations and Source Websites

> Updated: April 12, 2026
> Scope: APIs and upstream websites currently used by this repository

## Overview

This document lists:

1. the APIs used by the system
2. the local proxy routes exposed by the app
3. the upstream provider endpoints
4. which features use each API
5. the source website and docs for each provider

Core proxy reference:

- [`D:\TEST\server.cjs`](D:\TEST\server.cjs)

Core service references:

- [`D:\TEST\src\services\TwitterService.ts`](D:\TEST\src\services\TwitterService.ts)
- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)
- [`D:\TEST\src\hooks\useSearchWorkspace.ts`](D:\TEST\src\hooks\useSearchWorkspace.ts)
- [`D:\TEST\src\hooks\useHomeFeedWorkspace.ts`](D:\TEST\src\hooks\useHomeFeedWorkspace.ts)
- [`D:\TEST\src\components\CreateContent.tsx`](D:\TEST\src\components\CreateContent.tsx)

## Integration Map

| Local Route / SDK | Upstream | Provider | Main Usage |
|---|---|---|---|
| `/api/twitter/*` | `https://api.twitterapi.io/twitter/*` | twitterapi.io | X search, tweet lookup, profile lookup, feed sync |
| `/api/xai/*` | `https://api.x.ai/*` | xAI | text generation, reasoning, summaries, tool use |
| `/api/tavily/search` | `https://api.tavily.com/search` | Tavily | web search and external source grounding |

## 1. twitterapi.io

## Local Proxy

The app uses this local base path:

- `/api/twitter`

Defined in:

- [`D:\TEST\src\services\TwitterService.ts`](D:\TEST\src\services\TwitterService.ts)

Proxy implementation:

- [`D:\TEST\server.cjs`](D:\TEST\server.cjs)

## Upstream Base URL

```text
https://api.twitterapi.io/twitter
```

## App Features That Use It

- Home feed sync
- Load more feed
- Search content
- Audience discovery
- Manual username/profile lookup
- Fetch tweet by ID for content generation
- Recent activity verification for experts

## Observed Endpoint Patterns in the Code

### 1. Advanced Search

Used via:

```text
/api/twitter/tweet/advanced_search
```

App usage:

- watchlist feed
- content search
- broad search
- latest search
- expert discovery

Code references:

- [`D:\TEST\src\services\TwitterService.ts`](D:\TEST\src\services\TwitterService.ts)
- [`D:\TEST\src\hooks\useSearchWorkspace.ts`](D:\TEST\src\hooks\useSearchWorkspace.ts)
- [`D:\TEST\src\hooks\useHomeFeedWorkspace.ts`](D:\TEST\src\hooks\useHomeFeedWorkspace.ts)

### 2. Tweet Detail

Used via:

```text
/api/twitter/tweet/detail?tweet_id=...
```

App usage:

- fetch original tweet when the user pastes an X URL
- build source context for content generation

Code references:

- [`D:\TEST\src\services\TwitterService.ts`](D:\TEST\src\services\TwitterService.ts)
- [`D:\TEST\src\components\CreateContent.tsx`](D:\TEST\src\components\CreateContent.tsx)

### 3. Thread Context

Used via:

```text
/api/twitter/tweet/thread_context?tweetId=...
```

App usage:

- thread reconstruction support

Code reference:

- [`D:\TEST\src\services\TwitterService.ts`](D:\TEST\src\services\TwitterService.ts)

### 4. Profile Lookup

Used through `getUserInfo`

App usage:

- manual audience search
- add author to watchlist
- hydrate placeholder users

Code references:

- [`D:\TEST\src\services\TwitterService.ts`](D:\TEST\src\services\TwitterService.ts)
- [`D:\TEST\src\App.tsx`](D:\TEST\src\App.tsx)

## Source Website and Docs

- Main website: [twitterapi.io](https://twitterapi.io/)
- Pricing: [twitterapi.io pricing](https://twitterapi.io/)
- Product docs / dashboard entrypoint: [twitterapi.io](https://twitterapi.io/)

## 2. xAI

## Local SDK / Proxy

The app configures the xAI SDK with:

```text
baseURL: /api/xai/v1
```

Defined in:

- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)

Proxy implementation:

- [`D:\TEST\server.cjs`](D:\TEST\server.cjs)

## Upstream Base URL

```text
https://api.x.ai
```

## Models Used in the Code

Configured in:

- [`D:\TEST\src\config\aiModels.ts`](D:\TEST\src\config\aiModels.ts)

Observed models:

- `grok-4-1-fast-non-reasoning`
- `grok-4-1-fast-reasoning`

## App Features That Use It

- Search query expansion
- Search planning
- AI feed filtering
- Executive summary generation
- Thai summary generation for posts
- On-demand Thai article translation in `ArticleReaderModal`
- Content intent normalization
- Fact-sheet generation
- Final content writing and review
- X video analysis
- X image analysis
- Expert discovery and ranking

## Main xAI Workflows in the Code

### 1. Text Generation

Used through:

- `generateText`
- `streamText`

App usage:

- summaries
- article translation for RSS and web articles opened in the reader
- final article generation
- rewrites

Article translation implementation notes:

- current runtime path uses `grok-4-1-fast-non-reasoning`
- article `title` and `body` are translated separately
- long article bodies are chunked before translation
- translated output is cleaned up with a lightweight post-process pass

Code reference:

- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)

### 2. Structured JSON Generation

Used through:

- `generateObject`

App usage:

- filter selection
- intent normalization
- content brief generation
- search plan generation
- fact-sheet generation
- expert recommendation generation

Code reference:

- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)

### 3. xAI Tool Use

Observed tools:

- `x_search`
- `view_x_video`

Used in:

- `analyzeXVideoPost`
- `analyzeXImagePost`

App usage:

- inspect X video posts
- inspect X image posts
- extract hooks, key points, and visual context for content generation

Code reference:

- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)

## Source Website and Docs

- Main website: [xAI](https://x.ai/)
- API pricing: [xAI API pricing](https://x.ai/api)
- Developer docs: [xAI docs](https://docs.x.ai/)
- Tool usage docs: [xAI tool usage details](https://docs.x.ai/developers/tools/tool-usage-details)
- Models docs: [xAI models](https://docs.x.ai/developers/models)

## 3. Tavily

## Local Proxy

The app calls:

```text
/api/tavily/search
```

Defined in:

- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)

Proxy implementation:

- [`D:\TEST\server.cjs`](D:\TEST\server.cjs)

## Upstream Endpoint

```text
https://api.tavily.com/search
```

## App Features That Use It

- web context for search
- research grounding for content generation
- URL resolution for pasted article links
- expert discovery support
- attached source verification

## Search Modes Observed in the Code

### 1. Basic Search

Typical usage:

- expert discovery
- URL resolution

Observed options:

- `search_depth: "basic"`

Code references:

- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)
- [`D:\TEST\src\components\CreateContent.tsx`](D:\TEST\src\components\CreateContent.tsx)

### 2. Advanced Search

Typical usage:

- search grounding
- fact gathering
- content research
- source verification

Observed options:

- `search_depth: "advanced"`
- `include_answer: true`
- `include_raw_content: true` in some source-validation paths

Code reference:

- [`D:\TEST\src\services\GrokService.ts`](D:\TEST\src\services\GrokService.ts)

## Source Website and Docs

- Main website: [Tavily](https://tavily.com/)
- Developer docs: [Tavily docs](https://docs.tavily.com/)
- FAQ / credits info: [Tavily FAQ](https://docs.tavily.com/faq/faq)

## 4. Other External Websites Used by the Frontend

These are not core backend APIs, but they are still external websites used by the app.

### 1. Unavatar

Usage:

- render social avatars for audience discovery cards

Observed URL patterns:

- `https://unavatar.io/twitter/{username}`
- `https://unavatar.io/github/{username}`

Code reference:

- [`D:\TEST\src\components\AudienceWorkspace.tsx`](D:\TEST\src\components\AudienceWorkspace.tsx)

Website:

- [unavatar.io](https://unavatar.io/)

### 2. UI Avatars

Usage:

- fallback avatar generation

Observed URL pattern:

- `https://ui-avatars.com/api/...`

Code references:

- [`D:\TEST\src\components\AudienceWorkspace.tsx`](D:\TEST\src\components\AudienceWorkspace.tsx)
- [`D:\TEST\src\App.tsx`](D:\TEST\src\App.tsx)

Website:

- [ui-avatars.com](https://ui-avatars.com/)

### 3. Google Favicon Service

Usage:

- fallback favicon/avatar source

Observed URL pattern:

- `https://www.google.com/s2/favicons?...`

Code reference:

- [`D:\TEST\src\components\AudienceWorkspace.tsx`](D:\TEST\src\components\AudienceWorkspace.tsx)

Website:

- [Google favicon service](https://www.google.com/s2/favicons)

## Environment Variables Used for Integrations

Defined by current backend behavior:

- `TWITTER_API_KEY`
- `XAI_API_KEY`
- `TAVILY_API_KEY`
- `INTERNAL_API_SECRET`
- `VITE_INTERNAL_API_SECRET`

Reference:

- [`D:\TEST\server.cjs`](D:\TEST\server.cjs)
- [`D:\TEST\src\utils\apiFetch.ts`](D:\TEST\src\utils\apiFetch.ts)

## Security Note

The repository currently contains real provider keys in [`D:\TEST\.env`](D:\TEST\.env). Those keys should be rotated and removed from versioned or shared environments as soon as possible.

## Recommended Next Step

If this document will be used by engineering and product together, the next useful companion docs are:

1. `billing-schema.md`
2. `usage-events.md`
3. `provider-metering.md`
