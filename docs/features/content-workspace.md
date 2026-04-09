# Content Workspace

## เป้าหมายของฟีเจอร์

Content Workspace เป็นพื้นที่ที่ผู้ใช้ใช้ค้นข้อมูล ตรวจสอบ source และสร้างคอนเทนต์จากข้อมูลที่ค้นหรือคัดมาแล้ว จุดสำคัญของฟีเจอร์นี้คือทำให้ search flow กับ create flow ต่อกันได้โดยไม่หลุด context

## พฤติกรรมปัจจุบัน

- เปิดภายใต้ `activeView = "content"` และใช้ `contentTab` สำหรับสลับระหว่างโหมด search กับ create
- โหมด search ใช้สำหรับค้น คัด และสรุป source material ก่อนเข้าสู่ขั้นสร้างคอนเทนต์
- โหมด create ใช้ attached source, prompt และ AI generation flow เพื่อสร้าง draft หรือ structured content
- ถ้า `activePlanId === "free"` แท็บ create จะไม่เปิด workflow จริง แต่จะแสดง premium gate และเปิด pricing flow แทน
- workspace นี้แชร์ state กับ summary blocks, article reader modal, post lists และ attached source ที่ถูกบันทึกไว้

## ลำดับการใช้งานหลัก

1. ผู้ใช้เข้ามาที่ Content Workspace
2. ผู้ใช้ค้นหัวข้อหรือรีวิว source ที่มีอยู่
3. ผู้ใช้เปิดอ่าน item เพิ่มเติมเมื่ออยากดู context ลึกขึ้น
4. ผู้ใช้สลับไป create mode และ generate คอนเทนต์จาก context ที่เลือกไว้

## กฎสำคัญที่ห้ามหลุด

- search กับ create เป็นคนละ tab แต่ต้องต่อกันได้ ถ้าผู้ใช้ตั้งใจเลือก context แล้ว การสลับ tab ไม่ควรทำให้ข้อมูลหาย
- attached source เป็น state ที่ persist เพื่อให้ผู้ใช้กลับมาร่างงานต่อหลัง navigation หรือ refresh ได้
- การ generate ด้วย AI ต้องเคารพ usage gating และ plan ปัจจุบันจาก billing
- สิทธิ์ในการเข้า create workflow ต้องสอดคล้องกับ plan ปัจจุบันเสมอ ถ้าเป็น free plan UI ต้อง lock create mode ตามที่ component ปัจจุบันกำหนด
- search summary และ draft ที่ generate ต้องสะท้อน selection ปัจจุบัน ไม่ใช่ผลลัพธ์เก่าที่ค้างอยู่
- ถ้าแก้อะไรแล้วทำให้สลับ tab แล้ว source หลุด draft ไม่ตรง selection หรือ bypass billing gate ได้ ให้ถือว่าเป็น regression

## UI States ที่ต้องนึกถึงเวลาแก้

- Loading: กำลังค้นหรือกำลัง generate
- Search Results: มีรายการผลลัพธ์และ summary ให้ใช้งาน
- Empty Search: ไม่เจอข้อมูลตาม query ปัจจุบัน
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
- services สำหรับ AI generation
- state ของ attached sources ที่ถูก persist

## สิ่งที่ฟีเจอร์นี้ไม่ได้เป็นเจ้าของ

- Watchlist feed sync behavior
- Pricing plan management UI
- RSS source subscription browsing

## สัญญาณว่าควรอัปเดตเอกสารหน้านี้

- เปลี่ยนจำนวน tab หรือความหมายของแต่ละ tab
- เปลี่ยนการ persist attached source
- เปลี่ยน gating ของการ generate
- เปลี่ยน loading, empty หรือ error state ที่ผู้ใช้เจอระหว่างค้นหรือ generate

## Change Log

- 2026-04-09: สร้างเอกสาร baseline ภาษาไทยสำหรับ Content Workspace
