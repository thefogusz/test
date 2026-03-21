# Promptfoo for Foro

ชุดนี้เป็น eval starter สำหรับเทสงานเขียนภาษาไทยของเมนูสร้างคอนเทนต์ โดยไม่ผูกเข้ากับ runtime ของผู้ใช้จริง

## สิ่งที่ใช้

- Promptfoo รันแบบ dev-only
- ยิงผ่าน OpenAI-compatible proxy เดิมของโปรเจกต์
- ใช้ model `grok-4-1-fast-reasoning` ผ่าน `http://localhost:3001/api/xai/v1`

## วิธีรัน

1. เปิด proxy/server ของ Foro ก่อน

```bash
npm run start
```

2. ตรวจ config

```bash
npm run promptfoo:foro:validate
```

3. รัน eval

```bash
npm run promptfoo:foro:eval
```

4. เปิด viewer

```bash
npm run promptfoo:foro:view
```

## ชุดเทสเริ่มต้น

- Social informative: กัน heading, hype เกินจริง, และการเอ่ยชื่อยิบย่อย
- Social viral: อนุญาตพลังงานมากขึ้น แต่กันความ spammy
- Blog/SEO: เน้นความยาวพอประมาณ, มีข้อจำกัด/ความเสี่ยง, ไม่มี CTA แบบโพสต์
- Thread: เล่าเป็นลำดับ, ไม่ใส่ heading, ไม่ยัดชื่อบัญชีพร่ำเพรื่อ

## ขอบเขตของรอบนี้

- ยังไม่ดึง flow จากปุ่ม Create Content มาใช้ตรง ๆ
- ยังไม่ใช้ model-graded rubric เพื่อลดค่าใช้จ่ายในการเทส
- เน้น deterministic assertions ก่อน เพื่อจับ regression ง่าย
