# System Architecture — Foro

> เอกสารนี้อธิบาย architecture ของระบบ Foro (Content Discovery & Curation Platform) ในระดับที่ dev
> สามารถอ่านแล้วเข้าใจหลักการทำงานทุกส่วนได้ทันที โดยอ้างอิงถึงไฟล์และโค้ดจริงทุกจุด

---

## สารบัญ

1. [Big Picture](#1-big-picture)
2. [Backend Layer — server.cjs](#2-backend-layer--servercjs)
3. [API Security — apiFetch.ts](#3-api-security--apifetchts)
4. [Twitter Service — ระบบดึงข้อมูลและ Scoring](#4-twitter-service--twitterservicets)
5. [Grok AI Service — ระบบ AI และ Caching](#5-grok-ai-service--grokservicets)
6. [State Management — localStorage + Hooks](#6-state-management--localstorage--hooks)
7. [Data Types — domain.ts](#7-data-types--domaints)
8. [Frontend Components](#8-frontend-components)
9. [Build System — vite.config.js](#9-build-system--viteconfigjs)
10. [Deployment & Environment](#10-deployment--environment)
11. [Feature Map — Flow แต่ละฟีเจอร์](#11-feature-map--flow-แต่ละฟีเจอร์)

---

## 1. Big Picture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (React 19)                             │
│                                                                          │
│  ┌──────────┐  ┌──────────────────────────────────────────────────────┐ │
│  │ Sidebar  │  │                    App.tsx (Root)                    │ │
│  │ (Nav)    │  │  activeView: home | content | read | audience |      │ │
│  │          │  │              bookmarks                               │ │
│  │ RightSide│  │  State: watchlist, homeFeed, searchResults,          │ │
│  │ bar      │  │         bookmarks, readArchive, postLists            │ │
│  │ (Lists)  │  └──────────────────────────────────────────────────────┘ │
│  └──────────┘          │                                                │
│                        ├── HomeCanvas (particle bg)                     │
│                        ├── FeedCard (tweet cards)                       │
│                        ├── [lazy] ContentWorkspace                      │
│                        ├── [lazy] ReadWorkspace                         │
│                        ├── [lazy] AudienceWorkspace                     │
│                        └── [lazy] BookmarksWorkspace                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │  /api/*  (+ x-internal-token header)
┌─────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER (server.cjs)                          │
│                                                                          │
│  Auth Guard: x-internal-token ─────────────────────────────────────     │
│                                                                          │
│  /api/twitter/* ──proxy──► https://api.twitterapi.io  (X-API-Key)       │
│  /api/xai/*     ──proxy──► https://api.x.ai           (Bearer XAI_KEY)  │
│  /api/tavily/search ──► https://api.tavily.com         (api_key body)   │
│  /test/*        ──static──► dist/index.html                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 19.2.4 |
| Build Tool | Vite | 8.0.0 |
| Language | TypeScript | 5.9.3 (strict: false) |
| Backend | Express | 4.22.1 |
| AI SDK | @ai-sdk/xai | 3.0.72 |
| AI Streaming | Vercel AI SDK (`ai`) | 6.0.116 |
| Validation | Zod | 4.3.6 |
| Icons | lucide-react | 0.577 |
| Markdown | marked + DOMPurify | 17.0.4 / 3.3.3 |
| E2E Testing | Playwright | 1.58.2 |

---

## 2. Backend Layer — `server.cjs`

ไฟล์: `server.cjs`

Express server ทำหน้าที่เป็น **secure API proxy** เท่านั้น — ไม่มี business logic อยู่ที่ฝั่ง server

### Startup & Config

```js
// server.cjs:6-24
const loadEnvFile = () => {
  const envPath = path.join(__dirname, '.env');
  // อ่าน .env ด้วย manual parser (ไม่ใช้ dotenv)
  // ป้องกัน override env vars ที่ถูก inject จาก platform แล้ว
  if (key && process.env[key] === undefined) {
    process.env[key] = value;
  }
};
```

### Auth Guard (middleware ลำดับ 1)

```js
// server.cjs:40-45
app.use('/api', (req, res, next) => {
  if (INTERNAL_API_SECRET && req.headers['x-internal-token'] !== INTERNAL_API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

ทุก `/api/*` request **ต้องมี** header `x-internal-token` ตรงกับ `INTERNAL_API_SECRET` ใน `.env`
— ป้องกันคนนอกเรียก proxy โดยตรง

### Logging Middleware (ลำดับ 2)

```js
// server.cjs:47-58
app.use('/api', (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    // log เฉพาะ request ที่ช้า (>250ms) หรือ error (4xx/5xx)
    if (durationMs >= API_LOG_THRESHOLD_MS || res.statusCode >= 400) {
      console.log(`[server] ${req.method} ${req.originalUrl} -> ${res.statusCode} in ${durationMs}ms`);
    }
  });
  next();
});
```

### Twitter Proxy

```js
// server.cjs:60-84
app.use('/api/twitter', async (req, res) => {
  const upstreamUrl = `https://api.twitterapi.io/twitter${req.originalUrl.replace(/^\/api\/twitter/, '')}`;
  const upstreamResponse = await fetch(upstreamUrl, {
    headers: { 'X-API-Key': TWITTER_API_KEY },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS), // 120s default
    body: req.method === 'GET' ? undefined : JSON.stringify(req.body),
  });
  // pass-through status + body ตรงๆ ไม่แปลง
  res.status(upstreamResponse.status).send(responseText);
});
```

URL mapping: `/api/twitter/user/tweets` → `https://api.twitterapi.io/twitter/user/tweets`

### xAI (Grok) Proxy

```js
// server.cjs:86-110
app.use('/api/xai', createProxyMiddleware({
  target: 'https://api.x.ai',
  pathRewrite: { '^/api/xai': '' },    // /api/xai/v1/chat → /v1/chat
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader('Authorization', `Bearer ${XAI_API_KEY}`);
    }
  }
}));
```

ใช้ `http-proxy-middleware` เพราะต้องรองรับ **streaming response** (SSE) จาก Grok

### Tavily Proxy

```js
// server.cjs:112-137
app.post('/api/tavily/search', async (req, res) => {
  // inject api_key ลงใน body ก่อนส่งต่อ — key ไม่เคยถึง browser
  body: JSON.stringify({ ...req.body, api_key: TAVILY_API_KEY }),
});
```

### Static File Serving

```js
// server.cjs:139-147
app.use('/test', express.static(path.join(__dirname, 'dist')));
app.get('/test/*', (req, res) => res.sendFile('dist/index.html'));  // SPA fallback
app.get('/', (req, res) => res.redirect('/test'));
```

App serve อยู่ที่ path `/test/` (ไม่ใช่ `/`) — ตั้งใจให้ไม่ชนกับ route อื่นถ้าเอาไป deploy ใน subdirectory

---

## 3. API Security — `apiFetch.ts`

ไฟล์: `src/utils/apiFetch.ts`

```typescript
// apiFetch.ts:15
export const INTERNAL_TOKEN = import.meta.env.VITE_INTERNAL_API_SECRET ?? '';

// apiFetch.ts:19-35
export const apiFetch = (url, options = {}) => {
  const { timeout = 90000, ...fetchOptions } = options;  // 90s default

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const headers = {
    ...(fetchOptions.headers || {}),
    // inject token ทุก request อัตโนมัติ
    ...(INTERNAL_TOKEN ? { 'x-internal-token': INTERNAL_TOKEN } : {}),
  };

  return fetch(url, { ...fetchOptions, headers, signal: controller.signal })
    .finally(() => clearTimeout(id));
};
```

**หลักการ:**
- `VITE_INTERNAL_API_SECRET` เป็น **env var เดียว** ที่ขึ้นต้นด้วย `VITE_` — ทำให้ Vite bundle เข้า browser ได้
- Real API keys (`XAI_API_KEY`, `TWITTER_API_KEY`, `TAVILY_API_KEY`) **ไม่มี** `VITE_` prefix → ไม่ถึง browser เลย
- `INTERNAL_TOKEN` ไม่ใช่ secret จริงๆ — แค่ป้องกัน anonymous abuse ของ proxy

---

## 4. Twitter Service — `TwitterService.ts`

ไฟล์: `src/services/TwitterService.ts` (~900 lines)

### Constants & Patterns

```typescript
// TwitterService.ts:6-7
const BASE_URL = '/api/twitter';
export const RECENT_WINDOW_HOURS = 24;

// LOW_SIGNAL_PATTERNS — ใช้กรอง spam/scam tweets
const LOW_SIGNAL_PATTERNS = [
  /\bairdrop\b/i, /\bgiveaway\b/i, /\btelegram\b/i,
  /\bwhatsapp\b/i, /\bdiscord\b/i, /\bjoin\b/i,
  /\bdm\b/i, /\bcontract\b/i, /\bpresale\b/i,
  /\breferral\b/i, /\bsignal\b/i, /\bcopy trade\b/i,
];

// HYPE_PATTERNS — ตรวจจับ low-quality hype content
const HYPE_PATTERNS = [
  /\b100x\b/i, /\b1000x\b/i, /\bmoney printer\b/i,
  /\bquit your job\b/i, /\bfollow you back\b/i, /\bgiga volatile\b/i,
];
```

### Scoring Architecture

ระบบ scoring คือหัวใจของ TwitterService — ทุก tweet จะได้ `search_score` จากสูตร:

```
final_score = signalScore
            + credibilityScore
            + relevanceScore
            + broadSemanticScore
            + broadGlobalAuthorityScore
            + broadViralMomentumScore
            + freshnessScore
            + providerRankScore
            - lowSignalPenalty
            - broadTopicPenalty
            - broadTopicFocusPenalty
            - broadLocalCasualPenalty
```

#### `getSignalScore(tweet)` — EngagementScore

```typescript
// TwitterService.ts:386-400
const getSignalScore = (tweet) => {
  // logScore = Math.log10(value+1) / Math.log10(maxInput+1) * multiplier
  return (
    logScore(views,      3.5, 5_000_000) +   // views score
    logScore(engagement, 6.0, 200_000)   +   // likes+RT+replies+quotes (ใหญ่สุด)
    clamp(engagementRate / 0.04, 0, 1) * 3.5 // engagement rate bonus
  );
};
```

#### `getCredibilityScore(tweet)` — Author Authority

```typescript
// TwitterService.ts:360-383
const getCredibilityScore = (tweet) => {
  if (author.isVerified)     score += 3.5;  // Gold/Official ✓
  if (author.isBlueVerified) score += 1.4;  // Blue Premium ✓
  if (verifiedType === 'Business' || 'Government') score += 1.2;

  score += logScore(followers, 5.0, 1_000_000);  // follower score (สูงสุด)
  score += logScore(statuses,  1.2, 500_000);    // tweet history
  score += clamp(accountAgeDays / 365, 0, 5) * 0.5; // account age
};
```

#### `getRelevanceScore(tweet, queryTerms)` — Keyword Match

```typescript
// TwitterService.ts:186-211
// สำหรับแต่ละ query term:
//   match ใน text body  → +1.2
//   match ใน author bio → +0.45
//   multi-term bonus    → +0.4/term (max +1.4)
//   exact phrase match  → +1.25 (ถ้า query ยาวกว่า 4 chars)
```

#### `getVelocityTag(tweet)` — Momentum Detection

```typescript
// TwitterService.ts:402-413
const getVelocityTag = (tweet) => {
  const engPerHour = (likes + retweets) / ageHours;
  if (ageHours <= 6  && engPerHour >= 200) return '🔥 กำลังระเบิด';
  if (ageHours <= 24 && engPerHour >= 50)  return '📈 กำลังขึ้น';
  if (ageHours <= 48 && engPerHour >= 15)  return '📊 กำลังมา';
  return null;
};
```

#### `getLowSignalPenalty(tweet)` — Spam/Noise Filter

```typescript
// TwitterService.ts:433-492
// LOW_SIGNAL_PATTERNS match  → +1.5 per match
// HYPE_PATTERNS match        → +0.9 per match
// isAutomated account        → +5.0 (heavy)
// new account (< 1000 followers, < 180 days) → +2.5
// news query + low credibility → +2.0 + 1.5
// no keyword match (non-broad) → +5.0 (heavy)
// reply + engagement < 5     → return 80 (kill)
// reply + engagement < 30    → +5.0
```

### Query Intent Detection

```typescript
// TwitterService.ts:93-112
const isNewsIntent = (query) => /ข่าว|news|latest|update|breaking/i.test(query);

const isBroadDiscoveryIntent = (query) => {
  // stripped = query หลังเอา news keywords ออก
  // broad = true ถ้า query match กับ BROAD_TOPIC_HINTS (gaming/football/crypto)
  // และ token count <= 6
};
```

Intent แบ่งเป็น 3 ประเภท:
- **news intent** → เน้น credibility, freshness
- **broad discovery** → ใช้ topic buckets + diversity algorithm
- **product/specific** → เน้น exact keyword match

### Broad Topic Diversification

```typescript
// TwitterService.ts:565-613
const diversifyBroadResults = (tweets, queryProfile, limit = 30) => {
  // แบ่ง tweets เป็น buckets: gaming-main, gaming-general, general, esports, promo
  // rotate ดึงจากแต่ละ bucket ทีละตัวจนครบ limit
  // ข้าม promo bucket เสมอ (ถ้า preferGlobal)
  // esports จำกัดที่ 2 tweets
};
```

### Author Diversification

```typescript
// TwitterService.ts:531-548
const diversifyByAuthor = (tweets, protectedWindow = 12) => {
  // ใน top-12 ห้าม author เดียวกันซ้ำ
  // tweet ที่ซ้ำ author ถูกดัน overflow ไปท้าย list
};
```

### Public API Functions

| Function | ใช้ใน | หน้าที่ |
|----------|-------|---------|
| `getUserInfo(username)` | App.tsx watchlist add | GET `/api/twitter/user/info?username=` |
| `fetchWatchlistFeed(handles[])` | App.tsx home refresh | ดึง timeline ของ handles ทั้งหมดแบบ parallel |
| `searchEverything(query, opts)` | ContentWorkspace | search + score + dedupe + diversify |
| `searchEverythingDeep(query, opts)` | ContentWorkspace | เหมือน searchEverything แต่ multi-round |
| `curateSearchResults(tweets, query)` | App.tsx search | re-rank tweets ด้วย composite score |
| `analyzeSearchQueryIntent(query)` | App.tsx search | return `{ isNews, isBroad, queryProfile }` |
| `clusterBySimilarity(tweets, threshold)` | App.tsx | group tweets ที่คล้ายกัน |
| `fetchTweetById(id)` | GrokService | GET `/api/twitter/tweet/detail?tweet_id=` |

---

## 5. Grok AI Service — `GrokService.ts`

ไฟล์: `src/services/GrokService.ts` (~1,900 lines)

### Models

```typescript
// GrokService.ts:8-11
const MODEL_NEWS_FAST      = 'grok-4-1-fast-non-reasoning';  // summarization, fast
const MODEL_REASONING_FAST = 'grok-4-1-fast-reasoning';     // analysis, planning
const MODEL_WRITER         = 'grok-4-1-fast-reasoning';     // content writing
const MODEL_MULTI_AGENT    = 'grok-4-1-fast-reasoning';     // agent tasks
```

### xAI Client Setup

```typescript
// GrokService.ts:13-19
const grok = createXai({
  apiKey: 'local-proxy',       // dummy key — จริงๆ inject ที่ server
  baseURL: '/api/xai/v1',     // ผ่าน Express proxy
  headers: {
    'x-internal-token': INTERNAL_TOKEN,  // auth guard
  },
});
```

### In-Memory Cache

```typescript
// GrokService.ts:21-28
const responseCache = new Map();
const CACHE_MAX_ENTRIES      = 400;

// TTLs ต่าง กัน ตาม use case:
const TAVILY_CACHE_TTL_MS          =  5 * 60 * 1000;   // 5 min
const QUERY_CACHE_TTL_MS           = 15 * 60 * 1000;   // 15 min
const EXECUTIVE_SUMMARY_CACHE_TTL  = 10 * 60 * 1000;   // 10 min
const CONTENT_BRIEF_CACHE_TTL      = 30 * 60 * 1000;   // 30 min
const SUMMARY_CACHE_TTL_MS         = 12 * 60 * 60 * 1000; // 12 hr
const FACT_CACHE_TTL_MS            = 30 * 60 * 1000;   // 30 min
```

#### Cache Key Generation

```typescript
// GrokService.ts:44-56
const hashString = (value) => {
  let hash = 2166136261;  // FNV-1a 32-bit
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const buildCacheKey = (namespace, value) =>
  `${namespace}:${hashString(JSON.stringify(value))}`;
// ตัวอย่าง: "tavily:3k9m2p1"
```

#### Cache Eviction (LRU-like)

```typescript
// GrokService.ts:58-71
const pruneCache = (cache) => {
  // 1. ลบ expired entries ก่อน
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
  // 2. ถ้ายังเกิน 400 entries ลบ oldest (Map preserves insertion order)
  while (cache.size >= CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
};
```

### Prompt Injection Prevention

```typescript
// GrokService.ts:33-41
const sanitizeForPrompt = (text = '', maxLen = 500) =>
  String(text)
    .replace(/`/g, "'")           // backtick → single quote
    .replace(/\[INST\]/gi, '')    // LLaMA/Mistral injection markers
    .replace(/<<SYS>>/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .trim()
    .slice(0, maxLen);            // hard limit 500 chars
```

ใช้ทุกครั้งที่ embed tweet text / web content ลง prompt

### Content Summarization

#### `generateGrokSummary(text)` — Single Tweet

```
POST /api/xai/v1/chat/completions
model: grok-4-1-fast-non-reasoning
system: SUMMARY_RULES (Thai summarization rules)
user: tweet text
→ cache TTL: 12 hours
```

SUMMARY_RULES (GrokService.ts:113-125) กำหนด:
- เขียนสรุปภาษาไทย 1-2 ประโยค
- คงชื่อเฉพาะ/technical terms เป็น English
- ห้ามระบุ @username ของ account ทั่วไป (ยกเว้น verified/มีชื่อเสียง)
- ห้ามพูดถึง Twitter/X โดยชื่อ
- ห้ามใส่ URL ใน output

#### `generateGrokBatch(stories[])` — Batch

```
ส่ง tweets หลายตัวใน prompt เดียว (เพื่อลด API calls)
→ parse response กลับเป็น array by tweet ID
```

### Executive Summary (Streaming)

```typescript
export const generateExecutiveSummary = async (tweets, query, options) => {
  // 1. cache check
  // 2. streamText() จาก Vercel AI SDK
  // 3. consumer อ่าน async iterator → append ทีละ chunk
  // 4. cache final result
};
```

### Content Generation Pipeline

`generateStructuredContent(params)` ทำงาน 3 ขั้น:

```
Step 1: researchAndPreventHallucination(input, sourceUrl)
  ├── tavilySearch(input)          ← web context
  ├── fetchTweetById(citation_id)  ← source tweet (ถ้ามี)
  ├── generateObject(schema: FactSheet)  ← extract facts
  └── strengthenPrimaryLeadFactSheet()   ← remove risky inferences

Step 2: buildContentBrief(factSheet, format, tone, length)
  └── generateText() → structured brief with constraints

Step 3: writeContent(brief, format, tone, customInstructions)
  └── streamText() → final article/post/thread/script
      → polishThaiContent()  ← post-process
```

### Source Trust & Filtering

```typescript
// GrokService.ts:158-193
const SOURCE_TRUST_TIERS = {
  highest: ['reuters.com', 'bloomberg.com', 'techcrunch.com', 'ign.com', ...],
  medium:  ['yahoo.com', 'investing.com'],
  low:     ['reddit.com', 'youtube.com', 'facebook.com', 'tiktok.com', 'x.com'],
};

const scoreSourceQuality = (source, options) => {
  if (primaryHostname === hostname)               score += 80;  // exact lead domain
  if (matchesDomainTier(hostname, highest))       score += 40;
  if (matchesDomainTier(hostname, medium))        score += 18;
  if (matchesDomainTier(hostname, low))           score -= 25;  // penalty
  score += queryTokenHits * 4;
  if (/official|press release|reuters/.test(title)) score += 10;
};
// filter: score >= 8, max 6 sources
```

### Content Format Profiles

```typescript
// GrokService.ts:469-506
const CONTENT_FORMAT_PROFILES = {
  'โพสต์โซเชียล':       { allowHeadings: false, boldHeadline: true, ... },
  'สคริปต์วิดีโอสั้น':  { allowHeadings: false, boldHeadline: true, ... },
  'บทความ SEO / บล็อก': { allowHeadings: true,  boldHeadline: false, ... },
  'โพสต์ให้ความรู้ (Thread)': { allowHeadings: false, boldHeadline: true, ... },
};
```

### `polishThaiContent()` — Post-processing

```typescript
// GrokService.ts:591-620
const polishThaiContent = (text, { format, tone, allowEmoji }) => {
  // 1. stripDisallowedHeadings()  — ลบ ## headings ถ้า format ไม่อนุญาต
  // 2. stripEngagementBait()      — ลบ "คุณคิดยังไง / รีโพสต์ / follow ไว้"
  // 3. softenHypeLanguage()       — แทน "สะเทือนโลก" → "สำคัญ"
  // 4. normalizeThaiSpacing()     — ลบ zero-width spaces, normalize newlines
  // ถ้า tone = "กระตือรือร้น/ไวรัล" → ผ่อนปรน hype บางส่วน (keep energy)
};
```

### Public API Functions

| Function | หน้าที่ | Model | Cache TTL |
|----------|---------|-------|-----------|
| `generateGrokSummary(text)` | สรุป 1 tweet เป็นภาษาไทย | NEWS_FAST | 12h |
| `generateGrokBatch(stories)` | สรุป batch tweets | NEWS_FAST | 12h |
| `agentFilterFeed(tweets, prompt)` | AI filter feed ตาม prompt | REASONING | 15m |
| `generateExecutiveSummary(tweets, query)` | Streaming summary | REASONING | 10m |
| `expandSearchQuery(query)` | ขยาย query ด้วย related terms | REASONING | 15m |
| `buildSearchPlan(query)` | สร้าง multi-step search plan | REASONING | 15m |
| `discoverTopExperts(category)` | หา expert accounts | REASONING | 15m |
| `tavilySearch(query, isLatest, opts)` | Web search ผ่าน Tavily | — (HTTP) | 5m |
| `generateStructuredContent(params)` | สร้าง content แบบ full pipeline | WRITER | 30m |
| `researchAndPreventHallucination(input)` | Fact-check ก่อน generate | REASONING | 30m |

---

## 6. State Management — localStorage + Hooks

### ไม่มี Redux/Zustand — ทุกอย่างอยู่ที่ App.tsx

State ทั้งหมด manage ด้วย `useState` + `usePersistentState` ใน `App.tsx`
แล้ว **pass เป็น props ลงไป** — ไม่ใช้ Context

### `usePersistentState` Hook

ไฟล์: `src/hooks/usePersistentState.ts`

```typescript
// usePersistentState.ts:12-51
export const usePersistentState = <T>(storageKey, initialValue, options) => {
  const [state, setState] = useState(() => {
    // lazy init: อ่านจาก localStorage ก่อน
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue === null) return fallbackValue;

    // ถ้ามี custom deserializer ให้ใช้ (เพื่อ validate/sanitize)
    if (deserialize) return deserialize(storedValue, fallbackValue);
    return JSON.parse(storedValue);
  });

  useEffect(() => {
    // sync state → localStorage ทุกครั้งที่ state เปลี่ยน
    if (shouldRemove?.(state)) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, serialize ? serialize(state) : JSON.stringify(state));
    }
  }, [state]);

  return [state, setState] as const;
};
```

### Storage Keys ทั้งหมด

ไฟล์: `src/constants/storageKeys.ts`

```typescript
export const STORAGE_KEYS = {
  watchlist:          'foro_watchlist_v2',        // WatchlistUser[]
  homeFeed:           'foro_home_feed_v1',         // Post[]
  pendingFeed:        'foro_pending_feed_v1',      // Post[] (background fetch)
  bookmarks:          'foro_bookmarks_v1',         // Post[]
  readArchive:        'foro_read_archive_v1',      // Post[]
  attachedSource:     'foro_attached_source_v1',   // AttachedSource | null
  postLists:          'foro_postlists_v2',         // PostList[]
  searchQuery:        'foro_search_query_v1',      // string
  searchResults:      'foro_search_results_v1',    // Post[]
  searchSummary:      'foro_search_summary_v1',    // string (markdown)
  searchPresets:      'foro_search_presets_v1',    // string[] (max 4)
  searchHistory:      'foro_search_history_v1',    // SearchHistoryEntry[]
  aiSearchResults:    'foro_ai_search_results_v1', // Post[] (AI-filtered)
  searchWebSources:   'foro_search_web_sources_v1',// ContentSource[]
  activeListId:       'foro_active_list_id_v1',    // string | null
  activeView:         'foro_active_view_v2',       // ActiveView
  contentTab:         'foro_content_tab_v1',       // 'search' | 'create'
  quickFilterPresets: 'foro_quick_filter_presets_v1', // string[]
};
```

**Versioning convention:** `_v1`, `_v2` — เมื่อ schema เปลี่ยน bump version เพื่อ invalidate old data

### Data Sanitization on Load

```typescript
// App.tsx:83-93
const deserializeStoredCollection = (saved) =>
  sanitizeStoredCollection(safeParse(saved, []));
```

`sanitizeStoredPost` (appUtils.ts:44-51) จะลบ `summary` field ออกถ้า:
- summary ไม่มี Thai characters (เช่น "(Grok error: ...)")
- summary เหมือนกับ original text (ไม่ได้ถูก summarize จริง)

### `useLibraryViews` Hook

ไฟล์: `src/hooks/useLibraryViews.ts`

Hook นี้ทำหน้าที่ compute derived state สำหรับ Read workspace ทั้งหมด:

```
Input params:
  activeListId, postLists, bookmarkTab, bookmarks,
  deferredReadSearchQuery, readArchive, readFilters, visibleReadCount

Output:
  activeReadListMemberSet  — Set<username> ของ active list (O(1) lookup)
  filteredBookmarks        — bookmarks filtered by tab + list
  bookmarkIds              — Set<id> ของ bookmarks ทั้งหมด (O(1) lookup)
  normalizedReadSearchQuery
  readSearchSuggestions    — autocomplete suggestions (max 4)
  filteredReadArchive      — sorted + filtered archive
  visibleReadArchive       — paginated slice [0..visibleReadCount]
```

#### Fuzzy Search ใน Read Archive

```typescript
// useLibraryViews.ts:109-139
.map(item => ({
  item,
  searchScore: normalizedReadSearchQuery
    ? scoreFuzzyTextMatch(query, author.name, author.username, summary, text)
    : 1,
}))
.filter(({ searchScore }) => searchScore > 0)
.sort((a, b) => {
  // ถ้า search query มีอยู่ → sort by relevance
  if (normalizedReadSearchQuery) return b.searchScore - a.searchScore;
  // ถ้าไม่ search → sort by date (newest first)
  // ถ้าเปิด filter view/engagement → sort by engagement
});
```

---

## 7. Data Types — `domain.ts`

ไฟล์: `src/types/domain.ts`

### `Post` — Core Entity

```typescript
interface Post {
  id?:            string;
  type?:          string;           // 'tweet' | 'article'
  text?:          string;
  full_text?:     string;
  summary?:       string;           // Thai summary จาก Grok
  title?:         string;           // สำหรับ article type
  url?:           string;
  citation_id?:   string;           // tweet ID ที่เป็น source
  created_at?:    string;           // ISO 8601
  author?:        Author | null;

  // Engagement metrics (Twitter API ส่งมาหลายรูปแบบ)
  like_count?:    number | string;
  likeCount?:     number | string;
  view_count?:    number | string;
  retweet_count?: number | string;
  reply_count?:   number | string;
  quote_count?:   number | string;

  // Computed fields (ใส่ใน TwitterService ก่อน save)
  temporalTag?:   string;           // 'breaking' | 'related' | etc.
  velocityTag?:   string | null;    // '🔥 กำลังระเบิด' | null
  search_score?:  number;           // composite score จาก scoring engine
  ai_reasoning?:  string;           // Grok's reasoning (agentFilterFeed)

  // Content enrichment
  attachedSource?: AttachedSource | null;  // tweet ที่แนบมาจาก user
  sources?:        ContentSource[];        // web sources จาก Tavily
}
```

### `Author`

```typescript
interface Author {
  id?, username?, name?, description?,
  profile_image_url?, profilePicture?,
  followers?, fastFollowersCount?,
  isVerified?,       // Gold/Official verified
  isBlueVerified?,   // Premium Blue verified
  verifiedType?,     // 'Business' | 'Government'
  createdAt?, statusesCount?, location?, isAutomated?
}
```

### `ActiveView`

```typescript
// domain.ts:108
type ActiveView = 'home' | 'content' | 'read' | 'audience' | 'bookmarks' | 'search';
```

---

## 8. Frontend Components

### Component Tree

```
App.tsx (1,950 lines)
├── HomeCanvas.tsx        — particle canvas background animation
├── Sidebar.tsx           — left navigation (72 lines)
├── RightSidebar.tsx      — watchlist + post lists management (900+ lines)
├── FeedCard.tsx          — tweet/post card display (300+ lines)
├── AiFilteredBadge.tsx   — badge แสดงว่า feed ถูก AI filter
├── UserCard.tsx          — user profile preview popup
│
├── [lazy] ContentWorkspace.tsx   — Content Studio (800+ lines)
│   ├── ContentTabSwitcher.tsx    — search/create tab toggle
│   ├── CreateContent.tsx         — content creation form (923 lines)
│   └── SearchInlineStatus.tsx    — loading indicator
│
├── [lazy] ReadWorkspace.tsx      — Article Archive (250+ lines)
├── [lazy] AudienceWorkspace.tsx  — Expert Discovery (600+ lines)
└── [lazy] BookmarksWorkspace.tsx — Saved Articles (150+ lines)
```

### Lazy Loading Pattern

```typescript
// App.tsx:78-81
const AudienceWorkspace  = lazy(() => import('./components/AudienceWorkspace'));
const BookmarksWorkspace = lazy(() => import('./components/BookmarksWorkspace'));
const ContentWorkspace   = lazy(() => import('./components/ContentWorkspace'));
const ReadWorkspace      = lazy(() => import('./components/ReadWorkspace'));

// ใช้งาน:
<Suspense fallback={<Loader2 />}>
  {activeView === 'content' && <ContentWorkspace ... />}
</Suspense>
```

workspaces ถูก lazy load ทำให้ initial bundle เล็กลง — โหลดเมื่อ user navigate ครั้งแรกเท่านั้น

### `deriveVisibleFeed` — Home Feed Filtering

ใน `appUtils.ts` ใช้คำนวณ feed ที่จะ render:

```typescript
// app.tsx import: deriveVisibleFeed
// ทำงาน:
// 1. merge homeFeed + pendingFeed (ถ้า user approve)
// 2. filter ตาม active list (ถ้ามี)
// 3. filter ตาม quick filter presets
// 4. เรียงตาม created_at (newest first)
```

### Topic Interest Extraction

```typescript
// App.tsx:141-150+
const extractInterestTopics = (items = []) => {
  // สแกน bookmarks + readArchive หา topic scores
  // กรอง TOPIC_STOPWORDS (ไทย/อังกฤษ)
  // ยกเว้น TOPIC_ALLOWLIST ('AI', 'Web3', 'Gaming', ...)
  // return top topics เรียง score
};
```

ใช้ generate "suggested search" ให้ user โดย learn จาก behavior

---

## 9. Build System — `vite.config.js`

### Code Splitting

```javascript
// vite.config.js:16-25
manualChunks(id) {
  if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
  if (id.includes('lucide-react'))                       return 'icons';
  if (id.includes('@ai-sdk') || id.includes('/ai/'))     return 'ai-vendor';
  if (id.includes('marked') || id.includes('dompurify')) return 'markdown-vendor';
}
```

Output chunks:
- `react-vendor` — React + scheduler
- `icons` — lucide-react (ใหญ่มาก ถ้า import ทั้ง library)
- `ai-vendor` — @ai-sdk/xai + ai
- `markdown-vendor` — marked + dompurify
- `index` — app code

### Dev Server Proxy

```javascript
// vite.config.js:91-121
server: {
  proxy: {
    '/api/twitter': {
      target: 'https://api.twitterapi.io',
      rewrite: (path) => path.replace(/^\/api\/twitter/, '/twitter'),
      configure: (proxyServer) => {
        proxyServer.on('proxyReq', (proxyReq) => {
          proxyReq.setHeader('X-API-Key', twitterApiKey);
        });
      },
    },
    '/api/xai': {
      target: 'https://api.x.ai',
      rewrite: (path) => path.replace(/^\/api\/xai/, ''),
      // inject Bearer token
    },
  },
},
```

Dev server ทำ proxy เหมือน production `server.cjs` — environment เหมือนกัน

### Tavily Dev Middleware

```javascript
// vite.config.js:43-86
// Vite custom plugin: inject Tavily api_key ใน dev mode
// เพราะ Vite proxy ไม่รองรับ modify request body
// ต้อง parse body เอง แล้วเพิ่ม api_key ก่อนส่งต่อ
```

### Base Path

```javascript
base: '/test/'  // ทุก asset URL prefix ด้วย /test/
```

---

## 10. Deployment & Environment

### Environment Variables

| Variable | ใช้โดย | เปิดเผยต่อ browser? |
|----------|--------|---------------------|
| `TWITTER_API_KEY` | server.cjs proxy | ❌ ไม่ |
| `XAI_API_KEY` | server.cjs proxy | ❌ ไม่ |
| `TAVILY_API_KEY` | server.cjs proxy | ❌ ไม่ |
| `INTERNAL_API_SECRET` | server.cjs auth guard | ❌ ไม่ |
| `VITE_INTERNAL_API_SECRET` | apiFetch.ts header | ✅ ได้ (ไม่ใช่ real secret) |
| `PORT` | server.cjs listen | ❌ ไม่ |
| `UPSTREAM_TIMEOUT_MS` | server.cjs timeout | ❌ ไม่ |

### Scripts

```json
"dev":        "vite"           // Dev server :5173 + HMR
"build":      "vite build"     // Output → dist/
"start":      "node server.cjs"// Production
"typecheck":  "tsc --noEmit"   // Type check (no strict)
"preview":    "vite preview"   // Preview built files
"docs:dev":   "vitepress dev docs"
```

### Deployment

```toml
# Build: npm run build
# Start: node server.cjs
# Port: $PORT (default 8000)
```

### Request Timeout Chain

```
Browser (apiFetch: 90s)
  └── Express server.cjs (UPSTREAM_TIMEOUT_MS: 120s)
        └── External APIs (AbortSignal.timeout: 120s)
```

browser timeout < server timeout — ป้องกัน hanging connection ที่ server

---

## 11. Feature Map — Flow แต่ละฟีเจอร์

### 11.1 Home Feed Refresh

```
User คลิก Refresh
  └── App.tsx: fetchWatchlistFeed(watchlist.map(u => u.username))
        └── TwitterService: parallel fetch timelines
              └── GET /api/twitter/user/tweets?username=X (per user)
                    └── server.cjs → api.twitterapi.io
  └── ได้ tweets raw → dedupeTweetsById() → sort by date
  └── generateGrokBatch(newTweets)  ← ถ้า tweet ไม่มี Thai summary
        └── POST /api/xai/v1/chat/completions (Grok)
  └── save → localStorage[homeFeed]
  └── setState(homeFeed) → re-render FeedCard list
```

### 11.2 Content Search

```
User พิมพ์ query → submit
  └── App.tsx: analyzeSearchQueryIntent(query)
        └── detect: isNews | isBroad | isProduct
  └── searchEverything(query, { intent })
        ├── สร้าง search variants (Twitter search operators)
        ├── parallel fetch หลาย endpoint
        ├── dedupeTweetsById()
        ├── scoreAllTweets() → composite score
        ├── diversifyByAuthor()
        └── diversifyBroadResults() (ถ้า broad intent)
  └── parallel:
      ├── generateExecutiveSummary(tweets, query)  ← streaming
      └── tavilySearch(query)  ← web context
  └── agentFilterFeed(tweets, query)  ← Grok re-rank (optional)
  └── save all → localStorage[searchResults, searchSummary, searchWebSources]
```

### 11.3 Content Creation

```
User กรอก topic + เลือก format/tone/length → Generate
  └── CreateContent.tsx → GrokService.generateStructuredContent({
        topic, format, tone, length, customInstructions,
        sourcePost (optional), attachedSource (optional)
      })
        ├── Step 1: researchAndPreventHallucination()
        │     ├── tavilySearch(topic)  ← web facts
        │     ├── fetchTweetById(citation_id)  ← source tweet
        │     └── generateObject(FactSheetSchema)  ← extract structured facts
        │           → strengthenPrimaryLeadFactSheet()  ← tighten constraints
        ├── Step 2: buildContentBrief(factSheet, format, tone, length)
        │     └── generateText()  ← brief with format instructions
        └── Step 3: streamText()  ← write final content
              → polishThaiContent()  ← post-process
              → stripEngagementBait(), softenHypeLanguage()
  └── stream chunks → append to textarea in real-time
```

### 11.4 Audience Discovery

```
User เลือก category (Tech/AI/Business/Finance/Gaming/Crypto/...)
  └── AudienceWorkspace → discoverTopExperts(category)
        └── Grok: "list top Twitter experts in {category}"
              → generateObject(ExpertListSchema)
        → return { username, name, bio, why }[]
  └── render UserCard list
  └── User คลิก "Add to Watchlist" → App.tsx.addToWatchlist()
```

### 11.5 Read Archive

```
User drag tweet → "Save to Read"
  └── App.tsx: setReadArchive([...readArchive, post])
        └── save → localStorage[readArchive]

ReadWorkspace render:
  └── useLibraryViews({ readArchive, activeListId, deferredReadSearchQuery, ... })
        ├── filter by activeList membership
        ├── fuzzy search (scoreFuzzyTextMatch)
        ├── sort: date | view_count | engagement
        └── paginate: visibleReadArchive[0..visibleReadCount]

User scroll to bottom → visibleReadCount += READ_ARCHIVE_RENDER_BATCH (24)
```

### 11.6 Bookmark Management

```
User คลิก Bookmark บน FeedCard
  └── App.tsx: setBookmarks([...bookmarks, post])
        └── save → localStorage[bookmarks]

BookmarksWorkspace:
  └── useLibraryViews({ bookmarks, bookmarkTab: 'news'|'article', activeListId })
        ├── tab 'news'    → filter: type !== 'article'
        ├── tab 'article' → filter: type === 'article'
        └── filter by list membership (bookmarkIds Set for O(1))
```

### 11.7 Post Lists (Collections)

```
User สร้าง List ใหม่
  └── RightSidebar → App.tsx: setPostLists([...postLists, { id, name, members: [], color }])

User เพิ่ม member (username) ลง list
  └── update postLists[id].members → save localStorage[postLists]

Active List ใช้กรอง feed:
  └── useLibraryViews: activeReadListMemberSet = new Set(list.members)
        → filter bookmarks/readArchive ให้แสดงเฉพาะ posts ของ members
```

---

## Security Summary

| Threat | Mitigation | File |
|--------|-----------|------|
| Direct API key exposure | Keys ไม่มี `VITE_` prefix → ไม่ bundle ลง browser | `.env` |
| Unauthorized proxy access | `x-internal-token` auth guard | `server.cjs:40` |
| Prompt injection | `sanitizeForPrompt()` strip injection markers | `GrokService.ts:33` |
| XSS via markdown | DOMPurify sanitize HTML | `utils/markdown.ts` |
| SSRF via Tavily | Fixed upstream URL, no user-controlled target | `server.cjs:119` |
| Stale localStorage data | Custom deserializers + sanitizeStoredPost() | `appUtils.ts:44` |

---

*สร้างโดย Claude Code — อ้างอิงจาก source code จริง ณ วันที่ 2026-04-01*
