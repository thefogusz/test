# Read Workspace

## เป้าหมายของฟีเจอร์

Read Workspace เป็นคลังสำหรับบทความหรือโพสต์ที่ผู้ใช้เก็บไว้อ่านแบบต่อเนื่อง จุดประสงค์คือให้ผู้ใช้กลับมาทบทวนรายการที่คัดไว้แล้วได้ง่าย ค้นย้อนหลังได้ และค่อยแตกต่อไปยังการอ่านเต็มหรือการสร้างคอนเทนต์

## พฤติกรรมปัจจุบัน

- เปิดภายใต้ `activeView = "read"`
- แสดงรายการจาก `readArchive` ที่ถูก persist ไว้
- มี search input, suggestion pills และตัวกรอง `view` กับ `engagement`
- ใช้ `FeedCard` ในการแสดงรายการ ทำให้ยัง bookmark ซ้ำ เปิดอ่านต่อ หรือส่งไปสร้างคอนเทนต์ได้
- รองรับการ load เพิ่มทีละ batch ผ่าน `visibleReadCount`

## ลำดับการใช้งานหลัก

1. ผู้ใช้เข้ามาที่ Read Workspace
2. ผู้ใช้ค้นหาหรือกด suggestion เพื่อกรองรายการใน archive
3. ผู้ใช้เปิดอ่านรายการที่สนใจ หรือกดส่งต่อไปยัง article/read flow อื่น
4. ถ้ามีรายการจำนวนมาก ผู้ใช้กดโหลดเพิ่มเพื่อดูต่อ

## กฎสำคัญที่ห้ามหลุด

- `readArchive` คือ source หลักของหน้านี้ ถ้าไม่มีรายการต้องแสดง empty state ที่ชัด
- search เป็นการกรองภายใน archive ไม่ใช่การยิงค้นหาใหม่จากภายนอก
- การกด filter `view` และ `engagement` ต้องมีผลกับรายการที่แสดงจริง
- load more ต้องเพิ่มจำนวนรายการที่เห็นโดยไม่ทำให้รายการเดิมหายหรือ reorder แบบไม่ตั้งใจ

## UI States ที่ต้องนึกถึงเวลาแก้

- Empty Library: ยังไม่มีรายการใน archive
- Search Active: มีคำค้นหรือ suggestion ที่กำลังใช้กรอง
- Empty Search: มี archive แต่ไม่พบรายการที่ตรงกับคำค้น
- Filtered Results: รายการถูกจัดตาม filter ปัจจุบัน
- Load More Available: ยังมีรายการซ่อนอยู่และสามารถกดโหลดเพิ่มได้

## ไฟล์หลักที่เกี่ยวข้อง

- `src/App.tsx`
- `src/components/ReadWorkspace.tsx`
- `src/components/FeedCard.tsx`

## Dependency สำคัญ

- `readArchive` persistence
- search suggestion state ของ archive
- shared article actions จาก `FeedCard`

## สิ่งที่ฟีเจอร์นี้ไม่ได้เป็นเจ้าของ

- การ fetch feed ใหม่จากแหล่งข้อมูลภายนอก
- การจัดการ pricing
- logic หลักของ content generation

## สัญญาณว่าควรอัปเดตเอกสารหน้านี้

- เปลี่ยนวิธีค้นหรือ suggestion logic
- เปลี่ยนการจัดการ load more
- เปลี่ยนความหมายของ filter
- เปลี่ยน empty/search-empty behavior

## Change Log

- 2026-04-09: สร้างเอกสาร baseline ภาษาไทยสำหรับ Read Workspace
