#!/usr/bin/env bun

/**
 * Start Evaluation Environment
 *
 * Starts isolated frontend and API servers for evaluation testing.
 * Uses separate ports from dev environment to avoid conflicts.
 */

import { spawn } from 'node:child_process'

const FRONTEND_PORT = process.env.EVAL_FRONTEND_PORT || '3000'
const API_PORT = process.env.EVAL_API_PORT || '7070'
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`
const API_URL = `http://localhost:${API_PORT}/api`

console.log('🚀 Starting evaluation environment...')
console.log(`📱 Frontend: ${FRONTEND_URL}`)
console.log(`🔌 API: ${API_URL}`)
console.log('')

// Set environment variables for eval servers
const evalEnv = {
  ...process.env,
  FRONTEND_PORT,
  API_PORT,
  EVALUATION_FRONTEND_URL: FRONTEND_URL,
  EVALUATION_API_URL: API_URL,
  NODE_ENV: 'test',
}

// Start frontend server
console.log('🌐 Starting frontend server...')
const frontend = spawn('bun', ['run', '--filter', '@repo/web', 'dev'], {
  env: { ...evalEnv },
  stdio: 'inherit',
  shell: true,
})

// Start API server
console.log('🔌 Starting API server...')
const api = spawn('bun', ['run', '--filter', '@repo/api', 'dev'], {
  env: { ...evalEnv },
  stdio: 'inherit',
  shell: true,
})

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down evaluation environment...')
  frontend.kill()
  api.kill()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down evaluation environment...')
  frontend.kill()
  api.kill()
  process.exit(0)
})

// Wait for both servers to be ready
let frontendReady = false
let apiReady = false

const checkServers = async () => {
  const checkFrontend = async () => {
    try {
      const response = await fetch(FRONTEND_URL)
      if (response.ok && !frontendReady) {
        frontendReady = true
        console.log('✅ Frontend server ready')
      }
    } catch {
      // Not ready yet
    }
  }

  const checkAPI = async () => {
    try {
      const response = await fetch(`${API_URL}/health`)
      if (response.ok && !apiReady) {
        apiReady = true
        console.log('✅ API server ready')
      }
    } catch {
      // Not ready yet
    }
  }

  const interval = setInterval(async () => {
    await checkFrontend()
    await checkAPI()

    if (frontendReady && apiReady) {
      clearInterval(interval)
      console.log('')
      console.log('✨ Evaluation environment ready!')
      console.log(`   Frontend: ${FRONTEND_URL}`)
      console.log(`   API: ${API_URL}`)
      console.log('')
      console.log('Press Ctrl+C to stop')
    }
  }, 1000)
}

// Start checking after a short delay
setTimeout(checkServers, 2000)

// Keep process alive
frontend.on('exit', (code) => {
  console.error(`Frontend server exited with code ${code}`)
  process.exit(code || 1)
})

api.on('exit', (code) => {
  console.error(`API server exited with code ${code}`)
  process.exit(code || 1)
})
