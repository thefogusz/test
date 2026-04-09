---
layout: home

hero:
  name: "Foro Docs"
  text: "เอกสาร product และ engineering ที่อิงของจริง"
  tagline: "ให้ทีมเปิดที่เดียวแล้วเข้าใจได้ทันทีว่า feature ทำงานยังไง ตอนนี้อะไรเปลี่ยนไป และจุดไหนต้องตามเอกสารต่อ"
  actions:
    - theme: brand
      text: เริ่มอ่าน
      link: /getting-started
    - theme: alt
      text: เอกสารฟีเจอร์
      link: /features/
    - theme: alt
      text: กติกา Docs
      link: /process/docs-governance

features:
  - title: Source Of Truth ของฟีเจอร์
    details: หน้า feature docs จะบอก behavior, rules, states และจุดที่เกี่ยวข้องกับ implementation เพื่อให้ dev ไม่ต้องเดาจากแชตย้อนหลัง
  - title: ใช้กับทีมที่เปลี่ยนเร็วได้
    details: หน้า architecture อธิบายโครงระบบ ส่วน feature docs อธิบายของจริงที่ยังต้องรักษาไว้ระหว่างรอบแก้งานเร็วๆ
  - title: ผูกกับ PR ได้เลย
    details: ตอนนี้มีทั้งกติกาและ checklist สำหรับ PR เพื่อให้การเปลี่ยน behavior ไปพร้อมกับการอัปเดต docs
---

## วิธีใช้ docs ชุดนี้

เริ่มจาก [Getting Started](/getting-started) เพื่อจับภาพรวมก่อน แล้วค่อยเปิดหน้าใน [เอกสารฟีเจอร์](/features/) ให้ตรงกับส่วนที่กำลังจะแก้

ถ้าพฤติกรรมของระบบเปลี่ยนเพราะมี tradeoff หรือการตัดสินใจเชิง product ให้บันทึกเหตุผลไว้ใน [สารบัญ Decision Log](/decisions/) เพื่อให้ทีมรุ่นถัดไปไม่ต้องเดาว่าทำไมถึงเลือกแบบนี้

หน้า architecture ควรใช้ตอบคำถามว่า "ระบบต่อกันยังไง" ส่วนหน้า feature docs ควรใช้ตอบคำถามว่า "ของที่ผู้ใช้เจอตอนนี้ควรทำงานยังไง"

ถ้าต้องการดูว่าเอกสารตาม code ทันไหมหรือฟีเจอร์ไหนเพิ่งถูกอัปเดต ให้เปิด [สถานะ Docs และ Coverage](/status/) ซึ่งจะสรุปจาก Git และไฟล์ feature registry ของ repo นี้โดยตรง

ถ้าต้องการดูไทม์ไลน์การเปลี่ยนแปลงแบบอ่านง่าย ให้เปิด [Changelog](/changelog/) และถ้ากำลังแก้ branch อยู่แล้วอยากรู้ว่าควรกลับไปอัปเดตหน้า docs ไหน ให้เปิด [Draft Docs Suggestions](/drafts/)

## คำสั่งที่ใช้

```bash
npm run docs:dev
npm run docs:build
```
