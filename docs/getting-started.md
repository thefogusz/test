# อ่านเริ่มจากตรงนี้

หน้านี้ออกแบบมาสำหรับ dev ที่เพิ่งเปิดโปรเจกต์ครั้งแรกและอยากเข้าใจระบบเร็วที่สุด

## ถ้าจะไล่ระบบแบบเร็ว

อ่านตามลำดับนี้:

1. `src/main.jsx`
2. `src/App.jsx`
3. `src/services/TwitterService.js`
4. `src/services/GrokService.js`
5. `src/components/CreateContent.jsx`
6. `server.cjs`

ถ้าอ่านตามนี้ จะเห็นทั้ง entry point, state กลาง, data flow, AI flow และ proxy integration ครบ

## Mental Model ของระบบ

Foro คือแอป React ตัวเดียวที่ทำ 3 อย่างพร้อมกัน:

- ดึงข่าว/โพสต์จาก X
- ใช้ AI ช่วยคัดกรอง แปล และสรุป
- ใช้ AI สร้างคอนเทนต์ไทยจากข้อมูลที่ค้นคว้าแล้ว

พูดแบบง่ายที่สุด:

```text
UI ใน App.jsx
  -> เรียก service
  -> service คุยกับ proxy
  -> proxy คุยกับ external APIs
  -> ผลลัพธ์กลับมาเก็บใน state + localStorage
  -> UI render ต่อ
```

## ถ้าจะ debug feature หลัก

### Feed ไม่ขึ้น

ดูไฟล์:

- `src/App.jsx`
- `src/services/TwitterService.js`
- `server.cjs`

ดูฟังก์ชันหลัก:

- `handleSync()`
- `fetchWatchlistFeed()`

### Search ผลไม่ตรง

ดูไฟล์:

- `src/App.jsx`
- `src/services/GrokService.js`
- `src/services/TwitterService.js`

ดู flow:

- `handleSearch()`
- `expandSearchQuery()`
- `searchEverything()`
- `agentFilterFeed()`
- `generateExecutiveSummary()`

### AI สร้างคอนเทนต์ไม่ตรง

ดูไฟล์:

- `src/components/CreateContent.jsx`
- `src/services/GrokService.js`

ดู flow:

- `handleGenerate()`
- `researchAndPreventHallucination()`
- `buildContentBrief()`
- `generateStructuredContentV2()`

## หน้าที่ของไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
| :--- | :--- |
| `src/main.jsx` | boot app |
| `src/App.jsx` | state กลาง + orchestration ของทุก feature |
| `src/services/TwitterService.js` | ดึงข้อมูลจาก X |
| `src/services/GrokService.js` | AI logic ทั้งระบบ |
| `src/components/CreateContent.jsx` | UI ของ content generation |
| `server.cjs` | proxy ไป Twitter, xAI, Tavily |

## แผนการอ่านต่อ

- เริ่มจาก [ภาพรวมระบบ](/architecture/overview)
- ถ้าอยากเข้าใจ UI และ state ก่อน ไปที่ [Frontend](/architecture/frontend)
- ถ้าสนใจ flow ข่าวและการค้นหา ไปที่ [Feed และ Search](/architecture/feed-search)
- ถ้าสนใจ AI writer ไปที่ [AI Content Pipeline](/architecture/ai-pipeline)
