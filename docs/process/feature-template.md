# Template เอกสารฟีเจอร์

คัดโครงนี้ไปใช้เวลาเพิ่มหน้าใหม่ใน `docs/features/`

```md
# ชื่อฟีเจอร์

## เป้าหมายของฟีเจอร์

ฟีเจอร์นี้มีไว้เพื่ออะไร และแก้ปัญหาอะไรให้ผู้ใช้

## พฤติกรรมปัจจุบัน

- อธิบาย behavior ที่เกิดขึ้นจริงบน branch ปัจจุบัน
- เน้นสิ่งที่ dev ต้องรักษาไว้ไม่ให้พัง

## ลำดับการใช้งานหลัก

1. ผู้ใช้เริ่มตรงไหน
2. ผู้ใช้ทำอะไร
3. ระบบตอบสนองอย่างไร

## กฎสำคัญที่ห้ามหลุด

- business rules
- limits
- assumptions สำคัญ

## UI States ที่ต้องนึกถึงเวลาแก้

- Loading
- Empty
- Success
- Error

## ไฟล์หลักที่เกี่ยวข้อง

- `src/...`
- `server/...`

## Dependency สำคัญ

- APIs
- state hooks
- background jobs

## สิ่งที่ฟีเจอร์นี้ไม่ได้เป็นเจ้าของ

- ระบุให้ชัดว่าฟีเจอร์นี้ไม่ได้ดูแลอะไรบ้าง

## สัญญาณว่าควรอัปเดตเอกสารหน้านี้

- มีการเปลี่ยน flow หรือ rules
- มี state ใหม่
- มีข้อจำกัดใหม่

## Change Log

- YYYY-MM-DD: บันทึกสั้น ๆ
```

## กติกาเพิ่มสำหรับ repo นี้

เวลาใช้ template นี้ ให้เช็กคู่กับ `docs/ux-ui-readme.md` เสมอ

- ถ้าแก้ behavior ของฟีเจอร์: อัปเดตหน้าใน `docs/features/`
- ถ้าแก้ interaction, layout, responsive, animation, หรือ state บนหน้าจอ: อัปเดต `docs/ux-ui-readme.md` เพิ่มด้วย
- ถ้าเปลี่ยนทั้ง behavior และ UX/UI: ต้องอัปเดตทั้งสองฝั่งใน PR เดียวกัน

## คำแนะนำเรื่องการตั้งชื่อ

ให้ใช้หนึ่งหน้าต่อหนึ่ง feature area ไม่ใช่หนึ่งหน้าต่อหนึ่ง component

ตัวอย่างที่ดี:

- `docs/features/home-feed.md`
- `docs/features/news-sources.md`

ตัวอย่างที่ควรเลี่ยง:

- `docs/features/button.md`
- `docs/features/sidebar-icon.md`
