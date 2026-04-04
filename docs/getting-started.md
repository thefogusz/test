# อ่านเริ่มจากตรงนี้

หน้านี้ออกแบบมาสำหรับ dev ที่เพิ่งเปิดโปรเจ็กต์ครั้งแรกและอยากเข้าใจระบบให้เร็วที่สุด

## ถ้าจะไล่ระบบแบบเร็ว

อ่านตามลำดับนี้:

1. `src/main.tsx`
2. `src/App.tsx`
3. `src/services/TwitterService.ts`
4. `src/services/GrokService.ts`
5. `src/components/CreateContent.tsx`
6. `server.cjs`

ถ้าอ่านตามนี้ จะเห็นทั้ง entry point, state กลาง, data flow, AI flow และ proxy integration ครบ

## Mental Model ของระบบ

Foro คือแอป React ตัวเดียวที่ทำ 3 อย่างพร้อมกัน:

- ดึงข่าวและโพสต์จาก X
- ใช้ AI ช่วยคัดกรอง แปล และสรุป
- ใช้ AI สร้างคอนเทนต์ภาษาไทยจากข้อมูลที่ค้นคว้าแล้ว

พูดแบบง่ายที่สุด:

```text
UI ใน App.tsx
  -> เรียก service
  -> service คุยกับ proxy
  -> proxy คุยกับ external APIs
  -> ผลลัพธ์กลับมาเก็บใน state + storage
  -> UI render ต่อ
```

## ถ้าจะ debug feature หลัก

### Feed ไม่ขึ้น

ดูไฟล์:

- `src/App.tsx`
- `src/hooks/useHomeFeedWorkspace.ts`
- `src/services/TwitterService.ts`
- `server.cjs`

ดู flow:

- `handleSync()`
- `fetchWatchlistFeed()`

### Search ผลไม่ตรง

ดูไฟล์:

- `src/App.tsx`
- `src/hooks/useSearchWorkspace.ts`
- `src/services/GrokService.ts`
- `src/services/TwitterService.ts`

ดู flow:

- `handleSearch()`
- `expandSearchQuery()`
- `searchEverything()`
- `agentFilterFeed()`
- `generateExecutiveSummary()`

### AI สร้างคอนเทนต์ไม่ตรง

ดูไฟล์:

- `src/components/CreateContent.tsx`
- `src/services/GrokService.ts`

ดู flow:

- `handleGenerate()`
- `researchAndPreventHallucination()`
- `buildContentBrief()`
- `generateStructuredContentV2()`

### อยากเข้าใจต้นทุนระบบ

ดูเอกสาร:

- [Cost Analysis](/cost-analysis)
- [API Integrations](/api-integrations)

## หน้าที่ของไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
| :--- | :--- |
| `src/main.tsx` | boot app |
| `src/App.tsx` | state กลาง + orchestration ของทุก feature |
| `src/hooks/useHomeFeedWorkspace.ts` | flow ของ home feed และ sync |
| `src/hooks/useSearchWorkspace.ts` | flow ของ search workspace |
| `src/services/TwitterService.ts` | ดึงข้อมูลจาก X และจัดรูปข้อมูล |
| `src/services/GrokService.ts` | AI logic ทั้งระบบ |
| `src/components/CreateContent.tsx` | UI ของ content generation |
| `server.cjs` | proxy ไป Twitter, xAI และ Tavily |

## แผนการอ่านต่อ

- เริ่มจาก [ภาพรวมระบบ](/architecture/overview)
- ถ้าอยากเข้าใจ UI และ state ก่อน ไปที่ [Frontend](/architecture/frontend)
- ถ้าสนใจ flow ข่าวและการค้นหา ไปที่ [Feed และ Search](/architecture/feed-search)
- ถ้าสนใจ AI writer ไปที่ [AI Content Pipeline](/architecture/ai-pipeline)
- ถ้ากำลังไล่ดูว่าใช้ provider ไหนบ้าง ไปที่ [API Integrations](/api-integrations)
- ถ้ากำลังทำระบบเก็บเงินหรือวิเคราะห์ต้นทุน ไปที่ [Cost Analysis](/cost-analysis)
