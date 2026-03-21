---
layout: home

hero:
  name: "Foro Docs"
  text: "เอกสารระบบสำหรับทีมพัฒนา"
  tagline: "เอกสารที่เน้นให้ dev เปิดแล้วไล่โค้ดตามได้ง่าย เข้าใจ flow เร็ว และ debug ต่อได้"
  actions:
    - theme: brand
      text: เริ่มอ่าน
      link: /getting-started
    - theme: alt
      text: ดูภาพรวมระบบ
      link: /architecture/overview

features:
  - title: Read the Code Fast
    details: มีหน้าเริ่มต้นสำหรับ dev ใหม่ บอกว่าควรอ่านไฟล์ไหนก่อนและ debug ตรงไหน
  - title: Feature by Feature
    details: แยกเอกสารตามของจริงในระบบ เช่น Frontend, Feed/Search, AI Pipeline, Integrations, State
  - title: Built for Handoff
    details: ใช้เป็น internal docs สำหรับ onboarding, review architecture และคุย implementation ได้เลย
---

## วิธีเปิดเอกสาร

เอกสารชุดนี้ถูกจัดให้อยู่ในโครงสร้างของ VitePress แล้ว สามารถรันได้ด้วยคำสั่ง:

```bash
npm run docs:dev
```

และ build production docs ได้ด้วย:

```bash
npm run docs:build
```

## เส้นทางแนะนำ

- เริ่มจาก [อ่านเริ่มจากตรงนี้](/getting-started)
- ต่อด้วย [ภาพรวมระบบ](/architecture/overview)
- แล้วค่อยไล่หน้าตาม feature ที่สนใจ

## โครงเอกสารปัจจุบัน

- [Getting Started](/getting-started)
- [Architecture Overview](/architecture/overview)
- [Frontend](/architecture/frontend)
- [Feed และ Search](/architecture/feed-search)
- [AI Content Pipeline](/architecture/ai-pipeline)
- [Proxy และ External APIs](/architecture/integrations)
- [State และ Persistence](/architecture/state)
- [เอกสารฉบับเต็ม](/architecture-th)
