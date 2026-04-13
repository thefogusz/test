# UX/UI README

## เป้าหมายของเอกสารนี้

เอกสารนี้เป็น UX/UI source of truth สำหรับ repo `foro` ตัว test ที่ใช้เป็นต้นแบบก่อนย้ายหรือ copy logic ไปทำ `foro` ตัวจริง

เป้าหมายหลักมี 3 ข้อ:

- ให้ dev ที่เพิ่งเข้ามาอ่านแล้วเข้าใจภาพรวมของ UI โดยไม่ต้องไล่เปิดหลาย component พร้อมกัน
- ให้ LLM มีภาษากลางในการคุยเรื่อง layout, state, animation, responsive behavior และ interaction detail
- ให้เวลานำ repo นี้ไปแตกต่อเป็น production repo ยังรักษา intent ของงานออกแบบเดิมได้ ไม่ใช่ copy แค่หน้าตาแล้วเสีย behavior

เอกสารนี้ควรใช้คู่กับ `DESIGN.md` ที่ root ของ repo ซึ่งเน้น visual language, token, spacing, และ tone ของแบรนด์ ส่วนหน้านี้จะเน้นว่า UX แต่ละจุด "ถูกออกแบบให้ทำงานอย่างไร"

## วิธีใช้เอกสารนี้กับ dev และ LLM

เวลา brief งานกับ dev หรือถาม LLM ให้ใช้คำต่อไปนี้เป็นคำกลาง:

- `app shell`: โครงซ้าย กลาง ขวา ของแอป
- `left rail`: sidebar หลัก
- `main workspace`: พื้นที่ทำงานตรงกลาง
- `right rail`: post list / supporting context
- `home feed`: หน้าติดตามสัญญาณจาก X + RSS
- `content search`: หน้าค้นหาและสรุปข้อมูล
- `content create`: หน้าสร้างคอนเทนต์จาก source
- `read workspace`: ห้องอ่านบทความและข่าวที่เก็บไว้
- `audience workspace`: หน้าหา account / source ใหม่
- `pricing workspace`: หน้า profile, plan, usage, upgrade
- `mobile context switcher`: แถบสลับโหมดด้านล่างบน mobile
- `AI summary card`: การ์ดสรุปผลจาก FORO เช่น `FORO FILTER` หรือ `FORO SUMMARY`

prompt แนะนำสำหรับถาม LLM:

> ใช้ `docs/ux-ui-readme.md` และ `DESIGN.md` เป็น source of truth ก่อนแก้ UI ของ Foro อย่าแก้แค่หน้าตา ให้รักษา layout contract, interaction flow, mobile behavior, และ animation intent ของ workspace นี้ด้วย

## Product UX Intent

FORO ไม่ได้ถูกออกแบบให้เหมือน landing page หรือ social app แต่เป็น "workspace สำหรับคัดสัญญาณและตัดสินใจเร็ว"

สิ่งที่ UI ต้องสื่อให้ได้ตลอด:

- ผู้ใช้กำลังทำงานอยู่ในเครื่องมือ ไม่ได้กำลังดูหน้าโปรโมต
- สิ่งสำคัญที่สุดคือ signal, result, source, action ต่อไป
- animation ต้องช่วยแปล state ไม่ใช่ทำให้รู้สึก flashy
- แต่ละ workspace ต้องดูเป็นพี่น้องกัน แม้หน้าที่ต่างกัน

## UX Principles ที่ห้ามหลุด

### 1. Content-first

- header ต้องสั้น
- title ต้องบอกงานที่หน้าจอนั้นทำ
- action สำคัญต้องอยู่ใกล้ข้อมูลที่มันกระทบ
- metadata ต้องไม่แย่ง hierarchy จาก content หลัก

### 2. Progressive disclosure

- โชว์เท่าที่จำเป็นก่อน
- รายละเอียดรองให้ขยายเมื่อผู้ใช้ต้องการ
- ตัวอย่างในระบบนี้คือ right sidebar, source expansion, load more, search suggestions

### 3. Fast state readability

ผู้ใช้ต้องแยกให้ออกภายในไม่กี่วินาทีว่า:

- ตอนนี้อยู่ workspace ไหน
- ระบบกำลังทำงานอะไร
- ปุ่มไหนคือ primary action ของหน้าปัจจุบัน
- ตอนนี้เป็น empty, loading, filtered, or completed state

### 4. Reusable mental model

- `FeedCard` ถูกใช้หลาย workspace เพราะผู้ใช้ควรคุ้นกับ object เดียวกัน
- ปุ่ม pill, icon action, summary card, list pill และ chips ควรให้ความรู้สึกคุ้นเคยข้ามหน้า

### 5. Thai-first readability

- สำคัญกับ heading, subtitle, reasoning, summary, empty state
- ถ้าข้อความไทยยาวขึ้น UI ต้องยังอ่านง่ายและไม่ชนกัน

## App Shell Contract

อ้างอิงจาก `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/RightSidebar.tsx`, `src/index.css`

### Desktop structure

- ซ้าย: navigation + plan panel
- กลาง: workspace ปัจจุบัน
- ขวา: post list และบริบทเสริม

ค่า layout ปัจจุบันใน CSS:

- left sidebar กว้างประมาณ `288px`
- right sidebar กว้างประมาณ `320px`
- main workspace เป็น panel กลางพื้น `--bg-900`
- shell ด้านนอกเป็น pure black เพื่อสร้าง negative space ชัดเจน

### Pricing exception

เมื่อเข้า `pricing`:

- right rail ต้องหาย
- main workspace ต้องดูเหมือน focus mode
- อย่าเปิด context รองมาชนกับ flow profile / billing

### Mobile shell behavior

บน mobile shell เปลี่ยนจาก 3-column เป็น:

- bottom nav fixed
- มี context switcher / launcher ตาม workspace
- right sidebar กลายเป็น sheet
- main content ต้องมี bottom padding พอสำหรับ nav และ switcher

## Navigation Design Intent

### Left rail

- active item ใช้ tint + contrast + indicator bar ไม่ใช่แค่สีตัวอักษร
- busy state ใช้ spinner เล็กด้านขวา
- desktop label เน้นความชัด ส่วน mobile label ย่อให้สั้น

### Mobile nav

- มี 4 จุดหลัก: home, content, read, pricing
- audience และ bookmarks ถูกลด priority บน mobile
- แต่ละ workspace มี shortcut เพิ่มตามบริบท เช่น filter, feed, search/create, read/bookmarks

### Plan panel

Plan panel ไม่ใช่แค่ billing widget แต่เป็น global utility panel:

- สรุป plan ปัจจุบัน
- usage คงเหลือ
- ช่องทางไป pricing
- ช่องทางไป Foro Docs

## Workspace-by-Workspace UX

## 1. Home Feed

อ้างอิงหลัก: `src/components/HomeView.tsx`

### หน้าที่ของหน้า

ตอบคำถามว่า "ตอนนี้มีอะไรน่าดู น่าอ่าน หรือน่าเอาไปทำต่อ"

### โครงสร้าง UX

- header บอกว่าผู้ใช้อยู่หน้า home feed
- control panel มี quick filter, FORO Filter, sync
- feed toolbar มี clear/undo + sort
- body เป็น `feed-grid`
- footer มี load more หรือ plan limit state

### Interaction intent

- `FORO Filter` เป็น smart action ที่อยู่ใกล้ feed เพราะมันเปลี่ยนความหมายของรายการทั้งชุด
- `Feed data` เป็น primary button ของหน้า home
- `Clear` และ `Undo` ใช้ตำแหน่งเดียวกันเพื่อให้ผู้ใช้เข้าใจว่าเป็น action ต่อเนื่องกัน
- quick presets มีไว้ลด friction สำหรับ prompt ที่ใช้บ่อย

### States ที่ต้องรักษา

- empty state: ใช้ `HomeCanvas` + title กลางจอเพื่อให้หน้าไม่ตาย แต่ยังไม่กลายเป็น marketing hero
- syncing with existing feed: ใช้ skeleton แทรกก่อน/หลัง feed เดิม แปลว่าระบบกำลังเติมข้อมูล ไม่ได้ล้าง context
- filtering: ปุ่ม filter ต้องเปลี่ยน label/state ชัด
- filtered result: ต้องมี summary card หรือ badge ว่าผลที่เห็นถูกคัดแล้ว
- limit reached: ต้องบอกตรง ๆ ว่าเห็นครบตาม plan แล้ว

### Animation intent

- feed card hover ยกขึ้นเล็กน้อย เพื่อสื่อว่า interact ได้
- undo ปรากฏด้วย animation สั้นเพื่อบอกว่ามี recovery state
- summary card ใช้ fade-in ไม่ควรเด้งแรง
- skeleton ใช้ shimmer เพื่อสื่อ "กำลังโหลด" ไม่ใช่ decoration

### สิ่งที่ห้ามทำ

- ห้ามเปลี่ยน empty state ให้เหมือน landing page
- ห้ามทำปุ่ม primary หลายตัวแข่งกันใน header เดียว
- ห้ามทำ filter result ให้แยก visual language จนดูเหมือนคนละระบบ

## 2. Content Workspace

อ้างอิงหลัก: `src/components/ContentWorkspace.tsx`

หน้านี้มี 2 โหมดหลัก:

- `search`
- `create`

### 2.1 Search mode

#### หน้าที่ของหน้า

ให้ผู้ใช้ค้นหา topic, สำรวจผลลัพธ์, และอ่าน `FORO SUMMARY` ที่สรุปจากหลาย source

#### UX structure

- hero header สั้น
- search field เป็นองค์ประกอบหลักของหน้า
- toggle latest mode เป็น quick intent modifier
- media type chips เป็น secondary filter
- preset/history/discovery tags ช่วยเริ่มต้นเมื่อยังไม่ค้น
- result area ใช้ summary card ก่อน feed cards

#### Interaction intent

- search bar ต้องรู้สึกเหมือน command surface มากกว่า form ปกติ
- latest toggle ต้องเป็น "state modifier" ไม่ใช่ CTA แข่งกับปุ่มค้นหา
- clear result ต้องชัดว่าล้างผลรอบนี้ ไม่ใช่ล้างข้อมูลระบบ
- source expansion ใต้ summary มีไว้สร้างความเชื่อมั่น

#### States

- pre-search discovery state
- typing with suggestions
- live preparing state
- searching state
- empty result state
- results with summary
- results without summary เสร็จไม่พร้อมกันได้

#### Animation intent

- focus-within ของ search box ยกและเรืองเล็กน้อย เพื่อดึงสายตาเข้าจุดพิมพ์
- loading state ใช้ bar/lines ที่นิ่งพอ ไม่ควร distract
- results และ summary ค่อย ๆ ปรากฏ ไม่ควร snap แข็งเกินไป

### 2.2 Create mode

#### หน้าที่ของหน้า

ให้ผู้ใช้สร้าง content จาก source ที่ attach มา โดยไม่ให้ source panel บังพื้นที่คิด

#### Intent สำคัญ

- source attachment ต้อง compact
- editor/work area ต้องเป็นพระเอก
- generating state ต้องบอก phase ได้
- save result แล้วควรไปต่อ bookmark/article flow ได้

## 3. Read Workspace

อ้างอิงหลัก: `src/components/ReadWorkspace.tsx`

### หน้าที่ของหน้า

เป็น library สำหรับ deep read ของข่าวและบทความที่ผู้ใช้เก็บไว้

### UX structure

- header อธิบายว่าหน้านี้คือห้องอ่าน
- search box สำหรับค้นในคลัง
- suggestion pills สำหรับคืนคำค้นที่น่าจะเกี่ยว
- sort pills ตาม view / engagement
- card grid ใช้ object เดิมคือ `FeedCard`

### Intent สำคัญ

- ผู้ใช้ควรรู้สึกว่าเป็น "คลังอ่านต่อ" ไม่ใช่ feed สด
- interaction ต้องนิ่งกว่า home
- search empty state ต้องช่วยพากลับ ไม่ใช่แค่บอกว่าไม่เจอ

### Animation intent

- ใช้ fade-in เบา ๆ ระดับ workspace
- ไม่ควรมี motion เยอะกว่าหน้า home

## 4. Audience Workspace

อ้างอิงหลัก: `src/components/AudienceWorkspace.tsx`

### หน้าที่ของหน้า

ช่วยผู้ใช้ขยาย network ของ signal ทั้งจาก account และ RSS source

### UX structure

มี 3 tab:

- `FORO recommendations`
- `news sources`
- `manual search`

### AI recommendation mode

- search bar คือจุดสั่งงานหลัก
- category image cards ใช้เป็น guided discovery
- result card ต้องตอบให้ได้ว่า "ทำไมควรติดตาม"
- ปุ่มเพิ่มเข้า watchlist ต้องตรงและชัด

### Why-this-person reasoning

ข้อความ reasoning เป็นส่วนสำคัญของ UX ไม่ใช่แค่ description:

- ต้องอ่านง่าย
- ต้องเฉพาะเจาะจง
- ควรช่วยตัดสินใจได้ใน 1-2 ประโยค

### News sources mode

- ใช้ mental model เดียวกับ source management
- subscription state ต้องดูออกทันที

### Manual mode

- เหมาะกับกรณีรู้ username อยู่แล้ว
- suggestion dropdown ช่วยลด typo
- preview card ต้องยืนยันตัวตนก่อน add

### Animation intent

- category cards ควรตอบสนองไว
- results shell ตอน refresh ควรบอกว่าอัปเดตผลเดิม ไม่ใช่รีเซ็ตทั้งหมด
- menu / dropdown ต้องเป็น utility motion สั้น ๆ

## 5. Bookmarks Workspace

แม้หน้านี้ไม่ได้ inspect ละเอียดเท่าหน้าอื่นในรอบนี้ แต่จาก architecture ปัจจุบันมันอยู่ใน mental model เดียวกับ read workspace:

- เป็นพื้นที่เก็บ object ที่จะกลับมาใช้ต่อ
- ควร reuse card pattern เดิม
- visual hierarchy ต้องนิ่งและอ่านง่าย
- ไม่ควรแข่งขันกับ home ในแง่ urgency

## 6. Pricing Workspace

อ้างอิงหลัก: `src/components/PricingWorkspace.tsx`

### หน้าที่ของหน้า

รวม profile, usage, current plan, plan comparison, และ upgrade flow ไว้ในหน้าเดียว

### UX structure

- hero block สำหรับ current profile/usage
- plan grid เทียบ free กับ plus
- buy flow เปิด modal overlay

### Intent สำคัญ

- หน้า pricing ต้องดู trustworthy และตรงไปตรงมา
- usage tiles ต้องอ่านง่ายกว่า decorative
- plan card ปัจจุบันต้องเด่นด้วย state ไม่ใช่เพราะสีแรงอย่างเดียว
- modal ซื้อแพ็กต้องเป็น focus mode เต็ม ๆ

### Animation intent

- modal open/close ต้องนุ่มและชัด
- meter fill ใช้บอกสัดส่วนการใช้ ไม่ควร flashy

## Shared Component Contracts

## FeedCard

ใช้ข้าม home, content results, read, และบาง library flows

contract สำคัญ:

- hover ยกขึ้นเล็กน้อย
- header/body/footer ต้องแยกชัด
- action placement ต้องสม่ำเสมอ
- card เดียวกันต้องทำงานได้ทั้งใน feed สดและ archive

## Summary Card

ใช้กับ `FORO FILTER` และ `FORO SUMMARY`

contract สำคัญ:

- มี icon/title/meta ชัด
- มีปุ่ม copy เป็น utility action
- เนื้อหาควรอ่านเป็น editorial digest
- ถ้ามี source support ต้องขยายดูแหล่งอ้างอิงได้

## Sidebar / RightSidebar

- sidebar คือ navigation and system status
- right sidebar คือ collection management and supporting context
- สองส่วนนี้ไม่ควรแย่งเด่นจาก main workspace

## Animation System Contract

อิงจาก CSS ปัจจุบันใน `src/index.css`

### Motion categories

- micro motion: hover, active, focus
- reveal motion: fade-in, summary appear, panel expand
- loading motion: spin, shimmer, progress bar
- mobile transition: sheet / fixed switcher behavior

### หลักการใช้

- ใช้เวลาโดยรวมสั้นประมาณ `120ms-300ms`
- ใช้ easing ที่รู้สึกแม่นและนิ่ง
- ถ้าเป็น loading ควรสื่อสถานะ ไม่ใช่เรียกร้องความสนใจ
- motion ต้องรักษา continuity ของข้อมูลเดิม เช่น sync ทับของเก่าได้ ไม่ควรเด้งหายทั้งจอ

### จุดที่มี animation สำคัญตอนนี้

- `nav-item` hover / active
- `btn-pill` hover / active
- `feed-card` hover
- `undoReveal`
- `postListExpandIn`
- `fadeIn`
- search input focus state บน mobile
- skeleton shimmer

## Responsive Behavior Contract

### Desktop

- ใช้ 3-region shell เต็มรูปแบบ
- right rail ต้องพร้อมใช้งานเกือบตลอด ยกเว้น pricing

### Tablet

- ลดความกว้างและ spacing ก่อน
- right rail อาจถูกลดความสำคัญ
- toolbar ต้อง wrap แบบยังอ่านได้

### Mobile

- bottom nav เป็น primary navigation
- current task สำคัญกว่าบริบทรอง
- list / filter / library switcher ต้องอยู่ในระยะนิ้วโป้ง
- panel ที่เคยเป็น sidebar ต้องกลายเป็น sheet หรือ inline switcher

### สิ่งที่ต้องเช็กทุกครั้ง

- overflow แนวนอน
- label ไทยยาว
- bottom safe area
- sticky/fixed element ชนกันหรือไม่
- main scroll padding พอหรือยัง

## File Map สำหรับคนจะไปแก้

- `src/App.tsx`: orchestration หลักและ state ระดับ app
- `src/index.css`: visual tokens, layout shell, interaction, animation
- `src/components/Sidebar.tsx`: navigation และ mobile context launcher
- `src/components/RightSidebar.tsx`: post list management panel
- `src/components/HomeView.tsx`: home feed UX
- `src/components/ContentWorkspace.tsx`: search/create UX
- `src/components/ReadWorkspace.tsx`: read library UX
- `src/components/AudienceWorkspace.tsx`: audience discovery UX
- `src/components/PricingWorkspace.tsx`: profile/pricing UX

## Rules สำหรับ repo นี้ในฐานะ test baseline

- ห้าม treat repo นี้เป็นแค่ visual mockup
- เวลา copy ไปทำ `foro` ตัวจริง ต้องย้ายทั้ง interaction contract และ state meaning ไปด้วย
- ถ้าจะแก้ visual language ให้เช็ก `DESIGN.md`
- ถ้าจะแก้ flow หรือ user-facing behavior ให้แก้ docs ใน `docs/` พร้อมกัน

## เวลาแก้ UX/UI ต้องอัปเดตเอกสารนี้เมื่อไร

อัปเดตหน้านี้ทันทีเมื่อมีการเปลี่ยน:

- โครง app shell
- navigation behavior
- mobile interaction model
- feed/search/read/audience/pricing flow
- animation intent
- hierarchy ของ summary card, feed card, หรือ utility panels
- ภาษากลางที่ทีมใช้คุยกับ LLM

## Change Log

- 2026-04-13: สร้าง UX/UI README ฉบับละเอียดสำหรับใช้เป็น source of truth ระหว่าง repo test และ foro ตัวจริง
