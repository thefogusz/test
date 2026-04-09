# Pricing Workspace

## เป้าหมายของฟีเจอร์

Pricing Workspace ใช้สื่อสารแพ็กเกจของ Foro, ปริมาณการใช้งานที่เหลือ, และทางเลือกในการอัปเกรดหรือเปลี่ยนแผน จุดสำคัญคือช่วยให้ผู้ใช้เข้าใจ limit ของ plan ปัจจุบันและตัดสินใจอัปเกรดได้จาก flow ในแอป

## พฤติกรรมปัจจุบัน

- เปิดภายใต้ `activeView = "pricing"`
- แสดง current plan, usage strip และ comparison card ของแผน `free` กับ `plus`
- ถ้าเลือกแผน `plus` จะเปิด buy modal และ render Stripe buy button เมื่อมี `VITE_STRIPE_PUBLISHABLE_KEY`
- ถ้าไม่มี publishable key จะขึ้น fallback message แทน
- ถ้าเลือกแผนอื่นที่ไม่ต้อง checkout จะเรียก `onSelectPlan` ตรง

## ลำดับการใช้งานหลัก

1. ผู้ใช้เข้ามาที่หน้า Pricing
2. ผู้ใช้ดู usage ปัจจุบันและ compare แผน
3. ผู้ใช้เลือกแผนที่ต้องการ
4. ถ้าเป็น plus ระบบเปิด modal สำหรับ checkout

## กฎสำคัญที่ห้ามหลุด

- current plan และ usage ต้องสะท้อน state จริงจาก billing
- เส้นทางของ `plus` ต้องไป checkout modal ไม่ใช่สลับ plan ตรง
- buy button ของ Stripe ต้องโหลดเฉพาะตอน modal เปิด
- ถ้าไม่มี publishable key ต้องไม่พัง และต้องมี fallback ที่อธิบายได้

## UI States ที่ต้องนึกถึงเวลาแก้

- Current Plan Visible: เห็น plan ปัจจุบันและ usage strip
- Plan Compare: เห็นความต่างระหว่าง free และ plus
- Checkout Loading: ปุ่ม plus ถูก disable ระหว่าง checkout loading
- Buy Modal Open: modal เปิดและ body scroll ถูก lock
- Missing Key Fallback: ไม่มี key สำหรับ buy button

## ไฟล์หลักที่เกี่ยวข้อง

- `src/App.tsx`
- `src/components/PricingWorkspace.tsx`
- `src/config/pricingPlans.ts`

## Dependency สำคัญ

- billing state
- Stripe buy button script
- env `VITE_STRIPE_PUBLISHABLE_KEY`

## สิ่งที่ฟีเจอร์นี้ไม่ได้เป็นเจ้าของ

- logic หลักของการ consume usage ในแต่ละ feature
- feed, search หรือ generation UI
- RSS source management

## สัญญาณว่าควรอัปเดตเอกสารหน้านี้

- เปลี่ยน plan ที่เปิดขาย
- เปลี่ยน usage model หรือ object limits
- เปลี่ยน checkout flow
- เปลี่ยน fallback behavior เมื่อ Stripe ใช้งานไม่ได้

## Change Log

- 2026-04-09: สร้างเอกสาร baseline ภาษาไทยสำหรับ Pricing Workspace
