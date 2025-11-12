#!/usr/bin/env bun

/**
 * Run Evaluation Harness
 *
 * Starts evaluation environment, waits for servers to be ready,
 * runs the evaluation harness, then cleans up.
 */

import { spawn } from 'node:child_process'
import { join } from 'node:path'

const FRONTEND_PORT = process.env.EVAL_FRONTEND_PORT || '3001'
const API_PORT = process.env.EVAL_API_PORT || '7071'
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
  return new Promise((resolve) => {
    const checkInterval = setInterval(async () => {
      // Check frontend
      if (!frontendReady) {
        try {
          const response = await fetch(FRONTEND_URL)
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
          const response = await fetch(`${API_URL}/health`)
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
    }, 1000)

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!frontendReady || !apiReady) {
        clearInterval(checkInterval)
        console.error('❌ Timeout waiting for servers to start')
        evalEnv.kill()
        process.exit(1)
      }
    }, 30000)
  })
}

// Wait for servers
await waitForServers()

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

// Handle cleanup
const cleanup = () => {
  console.log('\n🛑 Shutting down evaluation environment...')
  evalEnv.kill()
  harness.kill()
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

harness.on('exit', (code) => {
  console.log('\n🛑 Shutting down evaluation environment...')
  evalEnv.kill()
  process.exit(code || 0)
})
