import fs from 'node:fs'
import path from 'node:path'
import {
  featureRegistry,
  getChangedFiles,
  repoRoot,
  toPosix,
} from './lib/docs-report-helpers.mjs'

const args = process.argv.slice(2)
const getArgValue = (flag) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : null
}

const baseRef = getArgValue('--base')
const headRef = getArgValue('--head')
const markdownOutputPath = getArgValue('--output')
const jsonOutputPath =
  getArgValue('--json-output') ||
  path.join(repoRoot, 'docs', '.vitepress', 'data', 'docs-draft.json')

const changedFiles = getChangedFiles({ baseRef, headRef })

const impactedFeatures = featureRegistry
  .map((feature) => {
    const changedSourceFiles = feature.sourceFiles.filter((filePath) =>
      changedFiles.includes(toPosix(filePath)),
    )
    const docChanged = changedFiles.includes(toPosix(feature.docPath))
    const touched = docChanged || changedSourceFiles.length > 0
    if (!touched) return null

    const recommendedSections = [
      'พฤติกรรมปัจจุบัน',
      'กฎสำคัญที่ห้ามหลุด',
      'UI States ที่ต้องนึกถึงเวลาแก้',
      'Change Log',
    ]

    return {
      id: feature.id,
      title: feature.title,
      route: feature.route,
      docPath: feature.docPath,
      surface: feature.surface,
      changedSourceFiles,
      docChanged,
      needsDocsUpdate: changedSourceFiles.length > 0 && !docChanged,
      recommendedSections,
    }
  })
  .filter(Boolean)

const unmappedFiles = changedFiles.filter((filePath) => {
  const isRelevantCodeFile =
    filePath.startsWith('src/') || filePath.startsWith('server/')

  return (
    isRelevantCodeFile &&
    !featureRegistry.some(
      (feature) =>
        feature.docPath === filePath || feature.sourceFiles.includes(filePath),
    )
  )
})

const report = {
  generatedAt: new Date().toISOString(),
  baseRef,
  headRef,
  changedFiles,
  impactedFeatures,
  unmappedFiles,
  summary: {
    impactedFeatures: impactedFeatures.length,
    needsDocsUpdate: impactedFeatures.filter((feature) => feature.needsDocsUpdate).length,
    docsAlreadyTouched: impactedFeatures.filter((feature) => feature.docChanged).length,
  },
}

fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true })
fs.writeFileSync(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

const markdownLines = [
  '<!-- foro-docs-draft -->',
  '## Foro Docs Draft',
  '',
  `สร้างเมื่อ: ${report.generatedAt}`,
  '',
]

if (!impactedFeatures.length) {
  markdownLines.push('ไม่พบการเปลี่ยนแปลงที่ชนกับ feature registry ในรอบนี้')
} else {
  markdownLines.push(
    `ฟีเจอร์ที่ได้รับผลกระทบ: ${report.summary.impactedFeatures} หน้า`,
    `ฟีเจอร์ที่ควรเช็ก docs เพิ่ม: ${report.summary.needsDocsUpdate} หน้า`,
    '',
  )

  for (const feature of impactedFeatures) {
    markdownLines.push(`### ${feature.title}`)
    markdownLines.push(`- Surface: \`${feature.surface}\``)
    markdownLines.push(`- Docs: \`${feature.docPath}\`${feature.docChanged ? ' (มีการแก้ docs ใน diff นี้แล้ว)' : ''}`)

    if (feature.changedSourceFiles.length > 0) {
      markdownLines.push(`- Source ที่เปลี่ยน: ${feature.changedSourceFiles.map((item) => `\`${item}\``).join(', ')}`)
    }

    if (feature.needsDocsUpdate) {
      markdownLines.push('- สถานะ: ควรอัปเดต docs หน้านี้ใน PR เดียวกัน')
    } else {
      markdownLines.push('- สถานะ: มีการแตะ docs ของฟีเจอร์นี้แล้ว')
    }

    markdownLines.push(`- แนะนำให้ทบทวนหัวข้อ: ${feature.recommendedSections.map((item) => `\`${item}\``).join(', ')}`)
    markdownLines.push(`- เปิดหน้า docs: ${feature.route}`)
    markdownLines.push('')
  }
}

if (unmappedFiles.length > 0) {
  markdownLines.push('### ไฟล์ที่ยังไม่ผูกกับ feature registry')
  for (const filePath of unmappedFiles) {
    markdownLines.push(`- \`${filePath}\``)
  }
  markdownLines.push('')
}

const markdown = `${markdownLines.join('\n')}\n`

if (markdownOutputPath) {
  fs.mkdirSync(path.dirname(markdownOutputPath), { recursive: true })
  fs.writeFileSync(markdownOutputPath, markdown, 'utf8')
  console.log(`Wrote docs draft markdown to ${path.relative(repoRoot, markdownOutputPath)}`)
}

console.log(`Wrote docs draft report to ${path.relative(repoRoot, jsonOutputPath)}`)
