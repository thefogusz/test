# UX/UI README

เอกสารนี้เป็น UX/UI source of truth สำหรับ Foro ใน repo นี้ โดยใช้คู่กับ `DESIGN.md`

- `DESIGN.md` อธิบาย visual language, token, hierarchy, spacing, และ brand feel
- หน้านี้อธิบาย interaction contract, responsive behavior, state meaning, และเหตุผลเชิง UX ว่าแต่ละหน้าถูกออกแบบให้ทำงานอย่างไร

เป้าหมายคือให้ dev และ LLM อ่านแล้วเข้าใจ "ของที่ผู้ใช้ควรเจอจริงตอนนี้" โดยไม่ต้องไล่เปิดหลาย component พร้อมกัน

## ภาพรวม UX ของผลิตภัณฑ์

Foro ไม่ได้ถูกออกแบบให้เป็น landing page หรือ social feed ทั่วไป แต่เป็น workspace สำหรับ:

- เก็บสัญญาณจาก X และ RSS
- คัดกรองสิ่งที่ควรดูต่อ
- อ่านและแปลบทความ
- ค้นหาและสรุปข้อมูล
- สร้างคอนเทนต์จาก source ที่เกี่ยวข้อง

สิ่งที่ UI ต้องสื่อเสมอ:

- ผู้ใช้กำลังทำงานอยู่ในเครื่องมือ ไม่ได้อยู่ในหน้าโปรโมต
- signal, source, summary, และ next action สำคัญกว่าของตกแต่ง
- motion ต้องช่วยแปล state ไม่ใช่แย่งความสนใจ
- แต่ละ workspace ต้องรู้สึกเป็นระบบเดียวกัน แม้หน้าที่ต่างกัน

## คำศัพท์กลางที่ใช้คุยงาน

- `app shell`: โครงซ้าย กลาง ขวา ของแอป
- `left rail`: sidebar หลัก
- `main workspace`: พื้นที่ทำงานตรงกลาง
- `right rail`: post list และ supporting context
- `home feed`: หน้าติดตามสัญญาณหลัก
- `content search`: โหมดค้นหาและสรุป
- `content create`: โหมดสร้างคอนเทนต์
- `read workspace`: ห้องอ่านและ archive
- `audience workspace`: หน้าหา account และ news source ใหม่
- `pricing workspace`: profile, usage, plan, upgrade
- `mobile context switcher`: ปุ่มสลับบริบทบนมือถือของแต่ละ workspace
- `summary card`: การ์ดสรุปแบบ `FORO FILTER` หรือ `FORO SUMMARY`

## UX Principles ที่ห้ามหลุด

### 1. Content-first

- header ต้องบอกงานของหน้าแบบสั้นและชัด
- action สำคัญต้องอยู่ใกล้ข้อมูลที่มันกระทบ
- metadata ต้องไม่ดังเกิน content หลัก

### 2. Progressive disclosure

- โชว์เท่าที่จำเป็นก่อน
- context รองค่อยขยายเมื่อผู้ใช้ต้องการ
- right rail, source expansion, suggestions, และ load more เป็นตัวอย่างของหลักนี้

### 3. Fast state readability

ผู้ใช้ต้องมองออกภายในไม่กี่วินาทีว่า:

- ตอนนี้อยู่ workspace ไหน
- ระบบกำลังทำอะไร
- primary action ของหน้าคืออะไร
- หน้านี้อยู่ในสถานะ empty, loading, filtered, searching, หรือ completed

### 4. Reusable mental model

- `FeedCard` ต้องรู้สึกคุ้น across home, search, read, bookmarks
- pill buttons, icon actions, summary cards, และ list chips ต้องใช้ภาษาดีไซน์ร่วมกัน

### 5. Thai-first readability

- label, summary, empty state, reasoning, และ helper text ต้องอ่านไทยได้ลื่น
- เมื่อข้อความไทยยาวขึ้น layout ต้องยังไม่พังและไม่แน่นเกินไป

## App Shell Contract

อ้างอิงจาก `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/RightSidebar.tsx`, `src/components/AppWorkspaceRouter.tsx`

### Desktop

โครงหลักเป็น 3 ส่วน:

- ซ้าย: navigation + plan panel
- กลาง: workspace ปัจจุบัน
- ขวา: post list manager และ supporting context

intent ของ shell:

- main workspace ต้องเป็นพระเอก
- rail สองฝั่งต้องนิ่งและใช้งานได้ต่อเนื่อง
- outer shell เป็น dark negative space เพื่อดัน focus เข้าหาพื้นที่ทำงาน

### Pricing exception

เมื่ออยู่ `pricing`:

- right rail ต้องหาย
- main workspace ต้องกลายเป็น focus mode
- ผู้ใช้ไม่ควรถูกดึง attention ไปที่ context รอง

### Mobile shell

บนมือถือ shell เปลี่ยนจาก 3-column เป็น:

- bottom navigation แบบ fixed
- context switcher เฉพาะ workspace
- right rail กลายเป็น sheet
- main content ต้องเว้นพื้นที่ด้านล่างพอสำหรับ nav และ switcher

## Navigation Contract

### Left rail

Sidebar ปัจจุบันมี top-level views:

- `home`
- `content`
- `read`
- `audience`
- `bookmarks`
- `pricing`

บน desktop:

- active item ใช้ tint + contrast + shape ไม่ใช่แค่เปลี่ยนสีตัวอักษร
- busy state แสดง spinner ด้านขวา
- logo area สามารถแสดง global working state ได้

บน mobile:

- `audience` และ `bookmarks` ถูกลดความสำคัญจาก bottom nav หลัก
- access ถูกส่งผ่าน context switcher หรือ flow ภายในหน้าที่เกี่ยวข้อง

### Plan panel

Plan panel ไม่ใช่แค่ billing widget แต่เป็น global utility panel สำหรับ:

- plan ปัจจุบัน
- usage ที่เหลือ
- entry ไป pricing
- notice ระดับระบบที่เกี่ยวกับ plan

## Workspace-by-Workspace Contract

## 1. Home Feed

อ้างอิงหลัก: `src/components/HomeView.tsx`

### หน้าที่ของหน้า

ตอบคำถามว่า:

- ตอนนี้มีอะไรน่าดู
- อะไรควรถูกคัดขึ้นมาก่อน
- ควร sync, filter, sort, อ่าน, หรือเอาไปทำคอนเทนต์ต่อไหม

### UX structure

- header บอกว่าผู้ใช้อยู่หน้า Home
- desktop control panel มี selected list context, quick presets, `FORO Filter`, และ sync action
- feed toolbar มี clear/undo และ sort
- body เป็น feed grid
- footer ของหน้าเป็น load more หรือ plan-limit state

### Current behavior ที่ต้องรักษา

- `FORO Filter` เป็น smart action ใกล้ feed ไม่ใช่ utility ห่าง ๆ
- quick presets มีไว้ลด friction ของ prompt ที่ใช้บ่อย
- clear กับ undo ใช้ตำแหน่งเดียวกันเพื่อสื่อว่าเป็น action ต่อเนื่อง
- เมื่อ sync ระหว่างที่ feed เดิมยังอยู่ ต้องแสดง prepended/appended skeleton มากกว่าล้าง context เดิมทิ้ง
- filtered result ต้องมี badge หรือ summary บอกชัดว่าผลที่เห็นถูกคัดมาแล้ว
- เมื่อถึงเพดาน plan ต้องบอกตรง ๆ ว่าเห็นครบตาม plan แล้ว

### Empty state

- ใช้ `HomeCanvas`
- ต้องรู้สึกเป็น workspace ว่างที่พร้อมเริ่ม ไม่ใช่ marketing hero

### Animation intent

- card hover ยกขึ้นเล็กน้อย
- undo state ต้องโผล่แบบสั้นและชัด
- summary card ใช้ fade-in เบา ๆ
- skeleton ใช้เพื่อแปล state loading เท่านั้น

## 2. Content Workspace

อ้างอิงหลัก: `src/components/ContentWorkspace.tsx`, `src/components/CreateContent.tsx`

มี 2 โหมดหลัก:

- `search`
- `create`

### 2.1 Search mode

### หน้าที่ของหน้า

ให้ผู้ใช้ค้นหา topic, อ่านสรุป, สำรวจ result set, เปิดอ่าน source, และต่อยอดเป็น content หรือ reading flow

### UX structure

- search input เป็น command surface หลัก
- latest toggle เป็น intent modifier ไม่ใช่ CTA แข่งกับปุ่มค้นหา
- media type chips เป็น secondary filter
- preset/history/discovery tags ช่วยเริ่มต้นก่อนผู้ใช้จะคิด query เอง
- summary card ต้องมาก่อน result cards เมื่อ summary พร้อม
- source expansion ใต้ summary ช่วยสร้างความเชื่อมั่นว่าข้อสรุปมีที่มา

### States ที่ต้องรักษา

- pre-search discovery state
- typing with suggestions
- live preparing state
- searching state
- empty result state
- result-with-summary state
- result-without-summary-yet state
- search choice refinement state เมื่อมีหลายมุมให้โฟกัส

### Animation intent

- search box focus ต้องดึงสายตาแบบนิ่งและคม
- loading skeleton/line state ต้องสื่อว่าระบบกำลังขยายและจัดอันดับข้อมูล
- summary และ results ควรค่อย ๆ ปรากฏ ไม่ snap แรง

### 2.2 Create mode

### หน้าที่ของหน้า

ให้ผู้ใช้สร้าง content จาก prompt หรือ attached source โดยไม่ให้ source panel แย่งพื้นที่คิด

### Current UX intent

- attached source ต้อง compact
- writing area และ result area ต้องเป็นพระเอก
- generation phase ต้องบอกเป็นลำดับงาน เช่น researching, briefing, generating
- ระหว่างสตรีม draft ต้องอ่านได้โดยไม่ crash render
- หลังสร้างเสร็จ ผู้ใช้ต้อง copy, edit, regenerate, bookmark, และเปิด source ต่อได้ทันที

## 3. Read Workspace

อ้างอิงหลัก: `src/components/ReadWorkspace.tsx`

### หน้าที่ของหน้า

เป็น library สำหรับสิ่งที่ควรกลับมาอ่านต่อ ไม่ใช่ feed สด

### UX intent

- บรรยากาศต้องนิ่งกว่า Home
- search ในคลังต้องช่วยพาผู้ใช้กลับไปเจอสิ่งที่เคยเก็บ
- sort/filter ต้องเป็น utility รอง ไม่แย่ง hierarchy จากเนื้อหา
- ใช้ object เดิมอย่าง `FeedCard` เพื่อคง mental model

### Mobile behavior

- มี context switcher ร่วมกับ Bookmarks
- post list ยังเข้าถึงได้ผ่าน mobile launcher

## 4. Audience Workspace

อ้างอิงหลัก: `src/components/AudienceWorkspace.tsx`, `src/components/NewsSourcesTab.tsx`

### หน้าที่ของหน้า

ช่วยผู้ใช้ขยาย network ของสัญญาณ ทั้งจาก account และ source

### Current tabs

- `FORO recommendations`
- `news sources`
- `manual search`

### Recommendation mode intent

- search bar คือ command surface หลัก
- category image cards ใช้เป็น guided discovery
- result card ต้องตอบได้ว่า "ทำไมควรติดตาม"
- CTA เพิ่มเข้ watchlist ต้องชัดและเร็ว
- reasoning ภาษาไทยเป็นส่วนสำคัญของ UX ไม่ใช่ text filler

### Reasoning contract

ข้อความ reasoning ควร:

- อ่านง่าย
- เฉพาะเจาะจง
- ช่วยตัดสินใจได้ใน 1-2 ประโยค
- ไม่ generic แบบ marketing copy

### News sources mode

- ใช้ mental model ของ source management
- subscription state ต้องดูออกทันที
- source card ต้องเชื่อมกับ post list flow ได้

### Manual mode

- เหมาะกับกรณีรู้ username อยู่แล้ว
- suggestion dropdown ช่วยลด typo
- preview card ต้องยืนยันตัวตนก่อน add

## 5. Bookmarks Workspace

อ้างอิงหลัก: `src/components/BookmarksWorkspace.tsx`

บทบาทของหน้านี้อยู่ใกล้กับ Read workspace แต่เน้นสิ่งที่ผู้ใช้บันทึกไว้เพื่อหยิบกลับมาใช้ต่อ

intent สำคัญ:

- reuse card pattern เดิม
- hierarchy ต้องนิ่งและอ่านง่าย
- ไม่แข่งกับ Home ในแง่ urgency
- บนมือถือมี context switcher ร่วมกับ Read

## 6. Pricing Workspace

อ้างอิงหลัก: `src/components/PricingWorkspace.tsx`

### หน้าที่ของหน้า

รวม profile, usage, current plan, comparison, และ upgrade flow ไว้ในหน้าเดียว

### UX intent

- หน้านี้ต้องดู trustworthy และตรงไปตรงมา
- usage tiles ต้องอ่านง่ายกว่าตกแต่ง
- current plan ต้องเด่นด้วย state, not decoration only
- buy flow ต้องรู้สึกเป็น focus mode เต็ม ๆ

### Motion

- modal open/close ต้องนุ่มและชัด
- meter fill ใช้บอกสัดส่วนการใช้ ไม่ใช่โชว์ motion

## Right Rail Contract

อ้างอิงหลัก: `src/components/RightSidebar.tsx`

Right rail ปัจจุบันไม่ใช่แค่ list viewer แต่เป็น post list manager เต็มรูปแบบ

มันต้องทำหน้าที่:

- แสดง list ที่มีอยู่
- เลือก active list
- สร้าง/นำเข้า list
- เปลี่ยนชื่อและสี
- เพิ่ม account หรือ RSS source เข้า list
- แชร์ list
- ลบสมาชิกและลบ list

UX intent:

- right rail เป็น supporting context ไม่ใช่พระเอก
- แต่เมื่อเปิด list ใด list หนึ่งแล้ว panel ขยายต้องใช้งานได้จริงแบบไม่รู้สึกเป็น secondary mockup
- available accounts/sources, manual add, และ current members ต้องต่อเนื่องกันเป็น flow เดียว

บน mobile:

- right rail กลายเป็น sheet
- ต้องยังเปิดไป Audience ได้จาก flow นี้

## Shared Component Contracts

## FeedCard

ใช้ข้าม Home, Search, Read, Bookmarks และบาง flow ของ Audience

contract สำคัญ:

- header/body/footer ต้องแยกชัด
- action placement ต้องสม่ำเสมอ
- hover feedback ต้องมีแต่ไม่แรงเกิน
- object เดียวกันต้องอยู่ได้ทั้งใน feed สดและ archive

## Summary Card

ใช้กับ `FORO FILTER` และ `FORO SUMMARY`

contract สำคัญ:

- มี icon, title, meta ชัด
- copy action เป็น utility action มาตรฐาน
- เนื้อหาต้องอ่านเป็น editorial digest
- ถ้ามี source support ต้องขยายดูแหล่งอ้างอิงได้

## Sidebar

- เป็น navigation + system status
- ต้องบอก active workspace และ background activity ได้เร็ว
- mobile launcher ที่โผล่ตาม workspace เป็นส่วนหนึ่งของ sidebar contract ไม่ใช่ของตกแต่งแยก

## Animation Contract

อ้างอิงจาก `src/index.css`

### Motion categories

- micro motion: hover, active, focus
- reveal motion: fade-in, panel expand, summary appear
- loading motion: spinner, shimmer, progress bar
- mobile transition: sheet และ context switcher behavior

### หลักการใช้

- ใช้ motion สั้นประมาณ `120ms-300ms`
- loading motion ต้องสื่อสถานะ ไม่ใช่เรียกความสนใจ
- motion ต้องรักษา continuity ของข้อมูลเดิม เช่น sync หรือ refresh ไม่ควรทำให้หน้าหายแล้วโผล่ใหม่ทั้งจอ

## Responsive Contract

### Desktop

- ใช้ 3-region shell เต็มรูปแบบ
- right rail พร้อมใช้งานเกือบตลอด ยกเว้น pricing

### Tablet

- ลด spacing และความกว้างก่อน
- toolbar ต้อง wrap แล้วยังอ่านลำดับ action ได้

### Mobile

- bottom nav เป็น primary navigation
- current task สำคัญกว่าบริบทรอง
- sidebar/right rail ต้องยุบเป็น switcher หรือ sheet
- label ภาษาไทยยาวต้องยังไม่ overflow
- ต้องเช็ก safe area ด้านล่างทุกครั้ง

## File Map สำหรับคนจะไปแก้

- `src/App.tsx`
- `src/index.css`
- `src/components/Sidebar.tsx`
- `src/components/RightSidebar.tsx`
- `src/components/HomeView.tsx`
- `src/components/ContentWorkspace.tsx`
- `src/components/CreateContent.tsx`
- `src/components/ReadWorkspace.tsx`
- `src/components/AudienceWorkspace.tsx`
- `src/components/BookmarksWorkspace.tsx`
- `src/components/PricingWorkspace.tsx`

## ต้องอัปเดตเอกสารนี้เมื่อไร

อัปเดตทันทีเมื่อมีการเปลี่ยน:

- app shell
- navigation behavior
- mobile interaction model
- home/content/read/audience/bookmarks/pricing flow
- hierarchy ของ summary card, feed card, หรือ rails
- animation intent
- ภาษากลางที่ทีมใช้คุยกับ LLM

## Change Log

- 2026-04-19: รีเฟรชเอกสารให้ตรงกับ workspace ปัจจุบัน, mobile context switcher, right rail แบบ post list manager, content summary/source flow, และ audience reasoning behavior
- 2026-04-13: สร้าง UX/UI README ฉบับแรกเป็น source of truth สำหรับ repo นี้
