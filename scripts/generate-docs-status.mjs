import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const outputPath = path.join(repoRoot, 'docs', '.vitepress', 'data', 'docs-status.json')
const registryModuleUrl = pathToFileURL(path.join(repoRoot, 'docs', '.vitepress', 'data', 'featureRegistry.mjs')).href
const { featureRegistry, appViewRegistry } = await import(registryModuleUrl)

const toPosix = (value) => value.replaceAll('\\', '/')

const runGit = (args) => {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

const parseGitMeta = (filePath) => {
  const output = runGit(['log', '-1', '--format=%cI|%h|%an|%s', '--', filePath])
  if (!output) return null

  const [committedAt, shortHash, author, subject] = output.split('|')
  if (!committedAt) return null

  return {
    committedAt,
    shortHash,
    author,
    subject,
  }
}

const isDirty = (filePath) => Boolean(runGit(['status', '--short', '--', filePath]))

const compareIsoDates = (left, right) => {
  if (!left && !right) return 0
  if (!left) return -1
  if (!right) return 1
  return new Date(left).getTime() - new Date(right).getTime()
}

const latestMeta = (entries) =>
  entries.reduce((currentLatest, entry) => {
    if (!entry?.committedAt) return currentLatest
    if (!currentLatest) return entry
    return compareIsoDates(entry.committedAt, currentLatest.committedAt) > 0 ? entry : currentLatest
  }, null)

const buildCommitUrl = (shortHash) =>
  shortHash ? `https://github.com/thefogusz/test/commit/${shortHash}` : null

const featureStatus = featureRegistry.map((feature) => {
  const docMeta = parseGitMeta(feature.docPath)
  const docDirty = isDirty(feature.docPath)
  const sourceDetails = feature.sourceFiles.map((filePath) => {
    const meta = parseGitMeta(filePath)
    const dirty = isDirty(filePath)
    return {
      path: toPosix(filePath),
      ...meta,
      dirty,
    }
  })

  const latestSourceMeta = latestMeta(sourceDetails)
  const dirtySources = sourceDetails.filter((entry) => entry.dirty).map((entry) => entry.path)
  const sourceAhead =
    Boolean(docMeta?.committedAt && latestSourceMeta?.committedAt) &&
    compareIsoDates(latestSourceMeta.committedAt, docMeta.committedAt) > 0

  let status = 'ok'
  let statusLabel = 'ตรงกับ docs ล่าสุด'

  if (!docMeta) {
    status = 'missing'
    statusLabel = 'ยังไม่มีประวัติ docs'
  } else if (docDirty) {
    status = 'docs-dirty'
    statusLabel = 'docs มีการแก้ค้างยังไม่ commit'
  } else if (dirtySources.length > 0) {
    status = 'source-dirty'
    statusLabel = 'source เปลี่ยนแล้ว ควรเช็ก docs'
  } else if (sourceAhead) {
    status = 'needs-review'
    statusLabel = 'source ใหม่กว่า docs'
  }

  return {
    ...feature,
    doc: {
      path: toPosix(feature.docPath),
      ...docMeta,
      dirty: docDirty,
      commitUrl: buildCommitUrl(docMeta?.shortHash),
    },
    latestSource: latestSourceMeta
      ? {
          ...latestSourceMeta,
          path:
            sourceDetails.find((entry) => entry.shortHash === latestSourceMeta.shortHash && entry.committedAt === latestSourceMeta.committedAt)?.path ??
            null,
          commitUrl: buildCommitUrl(latestSourceMeta.shortHash),
        }
      : null,
    sourceFiles: sourceDetails,
    dirtySources,
    status,
    statusLabel,
  }
})

const views = appViewRegistry.map((view) => {
  const linkedFeature = featureStatus.find((feature) => feature.surface === `activeView: ${view.id}`)
  return {
    ...view,
    covered: Boolean(linkedFeature),
    featureId: linkedFeature?.id ?? null,
    featureStatus: linkedFeature?.status ?? 'missing',
  }
})

const recentDocUpdates = [...featureStatus]
  .filter((entry) => entry.doc?.committedAt)
  .sort((left, right) => compareIsoDates(right.doc.committedAt, left.doc.committedAt))
  .slice(0, 8)
  .map((entry) => ({
    id: entry.id,
    title: entry.title,
    route: entry.route,
    committedAt: entry.doc.committedAt,
    shortHash: entry.doc.shortHash,
    author: entry.doc.author,
    subject: entry.doc.subject,
    commitUrl: entry.doc.commitUrl,
    status: entry.status,
    statusLabel: entry.statusLabel,
  }))

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalFeatures: featureStatus.length,
    healthyFeatures: featureStatus.filter((entry) => entry.status === 'ok').length,
    needsAttention: featureStatus.filter((entry) => entry.status !== 'ok').length,
    totalViews: views.length,
    coveredViews: views.filter((entry) => entry.covered).length,
  },
  views,
  features: featureStatus,
  recentDocUpdates,
}

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`Wrote docs status report to ${path.relative(repoRoot, outputPath)}`)
