import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const WATCH_DIRECTORIES = [
  'src',
  'docs',
  'scripts',
].map((dir) => path.join(repoRoot, dir))

const WATCH_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.md',
  '.json',
  '.css',
  '.yml',
  '.yaml',
])

const IGNORED_PATH_FRAGMENTS = [
  `${path.sep}.vitepress${path.sep}data${path.sep}`,
  `${path.sep}.vitepress${path.sep}dist${path.sep}`,
  `${path.sep}dist${path.sep}`,
  `${path.sep}node_modules${path.sep}`,
]

let runTimer = null
let activeRun = null
let rerunRequested = false

const vitepressCliPath = path.join(repoRoot, 'node_modules', 'vitepress', 'bin', 'vitepress.js')

const shouldHandleFile = (filePath = '') => {
  const normalizedPath = path.normalize(String(filePath || '')).toLowerCase()
  if (!normalizedPath) return false
  if (IGNORED_PATH_FRAGMENTS.some((fragment) => normalizedPath.includes(fragment.toLowerCase()))) {
    return false
  }
  return WATCH_EXTENSIONS.has(path.extname(normalizedPath))
}

const spawnNodeScript = (scriptName) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(repoRoot, 'scripts', scriptName)], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${scriptName} exited with code ${code ?? 'unknown'}`))
    })

    child.on('error', reject)
  })

const buildDocsSite = () =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [vitepressCliPath, 'build', 'docs'], {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`vitepress build exited with code ${code ?? 'unknown'}`))
    })

    child.on('error', reject)
  })

const runDocsData = async () => {
  if (activeRun) {
    rerunRequested = true
    return
  }

  activeRun = (async () => {
    const startedAt = new Date()
    console.log(`[docs-watch] Regenerating docs data at ${startedAt.toLocaleTimeString()}`)

    try {
      await spawnNodeScript('generate-docs-status.mjs')
      await spawnNodeScript('generate-docs-changelog.mjs')
      await spawnNodeScript('generate-docs-draft.mjs')
      console.log('[docs-watch] Docs data updated, rebuilding docs site...')
      await buildDocsSite()
      console.log('[docs-watch] Docs site rebuilt')
    } catch (error) {
      console.error('[docs-watch] Failed to refresh docs artifacts:', error.message)
    } finally {
      activeRun = null
      if (rerunRequested) {
        rerunRequested = false
        queueDocsDataRun()
      }
    }
  })()
}

const queueDocsDataRun = () => {
  clearTimeout(runTimer)
  runTimer = setTimeout(() => {
    runTimer = null
    void runDocsData()
  }, 350)
}

const watchDirectory = (directoryPath) => {
  try {
    const watcher = fs.watch(
      directoryPath,
      { recursive: true },
      (_eventType, fileName) => {
        const absolutePath = fileName ? path.join(directoryPath, fileName.toString()) : ''
        if (!shouldHandleFile(absolutePath)) return
        queueDocsDataRun()
      },
    )

    watcher.on('error', (error) => {
      console.error(`[docs-watch] Watcher error for ${path.relative(repoRoot, directoryPath)}:`, error.message)
    })

    return watcher
  } catch (error) {
    console.error(`[docs-watch] Unable to watch ${path.relative(repoRoot, directoryPath)}:`, error.message)
    return null
  }
}

const watchers = WATCH_DIRECTORIES
  .filter((directoryPath) => fs.existsSync(directoryPath))
  .map((directoryPath) => watchDirectory(directoryPath))
  .filter(Boolean)

console.log('[docs-watch] Watching docs-related files for changes...')
void runDocsData()

const cleanup = () => {
  clearTimeout(runTimer)
  for (const watcher of watchers) {
    watcher?.close()
  }
}

process.on('SIGINT', () => {
  cleanup()
  process.exit(0)
})

process.on('SIGTERM', () => {
  cleanup()
  process.exit(0)
})
