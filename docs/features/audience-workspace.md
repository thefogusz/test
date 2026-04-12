# พื้นที่ค้นหา Audience

## เป้าหมาย

Audience Workspace ช่วยให้ผู้ใช้หาได้ว่าควรติดตามใครต่อ แล้วส่ง target เหล่านั้นเข้าไปจัดการใน watchlist ได้อย่างลื่นที่สุด

ตอนนี้รองรับการค้นหา 3 แบบ:

- การค้นหา target ด้วย AI
- การค้นหาบัญชีแบบ manual
- การไล่ดู RSS หรือแหล่งข่าว

## กติกาของโปรดักต์ตอนนี้

### การ์ดคำแนะนำจาก AI

- การ์ดคำแนะนำจาก AI ควรอ่านเหมือนคำแนะนำที่มีคนช่วยคิด ไม่ใช่การ dump metadata ของบัญชีแบบดิบๆ
- คำแนะนำแต่ละใบต้องอธิบายอย่างมีความหมายว่าทำไมคนนี้ถึงเกี่ยวข้อง
- คำอธิบายนั้นต้องเข้าใจได้สำหรับผู้ใช้โปรดักต์ที่อ่านภาษาไทย

### fallback ภาษาไทยของคำแนะนำ

- ถ้า reasoning จากต้นทางอ่อนเกินไป, generic เกินไป หรือยังใช้เป็นคำแนะนำภาษาไทยไม่ได้ UI ต้องสร้างคำอธิบาย fallback ภาษาไทยขึ้นมา
- fallback นี้ยังต้องยึดกับหัวข้อค้นหาปัจจุบันอยู่ ไม่ควรลอยหรือกว้างเกินจริง

### layout ของ recommendation card

- การ์ดคำแนะนำต้องเน้นความชัดเจนมากกว่าความแน่นของข้อมูล
- เหตุผลที่แนะนำควรเด่นทางสายตา ไม่ใช่ตัวหนังสือเล็กที่หายอยู่กลางการ์ด
- profile block, topic hint, credibility signals และ action เพิ่มเข้า watchlist ควรรู้สึกเป็น recommendation card เดียวกันที่ตั้งใจออกแบบมา

### action ของ watchlist

- การเพิ่มบัญชีที่แนะนำเข้า watchlist ต้องยังเคารพกติกาเรื่องแพ็กเกจและ capacity
- Audience discovery ไม่มีสิทธิ์ bypass shared watchlist limits

## ลำดับการใช้งานหลัก

1. ผู้ใช้เปิด Audience Workspace
2. ผู้ใช้เลือกโหมด AI, manual หรือ source discovery
3. ระบบคืน candidate ของบัญชีหรือ source กลับมา
4. ผู้ใช้ตรวจดูบริบทของคำแนะนำ
5. ผู้ใช้เพิ่มบัญชีหรือแหล่งที่เกี่ยวข้องเข้า workflow การมอนิเตอร์ถัดไป

## Edge Cases สำคัญ

### เหตุผลจาก AI อ่อนหรือใช้ไม่ได้

- ถ้า reasoning จากต้นทางยังไม่นำเสนอได้ แอปก็ยังต้องแสดงสรุปคำแนะนำภาษาไทยที่ชัดเจน
- การ์ดต้องไม่ยุบเหลือแค่ metadata ของบัญชีโดยไม่อธิบายว่าทำไมคนนี้จึงสำคัญ

### รูปแบบตัวตนของผลลัพธ์ไม่เหมือนกัน

- ผลลัพธ์ของ Audience อาจมาจากหลายโหมดการค้นหา
- action เพิ่มเข้า watchlist ต้องรักษา semantics เดียวกัน ไม่ว่า candidate จะมาจาก AI search หรือ manual search

## ไฟล์หลักที่เกี่ยวข้อง

- `src/components/AudienceWorkspace.tsx`
- `src/hooks/useAudienceSearch.ts`
- `src/hooks/useWatchlist.ts`

## เมื่อไรต้องอัปเดตหน้านี้

อัปเดตหน้านี้เมื่อมีการเปลี่ยน:

- copy ของการ์ดคำแนะนำจาก AI
- layout หรือ visual hierarchy ของ audience card
- gating ของการเพิ่มเข้า watchlist
- ความสัมพันธ์ระหว่างแท็บ AI, manual และ source

## Change Log

- 2026-04-12: documented Thai fallback reasoning and redesigned recommendation-card expectations for AI audience discovery
