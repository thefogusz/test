# Audience Workspace

## เป้าหมายของฟีเจอร์

Audience Workspace ช่วยให้ผู้ใช้ค้นหา account, expert หรือกลุ่ม audience ที่น่าสนใจ แล้วเพิ่มผลลัพธ์เหล่านั้นเข้าสู่ watchlist flow ของแอปได้อย่างต่อเนื่อง

## พฤติกรรมปัจจุบัน

- เปิดภายใต้ `activeView = "audience"`
- ภายใน workspace นี้มี 3 tab หลัก คือ `ai`, `sources` และ `manual`
- tab `ai` ใช้ AI-assisted audience search
- tab `manual` ใช้ค้น account แบบ manual
- tab `sources` ใช้ News Sources UI สำหรับ browse และ subscribe RSS sources
- ผลลัพธ์ที่ได้สามารถถูกเพิ่มเข้า watchlist ได้ทันที ถ้า plan และความจุยังอนุญาต
- ใช้กฎเรื่อง watchlist capacity ร่วมกับส่วนอื่นของแอป

## ลำดับการใช้งานหลัก

1. ผู้ใช้เข้ามาที่ Audience Workspace
2. ผู้ใช้เลือกว่าจะใช้ tab แบบ AI, Sources หรือ Manual
3. ถ้าอยู่ tab AI หรือ Manual ผู้ใช้ดูผลลัพธ์ account หรือ audience suggestions
4. ถ้าอยู่ tab Sources ผู้ใช้ browse และ subscribe source ที่สนใจ
5. ผู้ใช้เพิ่มรายการที่ต้องการเข้า watchlist หรือจัดการ source ต่อจากหน้าจอนี้

## กฎสำคัญที่ห้ามหลุด

- ทุก action ที่เพิ่ม account เข้า watchlist ต้องผ่านกฎเรื่อง plan และ capacity ก่อน
- AI search กับ manual search ควรถูกแยก path ให้พอ debug และวัดผลได้
- tab `sources` เป็นส่วนหนึ่งของ Audience Workspace ใน UI ปัจจุบัน ดังนั้นการแก้ News Sources ต้องเช็กผลกระทบกับหน้า audience ด้วย
- ปุ่มหรือ action เพิ่มเข้า watchlist จากหน้าจอนี้ต้องทำงานด้วย semantics เดียวกับ entry point อื่นในแอป
- ถ้ามีการเปลี่ยนผลลัพธ์ limit หรือ add-to-watchlist behavior ต้องอัปเดตเอกสารนี้

## UI States ที่ต้องนึกถึงเวลาแก้

- AI Tab Idle: ยังไม่ค้น
- Loading: กำลังค้นแบบ AI หรือ manual
- Results: มี audience cards พร้อม action
- Sources Tab: แสดง News Sources UI พร้อมจำนวน subscribed sources ถ้ามี
- Empty: ไม่พบผลลัพธ์
- Error: ปัญหาถูกสะท้อนผ่าน status message หรือ UI state ที่กันพังไว้

## ไฟล์หลักที่เกี่ยวข้อง

- `src/App.tsx`
- `src/components/AudienceWorkspace.tsx`
- `src/components/NewsSourcesTab.tsx`
- `src/hooks/useAudienceSearch.ts`
- `src/hooks/useWatchlist.ts`

## Dependency สำคัญ

- billing และ watchlist capacity checks
- hooks สำหรับ audience search และ provider integrations
- shared watchlist state
- RSS catalog และ subscribed sources state สำหรับ tab `sources`

## สิ่งที่ฟีเจอร์นี้ไม่ได้เป็นเจ้าของ

- Home feed rendering
- Content generation workflow
- logic รายละเอียดภายในของ News Sources card และ source catalog

## สัญญาณว่าควรอัปเดตเอกสารหน้านี้

- เปลี่ยนประเภทการค้นหรือ provider ที่ใช้
- เปลี่ยน logic การเพิ่มเข้า watchlist
- เปลี่ยน limit หรือเงื่อนไขของ plan
- เปลี่ยน loading, empty หรือ error behavior ของผลการค้น

## Change Log

- 2026-04-09: สร้างเอกสาร baseline ภาษาไทยสำหรับ Audience Workspace
