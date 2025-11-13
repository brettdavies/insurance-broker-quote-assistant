#!/usr/bin/env bun

/**
 * Evaluation Harness
 *
 * Automated test runner for 15 synthetic test cases (10 conversational intake, 5 policy analysis).
 * Generates JSON and markdown reports with metrics: routing accuracy, intake completeness,
 * savings pitch clarity, compliance pass rate, and LLM token usage.
 *
 * @see docs/stories/3.1.evaluation-harness-test-cases.md
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { validateMetrics } from './services/metrics-validator'
import { generateMarkdownReport, generateReport } from './services/report-generator'
import { loadTestCases } from './services/test-case-loader'
import { runTestCase } from './services/test-runner'
import type { TestResult } from './types'

// Configuration
const RESULT_DIR = join(import.meta.dir, 'result')
const REPORT_JSON_PATH = join(RESULT_DIR, 'report.json')
const REPORT_MD_PATH = join(RESULT_DIR, 'report.md')

/**
 * Main evaluation harness runner
 */
async function main() {
  console.log('🚀 Starting evaluation harness...')
  const apiBaseUrl = process.env.EVALUATION_API_URL || 'http://localhost:7070/api'
  console.log(`📡 API Base URL: ${apiBaseUrl}`)

  // Check if LLM is enabled (default: enabled, use TEST_TARGETS=mock to disable)
  const testTargets = process.env.TEST_TARGETS?.split(',').map((t) => t.trim()) || []
  const useRealLLM = !testTargets.includes('mock') || testTargets.includes('real-api')
  if (useRealLLM) {
    console.log('✅ LLM enabled (real Gemini API)')
    // Show API key status (empty = free tier)
    const apiKeyStatus =
      process.env.GEMINI_API_KEY === ''
        ? 'free tier (no API key)'
        : process.env.GEMINI_API_KEY
          ? 'using API key'
          : 'free tier (no API key)'
    console.log(`   Gemini API: ${apiKeyStatus}`)
    console.log("   Note: Make sure API server is running with GEMINI_API_KEY='' to use free tier")
  } else {
    console.log('⚠️  LLM disabled (using mock provider)')
    console.log('   Set TEST_TARGETS=real-api to enable LLM for evaluations')
  }

  try {
    // Load test cases
    let testCases = await loadTestCases()

    // Filter by test IDs if specified
    const testIdsFilter = process.env.EVALUATION_TEST_IDS?.split(',').map((id) => id.trim())
    if (testIdsFilter && testIdsFilter.length > 0) {
      testCases = testCases.filter((tc) => testIdsFilter.includes(tc.id))
      console.log(
        `📋 Loaded ${testCases.length} test cases (filtered by: ${testIdsFilter.join(', ')})`
      )
    } else {
      console.log(`📋 Loaded ${testCases.length} test cases`)
    }

    if (testCases.length === 0) {
      console.error('❌ No test cases found matching the filter')
      process.exit(1)
    }

    // Run test cases
    const results = await runAllTestCases(testCases)

    // Generate reports
    const report = await generateReport(results)
    await writeReports(report)

    // Validate target metrics
    validateMetrics(report)

    console.log('\n✨ Evaluation complete!')
  } catch (error) {
    console.error('❌ Evaluation harness failed:', error)
    process.exit(1)
  }
}

/**
 * Run all test cases and collect results
 */
async function runAllTestCases(testCases: TestResult['testCase'][]): Promise<TestResult[]> {
  const results: TestResult[] = []

  for (const testCase of testCases) {
    console.log(`\n▶️  Running: ${testCase.name} (${testCase.type})`)
    const result = await runTestCase(testCase)
    results.push(result)

    if (result.passed) {
      console.log('✅ Passed')
    } else {
      console.log(`❌ Failed: ${result.error}`)
    }
  }

  return results
}

/**
 * Write reports to disk
 */
async function writeReports(report: Awaited<ReturnType<typeof generateReport>>): Promise<void> {
  // Ensure result directory exists
  await mkdir(RESULT_DIR, { recursive: true }).catch(() => {
    // Directory might already exist, ignore
  })

  // Write JSON report
  await writeFile(REPORT_JSON_PATH, JSON.stringify(report, null, 2))

  // Write markdown report (also generates individual reports)
  const markdownReport = await generateMarkdownReport(report, RESULT_DIR)
  await writeFile(REPORT_MD_PATH, markdownReport)

  const testCount = report.testResults.length
  console.log('\n📊 Reports generated:')
  console.log(`   Main Report: ${REPORT_MD_PATH}`)
  console.log(`   Individual Reports: ${testCount} files in ${RESULT_DIR}`)
  console.log(`   JSON Data: ${REPORT_JSON_PATH}`)
}

// Run harness if executed directly
if (import.meta.main) {
  main()
}
