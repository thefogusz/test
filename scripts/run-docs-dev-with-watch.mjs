import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const children = []

const startProcess = (command, args, options = {}) => {
  const child = spawn(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: options.shell ?? false,
    env: process.env,
  })

  children.push(child)
  child.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown(code)
    }
  })
  child.on('error', (error) => {
    console.error(`[docs-dev-with-watch] Failed to start ${command}:`, error.message)
    shutdown(1)
  })

  return child
}

const shutdown = (exitCode = 0) => {
  while (children.length > 0) {
    const child = children.pop()
    if (child && !child.killed) {
      child.kill('SIGTERM')
    }
  }

  process.exit(exitCode)
}

startProcess(process.execPath, [path.join(repoRoot, 'scripts', 'watch-docs-data.mjs')])
startProcess('npm', ['run', 'docs:dev:app'], { shell: true })

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
