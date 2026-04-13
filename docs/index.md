# เริ่มจากตรงนี้

หน้านี้คือทางลัดสำหรับทำความเข้าใจว่า Foro ทำงานอย่างไรในตอนนี้ ทั้งในมุม product, frontend, และ UX/UI

ถ้าเพิ่งเปิดโปรเจกต์นี้ครั้งแรก แนะนำให้อ่านตามลำดับนี้:

1. `src/main.tsx`
2. `src/App.tsx`
3. [UX/UI README](/ux-ui-readme)
4. [เอกสารฟีเจอร์](/features/)
5. [Frontend Architecture](/architecture/frontend)
6. [สถาปัตยกรรมฟีดและการค้นหา](/architecture/feed-search)

## สถานะโปรดักต์ตอนนี้

กติกาหลักที่ควรมองเป็น product contract:

- Home feed มีเพดานการ์ดตามแพ็กเกจ
  - `Free`: 30 cards
  - `Plus`: 100 cards
- AI filter ใช้ขอบเขตเดียวกับการ์ดที่ผู้ใช้มองเห็นได้ตามแพ็กเกจ
- RSS ใช้ระบบ dedup แบบถาวรระหว่าง sync ปกติ
- การล้าง Home feed จะ reset ประวัติ RSS อย่างตั้งใจ
- X sync แยกงานหาโพสต์ใหม่ ออกจากงาน refresh สถิติของการ์ดที่กำลังมองเห็น
- การเปิด RSS article ซ้ำควร reuse cached Thai translation

## ค้นหาตามหัวข้อ

- UX/UI, layout, animation, และ interaction contract
  - [UX/UI README](/ux-ui-readme)
- app shell, navigation, และโครงพื้นที่ทำงาน
  - [โครงแอปหลัก](/features/app-shell)
  - [Frontend Architecture](/architecture/frontend)
- พฤติกรรม sync ของ Home, RSS และ X
  - [หน้าโฮมฟีด](/features/home-feed)
  - [สถาปัตยกรรมฟีดและการค้นหา](/architecture/feed-search)
- การสร้างคอนเทนต์และ article reader
  - [พื้นที่ทำคอนเทนต์](/features/content-workspace)
- การค้นหา Audience
  - [พื้นที่ค้นหา Audience](/features/audience-workspace)
- ขีดจำกัดของแพ็กเกจและการ upgrade
  - [หน้าแพ็กเกจ](/features/pricing-workspace)
- ต้นทุน API และ provider
  - [วิเคราะห์ต้นทุน API](/cost-analysis)

## ทำไม Docs ถึงสำคัญ

ใช้ docs ชุดนี้เป็น product truth ไม่ใช่แค่เอกสาร onboarding

เมื่อ behavior ในโค้ดเปลี่ยน หน้า docs ที่เกี่ยวข้องต้องอัปเดตในคอมมิตหรือ PR เดียวกัน เพื่อให้ทีม dev และ LLM เข้าใจ "ของที่ระบบทำจริงตอนนี้" โดยไม่ต้องไล่ย้อนจากแชตหรือ PR เก่า

สำหรับงานหน้าจอ ให้ถือว่า [UX/UI README](/ux-ui-readme) เป็นภาษากลางสำหรับคุยว่าแต่ละ workspace, state, และ animation ถูกออกแบบให้ทำงานอย่างไร
