#!/usr/bin/env bun

/**
 * Run a single test case by ID and generate report
 *
 * Automatically starts eval environment servers, runs test, then cleans up.
 *
 * Usage: bun run evaluation/run-single-test.ts conv-01
 */

import { execSync, spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generateMarkdownReport, generateReport } from './services/report-generator'
import { runTestCase } from './services/test-runner'
import type { TestCase } from './types'

const TEST_CASES_DIR = join(import.meta.dir, 'test-cases')
const FRONTEND_PORT = process.env.EVAL_FRONTEND_PORT || '3000'
const API_PORT = process.env.EVAL_API_PORT || '7070'
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`
const API_URL = `http://localhost:${API_PORT}/api`

/**
 * Wait for servers to be ready by checking health endpoints
 */
async function waitForServers(): Promise<void> {
  let frontendReady = false
  let apiReady = false
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

async function loadSingleTestCase(testId: string): Promise<TestCase | null> {
  // Try conversational first (files are named conversational-01.json, policy-01.json, etc.)
  try {
    const conversationalPath = join(
      TEST_CASES_DIR,
      'conversational',
      `conversational-${testId.replace('conv-', '')}.json`
    )
    const content = await readFile(conversationalPath, 'utf-8')
    return { ...JSON.parse(content), type: 'conversational' as const }
  } catch {
    // Try policy (files are named policy-01.json, etc.)
    try {
      const policyPath = join(
        TEST_CASES_DIR,
        'policy',
        `policy-${testId.replace('policy-', '')}.json`
      )
      const content = await readFile(policyPath, 'utf-8')
      return { ...JSON.parse(content), type: 'policy' as const }
    } catch {
      return null
    }
  }
}

async function main() {
  const testId = process.argv[2]

  if (!testId) {
    console.error('Usage: bun run evaluation/run-single-test.ts <test-id>')
    console.error('Example: bun run evaluation/run-single-test.ts conv-01')
    process.exit(1)
  }

  // Set environment variables
  process.env.EVALUATION_FRONTEND_URL = FRONTEND_URL
  process.env.EVALUATION_API_URL = API_URL

  console.log('🚀 Starting evaluation environment...')
  console.log(`📱 Frontend: ${FRONTEND_URL}`)
  console.log(`🔌 API: ${API_URL}`)
  console.log('')

  // Start eval environment servers
  const evalEnv = spawn('bun', ['run', join(import.meta.dir, 'start-eval-env.ts')], {
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      FRONTEND_PORT,
      API_PORT,
    },
  })

  // Cleanup function
  const cleanup = (exitCode = 0) => {
    console.log('\n🛑 Shutting down servers...')
    evalEnv.kill('SIGTERM')

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
      } catch {
        // Process already dead
      }
      process.exit(exitCode)
    }, 2000)
  }

  // Handle interrupts
  process.on('SIGINT', () => cleanup(130))
  process.on('SIGTERM', () => cleanup(143))

  try {
    // Wait for servers to be ready
    await waitForServers()

    console.log(`▶️  Running test: ${testId}`)
    console.log('')

    console.log(`🔍 Loading test case: ${testId}`)
    const testCase = await loadSingleTestCase(testId)

    if (!testCase) {
      console.error(`❌ Test case "${testId}" not found`)
      cleanup(1)
      return
    }

    console.log(`📋 Test: ${testCase.name}`)
    console.log(
      `📝 Input: ${testCase.input || JSON.stringify(testCase.policyInput).substring(0, 100)}...\n`
    )

    console.log('▶️  Running test...\n')
    const result = await runTestCase(testCase)

    if (result.passed) {
      console.log('✅ Test passed\n')
    } else {
      console.log(`❌ Test failed: ${result.error}\n`)
    }

    console.log('📊 Extraction Result:')
    if (result.actualResponse && typeof result.actualResponse === 'object') {
      const response = result.actualResponse as { profile?: unknown; extraction?: unknown }
      console.log(
        JSON.stringify(response.profile || response.extraction || result.actualResponse, null, 2)
      )
    }

    console.log('\n📈 Metrics:')
    if (result.metrics) {
      console.log(JSON.stringify(result.metrics, null, 2))
    }

    // Generate report for single test case
    console.log('\n📝 Generating report...')
    const report = await generateReport([result])
    const markdown = await generateMarkdownReport(report)

    // Write report files
    const resultDir = join(import.meta.dir, 'result')
    const jsonPath = join(resultDir, 'single-test-report.json')
    const mdPath = join(resultDir, 'single-test-report.md')

    await writeFile(jsonPath, JSON.stringify(report, null, 2))
    await writeFile(mdPath, markdown)

    console.log('\n✅ Report written to:')
    console.log(`   - ${jsonPath}`)
    console.log(`   - ${mdPath}`)

    cleanup(0)
  } catch (error) {
    console.error('❌ Error:', error)
    cleanup(1)
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
}
