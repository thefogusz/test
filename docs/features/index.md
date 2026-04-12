# สารบัญเอกสารฟีเจอร์

หน้าในหมวดนี้คือ product source of truth ของพฤติกรรมที่ผู้ใช้เห็นจริงใน Foro

ใช้หน้านี้เพื่อตอบคำถามว่า:

- ตอนนี้ฟีเจอร์นั้นควรทำอะไร
- กติกาไหนคือ product rule ที่ตั้งใจไว้
- ไฟล์ไหนเป็นเจ้าของ behavior นี้
- edge case ไหนห้าม regress

## หน้าที่ควรอ่านก่อนในตอนนี้

หน้าต่อไปนี้สำคัญกับพฤติกรรมปัจจุบันของระบบมากเป็นพิเศษ:

- [หน้าฟีดหลัก](/features/home-feed)
- [App Shell](/features/app-shell)
- [พื้นที่ทำคอนเทนต์](/features/content-workspace)
- [พื้นที่ค้นหา Audience](/features/audience-workspace)
- [Bookmarks Workspace](/features/bookmarks-workspace)
- [หน้าราคาแพ็กเกจ](/features/pricing-workspace)
- [พื้นที่อ่าน](/features/read-workspace)
- [แหล่งข่าว](/features/news-sources)

## ประเด็นที่กระทบหลายฟีเจอร์พร้อมกัน

มี product change หลายอย่างที่ตอนนี้เชื่อมกันข้ามหลายฟีเจอร์:

- เพดานการ์ดของโฮมฟีดตามแพ็กเกจ:
  - `Free`: 30 cards
  - `Plus`: 100 cards
- ขอบเขตของ AI filter ต้องใช้เพดานเดียวกับฟีดที่มองเห็นอยู่
- RSS ใช้ durable duplicate suppression ระหว่าง sync ปกติ แต่ถ้าล้าง Home feed จะ reset ประวัติ RSS โดยตั้งใจ
- X feed แยกงานค้นหาโพสต์ใหม่ออกจากงาน refresh สถิติของการ์ดที่กำลังแสดง
- การแปลใน article reader ควร reuse ผลลัพธ์ที่ cache ไว้เมื่อเปิดบทความ RSS เดิมซ้ำ
- การ์ดแนะนำใน Audience ต้องมีคำอธิบายภาษาไทยที่ใช้งานได้จริง

## กติกาสำหรับ PR ต่อไป

ถ้า PR เปลี่ยนเรื่องใดเรื่องหนึ่งต่อไปนี้ ให้แก้เอกสารฟีเจอร์ที่เกี่ยวข้องใน PR เดียวกัน:

- พฤติกรรมที่ผู้ใช้มองเห็น
- business rule
- plan limits
- loading, empty หรือ error states
- expectation ของ integration

## เอกสารที่เกี่ยวข้อง

- [กติกาการอัปเดต Docs](/process/docs-governance)
- [ภาพรวมสถาปัตยกรรม](/architecture/overview)
- [สถาปัตยกรรมฟีดและการค้นหา](/architecture/feed-search)
- [Cost Analysis](/cost-analysis)
