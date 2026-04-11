# Content Workspace

## เป้าหมายของฟีเจอร์

Content Workspace เป็นพื้นที่ที่รวม flow `ค้นหา -> คัด source -> เปิดอ่านเพิ่ม -> สร้างคอนเทนต์` ไว้ในที่เดียว เพื่อให้ผู้ใช้ต่อ context จากการค้นหาไปสู่การเขียนได้โดยไม่ต้องเริ่มใหม่ทุกครั้ง

## พฤติกรรมปัจจุบัน

- เปิดภายใต้ `activeView = "content"` และใช้ `contentTab` สำหรับสลับระหว่างโหมด search กับ create
- โหมด search ใช้สำหรับค้นหา source, คัดรายการที่น่าสนใจ, และสรุป context ก่อนเข้าสู่ขั้นสร้างคอนเทนต์
- โหมด create ใช้ attached source, prompt และ AI generation flow เพื่อสร้าง draft หรือ structured content
- ถ้า `activePlanId === "free"` แท็บ create จะไม่เปิด workflow จริง แต่จะแสดง premium gate และพาไป pricing flow แทน
- workspace นี้แชร์ state กับ summary blocks, post lists, attached source และ `ArticleReaderModal`
- เมื่อผู้ใช้เปิดอ่าน RSS หรือ web article เต็มจากรายการใน workspace เดียวกัน ระบบจะใช้ article reader flow เดียวกับ Read Workspace
- article reader ปัจจุบันแปลบทความเป็นไทยด้วย `grok-4-1-fast-non-reasoning` ผ่าน `GrokService`
- สำหรับบทความยาว ระบบจะแยก `title` ออกจาก `body`, chunk เนื้อหาตามย่อหน้า และ cleanup คำแปลหลัง model ตอบ เพื่อช่วยให้ผลลัพธ์นิ่งขึ้นโดยไม่เพิ่ม provider ใหม่

## ลำดับการใช้งานหลัก

1. ผู้ใช้เข้ามาที่ Content Workspace
2. ผู้ใช้ค้นหาหัวข้อหรือรีวิว source ที่ระบบมีให้
3. ผู้ใช้เปิดอ่าน item เพิ่มเติมเมื่ออยากดู context ลึกขึ้น
4. ถ้าเป็น RSS หรือ web article ระบบจะเปิด `ArticleReaderModal` และแปลบทความไทยแบบ on-demand
5. ผู้ใช้ attach source ที่ต้องการ แล้วสลับไป create mode
6. ระบบ generate draft จาก context ที่ผู้ใช้เลือกไว้

## กฎสำคัญที่ห้ามหลุด

- search กับ create เป็นคนละ tab แต่ต้องต่อกันได้ ถ้าผู้ใช้ตั้งใจเลือก context แล้ว การสลับ tab ไม่ควรทำให้ข้อมูลหาย
- attached source เป็น state ที่ต้อง persist เพื่อให้ผู้ใช้กลับมาร่างงานต่อหลัง navigation หรือ refresh ได้
- article reader ที่ถูกเปิดจาก Content Workspace ต้องยังอ้างอิง source เดิมและไม่ทำให้ attached source หรือ search selection เพี้ยน
- การ generate ด้วย AI ต้องเคารพ usage gating และ plan ปัจจุบันจาก billing
- สิทธิ์ในการเข้า create workflow ต้องสอดคล้องกับ plan ปัจจุบันเสมอ ถ้าเป็น free plan UI ต้อง lock create mode ตามที่ component ปัจจุบันกำหนด
- search summary, article preview และ draft ที่ generate ต้องสะท้อน selection ปัจจุบัน ไม่ใช่ผลลัพธ์เก่าที่ค้างอยู่
- article translation flow ต้องยังเป็น `grok-4-1-fast-non-reasoning` เท่านั้นใน runtime ปัจจุบัน และไม่ควรเงียบๆ กลับไปพึ่ง Google Translate หรือ reasoning model

## UI States ที่ต้องนึกถึงเวลาแก้

- Loading: กำลังค้นหา, กำลังโหลด article reader, หรือกำลัง generate
- Search Results: มีรายการผลลัพธ์และ summary ให้ใช้งาน
- Empty Search: ไม่เจอข้อมูลตาม query ปัจจุบัน
- Reader Open: ผู้ใช้กำลังอ่านบทความเต็มและอาจรอ translation on-demand
- Create Locked: ผู้ใช้ฟรีเห็น premium gate แทน form สร้างคอนเทนต์
- Create Draft: มี source context ติดอยู่และพร้อมให้ generate
- Error: ปัญหาต้องถูกสะท้อนผ่าน status message หรือ UI guard ที่เหมาะสม

## ไฟล์หลักที่เกี่ยวข้อง

- `src/App.tsx`
- `src/components/ContentWorkspace.tsx`
- `src/components/CreateContent.tsx`
- `src/components/ArticleReaderModal.tsx`
- `src/hooks/useSearchWorkspace.ts`
- `src/services/GrokService.ts`

## Dependency สำคัญ

- billing usage checks
- hooks สำหรับ orchestration ของ search
- services สำหรับ AI generation และ article translation
- state ของ attached sources ที่ถูก persist

## สิ่งที่ฟีเจอร์นี้ไม่ได้เป็นเจ้าของ

- Watchlist feed sync behavior
- Pricing plan management UI
- RSS source subscription browsing
- Provider-level translation configuration นอกเหนือจากการเรียกใช้ `GrokService`

## สัญญาณว่าควรอัปเดตเอกสารหน้านี้

- เปลี่ยนจำนวน tab หรือความหมายของแต่ละ tab
- เปลี่ยนการ persist attached source
- เปลี่ยน gating ของการ generate
- เปลี่ยนวิธีเปิด article reader จาก search/content results
- เปลี่ยน model หรือ pipeline ของ article translation
- เปลี่ยน loading, empty หรือ error state ที่ผู้ใช้เจอระหว่างค้นหา เปิดอ่าน หรือ generate

## Change Log

- 2026-04-12: อัปเดตให้ตรงกับ article reader flow ปัจจุบันที่ใช้ `grok-4-1-fast-non-reasoning`, chunking บทความยาว และ cleanup หลังแปล
- 2026-04-09: สร้างเอกสาร baseline ภาษาไทยสำหรับ Content Workspace
