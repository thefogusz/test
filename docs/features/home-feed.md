# Home Feed

## เป้าหมายของฟีเจอร์

Home Feed คือ workspace หลักของแอปและเป็นหน้าที่ผู้ใช้ควรเห็นก่อนเป็นอันดับแรก จุดประสงค์คือให้ผู้ใช้เห็นโพสต์ล่าสุดจาก watchlist หรือ list context ที่เลือกไว้ได้เร็ว อ่านง่าย และใช้ FORO ช่วยคัดสัญญาณสำคัญจาก feed ชุดปัจจุบันได้ทันที

## พฤติกรรมปัจจุบัน

- เปิดเป็นค่าเริ่มต้นผ่าน `activeView = "home"` ใน `src/App.tsx`
- แสดง feed หลักผ่าน `src/components/HomeView.tsx` และ render รายการแต่ละชิ้นผ่าน `src/components/FeedCard.tsx`
- ใช้ข้อมูลจาก watchlist, post lists และ subscribed sources ที่ถูก persist ไว้เพื่อกำหนดว่า feed ควรมีอะไรบ้าง
- ผู้ใช้สามารถ sync feed, สลับ sort, bookmark โพสต์, เปิดอ่านบทความ และส่ง source ไปยัง flow สร้างคอนเทนต์ได้
- `FORO Filter` ทำงานเป็น analysis layer บน feed ปัจจุบัน ไม่ได้เปลี่ยน source หลักของ feed แต่คัด subset ที่ตรง intent ของผู้ใช้แล้วอธิบายผลให้
- quick presets ของ `FORO Filter` ถูกใช้เป็น analysis modes มากกว่าปุ่มค้นหาเร็ว เช่น โหมดจับสัญญาณ breakout, โหมดคัด policy/risk และโหมดหา angle สำหรับทำคอนเทนต์
- เมื่อกรองสำเร็จ ระบบจะเติม `citation_id`, `ai_reasoning` และ `temporalTag` ให้แต่ละรายการที่ถูกเลือก เพื่อใช้แสดงเหตุผลรายข่าวบนการ์ด
- summary ด้านบนของผลลัพธ์กรองถูกยกระดับจากข้อความก้อนเดียวเป็น brief ที่มีโครง เช่น headline, why now, what matched, what was excluded และ decision note
- state ของ read/archive ไม่ได้เป็นเจ้าของโดยหน้าจอนี้โดยตรง แต่ Home Feed สามารถส่งต่อรายการไปยัง flow ของ reader หรือ content creation ได้

## ลำดับการใช้งานหลัก

1. ผู้ใช้เข้ามาที่หน้า Home
2. ผู้ใช้กด sync หรือ refresh feed
3. ผู้ใช้ไล่อ่าน card เปลี่ยน sort ตาม view/engagement หรือเปิด `FORO Filter`
4. ผู้ใช้เลือก analysis mode หรือใส่ prompt เพื่อคัด feed
5. ระบบแสดง filtered brief ด้านบน พร้อมเหตุผลรายข่าวในแต่ละ card
6. ผู้ใช้เลือกอ่านบทความ เก็บ bookmark หรือส่งต่อไปยัง flow สร้างคอนเทนต์

## กฎสำคัญที่ห้ามหลุด

- Home Feed ต้องรู้ context ของ list ที่กำลัง active อยู่เสมอ ถ้ามี post list ถูกเลือก feed ต้องสะท้อน context นั้น
- quick filter presets เป็นข้อมูลที่ persist และควรอยู่ต่อหลัง reload
- analysis modes ของ `FORO Filter` ต้องเป็นเพียงค่าเริ่มต้นที่ช่วยให้ใช้ฟีเจอร์ง่ายขึ้น แต่ผู้ใช้ยัง override ด้วย prompt เองได้
- การ sync และ filter ต้องมี feedback ให้ผู้ใช้ผ่าน loading state หรือ status message อย่างสม่ำเสมอ
- การลบ feed ชั่วคราวต้อง undo ได้ จนกว่าจะมีการแทนที่ session state ในเครื่อง
- ถ้า behavior ใหม่ทำให้ feed ไม่สัมพันธ์กับ list context, preset หายหลัง refresh, หรือ filtered brief ไม่ตรงกับรายการที่ถูกเลือก ให้ถือว่าเป็น regression
- เหตุผลรายข่าว (`Why This Matched`) ต้องอิงข้อมูลจากผลกรองจริง ไม่ควรเดา beyond source ที่คัดมา

## UI States ที่ต้องนึกถึงเวลาแก้

- Loading: กำลัง sync หรือกำลัง bootstrap feed ครั้งแรก
- Success: มี card แสดงผลพร้อม toolbar สำหรับ sort/filter
- Empty: ยังไม่มีรายการสำหรับ context ที่ผู้ใช้เลือก
- Filtered: มี badge ว่ากำลังดูผลกรอง, มี structured brief ด้านบน, และมี reason block รายการต่อรายการ
- No Match: ผู้ใช้กด filter แล้วไม่พบรายการที่ตรง intent ควรล้าง brief และแสดง status message ชัดเจน
- Error: ปัญหาควรถูกสะท้อนผ่าน status message หรือ error boundary pattern ที่มีอยู่

## ไฟล์หลักที่เกี่ยวข้อง

- `src/App.tsx`
- `src/components/HomeView.tsx`
- `src/components/FeedCard.tsx`
- `src/components/AiFilterModal.tsx`
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
- เปลี่ยนความหมายของ quick presets หรือ analysis modes
- เปลี่ยนรูปแบบ brief ที่แสดงหลังกรอง
- เปลี่ยน loading, empty หรือ error behavior ที่ผู้ใช้เห็น

## Change Log

- 2026-04-09: สร้างเอกสาร baseline ภาษาไทยสำหรับ Home Feed
- 2026-04-09: อัปเดต `FORO Filter` ให้ใช้ analysis modes, สร้าง structured brief หลังกรอง และแสดง `Why This Matched` บนการ์ดข่าว
