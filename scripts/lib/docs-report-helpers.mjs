import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const repoRoot = path.resolve(__dirname, '..', '..')
const registryModuleUrl = pathToFileURL(
  path.join(repoRoot, 'docs', '.vitepress', 'data', 'featureRegistry.mjs'),
).href

const registryModule = await import(registryModuleUrl)

export const { featureRegistry, appViewRegistry } = registryModule

export const toPosix = (value) => value.replaceAll('\\', '/')

export const runGit = (args, options = {}) => {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      ...options,
    }).trim()
  } catch {
    return ''
  }
}

export const compareIsoDates = (left, right) => {
  if (!left && !right) return 0
  if (!left) return -1
  if (!right) return 1
  return new Date(left).getTime() - new Date(right).getTime()
}

export const buildCommitUrl = (shortHash) =>
  shortHash ? `https://github.com/thefogusz/test/commit/${shortHash}` : null

export const parseGitMeta = (filePath) => {
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

export const isDirty = (filePath) => Boolean(runGit(['status', '--short', '--', filePath]))

export const latestMeta = (entries) =>
  entries.reduce((currentLatest, entry) => {
    if (!entry?.committedAt) return currentLatest
    if (!currentLatest) return entry
    return compareIsoDates(entry.committedAt, currentLatest.committedAt) > 0 ? entry : currentLatest
  }, null)

export const getTrackedFeatureByFile = (filePath) =>
  featureRegistry.filter(
    (feature) =>
      feature.docPath === filePath || feature.sourceFiles.includes(filePath),
  )

export const getChangedFiles = ({ baseRef, headRef } = {}) => {
  if (baseRef && headRef) {
    const output = runGit(['diff', '--name-only', `${baseRef}...${headRef}`])
    return output ? output.split(/\r?\n/).filter(Boolean).map(toPosix) : []
  }

  const output = runGit(['status', '--short'])
  if (output) {
    return output
      .split(/\r?\n/)
      .map((line) => line.slice(3).trim())
      .filter(Boolean)
      .map(toPosix)
  }

  const hasOriginMain = Boolean(runGit(['rev-parse', '--verify', 'origin/main']))
  if (!hasOriginMain) return []

  const mergeBase = runGit(['merge-base', 'HEAD', 'origin/main'])
  if (!mergeBase) return []

  const branchDiff = runGit(['diff', '--name-only', `${mergeBase}...HEAD`])
  return branchDiff ? branchDiff.split(/\r?\n/).filter(Boolean).map(toPosix) : []
}
