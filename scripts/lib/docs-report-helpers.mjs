import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
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

export const runGitBuffer = (args, options = {}) => {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'buffer',
      stdio: ['ignore', 'pipe', 'ignore'],
      ...options,
    })
  } catch {
    return Buffer.alloc(0)
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
    const output = runGitBuffer(['diff', '--name-only', '-z', `${baseRef}...${headRef}`])
    return output.length
      ? output
          .toString('utf8')
          .split('\0')
          .filter(Boolean)
          .map(toPosix)
      : []
  }

  const porcelainOutput = runGitBuffer(['status', '--porcelain', '-z'])
  if (porcelainOutput.length) {
    const entries = porcelainOutput.toString('utf8').split('\0').filter(Boolean)
    const changedFiles = []

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]
      if (!entry) continue

      const status = entry.slice(0, 2)
      const rawPath = entry.slice(3).trim()

      if (status.startsWith('R') || status.startsWith('C')) {
        const renamedPath = entries[index + 1]
        if (renamedPath) {
          changedFiles.push(toPosix(renamedPath))
          index += 1
          continue
        }
      }

      if (rawPath) {
        changedFiles.push(toPosix(rawPath))
      }
    }

    return changedFiles
  }

  const hasOriginMain = Boolean(runGit(['rev-parse', '--verify', 'origin/main']))
  if (!hasOriginMain) return []

  const mergeBase = runGit(['merge-base', 'HEAD', 'origin/main'])
  if (!mergeBase) return []

  const branchDiff = runGit(['diff', '--name-only', `${mergeBase}...HEAD`])
  return branchDiff ? branchDiff.split(/\r?\n/).filter(Boolean).map(toPosix) : []
}

export const extractDeclaredActiveViews = () => {
  const domainTypesPath = path.join(repoRoot, 'src', 'types', 'domain.ts')
  const source = readFileSafe(domainTypesPath)
  if (!source) return []

  const match = source.match(/export\s+type\s+ActiveView\s*=\s*([^;]+);/m)
  if (!match?.[1]) return []

  return Array.from(
    new Set(
      match[1]
        .split('|')
        .map((entry) => entry.trim())
        .map((entry) => entry.replace(/^'/, '').replace(/'$/, ''))
        .filter(Boolean),
    ),
  )
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }
}
