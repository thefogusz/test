---
layout: home

hero:
  name: "Foro Docs"
  text: "เอกสาร product และ engineering ที่อิงของจริง"
  tagline: "ให้ทีมเปิดที่เดียวแล้วเข้าใจตรงกันว่า feature ตอนนี้ทำงานยังไง อะไรเพิ่งเปลี่ยน และจุดไหนต้องยึดเป็น source of truth"
  actions:
    - theme: brand
      text: เริ่มอ่าน
      link: /getting-started
    - theme: alt
      text: ดูฟีเจอร์ทั้งหมด
      link: /features/
    - theme: alt
      text: ดูสถานะ Docs
      link: /status/

features:
  - title: Feature Docs ที่อิง UI จริง
    details: อธิบาย behavior, states, rules และข้อควรระวังของแต่ละ workspace เพื่อให้ dev ไม่ต้องเดาจากแชตย้อนหลัง
  - title: เห็นได้เลยว่าอะไรเพิ่งเปลี่ยน
    details: ใช้ Status, Changelog และ Draft Suggestions เพื่อดูว่า docs หน้าไหนตาม code ทัน หน้าไหนควรอัปเดตต่อ
  - title: ใช้กับทีมที่เปลี่ยนเร็วได้จริง
    details: แยกของจริงตอนนี้ออกจากไอเดียในอนาคต และผูกการอัปเดต docs เข้ากับ PR / workflow ของทีม
---

## เริ่มจากตรงไหน

ถ้าต้องการภาพรวมของระบบ ให้เริ่มที่ [Getting Started](/getting-started) และ [Architecture Overview](/architecture/overview) ก่อน  
ถ้ากำลังจะแก้หน้าหรือ flow ใดโดยตรง ให้เปิดจาก [สารบัญฟีเจอร์](/features/) แล้วไล่เข้า feature page ที่เกี่ยวข้องทันที

## เส้นทางที่ทีมใช้บ่อย

<div class="foro-home-grid">
  <a class="foro-home-card" href="/features/">
    <span class="foro-home-card-kicker">Features</span>
    <strong>เปิดดู behavior ของฟีเจอร์จริง</strong>
    <p>เหมาะตอนจะลงมือแก้ UI, states, interaction หรือ business rules ของ workspace แต่ละส่วน</p>
  </a>
  <a class="foro-home-card" href="/status/">
    <span class="foro-home-card-kicker">Status</span>
    <strong>เช็กว่า docs ตาม code ทันไหม</strong>
    <p>ดู coverage, recent updates และหน้าที่ source code ใหม่กว่า docs เพื่อรู้ว่าจุดไหนต้องรีบตาม</p>
  </a>
  <a class="foro-home-card" href="/changelog/">
    <span class="foro-home-card-kicker">Changelog</span>
    <strong>ดูการเปลี่ยนแปลงล่าสุดแบบอ่านง่าย</strong>
    <p>เหมาะกับคนที่อยากตามว่ารอบนี้มีอะไรเปลี่ยน โดยไม่ต้องไปเปิด commit history เอง</p>
  </a>
  <a class="foro-home-card" href="/drafts/">
    <span class="foro-home-card-kicker">Drafts</span>
    <strong>ดูว่าควรกลับไปอัปเดตหน้าไหน</strong>
    <p>เหมาะตอนแก้ branch อยู่แล้วอยากเช็กว่ามี feature ไหนควรแก้เอกสารตามในรอบเดียวกัน</p>
  </a>
</div>

## หลักการของ docs ชุดนี้

<div class="foro-home-principles">
  <div class="foro-home-principle">
    <h3>Current behavior มาก่อน</h3>
    <p>ทุกหน้า feature ควรตอบให้ได้ก่อนว่าของที่ผู้ใช้เจอตอนนี้ทำงานอย่างไร ไม่ใช่สิ่งที่ทีมอาจอยากทำในอนาคต</p>
  </div>
  <div class="foro-home-principle">
    <h3>หนึ่งฟีเจอร์ หนึ่งที่ยึด</h3>
    <p>ถ้าจะคุยเรื่อง behavior, rules หรือ UI states ของฟีเจอร์ ให้กลับมายึดหน้า docs ของฟีเจอร์นั้นเป็นหลัก</p>
  </div>
  <div class="foro-home-principle">
    <h3>เปลี่ยน behavior ต้องเปลี่ยน docs</h3>
    <p>เอกสารไม่ควรเป็นของสวยงามแยกออกจากงานจริง แต่ต้องเดินไปพร้อมกับ PR ที่เปลี่ยนพฤติกรรมของระบบ</p>
  </div>
</div>

## ใช้หน้าไหนตอบคำถามอะไร

| ถ้าคำถามคือ | ให้เปิด |
| --- | --- |
| ฟีเจอร์นี้ตอนนี้ทำงานยังไง | [เอกสารฟีเจอร์](/features/) |
| ระบบส่วนนี้ต่อกับอะไรบ้าง | [Architecture](/architecture/overview) |
| อะไรเพิ่งเปลี่ยนไป | [Changelog](/changelog/) |
| หน้าไหนตาม code ไม่ทัน | [สถานะ Docs](/status/) |
| รอบนี้ควรอัปเดต docs หน้าไหนเพิ่ม | [Draft Suggestions](/drafts/) |
| ทีมต้องอัปเดต docs เมื่อไร | [Docs Governance](/process/docs-governance) |

## คำสั่งที่ใช้

```bash
npm run docs:dev
npm run docs:build
```
