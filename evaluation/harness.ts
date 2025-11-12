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

  try {
    // Load test cases
    const testCases = await loadTestCases()
    console.log(`📋 Loaded ${testCases.length} test cases`)

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

  // Write markdown report
  const markdownReport = await generateMarkdownReport(report)
  await writeFile(REPORT_MD_PATH, markdownReport)

  console.log('\n📊 Reports generated:')
  console.log(`   JSON: ${REPORT_JSON_PATH}`)
  console.log(`   Markdown: ${REPORT_MD_PATH}`)
}

// Run harness if executed directly
if (import.meta.main) {
  main()
}
