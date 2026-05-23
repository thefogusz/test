# AI Model Usage Map for Developers

Updated: 2026-05-23

เอกสารนี้สรุปว่าแต่ละฟีเจอร์ของ FORO ใช้ model จริงอะไรบ้าง สำหรับ dev/production handoff โดยอิงชื่อฟีเจอร์ที่ผู้ใช้เห็น ไม่อิงชื่อไฟล์หรือ internal code path ของโปรเจกต์

หลักสำคัญ:

- `grok-4.3 + none`, `grok-4.3 + low`, และ `grok-4.3 + medium` คือ model เดียวกัน (`grok-4.3`) แต่ต่างกันที่ `reasoning_effort`
- `none` เร็วสุด เหมาะกับสรุป/แปล/คัดข้อมูลเร็ว
- `low` ช้ากว่า แต่เหมาะกับงานวางแผน จับประเด็น และงานเขียนที่ต้องรักษาคุณภาพ
- `medium` ใช้เฉพาะงานวิเคราะห์รูป/วิดีโอจากโพสต์ X
- `grok-4.20-multi-agent-0309` ยังไม่ได้ใช้กับฟีเจอร์หลักบนหน้าเว็บ

## Feature To Model Map

| ฟีเจอร์ที่ผู้ใช้เห็นใน UI | Model จริงที่ใช้ | ใช้ทำอะไร |
|---|---|---|
| `ฟีดข้อมูล` | `grok-4.3 + reasoning_effort: none` | สรุป/แปล feed ข่าว, X, RSS เป็นไทย |
| `โหลดเพิ่มเติม` | `grok-4.3 + reasoning_effort: none` | สรุป/แปลการ์ดที่โหลดเพิ่ม |
| `FORO Filter` | `grok-4.3 + reasoning_effort: none` | คัดการ์ดตามคำสั่งผู้ใช้ และเขียน brief/summary ของผล filter |
| `อ่านข่าว` > `Insights` | `grok-4.3 + reasoning_effort: none` | สรุป insight สั้นก่อนอ่านเต็ม |
| `อ่านข่าว` > `Thai translation` title | `grok-4.3 + reasoning_effort: low` | แปล headline ให้เป็นไทยธรรมชาติ |
| `อ่านข่าว` > `Thai translation` body | `grok-4.3 + reasoning_effort: none` | แปลเนื้อหาบทความเป็นไทย |
| `คอนเทนต์สตูดิโอ` > `ค้นหา` | `grok-4.3 + reasoning_effort: low` | ขยายคำค้น, วาง search plan สำหรับ query ซับซ้อน, และสรุปภาพรวมแบบมี citation |
| `คอนเทนต์สตูดิโอ` > `ค้นหา` | `grok-4.3 + reasoning_effort: none` | สรุปผลลัพธ์รายชิ้นเป็นไทย และคัด/rerank post จาก search pool |
| `คอนเทนต์ใหม่` | ใช้ model ชุดเดียวกับ `ค้นหา` | ใช้ search pipeline เดียวกัน แต่เปิด latest/freshness mode |
| `อยากโฟกัสผลค้นหาแบบไหนมากขึ้น` | `grok-4.3 + reasoning_effort: low` | สรุปผลค้นหาใหม่ตาม focus ที่เลือก |
| `สร้างคอนเทนต์` fact sheet / brief | `grok-4.3 + reasoning_effort: none` | สร้าง fact sheet และ content brief ก่อนเขียน |
| `โพสต์โซเชียล` | `grok-4.3 + reasoning_effort: low` | เขียนโพสต์ด้วย writer หลัก |
| `วิดีโอสั้น / Reels` fast path | `grok-4.3 + reasoning_effort: none` | เขียนสคริปต์วิดีโอสั้นแบบเร็ว เมื่องานไม่ยาว/ไม่ซับซ้อน |
| `วิดีโอสั้น / Reels` fallback | `grok-4.3 + reasoning_effort: low` | ใช้เมื่องานยาว/ซับซ้อน/ต้องคุมคุณภาพ |
| `บทความ Blog/SEO` | `grok-4.3 + reasoning_effort: low` | เขียนบทความยาว มีโครงเรื่องและความต่อเนื่อง |
| `X Thread` | `grok-4.3 + reasoning_effort: low` | เขียน thread ที่ต้องเรียงเหตุผลหลายตอน |
| สร้างคอนเทนต์จากโพสต์ X ที่มีวิดีโอ | `grok-4.3 + reasoning_effort: medium` | วิเคราะห์วิดีโอ/transcript/key points ก่อนส่งต่อเข้า writer |
| สร้างคอนเทนต์จากโพสต์ X ที่มีรูป | `grok-4.3 + reasoning_effort: medium` | วิเคราะห์รูป, visible text, key points ก่อนส่งต่อเข้า writer |
| `การติดตาม` > `แนะนำโดย FORO` | `grok-4.3 + reasoning_effort: none` | สร้าง candidate pool, reasoning และ rerank บัญชีที่ควรติดตาม |

## Reels Fast Path Conditions

`วิดีโอสั้น / Reels` จะใช้ `grok-4.3 + reasoning_effort: none` เฉพาะเมื่อเข้าเงื่อนไขทั้งหมดนี้:

- format ในโค้ดคือ `สคริปต์วิดีโอสั้น`
- length ไม่ใช่ `long`
- tone ไม่ใช่ `ทางการ/วิชาการ`, `ดุดัน/วิจารณ์เชิงลึก`, หรือ `ฮาร์ดเซลล์/ขายของ`
- custom instructions ไม่ยาวเกิน 120 ตัวอักษร
- intent ไม่ได้ต้องการ interactive detour

ถ้าไม่เข้าเงื่อนไข จะ fallback ไป `grok-4.3 + reasoning_effort: low`

## Why These Choices

### ใช้ `grok-4.3 + none` กับงานที่ต้องเร็ว

ใช้กับงานที่ไม่ต้อง reasoning ลึก เช่น `ฟีดข้อมูล`, `โหลดเพิ่มเติม`, `FORO Filter`, `Insights`, การสรุปการ์ดค้นหา, fact sheet และ brief

### ใช้ `grok-4.3 + low` กับงานที่ต้องคิดหรือเขียนดี

ใช้กับ search query expansion, search planning, executive summary, title translation, และ writer หลัก เพราะต้องรักษาคุณภาพของภาษา ลำดับเหตุผล citation และโครงเรื่อง

### ใช้ `grok-4.3 + medium` เฉพาะรูป/วิดีโอ

งานวิเคราะห์รูป/วิดีโอจากโพสต์ X ต้องเข้าใจ visual/context มากกว่างาน text ธรรมดา จึงใช้ `medium`

### ยังไม่ใช้ `grok-4.20-multi-agent-0309` กับ flow หลัก

model นี้เหมาะกับ deep research/multi-agent มากกว่า flow ที่ผู้ใช้ต้องการเร็ว จึงยังไม่ควรผูกกับฟีเจอร์หลัก

## Benchmark Decisions

| Test case | Current/old | Fast candidate | Decision |
|---|---:|---:|---|
| `วิดีโอสั้น / Reels` writer | ~11.9s | ~2.6s | use fast path |
| `Thai translation` title | ~6.8s | ~1.0s | keep `low`; `none` แปลคำอังกฤษไม่เนียนพอ |
| `โพสต์โซเชียล` | ~7.1s | ~1.6s | keep `low`; output จาก `low` ดีกว่า |
| search summary | ~11.5s | ~3.4s | keep `low`; citation/ลำดับประเด็นดีกว่า |
| search query expansion | ~5.5s | ~0.7s | keep `low`; query จาก `none` แคบเกินไป |

## Guardrails

- ห้ามนำ model slug เก่ากลับมา เช่น `grok-4-1-fast-*`, `grok-4-fast-*`, `grok-4-0709`, `grok-code-fast-1`
- ห้ามใช้ `presencePenalty` หรือ `frequencyPenalty` กับ xAI request
- เอกสาร product/dev ควรเขียนด้วยชื่อจริง เช่น `grok-4.3 + reasoning_effort: none` ไม่ใช่เริ่มจากชื่อ constant
