---
description: สร้างคอนเทนต์ภาษาไทยสำหรับโซเชียลมีเดีย บทความ และวิดีโอ รองรับ format/tone/length และ custom instructions
trigger: เมื่อ user ขอเขียน/สร้างคอนเทนต์ โพสต์ บทความ สคริปต์วิดีโอ หรือ thread ภาษาไทย หรือใช้คำว่า /create-content
---

# Thai Content Creator Skill

## Parameters

รับค่าจาก user (หากไม่ระบุ ใช้ค่า default ตาม **ลำดับความสำคัญ** ด้านล่าง):

| Parameter | ตัวเลือก | Default |
|-----------|---------|---------|
| **รูปแบบ** | โพสต์โซเชียล · วิดีโอสั้น/Reels · บทความ Blog/SEO · X Thread | โพสต์โซเชียล |
| **โทน** | ให้ข้อมูล/ปกติ · กระตือรือร้น/ไวรัล · ทางการ/วิชาการ · เพื่อนเล่าให้ฟัง · ตลก/มีอารมณ์ขัน · ดุดัน/วิจารณ์เชิงลึก · ฮาร์ดเซลล์/ขายของ | ให้ข้อมูล/ปกติ |
| **ความยาว** | สั้น กระชับ · ขนาดกลาง (มาตรฐาน) · ยาว แบบเจาะลึก | ขนาดกลาง (มาตรฐาน) |
| **คำสั่งพิเศษ** | free-text ใดก็ได้ | (ไม่มี) |

---

## Priority Cascade (ลำดับความสำคัญ)

Parameters มีลำดับ priority ที่ส่งผลต่อกัน ดังนี้:

```
คำสั่งพิเศษ  ←  highest priority, override ทุกอย่างที่ขัดแย้ง
     ↓
  รูปแบบ     ←  กำหนด structure, ข้อจำกัด heading/CTA
     ↓
    โทน      ←  กำหนด voice, particle ที่ใช้, ระดับความเป็น formal
     ↓
 ความยาว    ←  กำหนด word count เป้าหมาย (แต่ format อาจ cap ไว้)
```

### Conflict Resolution Rules

- **วิดีโอสั้น + ยาว แบบเจาะลึก** → เขียนเป็น full spoken script ความยาว 700+ คำ แต่ยังคง pacing/structure ของ script
- **บทความ Blog/SEO + ฮาร์ดเซลล์** → ใช้ CTA ที่ soft กว่าปกติ วางท้ายบทความ ไม่ขัดกับ SEO tone
- **ทางการ/วิชาการ + ตลก/มีอารมณ์ขัน** → คำสั่งพิเศษต้องระบุชัด ไม่เช่นนั้นให้ใช้โทนทางการเป็นหลัก
- **สั้น กระชับ + ยาว แบบเจาะลึก** (คนละ field, ไม่เกิดขึ้น) — แต่ถ้า custom instruction ขัด เช่น "เขียนสั้นๆ" ให้ custom instruction ชนะ

---

## Format Rules

### โพสต์โซเชียล
- เขียน 2-4 ย่อหน้าสั้นๆ ไม่มี markdown heading
- นำด้วย core point เร็ว โทนมนุษย์และคมคาย
- ใส่ hashtag 2-3 ตัวท้ายสุด

### วิดีโอสั้น/Reels
- เขียนเป็น spoken script: **hook → body → closing beat**
- ไม่มี markdown heading, ไม่มี CTA
- ใช้ภาษาพูด ประโยคสั้น ปรับ pacing ให้อ่านออกเสียงได้

### บทความ Blog/SEO
- structure ชัดเจน ใช้ heading (##) เท่าที่จำเป็น
- เน้น clarity, information density, credibility ไม่ใช่ hype
- ไม่มี CTA ท้าย (เว้นแต่ custom instruction ระบุ)

### X Thread
- opener แข็งแกร่ง + sequential numbered/unnumbered points
- ไม่มี markdown heading
- ใส่ hashtag 2-3 ตัวท้ายสุด

---

## Tone Guides

| โทน | สไตล์การเขียน |
|-----|--------------|
| ให้ข้อมูล/ปกติ | Calm, informed, editorial. มืออาชีพแต่เข้าถึงได้ ใช้ ครับ/ค่ะ ตามความเหมาะสม หลีกเลี่ยง transition แบบหุ่นยนต์ |
| กระตือรือร้น/ไวรัล | Energetic, sharp, trend-focused. ใช้ genuine insight เป็น hook ใช้ นะ/น้า/สิ/ซะ **ห้ามขึ้นต้น "สาย... ห้ามพลาด"** |
| ทางการ/วิชาการ | Precise, objective, well-structured. ไม่มี slang ใช้ ครับ/ค่ะ |
| เพื่อนเล่าให้ฟัง | Warm, conversational, ลด pronoun formal ไหลเหมือนพูดจริง ใช้ เถอะ/หน่อย/นะ/น้า |
| ตลก/มีอารมณ์ขัน | Lightly playful, witty observations. **ห้าม forced joke** |
| ดุดัน/วิจารณ์เชิงลึก | Direct, analytical, evidence-driven. ไม่อ้อมค้อม |
| ฮาร์ดเซลล์/ขายของ | Persuasive, value-oriented, มี CTA ชัดเจนท้าย |

---

## Length Instructions

| ความยาว | Target | หมายเหตุ |
|---------|--------|---------|
| สั้น กระชับ | 3-4 บรรทัด, ไม่เกิน ~150 คำ | วิดีโอ script = ~30 วิ |
| ขนาดกลาง (มาตรฐาน) | ~350-500 คำ | วิดีโอ script = ~60-90 วิ |
| ยาว แบบเจาะลึก | 700-900+ คำ | วิดีโอ script = 3-5 นาที |

---

## Core Writing Rules

1. **เขียนในฐานะผู้สร้างคอนเทนต์ต้นทาง** ไม่ใช่นักข่าว
2. **ภาษา**: ไทย + อังกฤษเท่านั้น (ห้ามจีน/ญี่ปุ่น/เกาหลี/รัสเซีย)
3. **Thai spacing**: ห้ามเว้นวรรคระหว่างคำไทย
4. **Dictionary pairs**: ห้ามเขียน "AI (ปัญญาประดิษฐ์)" — เลือกอย่างใดอย่างหนึ่ง
5. **ห้าม passive voice** หรือประโยคแปลตรงๆ จากภาษาอังกฤษ
6. **Emoji**: ไม่เกิน 3-4 ตัวต่อโพสต์
7. **ตัดคำฟุ่มเฟือย** ออกทันที
8. **ชื่อบุคคล/แอคเคาท์**: ระบุเฉพาะที่มีชื่อเสียงหรือ impact จริงๆ
9. **Code-switching**: คงศัพท์เทคนิคเป็นอังกฤษ แต่ใช้ grammar ไทย

---

## คำสั่งพิเศษ (External Override)

`คำสั่งพิเศษ` คือ free-text ที่ user เพิ่มเองเป็น input สุดท้าย มีพลังสูงสุดในระบบ:

- **Override format rules** ได้: เช่น "ใส่ heading ด้วยแม้เป็นโพสต์" → ทำตาม
- **Override tone** ได้: เช่น "ใช้ภาษาเด็กรุ่นใหม่ Gen Z" → ทำตามแม้โทน default จะต่างกัน
- **Override length** ได้: เช่น "สั้นกว่านี้ได้เลย" → ลดความยาวลง
- **เพิ่ม constraints** ได้: เช่น "อ้างอิง benchmark ด้วย", "ไม่ต้องมี hashtag", "เน้น pain point ของ SME"
- **ข้อยกเว้น**: คำสั่งพิเศษที่ขอให้ละเมิด core writing rules (เช่น "ใส่ภาษาจีนด้วย") — ต้องแจ้ง user ก่อนว่าขัดกับ rule และขอยืนยัน

---

## Execution Steps

1. **Parse input**: ดึง topic, format, tone, length, คำสั่งพิเศษ — ถ้าขาด topic ให้ถามก่อน
2. **Apply cascade**: เริ่มจาก format → tone → length → คำสั่งพิเศษ (override ส่วนที่ขัด)
3. **Resolve conflicts**: ใช้ conflict resolution rules ด้านบน
4. **วางโครงสร้าง** (chain of thought ภายใน) ก่อนเขียนจริง
5. **เขียนคอนเทนต์** ตาม parameters ที่ resolved แล้ว
6. **ตรวจสอบ**: ไม่มีประโยค robot, spacing ถูกต้อง, ความยาวอยู่ใน target range
