# กติกาการอัปเดต Docs

repo นี้ใช้ docs เป็น living source of truth ของพฤติกรรม product ไม่ใช่แค่เอกสาร architecture

## กติกาหลัก

ให้อัปเดต docs ใน PR เดียวกันทันที ถ้าการเปลี่ยนแปลงนั้นมีอย่างใดอย่างหนึ่งต่อไปนี้

- เปลี่ยนพฤติกรรมที่ผู้ใช้เห็น
- เปลี่ยน business rule หรือ limit
- เพิ่มหรือลดขั้นตอนใน workflow
- เปลี่ยน loading, empty, success หรือ error state
- เปลี่ยน expectation ของ external integration
- เพิ่มฟีเจอร์ใหม่

โดยปกติไม่จำเป็นต้องอัปเดต docs ถ้าเป็นแค่:

- refactor ภายในที่ไม่เปลี่ยน behavior
- rename หรือ cleanup โค้ดอย่างเดียว
- styling-only change ที่ไม่เปลี่ยน UX behavior
- test-only change

## แยกหน้าที่ของเอกสารให้ชัด

ให้แยก 3 ชั้นนี้ออกจากกันเสมอ:

- Feature docs: ตอนนี้ product ทำอะไรอยู่จริง
- Decision logs: ทำไมทีมถึงเลือก behavior หรือ tradeoff แบบนี้
- Architecture docs: ระบบเชื่อมกันยังไง

ถ้าเอา 3 ชั้นนี้มาปนกัน docs จะ drift เร็วมาก เพราะข้อมูลคนละแบบอัปเดตไม่พร้อมกัน

## Workflow ที่ควรทำทุกครั้ง

1. หาเอกสารเดิมใน `docs/features/` ให้เจอก่อน
2. อัปเดตหัวข้อ `พฤติกรรมปัจจุบัน`, `กฎสำคัญ`, `UI States` และ `Change Log` ถ้ามีผลกระทบ
3. ถ้าการเปลี่ยนนี้มาจากการตัดสินใจเชิง product หรือ tradeoff ให้เพิ่มหรืออัปเดต decision log ด้วย
4. ส่ง code และ docs ไปใน PR เดียวกัน

## ระบบติดตามการอัปเดต

เว็บ docs ชุดนี้มีหน้า [สถานะ Docs และ Coverage](/status/) ซึ่ง build จากไฟล์ registry และข้อมูล Git ใน repo โดยตรง เพื่อช่วยตอบคำถามเหล่านี้:

- หน้าไหนเพิ่งอัปเดตล่าสุด
- ฟีเจอร์ไหน code ใหม่กว่า docs
- มีไฟล์ source ไหนที่แก้ค้างแต่ docs ยังไม่ถูกแตะ
- `activeView` ไหนยังไม่มี coverage

หน้ารายงานที่เป็น generated dashboard เช่น [สถานะ Docs และ Coverage](/status/), [Changelog](/changelog/) และ [Draft Docs Suggestions](/drafts/) ใช้ snapshot data ที่ generate ตอน `docs:dev` และ `docs:build` โดยตรง ไม่ได้พึ่ง runtime fetch จาก path พิเศษระหว่างเปิดหน้า

ผลที่คาดหวังคือ:

- ถ้า build ผ่าน หน้า dashboard ควรเปิดได้แม้รันจาก static output
- ถ้าข้อมูลบนหน้าแปลก ให้เช็ก `npm run docs:data` หรือ `npm run docs:build` ก่อนว่ารายงานล่าสุดถูก regenerate แล้วหรือยัง
- ถ้าในโค้ดมี `ActiveView` ใหม่ แต่หน้า status ยังไม่ track ระบบควรเตือนบนหน้า status เอง เพื่อให้เพิ่ม coverage ใน registry หรือปรับ type ให้ตรงกับของจริง

สถานะหลักที่ใช้ตอนนี้:

- `ok`: docs ยังตาม source ทัน
- `needs-review`: source ใหม่กว่า docs
- `source-dirty`: source มีการแก้ค้าง ควรเช็ก docs
- `docs-dirty`: docs มีการแก้ค้างยังไม่ commit
- `missing`: ยังไม่มี metadata หรือ coverage ที่ระบบตามได้

อีกสัญญาณที่ควรดูคือ `ActiveView ที่ประกาศในโค้ดแต่ยังไม่ถูก track`

- ถ้าค่านี้มากกว่า 0 แปลว่า source of truth ระหว่าง type กับ docs tracker ยังไม่ตรงกัน
- ก่อน merge ควรตัดสินใจให้ชัดว่าจะเพิ่ม coverage ให้ view นั้น หรือเอาค่าที่ไม่ใช้แล้วออกจาก type/registry

## Automation ที่เพิ่มเข้ามา

ตอนนี้ repo นี้มี automation 2 ชั้น:

- หน้า [Changelog](/changelog/) สำหรับสรุปว่า commit ล่าสุดกระทบฟีเจอร์ไหน
- หน้า [Draft Docs Suggestions](/drafts/) สำหรับดูว่าการเปลี่ยนใน branch ปัจจุบันควรกลับไปอัปเดต docs หน้าไหน

ใน GitHub Actions ยังมี workflow ที่สามารถคอมเมนต์ draft docs summary กลับเข้า pull request อัตโนมัติได้ด้วย เพื่อให้ reviewer เห็นเลยว่ามีฟีเจอร์ไหนได้รับผลกระทบและ docs ถูกแตะแล้วหรือยัง

## คำถามที่ reviewer ควรถามก่อน merge

ก่อน merge ให้ถามประโยคนี้:

`ถ้าพรุ่งนี้มี dev อีกคนมาเปิด docs เขาจะเข้าใจ behavior ปัจจุบันของระบบโดยไม่ต้องไล่อ่าน PR นี้ไหม`

## คำสั่งที่ใช้

```bash
npm run docs:dev
npm run docs:build
```
