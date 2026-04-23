# API Integrations และเว็บไซต์ต้นทาง

> อัปเดต: 23 เมษายน 2026
> ขอบเขต: APIs และเว็บไซต์ภายนอกที่ใช้งานจริงในโปรเจ็กต์นี้

## ภาพรวม

เอกสารนี้รวมข้อมูล:

1. APIs ที่ระบบใช้งาน
2. proxy routes ที่แอปเปิดไว้
3. endpoint ของ provider ต้นทาง
4. ฟีเจอร์ไหนใช้ API ไหน
5. เว็บไซต์และ docs ของแต่ละ provider

ไฟล์ proxy หลัก:

- `server.cjs`

ไฟล์ service หลัก:

- `src/services/TwitterService.ts`
- `src/services/GrokService.ts`
- `src/hooks/useSearchWorkspace.ts`
- `src/hooks/useHomeFeedWorkspace.ts`
- `src/components/CreateContent.tsx`

## แหล่งอ้างอิงหลักของโปรเจก FORO

ถ้าต้องอ้างอิง provider สำหรับโปรเจกแชทนี้ ให้ใช้ชุดนี้เป็นค่าเริ่มต้น:

- ฝั่ง X API: `twitterapi.io` โดยอิง docs หลักจาก `https://docs.twitterapi.io/introduction`
- ฝั่ง LLM: `Grok / xAI` โดยอิง docs ของ xAI เป็นหลัก
- ฝั่ง web grounding และ research: `Tavily`

## แผนที่ Integration

| Local Route / SDK | Upstream | Provider | การใช้งานหลัก |
|---|---|---|---|
| `/api/twitter/*` | `https://api.twitterapi.io/twitter/*` | twitterapi.io | X search, tweet lookup, profile lookup, feed sync |
| `/api/xai/*` | `https://api.x.ai/*` | xAI / Grok | text generation, reasoning, summaries, tool use |
| `/api/tavily/search` | `https://api.tavily.com/search` | Tavily | web search และ source grounding |

---

## 1. twitterapi.io

### Local Proxy

แอปใช้ base path นี้:

```text
/api/twitter
```

กำหนดใน `src/services/TwitterService.ts` — proxy ใน `server.cjs`

### Upstream Base URL

```text
https://api.twitterapi.io/twitter
```

### ฟีเจอร์ที่ใช้

- Home feed sync
- Load more feed
- ค้นหาคอนเทนต์
- Audience discovery
- ค้นหา username / profile แบบ manual
- ดึง tweet ด้วย ID สำหรับสร้างคอนเทนต์
- ตรวจสอบ activity ล่าสุดของ expert

### Endpoint ที่พบในโค้ด

**1. Advanced Search** — `/api/twitter/tweet/advanced_search`

ใช้ใน: watchlist feed, content search, broad search, latest search, expert discovery

**2. Tweet Detail** — `/api/twitter/tweet/detail?tweet_id=...`

ใช้ใน: ดึง tweet ต้นทางเมื่อผู้ใช้วาง X URL, สร้าง source context สำหรับ content generation

**3. Thread Context** — `/api/twitter/tweet/thread_context?tweetId=...`

ใช้ใน: reconstruction ของ thread

**4. Profile Lookup** — ผ่าน `getUserInfo`

ใช้ใน: manual audience search, เพิ่มผู้เขียนเข้า watchlist, hydrate placeholder users

### เว็บไซต์และ Docs

- เว็บหลัก: [twitterapi.io](https://twitterapi.io/)
- Docs หลักที่ควรอ้างอิงสำหรับโปรเจกนี้: [docs.twitterapi.io/introduction](https://docs.twitterapi.io/introduction)

---

## 2. xAI / Grok

### Local SDK / Proxy

แอปตั้งค่า xAI SDK ด้วย:

```text
baseURL: /api/xai/v1
```

กำหนดใน `src/services/GrokService.ts` — proxy ใน `server.cjs`

### Upstream Base URL

```text
https://api.x.ai
```

### โมเดลที่ใช้

กำหนดใน `src/config/aiModels.ts`:

- `grok-4-1-fast-non-reasoning`
- `grok-4-1-fast-reasoning`

### ฟีเจอร์ที่ใช้

- ขยาย search query
- วางแผนการค้นหา
- AI feed filtering
- สร้าง executive summary
- สร้างสรุปภาษาไทยของโพสต์
- แปลบทความเป็นไทย on-demand ใน `ArticleReaderModal`
- normalize content intent
- สร้าง fact-sheet
- เขียนและตรวจสอบคอนเทนต์ขั้นสุดท้าย
- วิเคราะห์วิดีโอและรูปภาพจาก X
- ค้นหาและจัดลำดับ expert

### Workflow หลักของ xAI / Grok

**1. Text Generation** — ใช้ `generateText` / `streamText`

ใช้ใน: สรุปบทความ, แปลบทความ, เขียนบทความ, rewrite

หมายเหตุการแปลบทความ:
- ใช้ `grok-4-1-fast-non-reasoning`
- แปล `title` และ `body` แยกกัน
- body ยาวถูก chunk ก่อนแปล
- ผลลัพธ์ผ่าน post-process cleanup

**2. Structured JSON Generation** — ใช้ `generateObject`

ใช้ใน: filter selection, intent normalization, content brief, search plan, fact-sheet, expert recommendation

**3. xAI Tool Use**

Tools: `x_search`, `view_x_video`

ใช้ใน: วิเคราะห์ X video/image posts, ดึง hooks + key points สำหรับ content generation

### เว็บไซต์และ Docs

- เว็บหลัก: [x.ai](https://x.ai/)
- LLM หลักของโปรเจกนี้: Grok ผ่าน xAI API
- ราคา API: [x.ai/api](https://x.ai/api)
- Developer docs: [docs.x.ai](https://docs.x.ai/)
- Models: [docs.x.ai/developers/models](https://docs.x.ai/developers/models)

---

## 3. Tavily

### Local Proxy

แอปเรียก:

```text
/api/tavily/search
```

กำหนดใน `src/services/GrokService.ts` — proxy ใน `server.cjs`

### Upstream Endpoint

```text
https://api.tavily.com/search
```

### ฟีเจอร์ที่ใช้

- web context สำหรับ search
- research grounding สำหรับ content generation
- resolve URL จากบทความที่วางลิงก์
- สนับสนุน expert discovery
- ตรวจสอบ attached source

### Search Mode ที่พบในโค้ด

**Basic Search** (`search_depth: "basic"`) — ใช้ใน expert discovery, URL resolution

**Advanced Search** (`search_depth: "advanced"`, `include_answer: true`) — ใช้ใน search grounding, fact gathering, content research

### เว็บไซต์และ Docs

- เว็บหลัก: [tavily.com](https://tavily.com/)
- Developer docs: [docs.tavily.com](https://docs.tavily.com/)

---

## 4. เว็บไซต์ภายนอกอื่นที่ Frontend ใช้

ไม่ใช่ backend API หลัก แต่เป็นบริการภายนอกที่แอปเรียกใช้จริง

**Unavatar** — render avatar ของ social account ใน audience discovery
- URL pattern: `https://unavatar.io/twitter/{username}`

**UI Avatars** — สร้าง avatar แบบ fallback
- URL pattern: `https://ui-avatars.com/api/...`

**Google Favicon Service** — fallback favicon/avatar
- URL pattern: `https://www.google.com/s2/favicons?...`

---

## Environment Variables สำหรับ Integration

```text
TWITTER_API_KEY
XAI_API_KEY
TAVILY_API_KEY
INTERNAL_API_SECRET
VITE_INTERNAL_API_SECRET
```

อ้างอิงจาก `server.cjs` และ `src/utils/apiFetch.ts`

## หมายเหตุด้านความปลอดภัย

ตรวจสอบให้แน่ใจว่าไม่มี API key จริงอยู่ใน `.env` ที่ commit เข้า version control หรือแชร์ในสภาพแวดล้อมที่ไม่ปลอดภัย
