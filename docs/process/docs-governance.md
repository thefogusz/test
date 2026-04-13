# กติกาการอัปเดต Docs

repo นี้ใช้ docs เป็น living source of truth ของ product, frontend behavior, และ UX/UI ไม่ใช่แค่เอกสารประกอบ

## กติกาหลัก

ทุกครั้งที่โค้ดถูกเปลี่ยน ต้องพิจารณา docs ใน PR เดียวกันเสมอ

กติกาที่ใช้กับ repo นี้คือ:

- ถ้า code change กระทบ behavior ของฟีเจอร์ ต้องอัปเดต feature doc ที่เกี่ยวข้อง
- ถ้า code change กระทบ layout, interaction, responsive behavior, state บนหน้าจอ, animation, หรือ visual hierarchy ต้องอัปเดต UX/UI doc ด้วย
- ถ้า code change กระทบทั้ง behavior และ UI ต้องอัปเดตทั้ง 2 ฝั่งพร้อมกัน
- ห้ามปล่อยให้โค้ดเปลี่ยนไป แต่ `.md` ยังอธิบายของเก่าอยู่

สรุปสั้น ๆ:

- `code เปลี่ยน -> docs ต้องถูกเช็ก`
- `feature เปลี่ยน -> feature docs ต้องอัปเดต`
- `ui/ux เปลี่ยน -> ux-ui-readme.md ต้องอัปเดต`
- `ทั้งคู่เปลี่ยน -> อัปเดตทั้งคู่`

## จุดที่ถือว่า "ต้องอัปเดต docs"

### Feature docs

ให้อัปเดตเมื่อมีอย่างใดอย่างหนึ่ง:

- เปลี่ยนพฤติกรรมที่ผู้ใช้เห็น
- เปลี่ยน business rule หรือ limit
- เพิ่มหรือลดขั้นตอนใน workflow
- เปลี่ยน loading, empty, success, error state
- เปลี่ยน expectation ของ integration
- เพิ่มฟีเจอร์ใหม่

### UX/UI docs

ให้อัปเดตเมื่อมีอย่างใดอย่างหนึ่ง:

- เปลี่ยน layout ของ app shell หรือ workspace
- เปลี่ยน navigation behavior
- เปลี่ยน interaction ของปุ่ม, modal, sheet, switcher, filter, search, card
- เปลี่ยน responsive behavior desktop / tablet / mobile
- เปลี่ยน animation intent หรือ state transition ที่มีความหมายต่อ UX
- เปลี่ยน hierarchy ของข้อมูลบนหน้าจอ
- เปลี่ยนภาษากลางที่ทีมใช้คุยกับ LLM เรื่องหน้าจอ

## ไฟล์ docs ที่ต้องนึกถึงก่อน merge

- `docs/features/*.md`
- `docs/architecture/*.md`
- `docs/ux-ui-readme.md`
- `README.md`

## กรณีที่ "ไม่ควรข้าม" UX/UI doc

ถึงจะดูเหมือนเป็น styling change ก็ห้ามข้าม `docs/ux-ui-readme.md` ถ้ามันกระทบ:

- ความรู้สึกของ interaction
- animation ที่สื่อ state
- ความสามารถในการใช้งานบน mobile
- ลำดับความเด่นของข้อมูล
- การรับรู้ว่าอะไรคือ primary action

พูดง่าย ๆ คือ ถ้า dev หรือ LLM อ่าน doc เดิมแล้วจะเผลอทำของใหม่ผิด intention ให้ถือว่าต้องอัปเดต

## Workflow ที่ต้องทำทุกครั้ง

1. ระบุให้ชัดว่า code change นี้กระทบ feature ไหนบ้าง
2. เช็กหน้าใน `docs/features/` ที่เกี่ยวข้อง
3. ถ้ามีผลกับหน้าจอ ให้เช็ก `docs/ux-ui-readme.md` ด้วยเสมอ
4. ถ้ามีผลกับโครงรวมของ frontend หรือ shell ให้เช็ก `docs/architecture/frontend.md` หรือ `docs/features/app-shell.md`
5. อัปเดต `Change Log` ของหน้าที่แก้ ถ้ามี section นี้อยู่
6. ส่ง code และ docs ใน PR เดียวกัน

## Checklist ก่อนปิดงาน

- behavior ใหม่ถูกสะท้อนใน docs แล้วหรือยัง
- UI state ใหม่ถูกสะท้อนใน docs แล้วหรือยัง
- animation / interaction ที่เปลี่ยน ถูกอธิบายใน UX/UI doc แล้วหรือยัง
- ถ้ามี workspace ใหม่หรือ flow ใหม่ หน้า index / nav ของ docs ต้องลิงก์ถึงหรือยัง
- ถ้า dev ใหม่มาเปิด docs วันนี้ เขาจะเข้าใจของจริงโดยไม่ต้องอ่าน PR หรือแชตเก่าหรือยัง

## Reviewer rule

ก่อน merge ให้ถามประโยคนี้:

`ถ้าวันพรุ่งนี้มี dev อีกคนมาเปิด docs เขาจะเข้าใจ behavior และ UX/UI ปัจจุบันของระบบโดยไม่ต้องไล่อ่าน PR นี้ไหม`

ถ้าคำตอบคือไม่ ให้ถือว่างาน docs ยังไม่ครบ

## Automation และ dashboard

ใช้หน้าเหล่านี้ช่วยเช็กว่ามี docs ไหนตามไม่ทัน:

- [สถานะ Docs และ Coverage](/status/)
- [Changelog](/changelog/)
- [Draft Docs Suggestions](/drafts/)

และใช้คำสั่งนี้ก่อนส่งงาน:

```bash
npm run docs:build
```

## เอกสารแม่แบบที่ต้องใช้

- ฟีเจอร์ใหม่หรือ behavior ใหม่: ใช้ `docs/process/feature-template.md`
- งาน UX/UI: อัปเดต `docs/ux-ui-readme.md`
- งาน architecture ระดับระบบ: อัปเดต `docs/architecture/*.md`

## Change Log

- 2026-04-13: เพิ่มกติกาชัดเจนว่า every code change must review docs, และถ้ากระทบ UI/UX ต้องอัปเดต `docs/ux-ui-readme.md` ทุกครั้ง
