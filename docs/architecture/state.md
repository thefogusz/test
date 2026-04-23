# State และ Persistence

## State Strategy ปัจจุบัน

ระบบนี้ใช้ React hooks เป็นหลัก โดยไม่มี state library ภายนอก

หมายความว่า:

- state หลักอยู่ใน `src/App.tsx`
- component ย่อยรับ props ลงไป
- side effects ใช้ `useEffect()`

## localStorage ที่ใช้จริง

ตัวอย่าง key สำคัญ:

| Key | ใช้เก็บอะไร |
| :--- | :--- |
| `foro_watchlist_v2` | รายชื่อ account ที่ติดตาม |
| `foro_home_feed_v1` | feed หลัก |
| `foro_read_archive_v1` | คลังอ่านย้อนหลัง |
| `foro_bookmarks_v1` | bookmarks ของข่าวและบทความ |
| `foro_postlists_v2` | post lists |
| `foro_attached_source_v1` | source ที่แนบเข้า content creator |
| `foro_generate_input_v1` | input ของ content generation |
| `foro_generate_markdown_v1` | draft markdown ล่าสุด |
| `foro_rss_seen_registry_v1` | RSS seen registry สำหรับกันข่าวซ้ำระหว่าง sync |
| `foro_x_seen_registry_v1` | X seen registry สำหรับกันโพสต์ซ้ำ |
| `foro_x_sync_checkpoints_v1` | checkpoint ของ X sync แยกตามขอบเขต list/handle |

## Feed history hydration

Home sync ใช้ประวัติฟีด durable หลายก้อนพร้อมกัน ได้แก่ RSS seen registry, X seen registry, และ X sync checkpoints

- hook `useHomeFeedWorkspace` expose `isFeedHistoryHydrated` ให้ UI และ `App.tsx` ใช้เป็น guard
- ปุ่ม sync ต้องรอ hydration ครบก่อนเริ่ม fetch
- `App.tsx` ต้องเช็ก hydration ก่อน consume usage เพื่อไม่หัก quota จากการกดที่ยังทำงานจริงไม่ได้
- ถ้า hydration ยังไม่ครบ ระบบควรสื่อว่า `กำลังโหลดประวัติฟีด...` แทนการบอกว่าไม่มีข้อมูลใหม่

## ข้อดี

- เริ่มระบบง่าย
- ไม่ต้องมี backend database
- refresh หน้าแล้วยังอยู่

## ข้อจำกัด

- ข้อมูลอยู่แค่ browser/device เดียว
- schema เปลี่ยนแล้วต้องคอย sanitize data เก่า
- state หลายก้อนยังผูกกับ component ใหญ่ตัวเดียว

## ถ้าจะ refactor ต่อ

แนะนำแยกเป็น:

- `useFeedState()`
- `useSearchState()`
- `useBookmarksState()`
- `useContentGenerationState()`

จะช่วยให้แยก domain ชัดขึ้นและ test ง่ายขึ้น
