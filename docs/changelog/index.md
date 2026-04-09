# Changelog

หน้านี้สรุปการเปลี่ยนแปลงล่าสุดของฟีเจอร์ที่ tracked ไว้ใน registry โดยอ่านจาก Git โดยตรง เหมาะกับคนที่อยากดูว่า "เพิ่งมีอะไรเปลี่ยนไปบ้าง" โดยไม่ต้องไล่เปิด commit ทีละตัว

<script setup>
import { withBase } from 'vitepress'
import changelogReport from '../.vitepress/data/docs-changelog.json'

const kindTone = {
  'feature-and-docs': 'background:#132b4d;color:#90c2ff;',
  'docs-only': 'background:#0f2f1e;color:#90f3b3;',
  'source-only': 'background:#3a2a10;color:#ffd37a;',
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
</script>

## Snapshot

- สร้างรายงานเมื่อ: `{{ formatDate(changelogReport.generatedAt) }}`
- รายการที่ tracked: `{{ changelogReport.summary.totalEntries }}`
- โค้ดและ docs เปลี่ยนพร้อมกัน: `{{ changelogReport.summary.featureAndDocs }}`
- อัปเดต docs อย่างเดียว: `{{ changelogReport.summary.docsOnly }}`
- อัปเดตโค้ดอย่างเดียว: `{{ changelogReport.summary.sourceOnly }}`

## Recent Changes

<div v-if="changelogReport.entries.length === 0" style="border:1px solid var(--vp-c-divider);border-radius:16px;padding:16px 18px;margin:14px 0;">
  ยังไม่มีรายการที่ตรงกับ feature registry
</div>

<div v-for="entry in changelogReport.entries" :key="entry.hash" style="border:1px solid var(--vp-c-divider);border-radius:16px;padding:16px 18px;margin:14px 0;">
  <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
    <div>
      <div style="font-size:18px;font-weight:800;">{{ entry.subject }}</div>
      <div style="margin-top:6px;color:var(--vp-c-text-2);">
        {{ formatDate(entry.committedAt) }} · {{ entry.author }}
        <span v-if="entry.commitUrl"> · <a :href="entry.commitUrl" target="_blank" rel="noreferrer">commit {{ entry.shortHash }}</a></span>
      </div>
    </div>
    <div :style="kindTone[entry.kind]" style="padding:6px 10px;border-radius:999px;font-weight:800;">
      {{ changelogReport.kindLabels[entry.kind] }}
    </div>
  </div>

  <div style="margin-top:12px;">
    <strong>ฟีเจอร์ที่เกี่ยวข้อง:</strong>
    <span v-for="feature in entry.impactedFeatures" :key="feature.id" style="display:inline-block;margin:6px 8px 0 0;">
      <a :href="withBase(feature.route)">{{ feature.title }}</a>
    </span>
  </div>

  <details style="margin-top:12px;">
    <summary>ดูไฟล์ที่เปลี่ยน</summary>
    <ul>
      <li v-for="filePath in entry.files" :key="filePath">
        <code>{{ filePath }}</code>
      </li>
    </ul>
  </details>
</div>

## ใช้ยังไงกับทีม

1. ถ้าเป็นคนออก requirement ให้ดูหน้านี้เพื่อรู้ว่าฟีเจอร์ไหนเพิ่งถูกแตะ
2. ถ้าเป็น dev ให้จับคู่หน้านี้กับ [สถานะ Docs และ Coverage](/status/) เพื่อดูว่าควรแก้ docs ต่อไหม
3. ถ้า commit ไหนเปลี่ยนโค้ดแต่ไม่มี docs แตะเลย หน้านี้จะช่วยให้เห็น pattern ได้เร็วมาก
