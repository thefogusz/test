# เอกสารฟีเจอร์

หน้าในหมวดนี้คือ source of truth ของพฤติกรรมจริงใน Foro ณ ตอนนี้

เปิด feature docs เมื่อต้องการตอบคำถามพวกนี้:

- ฟีเจอร์นี้ตอนนี้ทำอะไรอยู่จริง
- มี state หรือ business rule อะไรที่ห้ามทำพัง
- ไฟล์หรือ hook ไหนน่าจะเกี่ยวมากที่สุด
- คำขอใหม่เป็น bug fix, งาน polish หรือเป็น behavior change กันแน่

## กติกาการใช้งาน

ถ้า PR เปลี่ยนพฤติกรรมที่ผู้ใช้เห็น เปลี่ยน business rule เปลี่ยน loading/empty/error state หรือเปลี่ยน expectation ของ integration ต้องอัปเดตหน้า feature doc ที่เกี่ยวข้องใน PR เดียวกัน

ถ้ายังไม่มีหน้าของฟีเจอร์นั้น ให้สร้างหน้าใหม่จาก [Template เอกสารฟีเจอร์](/process/feature-template)

## ฟีเจอร์ที่มีเอกสารแล้ว

หมายเหตุ: หน้าที่มีอยู่ตอนนี้ผ่านการไล่เทียบกับโค้ดของ workspaces หลักในรอบนี้แล้ว แต่ยังไม่ครอบคลุมทุก view ของแอปทั้งหมด เช่น `read`, `bookmarks`, `pricing` และ flow ย่อยบางส่วนยังควรมีหน้าแยกเพิ่ม

- [Home Feed](/features/home-feed)
- [Content Workspace](/features/content-workspace)
- [Read Workspace](/features/read-workspace)
- [News Sources](/features/news-sources)
- [Audience Workspace](/features/audience-workspace)
- [Bookmarks Workspace](/features/bookmarks-workspace)
- [Pricing Workspace](/features/pricing-workspace)

## เอกสารที่เกี่ยวข้อง

- [กติกาการอัปเดต Docs](/process/docs-governance)
- [สารบัญ Decision Log](/decisions/)
- [สถานะ Docs และ Coverage](/status/)
- [Architecture Overview](/architecture/overview)
