# สถานะ Docs และ Coverage

หน้านี้ช่วยให้ทีมเช็กได้เร็วว่า:

- ฟีเจอร์ไหนมี docs แล้ว
- docs ยังตาม code ทันหรือไม่
- หน้าไหนเพิ่งอัปเดต
- `activeView` ไหนยังไม่มี coverage

อ้างอิงแนวทาง docs-as-code: [VitePress Site Config](https://vitepress.dev/reference/site-config), [VitePress Data Loading](https://vitepress.dev/guide/data-loading), [Docusaurus Versioning](https://docusaurus.io/docs/next/versioning), [GitLab Docs Architecture](https://docs.gitlab.com/development/documentation/site_architecture/), [GitLab /help](https://docs.gitlab.com/development/documentation/help/)

<script setup>
import { withBase } from 'vitepress'
import statusReport from '../.vitepress/data/docs-status.json'

const statusTone = {
  ok: 'background:#0f2f1e;color:#90f3b3;',
  'needs-review': 'background:#3a2a10;color:#ffd37a;',
  'source-dirty': 'background:#3a2a10;color:#ffd37a;',
  'docs-dirty': 'background:#132b4d;color:#90c2ff;',
  missing: 'background:#4b1717;color:#ff9c9c;',
}

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
</script>

## Snapshot ล่าสุด

- สร้างรายงานเมื่อ: `{{ formatDate(statusReport.generatedAt) }}`
- ฟีเจอร์ที่ tracked อยู่: `{{ statusReport.summary.totalFeatures }}`
- ฟีเจอร์ที่สถานะปกติ: `{{ statusReport.summary.healthyFeatures }}`
- ฟีเจอร์ที่ต้องเช็ก: `{{ statusReport.summary.needsAttention }}`
- `activeView` ที่มี coverage แล้ว: `{{ statusReport.summary.coveredViews }}/{{ statusReport.summary.totalViews }}`

## View Coverage

<div v-for="view in statusReport.views" :key="view.id" style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;border:1px solid var(--vp-c-divider);border-radius:14px;padding:12px 14px;margin:10px 0;">
  <div>
    <div style="font-size:13px;color:var(--vp-c-text-2);font-weight:700;">activeView</div>
    <div style="font-size:18px;font-weight:800;">{{ view.id }}</div>
  </div>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <a v-if="view.covered" :href="withBase(view.route)">เปิดหน้า docs</a>
    <span v-else>-</span>
    <span :style="statusTone[view.featureStatus] || statusTone.missing" style="padding:4px 10px;border-radius:999px;font-weight:800;">
      {{ view.featureStatus }}
    </span>
  </div>
</div>

## ฟีเจอร์ทั้งหมด

<div v-for="feature in statusReport.features" :key="feature.id" style="border:1px solid var(--vp-c-divider);border-radius:16px;padding:16px 18px;margin:14px 0;">
  <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
    <div>
      <div style="font-size:12px;color:var(--vp-c-text-2);font-weight:700;">{{ feature.surface }}</div>
      <div style="font-size:20px;font-weight:800;">{{ feature.title }}</div>
      <div style="margin-top:6px;"><a :href="withBase(feature.route)">เปิดหน้า docs</a></div>
    </div>
    <div :style="statusTone[feature.status] || statusTone.missing" style="padding:6px 10px;border-radius:999px;font-weight:800;">
      {{ feature.statusLabel }}
    </div>
  </div>

  <div style="margin-top:14px;">
    <strong>Docs ล่าสุด:</strong>
    <span v-if="feature.doc.committedAt">
      {{ formatDate(feature.doc.committedAt) }}
      <span v-if="feature.doc.author"> โดย {{ feature.doc.author }}</span>
      <span v-if="feature.doc.commitUrl"> · <a :href="feature.doc.commitUrl" target="_blank" rel="noreferrer">commit {{ feature.doc.shortHash }}</a></span>
    </span>
    <span v-else>-</span>
  </div>

  <div style="margin-top:8px;">
    <strong>Code ล่าสุด:</strong>
    <span v-if="feature.latestSource?.committedAt">
      {{ formatDate(feature.latestSource.committedAt) }}
      <span v-if="feature.latestSource.path"> จาก <code>{{ feature.latestSource.path }}</code></span>
      <span v-if="feature.latestSource.commitUrl"> · <a :href="feature.latestSource.commitUrl" target="_blank" rel="noreferrer">commit {{ feature.latestSource.shortHash }}</a></span>
    </span>
    <span v-else>-</span>
  </div>

  <div v-if="feature.dirtySources.length" style="margin-top:8px;">
    <strong>ไฟล์ source ที่มีการแก้ค้าง:</strong>
    <span v-for="dirtySource in feature.dirtySources" :key="dirtySource" style="margin-right:8px;">
      <code>{{ dirtySource }}</code>
    </span>
  </div>

  <details style="margin-top:12px;">
    <summary>ดูไฟล์ที่อิง</summary>
    <ul>
      <li v-for="sourceFile in feature.sourceFiles" :key="sourceFile.path">
        <code>{{ sourceFile.path }}</code>
        <span v-if="sourceFile.committedAt"> · {{ formatDate(sourceFile.committedAt) }}</span>
        <span v-if="sourceFile.dirty"> · มีการแก้ค้าง</span>
      </li>
    </ul>
  </details>
</div>

## Recent Docs Updates

<div v-for="item in statusReport.recentDocUpdates" :key="item.id" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;border:1px solid var(--vp-c-divider);border-radius:14px;padding:12px 14px;margin:10px 0;">
  <div>
    <div style="font-size:18px;font-weight:800;"><a :href="withBase(item.route)">{{ item.title }}</a></div>
    <div style="margin-top:6px;color:var(--vp-c-text-2);">{{ formatDate(item.committedAt) }}</div>
    <div v-if="item.commitUrl" style="margin-top:4px;"><a :href="item.commitUrl" target="_blank" rel="noreferrer">commit {{ item.shortHash }}</a></div>
  </div>
  <div :style="statusTone[item.status] || statusTone.missing" style="padding:6px 10px;border-radius:999px;font-weight:800;">
    {{ item.statusLabel }}
  </div>
</div>

## วิธีใช้งานกับทีม

1. เวลาแก้ code ที่เปลี่ยน behavior ให้ดูหน้านี้ก่อนว่าฟีเจอร์นั้น tracked อยู่หรือยัง
2. ถ้า `source ใหม่กว่า docs` หรือ `source เปลี่ยนแล้ว ควรเช็ก docs` ให้แก้หน้า docs ใน PR เดียวกัน
3. ถ้ายังไม่มี coverage ให้เพิ่ม feature page จาก template แล้วผูกเข้า registry

## แนวทางที่ควรใช้ระยะยาว

- ใช้ `lastUpdated` ของ VitePress เพื่อโชว์เวลาหน้า docs ถูกแก้ล่าสุดจาก Git โดยตรง
- ใช้ data loader หรือ script build-time เพื่อสร้าง dashboard แบบหน้านี้จากไฟล์จริงใน repo
- ถ้าต้อง support release history จริง ค่อยเพิ่ม versioning แบบ `current` และ `versioned docs`
- ถ้าจะ scale ใหญ่ขึ้น ให้ยึดแนว docs อยู่กับ code repository เดียวกับ product
