/**
 * Test Runner
 *
 * Executes test cases using real E2E browser automation with Playwright.
 * Tests the full frontend flow: inject text → extract pills → send to API → get results.
 */

import { chromium } from 'playwright'
import type { TestCase, TestResult } from '../types'
import {
  extractCleanedTextAndPills,
  injectTextIntoEditor,
  waitForExtraction,
} from '../utils/browser-automation'
import { calculateMetrics } from './metrics-calculator'

const FRONTEND_URL = process.env.EVALUATION_FRONTEND_URL || 'http://localhost:3001'
const API_BASE_URL = process.env.EVALUATION_API_URL || 'http://localhost:7071/api'

/**
 * Run a single test case against the API
 */
export async function runTestCase(testCase: TestCase): Promise<TestResult> {
  try {
    const actualResponse = await callApi(testCase)
    const metrics = calculateMetrics(testCase, actualResponse)

    return {
      testCase,
      passed: true,
      actualResponse,
      metrics,
    }
  } catch (error) {
    return {
      testCase,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Call appropriate API endpoint based on test case type
 */
async function callApi(testCase: TestCase): Promise<unknown> {
  if (testCase.type === 'conversational') {
    return callIntakeEndpoint(testCase.input || '')
  }
  return callPolicyAnalyzeEndpoint(testCase.policyInput, testCase.expectedPolicy)
}

/**
 * Call /api/intake endpoint using real E2E browser automation
 *
 * Uses Playwright to:
 * 1. Launch browser and navigate to frontend
 * 2. Inject text into Lexical editor (triggers pill extraction)
 * 3. Extract cleaned text and pills from frontend React state
 * 4. Send both cleaned text and pills to API endpoint
 * 5. Return API response
 */
async function callIntakeEndpoint(input: string): Promise<unknown> {
  // Launch browser (non-headless so we can see it working)
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  // Capture all console logs
  const consoleLogs: Array<{ type: string; text: string }> = []
  page.on('console', (msg) => {
    const text = msg.text()
    const type = msg.type()
    consoleLogs.push({ type, text })
    // Also log to Node.js console for real-time viewing
    console.log(`[Browser ${type.toUpperCase()}]`, text)
  })

  try {
    // Navigate to frontend
    console.log(`🌐 Navigating to ${FRONTEND_URL}...`)
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' })

    // Wait for React to render (give it extra time)
    console.log('⏳ Waiting for React to render...')
    await page.waitForTimeout(2000)

    // Take initial screenshot for debugging
    await page.screenshot({ path: 'evaluation/debug-screenshot-initial.png' })
    console.log('📸 Initial screenshot saved to evaluation/debug-screenshot-initial.png')

    // Inject text into editor (triggers pill extraction via KeyValuePlugin)
    console.log(`⌨️  Injecting text: "${input}"`)
    await injectTextIntoEditor(page, input)

    // Wait for extraction to complete (debounce + API call)
    await waitForExtraction(page)

    // Extract cleaned text and pills from frontend
    const { cleanedText, pills } = await extractCleanedTextAndPills(page)

    console.log('📦 Extracted cleaned text:', JSON.stringify(cleanedText))
    console.log('💊 Extracted pills:', JSON.stringify(pills, null, 2))

    // Send request with both cleaned text and pills to API
    const response = await fetch(`${API_BASE_URL}/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: cleanedText || input, // Fallback to original if cleaned is empty
        pills: Object.keys(pills).length > 0 ? pills : undefined,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API error: ${error.error?.message || response.statusText}`)
    }

    const result = await response.json()

    // Wait a bit more to ensure all console logs are captured
    await page.waitForTimeout(500)

    // Take final screenshot before closing
    await page.screenshot({ path: 'evaluation/debug-screenshot-final.png' })
    console.log('📸 Final screenshot saved to evaluation/debug-screenshot-final.png')

    // Print all console logs
    console.log(`\n${'='.repeat(80)}`)
    console.log('📋 BROWSER CONSOLE LOGS:')
    console.log('='.repeat(80))
    for (const log of consoleLogs) {
      console.log(`[${log.type.toUpperCase()}] ${log.text}`)
    }
    console.log('='.repeat(80))
    console.log(`Total console messages: ${consoleLogs.length}\n`)

    return result
  } finally {
    // Always close browser
    await browser.close()
  }
}

/**
 * Call /api/policy/analyze endpoint
 *
 * API expects: { policySummary: PolicySummary, policyText?: string }
 * Test cases provide: policyInput (string) and expectedPolicy (PolicySummary)
 * We use expectedPolicy as policySummary, and policyInput as optional policyText
 */
async function callPolicyAnalyzeEndpoint(
  policyInput?: string | unknown,
  expectedPolicy?: unknown
): Promise<unknown> {
  // API requires policySummary (PolicySummary object), policyText is optional
  // Use expectedPolicy if available, otherwise try to use policyInput if it's an object
  const policySummary =
    expectedPolicy || (typeof policyInput !== 'string' ? policyInput : undefined)
  const policyText = typeof policyInput === 'string' ? policyInput : undefined

  if (!policySummary) {
    throw new Error('PolicySummary is required for /api/policy/analyze endpoint')
  }

  const response = await fetch(`${API_BASE_URL}/policy/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      policySummary,
      ...(policyText ? { policyText } : {}),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`API error: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}
