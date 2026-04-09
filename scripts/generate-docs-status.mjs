import fs from 'node:fs'
import path from 'node:path'
import {
  appViewRegistry,
  buildCommitUrl,
  compareIsoDates,
  extractDeclaredActiveViews,
  featureRegistry,
  isDirty,
  latestMeta,
  parseGitMeta,
  repoRoot,
  toPosix,
} from './lib/docs-report-helpers.mjs'

const outputPath = path.join(repoRoot, 'docs', '.vitepress', 'data', 'docs-status.json')

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

const declaredActiveViews = extractDeclaredActiveViews()
const trackedViewIds = new Set(appViewRegistry.map((view) => view.id))
const untrackedDeclaredViews = declaredActiveViews
  .filter((viewId) => !trackedViewIds.has(viewId))
  .map((viewId) => ({
    id: viewId,
    reason: 'Declared in ActiveView type but missing from docs appViewRegistry',
  }))

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
    declaredActiveViews: declaredActiveViews.length,
    untrackedDeclaredViews: untrackedDeclaredViews.length,
  },
  views,
  untrackedDeclaredViews,
  features: featureStatus,
  recentDocUpdates,
}

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(`Wrote docs status report to ${path.relative(repoRoot, outputPath)}`)
