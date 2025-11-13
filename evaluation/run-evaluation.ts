#!/usr/bin/env bun

/**
 * Run Evaluation Harness
 *
 * Starts evaluation environment, waits for servers to be ready,
 * runs the evaluation harness, then cleans up.
 */

import { spawn, execSync } from 'node:child_process'
import { join } from 'node:path'

const FRONTEND_PORT = process.env.EVAL_FRONTEND_PORT || '3000'
const API_PORT = process.env.EVAL_API_PORT || '7070'
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`
const API_URL = `http://localhost:${API_PORT}/api`

// Set environment variables
process.env.EVALUATION_FRONTEND_URL = FRONTEND_URL
process.env.EVALUATION_API_URL = API_URL
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

console.log('🚀 Starting evaluation environment...')
console.log(`📱 Frontend: ${FRONTEND_URL}`)
console.log(`🔌 API: ${API_URL}`)
console.log('')

// Start eval environment
const evalEnv = spawn('bun', ['run', join(import.meta.dir, 'start-eval-env.ts')], {
  stdio: 'pipe',
  shell: true,
  env: {
    ...process.env,
    FRONTEND_PORT,
    API_PORT,
  },
})

// Wait for servers to be ready
let frontendReady = false
let apiReady = false

const waitForServers = async (): Promise<void> => {
  const startTime = Date.now()
  const TIMEOUT_MS = 30000 // 30 seconds

  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      // Check frontend
      if (!frontendReady) {
        try {
          const response = await fetch(FRONTEND_URL, { signal: AbortSignal.timeout(2000) })
          if (response.ok) {
            frontendReady = true
            console.log('✅ Frontend server ready')
          }
        } catch {
          // Not ready yet
        }
      }

      // Check API
      if (!apiReady) {
        try {
          const response = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(2000) })
          if (response.ok) {
            apiReady = true
            console.log('✅ API server ready')
          }
        } catch {
          // Not ready yet
        }
      }

      if (frontendReady && apiReady) {
        clearInterval(checkInterval)
        console.log('')
        resolve()
      }

      // Timeout check
      if (Date.now() - startTime > TIMEOUT_MS) {
        clearInterval(checkInterval)
        reject(new Error('Timeout waiting for servers to start'))
      }
    }, 1000)
  })
}

// Wait for servers
try {
  await waitForServers()
} catch (error) {
  console.error('❌ Failed to start servers:', error)
  evalEnv.kill('SIGTERM')
  setTimeout(() => evalEnv.kill('SIGKILL'), 2000)
  process.exit(1)
}

console.log('▶️  Running evaluation harness...')
console.log('')

// Run the harness
const harness = spawn('bun', ['run', join(import.meta.dir, 'harness.ts')], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    EVALUATION_FRONTEND_URL: FRONTEND_URL,
    EVALUATION_API_URL: API_URL,
  },
})

// Handle cleanup with proper signal handling
const cleanup = (exitCode = 0) => {
  console.log('\n🛑 Shutting down evaluation environment...')
  evalEnv.kill('SIGTERM')
  try {
    harness.kill('SIGTERM')
  } catch {
    // Harness may already be dead
  }

  // Kill any remaining bun processes using kill-eval-servers.sh
  try {
    const killScript = join(import.meta.dir, 'kill-eval-servers.sh')
    execSync(`bash ${killScript}`, { stdio: 'inherit' })
  } catch (error) {
    console.error('⚠️  Error running kill-eval-servers.sh:', error)
  }

  // Force kill after 2 seconds if not terminated
  setTimeout(() => {
    try {
      evalEnv.kill('SIGKILL')
      harness.kill('SIGKILL')
    } catch {
      // Processes already dead
    }
    process.exit(exitCode)
  }, 2000)
}

process.on('SIGINT', () => cleanup(130))
process.on('SIGTERM', () => cleanup(143))

harness.on('exit', (code) => {
  cleanup(code || 0)
})

harness.on('error', (error) => {
  console.error('❌ Harness error:', error)
  cleanup(1)
})
