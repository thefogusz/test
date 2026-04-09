import fs from 'node:fs'
import path from 'node:path'
import {
  buildCommitUrl,
  featureRegistry,
  getTrackedFeatureByFile,
  repoRoot,
  runGit,
  toPosix,
} from './lib/docs-report-helpers.mjs'

const outputPath = path.join(repoRoot, 'docs', '.vitepress', 'data', 'docs-changelog.json')

const trackedFiles = Array.from(
  new Set(
    featureRegistry.flatMap((feature) => [feature.docPath, ...feature.sourceFiles]),
  ),
)

const rawLog = runGit([
  'log',
  '--date=iso-strict',
  '--name-only',
  '--pretty=format:__COMMIT__%n%H|%h|%cI|%an|%s',
  '-n',
  '60',
  '--',
  ...trackedFiles,
])

const blocks = rawLog
  .split('__COMMIT__')
  .map((block) => block.trim())
  .filter(Boolean)

const entries = blocks
  .map((block) => {
    const [metaLine, ...fileLines] = block.split(/\r?\n/)
    const [hash, shortHash, committedAt, author, subject] = metaLine.split('|')
    const files = fileLines.map((line) => toPosix(line.trim())).filter(Boolean)
    const impactedFeatures = Array.from(
      new Map(
        files
          .flatMap((filePath) => getTrackedFeatureByFile(filePath))
          .map((feature) => [feature.id, feature]),
      ).values(),
    )

    if (!impactedFeatures.length) return null

    const docsTouched = files.filter((filePath) => filePath.startsWith('docs/'))
    const sourceTouched = files.filter((filePath) => filePath.startsWith('src/') || filePath.startsWith('server/'))

    return {
      hash,
      shortHash,
      committedAt,
      author,
      subject,
      commitUrl: buildCommitUrl(shortHash),
      files,
      docsTouched,
      sourceTouched,
      impactedFeatures: impactedFeatures.map((feature) => ({
        id: feature.id,
        title: feature.title,
        route: feature.route,
      })),
      kind:
        docsTouched.length > 0 && sourceTouched.length > 0
          ? 'feature-and-docs'
          : docsTouched.length > 0
            ? 'docs-only'
            : 'source-only',
    }
  })
  .filter(Boolean)

const kindLabels = {
  'feature-and-docs': 'โค้ดและ docs เปลี่ยนพร้อมกัน',
  'docs-only': 'อัปเดต docs',
  'source-only': 'อัปเดตโค้ด',
}

const groupedByDay = entries.reduce((groups, entry) => {
  const day = entry.committedAt.slice(0, 10)
  if (!groups[day]) groups[day] = []
  groups[day].push(entry)
  return groups
}, {})

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalEntries: entries.length,
    docsOnly: entries.filter((entry) => entry.kind === 'docs-only').length,
    sourceOnly: entries.filter((entry) => entry.kind === 'source-only').length,
    featureAndDocs: entries.filter((entry) => entry.kind === 'feature-and-docs').length,
  },
  kindLabels,
  entries,
  groups: Object.entries(groupedByDay).map(([date, dayEntries]) => ({
    date,
    entries: dayEntries,
  })),
}

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`Wrote docs changelog report to ${path.relative(repoRoot, outputPath)}`)
