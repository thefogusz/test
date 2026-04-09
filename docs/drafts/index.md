# Draft Docs Suggestions

หน้านี้สรุปจากไฟล์ที่เปลี่ยนใน branch หรือ working tree ปัจจุบัน เพื่อบอกว่า PR นี้ควรกลับไปเช็กหน้า docs ไหนบ้าง

<script setup>
import { withBase } from 'vitepress'
import draftReport from '../.vitepress/data/docs-draft.json'

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
</script>

## Snapshot

- สร้างรายงานเมื่อ: `{{ formatDate(draftReport.generatedAt) }}`
- โหมดการตรวจ: `{{ draftReport.context?.mode || '-' }}`
- กำลังเทียบกับ: `{{ draftReport.context?.comparedAgainst || '-' }}`
- ฟีเจอร์ที่ได้รับผลกระทบ: `{{ draftReport.summary.impactedFeatures }}`
- ฟีเจอร์ที่ควรอัปเดต docs เพิ่ม: `{{ draftReport.summary.needsDocsUpdate }}`
- ฟีเจอร์ที่มีการแตะ docs แล้ว: `{{ draftReport.summary.docsAlreadyTouched }}`

## Suggested Review

<div v-if="draftReport.context?.explanation" style="border:1px solid var(--vp-c-divider);border-radius:16px;padding:16px 18px;margin:14px 0;background:color-mix(in srgb, var(--vp-c-bg-soft) 80%, transparent);">
  <strong>สถานะการตรวจล่าสุด</strong>
  <div style="margin-top:6px;">{{ draftReport.context.explanation }}</div>
</div>

<div v-if="draftReport.impactedFeatures.length === 0" style="border:1px solid var(--vp-c-divider);border-radius:16px;padding:16px 18px;margin:14px 0;">
  ไม่พบการเปลี่ยนแปลงที่ชนกับ feature registry ในรอบการตรวจนี้
</div>

<div v-for="feature in draftReport.impactedFeatures" :key="feature.id" style="border:1px solid var(--vp-c-divider);border-radius:16px;padding:16px 18px;margin:14px 0;">
  <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
    <div>
      <div style="font-size:12px;color:var(--vp-c-text-2);font-weight:700;">{{ feature.surface }}</div>
      <div style="font-size:20px;font-weight:800;">{{ feature.title }}</div>
      <div style="margin-top:6px;"><a :href="withBase(feature.route)">เปิดหน้า docs</a></div>
    </div>
    <div :style="feature.needsDocsUpdate ? 'background:#3a2a10;color:#ffd37a;' : 'background:#0f2f1e;color:#90f3b3;'" style="padding:6px 10px;border-radius:999px;font-weight:800;">
      {{ feature.needsDocsUpdate ? 'ควรอัปเดต docs' : 'มีการแตะ docs แล้ว' }}
    </div>
  </div>

  <div style="margin-top:12px;">
    <strong>Docs:</strong> <code>{{ feature.docPath }}</code>
  </div>

  <div v-if="feature.changedSourceFiles.length" style="margin-top:8px;">
    <strong>Source ที่เปลี่ยน:</strong>
    <span v-for="filePath in feature.changedSourceFiles" :key="filePath" style="display:inline-block;margin:6px 8px 0 0;">
      <code>{{ filePath }}</code>
    </span>
  </div>

  <div style="margin-top:8px;">
    <strong>หัวข้อที่ควรทบทวน:</strong>
    <span v-for="section in feature.recommendedSections" :key="section" style="display:inline-block;margin:6px 8px 0 0;">
      <code>{{ section }}</code>
    </span>
  </div>
</div>

<div v-if="draftReport.unmappedFiles.length" style="border:1px solid var(--vp-c-divider);border-radius:16px;padding:16px 18px;margin:14px 0;">
  <strong>ไฟล์ที่ยังไม่ผูกกับ feature registry</strong>
  <ul>
    <li v-for="filePath in draftReport.unmappedFiles" :key="filePath">
      <code>{{ filePath }}</code>
    </li>
  </ul>
</div>
