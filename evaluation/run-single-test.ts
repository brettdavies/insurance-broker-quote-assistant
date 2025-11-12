#!/usr/bin/env bun

/**
 * Run a single test case by ID and generate report
 *
 * Usage: bun run evaluation/run-single-test.ts conv-01
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generateMarkdownReport, generateReport } from './services/report-generator'
import { runTestCase } from './services/test-runner'
import type { TestCase } from './types'

const TEST_CASES_DIR = join(import.meta.dir, 'test-cases')

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

  console.log(`🔍 Loading test case: ${testId}`)
  const testCase = await loadSingleTestCase(testId)

  if (!testCase) {
    console.error(`❌ Test case "${testId}" not found`)
    process.exit(1)
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
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
}
