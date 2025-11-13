/**
 * Evaluation Environment Manager
 *
 * Centralized server lifecycle management for evaluation runs.
 * Eliminates duplication between runner scripts (DRY/SOLID).
 */

import { type ChildProcess, execSync, spawn } from 'node:child_process'
import { join } from 'node:path'

export interface EvalEnvironmentConfig {
  frontendPort?: string
  apiPort?: string
}

export interface EvalEnvironment {
  frontendUrl: string
  apiUrl: string
  process: ChildProcess
  cleanup: (exitCode?: number) => void
}

/**
 * Setup environment variables for evaluation
 */
export function setupEnvironmentVariables(config: EvalEnvironmentConfig = {}): {
  frontendUrl: string
  apiUrl: string
  frontendPort: string
  apiPort: string
} {
  const frontendPort = config.frontendPort || process.env.EVAL_FRONTEND_PORT || '3000'
  const apiPort = config.apiPort || process.env.EVAL_API_PORT || '7070'
  const frontendUrl = `http://localhost:${frontendPort}`
  const apiUrl = `http://localhost:${apiPort}/api`

  // Set environment variables for child processes
  process.env.EVALUATION_FRONTEND_URL = frontendUrl
  process.env.EVALUATION_API_URL = apiUrl
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

  return { frontendUrl, apiUrl, frontendPort, apiPort }
}

/**
 * Wait for servers to be ready by checking health endpoints
 */
export async function waitForServers(
  frontendUrl: string,
  apiUrl: string,
  timeoutMs = 30000
): Promise<void> {
  let frontendReady = false
  let apiReady = false
  const startTime = Date.now()

  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      // Check frontend
      if (!frontendReady) {
        try {
          const response = await fetch(frontendUrl, { signal: AbortSignal.timeout(2000) })
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
          const response = await fetch(`${apiUrl}/health`, {
            signal: AbortSignal.timeout(2000),
          })
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
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval)
        reject(new Error('Timeout waiting for servers to start'))
      }
    }, 1000)
  })
}

/**
 * Start evaluation environment servers
 */
export async function startEvalEnvironment(
  config: EvalEnvironmentConfig = {}
): Promise<EvalEnvironment> {
  const { frontendUrl, apiUrl, frontendPort, apiPort } = setupEnvironmentVariables(config)

  console.log('🚀 Starting evaluation environment...')
  console.log(`📱 Frontend: ${frontendUrl}`)
  console.log(`🔌 API: ${apiUrl}`)
  console.log('')

  // Start eval environment servers
  const evalEnvDir = join(import.meta.dir, '..')
  const evalEnvProcess = spawn('bun', ['run', join(evalEnvDir, 'start-eval-env.ts')], {
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      FRONTEND_PORT: frontendPort,
      API_PORT: apiPort,
    },
  })

  // Create cleanup function
  const cleanup = (exitCode = 0) => {
    console.log('\n🛑 Shutting down evaluation environment...')
    evalEnvProcess.kill('SIGTERM')

    // Kill any remaining bun processes using kill-eval-servers.sh
    try {
      const killScript = join(evalEnvDir, 'kill-eval-servers.sh')
      execSync(`bash ${killScript}`, { stdio: 'inherit' })
    } catch (error) {
      console.error('⚠️  Error running kill-eval-servers.sh:', error)
    }

    // Force kill after 2 seconds if not terminated
    setTimeout(() => {
      try {
        evalEnvProcess.kill('SIGKILL')
      } catch {
        // Process already dead
      }
      process.exit(exitCode)
    }, 2000)
  }

  // Wait for servers to be ready
  try {
    await waitForServers(frontendUrl, apiUrl)
  } catch (error) {
    console.error('❌ Failed to start servers:', error)
    cleanup(1)
    throw error
  }

  return {
    frontendUrl,
    apiUrl,
    process: evalEnvProcess,
    cleanup,
  }
}

/**
 * Create cleanup handler that handles multiple processes
 */
export function createCleanupHandler(processes: ChildProcess[]): (exitCode?: number) => void {
  return (exitCode = 0) => {
    console.log('\n🛑 Shutting down evaluation environment...')

    // Kill all processes
    for (const proc of processes) {
      try {
        proc.kill('SIGTERM')
      } catch {
        // Process may already be dead
      }
    }

    // Kill any remaining bun processes using kill-eval-servers.sh
    try {
      const killScript = join(import.meta.dir, '..', 'kill-eval-servers.sh')
      execSync(`bash ${killScript}`, { stdio: 'inherit' })
    } catch (error) {
      console.error('⚠️  Error running kill-eval-servers.sh:', error)
    }

    // Force kill after 2 seconds if not terminated
    setTimeout(() => {
      for (const proc of processes) {
        try {
          proc.kill('SIGKILL')
        } catch {
          // Process already dead
        }
      }
      process.exit(exitCode)
    }, 2000)
  }
}
