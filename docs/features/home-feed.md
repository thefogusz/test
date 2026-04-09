# Home Feed

## เป้าหมายของฟีเจอร์

Home Feed คือ workspace หลักของแอปและเป็นหน้าที่ผู้ใช้ควรเห็นก่อนเป็นอันดับแรก จุดประสงค์คือให้ผู้ใช้เห็นโพสต์ล่าสุดจาก watchlist หรือ list context ที่เลือกไว้ได้เร็ว อ่านง่าย และสามารถใช้ AI ช่วยกรองหรือสรุปข้อมูลจาก feed ชุดปัจจุบันได้ทันที

## พฤติกรรมปัจจุบัน

- เปิดเป็นค่าเริ่มต้นผ่าน `activeView = "home"` ใน `src/App.tsx`
- แสดง feed หลักผ่าน `HomeView` และ render รายการแต่ละชิ้นด้วย `FeedCard`
- ใช้ข้อมูลจาก watchlist, post lists และ subscribed sources ที่ถูก persist ไว้เพื่อกำหนดว่า feed ควรมีอะไรบ้าง
- ผู้ใช้สามารถ sync feed, สลับ sort, ใช้ AI quick filter, ใช้ custom AI filter, bookmark โพสต์ และเปิดอ่านรายละเอียดของบทความได้
- state ของ read/archive ไม่ได้เป็นเจ้าของโดยหน้าจอนี้โดยตรง แต่ Home Feed สามารถส่งต่อรายการไปยัง flow ของ reader หรือ content creation ได้

## ลำดับการใช้งานหลัก

1. ผู้ใช้เข้ามาที่หน้า Home
2. ผู้ใช้กด sync หรือ refresh feed
3. ผู้ใช้ไล่อ่าน card เปลี่ยน sort ตาม view/engagement หรือใช้ AI filter เพื่อคัด feed
4. ผู้ใช้เลือกอ่านบทความ bookmark รายการที่ต้องการเก็บ หรือส่ง source ต่อไปยัง flow สร้างคอนเทนต์

## กฎสำคัญที่ห้ามหลุด

- Home Feed ต้องรู้ context ของ list ที่กำลัง active อยู่เสมอ ถ้ามี post list ถูกเลือก feed ต้องสะท้อน context นั้น
- AI filter presets เป็นข้อมูลที่ persist และควรอยู่ต่อหลัง reload
- การ sync และ filter ต้องมี feedback ให้ผู้ใช้ผ่าน loading state หรือ status message อย่างสม่ำเสมอ
- การลบ feed ชั่วคราวต้อง undo ได้ จนกว่าจะมีการแทนที่ session state ในเครื่อง
- ถ้า behavior ใหม่ทำให้ feed ไม่สัมพันธ์กับ list context preset หายหลัง refresh หรือ undo ใช้ไม่ได้ ให้ถือว่าเป็น regression ของฟีเจอร์นี้

## UI States ที่ต้องนึกถึงเวลาแก้

- Loading: กำลัง sync หรือกำลัง bootstrap feed ครั้งแรก
- Success: มี card แสดงผลพร้อม toolbar สำหรับ sort/filter
- Empty: ยังไม่มีรายการสำหรับ context ที่ผู้ใช้เลือก
- Filtered: มี AI summary และ indicator ว่ากำลังดูผลลัพธ์ที่ผ่านการกรอง
- Error: ปัญหาควรถูกสะท้อนผ่าน status message หรือ error boundary pattern ที่มีอยู่

## ไฟล์หลักที่เกี่ยวข้อง

- `src/App.tsx`
- `src/components/HomeView.tsx`
- `src/components/FeedCard.tsx`
- `src/hooks/useHomeFeedWorkspace.ts`
- `src/hooks/usePostLists.ts`
- `src/hooks/useWatchlist.ts`

## Dependency สำคัญ

- persistence ผ่าน `usePersistentState` และ `useIndexedDbState`
- service สำหรับดึง feed และ normalize ข้อมูล
- state ของ post list membership
- modal และ flow ของ AI filter และ summary generation

## สิ่งที่ฟีเจอร์นี้ไม่ได้เป็นเจ้าของ

- Pricing and plan selection
- Audience search
- News source subscription management

## สัญญาณว่าควรอัปเดตเอกสารหน้านี้

- มีการเพิ่มหรือลด action บน toolbar
- เปลี่ยน logic ของ sort, filter หรือ undo
- เปลี่ยนความสัมพันธ์ระหว่าง active list กับ feed
- เปลี่ยน loading, empty หรือ error behavior ที่ผู้ใช้เห็น

## Change Log

- 2026-04-09: สร้างเอกสาร baseline ภาษาไทยสำหรับ Home Feed
