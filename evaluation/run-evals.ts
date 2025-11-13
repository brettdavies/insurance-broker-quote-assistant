#!/usr/bin/env bun

/**
 * Run Evaluation Harness (Unified Runner)
 *
 * Runs all tests or specific tests by ID.
 * Usage:
 *   bun run evaluation/run-evals.ts              # Run all tests
 *   bun run evaluation/run-evals.ts conv-01      # Run single test
 *   bun run evaluation/run-evals.ts conv-01 policy-01  # Run multiple tests
 */

import { spawn } from 'node:child_process'
import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import {
  createCleanupHandler,
  setupEnvironmentVariables,
  startEvalEnvironment,
} from './services/eval-env-manager'

/**
 * Clear result folder (*.md files only)
 */
async function clearResultsFolder(): Promise<void> {
  const resultDir = join(import.meta.dir, 'result')

  try {
    const files = await readdir(resultDir)
    const markdownFiles = files.filter((file) => file.endsWith('.md'))

    console.log(`🗑️  Clearing ${markdownFiles.length} existing report(s)...`)

    await Promise.all(
      markdownFiles.map(async (file) => {
        try {
          await rm(join(resultDir, file))
        } catch (error) {
          console.warn(`⚠️  Failed to delete ${file}:`, error)
        }
      })
    )

    if (markdownFiles.length > 0) {
      console.log('✅ Results folder cleared\n')
    }
  } catch (error) {
    console.warn('⚠️  Failed to clear results folder:', error)
  }
}

/**
 * Main execution
 */
async function main() {
  // Parse test IDs from command line arguments
  const testIds = process.argv.slice(2)

  if (testIds.length > 0) {
    console.log(`📋 Running specific tests: ${testIds.join(', ')}\n`)
  } else {
    console.log('📋 Running all tests\n')
  }

  // Clear results folder before starting
  await clearResultsFolder()

  // Start evaluation environment
  const evalEnv = await startEvalEnvironment()

  console.log('▶️  Running evaluation harness...')
  console.log('')

  // Run the harness with optional test filter
  const harnessArgs = ['run', join(import.meta.dir, 'harness.ts')]

  // Pass test IDs via environment variable
  const harnessEnv = {
    ...process.env,
    EVALUATION_FRONTEND_URL: evalEnv.frontendUrl,
    EVALUATION_API_URL: evalEnv.apiUrl,
  }

  if (testIds.length > 0) {
    harnessEnv.EVALUATION_TEST_IDS = testIds.join(',')
  }

  const harness = spawn('bun', harnessArgs, {
    stdio: 'inherit',
    shell: true,
    env: harnessEnv,
  })

  // Create cleanup handler for both processes
  const cleanup = createCleanupHandler([evalEnv.process, harness])

  // Handle signals
  process.on('SIGINT', () => cleanup(130))
  process.on('SIGTERM', () => cleanup(143))

  // Handle harness exit
  harness.on('exit', (code) => {
    cleanup(code || 0)
  })

  harness.on('error', (error) => {
    console.error('❌ Harness error:', error)
    cleanup(1)
  })
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
}
