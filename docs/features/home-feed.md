# Home Feed

## เป้าหมายของฟีเจอร์

Home Feed คือ workspace หลักของแอปและเป็นหน้าที่ผู้ใช้ควรเห็นก่อนเป็นอันดับแรก จุดประสงค์คือให้ผู้ใช้เห็นโพสต์ล่าสุดจาก watchlist หรือ list context ที่เลือกไว้ได้เร็ว อ่านง่าย และใช้ FORO ช่วยคัดสัญญาณสำคัญจาก feed ชุดปัจจุบันได้ทันที

## พฤติกรรมปัจจุบัน

- เปิดเป็นค่าเริ่มต้นผ่าน `activeView = "home"` ใน `src/App.tsx`
- แสดง feed หลักผ่าน `src/components/HomeView.tsx` และ render รายการแต่ละชิ้นผ่าน `src/components/FeedCard.tsx`
- ใช้ข้อมูลจาก watchlist, post lists และ subscribed sources ที่ถูก persist ไว้เพื่อกำหนดว่า feed ควรมีอะไรบ้าง
- ผู้ใช้สามารถ sync feed, สลับ sort, bookmark โพสต์, เปิดอ่านบทความ และส่ง source ไปยัง flow สร้างคอนเทนต์ได้
- `FORO Filter` ทำงานเป็น analysis layer บน feed ปัจจุบัน ไม่ได้เปลี่ยน source หลักของ feed แต่คัด subset ที่ตรง intent ของผู้ใช้แล้วสังเคราะห์ผลลัพธ์ใหม่จากชุดการ์ดที่ถูกเลือก
- quick presets ของ `FORO Filter` ถูกใช้เป็น prompt ตั้งต้น แต่ผู้ใช้ยังพิมพ์ prompt เปิดเองได้ เช่น สรุปภาพรวม, ขอความเห็น, จัด shortlist, จัดอันดับ, หรือหา content angle จากชุดการ์ดนี้
- เมื่อกรองสำเร็จ ระบบจะเติม `citation_id`, `ai_reasoning` และ `temporalTag` ให้แต่ละรายการที่ถูกเลือกเพื่อใช้เป็นหลักฐานอ้างอิงในผล synthesis แม้หน้า card จะไม่แสดง `Why This Matched` แล้ว
- result card ด้านบนของผลกรองเป็น structured analysis card ที่มี headline, why now, output badge, section label ตาม intent, bullet synthesis พร้อม citation badge และ note ปิดท้าย
- ระหว่างรอ synthesis ระบบจะแสดง skeleton card ก่อน เพื่อให้ผู้ใช้เห็นว่ากำลังประมวลผลผลลัพธ์จากชุดการ์ดนี้อยู่
- state ของ read/archive ไม่ได้เป็นเจ้าของโดยหน้าจอนี้โดยตรง แต่ Home Feed สามารถส่งต่อรายการไปยัง flow ของ reader หรือ content creation ได้

## ลำดับการใช้งานหลัก

1. ผู้ใช้เข้ามาที่หน้า Home
2. ผู้ใช้กด sync หรือ refresh feed
3. ผู้ใช้ไล่อ่าน card เปลี่ยน sort ตาม view/engagement หรือเปิด `FORO Filter`
4. ผู้ใช้เลือก preset หรือใส่ prompt เพื่อคัดและวิเคราะห์ feed
5. ระบบแสดง analysis result card ด้านบนของ feed โดยสังเคราะห์จากชุดการ์ดที่ถูกคัดมา และแสดง bullet พร้อม citation badge
6. ผู้ใช้เลือกอ่านบทความ เก็บ bookmark หรือส่งต่อไปยัง flow สร้างคอนเทนต์

## กฎสำคัญที่ห้ามหลุด

- Home Feed ต้องรู้ context ของ list ที่กำลัง active อยู่เสมอ ถ้ามี post list ถูกเลือก feed ต้องสะท้อน context นั้น
- quick filter presets เป็นข้อมูลที่ persist และควรอยู่ต่อหลัง reload
- presets ของ `FORO Filter` เป็นเพียงค่าเริ่มต้นที่ช่วยให้ใช้ฟีเจอร์ง่ายขึ้น แต่ผู้ใช้ยัง override ด้วย prompt เองได้
- `FORO Filter` ต้องยึดชุดการ์ดที่ผู้ใช้กำลังดูอยู่เป็น source of truth เสมอ ไม่ว่าจะเป็น feed ที่ยังไม่กรองหรือ subset หลังกรองแล้ว
- synthesis result ต้องครอบคลุมชุดการ์ดที่ถูกเลือกจริง ไม่ใช่ snapshot จากบางการ์ดแรกเท่านั้น
- การ sync และ filter ต้องมี feedback ให้ผู้ใช้ผ่าน loading state หรือ status message อย่างสม่ำเสมอ
- การลบ feed ชั่วคราวต้อง undo ได้ จนกว่าจะมีการแทนที่ session state ในเครื่อง
- ถ้า behavior ใหม่ทำให้ feed ไม่สัมพันธ์กับ list context, preset หายหลัง refresh, หรือ analysis result ไม่ตรงกับรายการที่ถูกเลือก ให้ถือว่าเป็น regression

## UI States ที่ต้องนึกถึงเวลาแก้

- Loading: กำลัง sync หรือกำลัง bootstrap feed ครั้งแรก
- Success: มี card แสดงผลพร้อม toolbar สำหรับ sort/filter
- Empty: ยังไม่มีรายการสำหรับ context ที่ผู้ใช้เลือก
- Filtered: มี badge ว่ากำลังดูผลกรอง มี analysis result card ด้านบน และรายการ feed ถูกแทนด้วย subset ที่ผ่าน intent ปัจจุบัน
- Synthesizing: ระบบกำลังสร้าง result card และแสดง skeleton animation แทน brief ชั่วคราว
- No Match: ผู้ใช้กด filter แล้วไม่พบรายการที่ตรง intent ควรล้าง brief และแสดง status message ชัดเจน
- Error: ปัญหาควรถูกสะท้อนผ่าน status message หรือ error boundary pattern ที่มีอยู่

## ไฟล์หลักที่เกี่ยวข้อง

- `src/App.tsx`
- `src/components/HomeView.tsx`
- `src/components/FeedCard.tsx`
- `src/components/AiFilterModal.tsx`
- `src/components/ForoFilterSummarySkeleton.tsx`
- `src/hooks/useHomeFeedWorkspace.ts`
- `src/services/GrokService.ts`

## Dependency สำคัญ

- persistence ผ่าน `usePersistentState` และ `useIndexedDbState`
- service สำหรับดึง feed และ normalize ข้อมูล
- state ของ post list membership
- modal และ flow ของ AI filter, brief generation และ summary generation

## สิ่งที่ฟีเจอร์นี้ไม่ได้เป็นเจ้าของ

- Pricing และ plan selection
- Audience search
- News source subscription management

## สัญญาณว่าควรอัปเดตเอกสารหน้านี้

- มีการเพิ่มหรือลด action บน toolbar
- เปลี่ยน logic ของ sort, filter หรือ undo
- เปลี่ยนความหมายของ quick presets หรือ prompt examples
- เปลี่ยนรูปแบบ result card ที่แสดงหลังกรอง
- เปลี่ยน loading, empty หรือ error behavior ที่ผู้ใช้เห็น

## Change Log

- 2026-04-09: สร้างเอกสาร baseline ภาษาไทยสำหรับ Home Feed
- 2026-04-09: อัปเดต `FORO Filter` ให้ใช้ analysis modes, สร้าง structured brief หลังกลอง และแสดง `Why This Matched` บนการ์ดข่าว
- 2026-04-10: เปลี่ยน `FORO Filter` เป็น flexible analysis mode ที่รองรับ prompt เปิด, synthesis จากทุกการ์ดในชุดที่ถูกเลือก, result card แบบ dynamic, skeleton ระหว่างประมวลผล และ citation badge ใน bullet summary
