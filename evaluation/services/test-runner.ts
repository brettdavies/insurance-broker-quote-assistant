/**
 * Test Runner
 *
 * Executes test cases using real E2E browser automation with Playwright.
 * Tests the full frontend flow: inject text → extract pills → send to API → get results.
 */

import { chromium } from 'playwright'
import type { IntakeResult, PolicyAnalysisResult } from '../../packages/shared/src/index'
import type { TestCase, TestResult } from '../types'
import {
  extractCleanedTextAndPills,
  injectTextIntoEditor,
  waitForExtraction,
} from '../utils/browser-automation'
import { calculateMetrics } from './metrics-calculator'

const FRONTEND_URL = process.env.EVALUATION_FRONTEND_URL || 'http://localhost:3000'
const API_BASE_URL = process.env.EVALUATION_API_URL || 'http://localhost:7070/api'

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
async function callApi(
  testCase: TestCase
): Promise<IntakeResult | PolicyAnalysisResult | undefined> {
  if (testCase.type === 'conversational') {
    return callIntakeEndpoint(testCase.input || '', testCase.id)
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
async function callIntakeEndpoint(
  input: string,
  testId: string
): Promise<IntakeResult | undefined> {
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
    await page.waitForTimeout(1000)

    // Take initial screenshot for debugging
    await page.screenshot({ path: '.ai/debug-screenshot-initial.png' })
    console.log('📸 Initial screenshot saved to .ai/debug-screenshot-initial.png')

    // Inject text into editor (triggers pill extraction via KeyValuePlugin)
    console.log(`⌨️  Injecting text: "${input}"`)
    await injectTextIntoEditor(page, input)

    // Wait for extraction to complete (debounce + API call)
    await waitForExtraction(page)

    // Extract cleaned text and pills from frontend with retry
    let cleanedText = ''
    let pills = {}
    for (let attempt = 0; attempt < 3; attempt++) {
      const extracted = await extractCleanedTextAndPills(page)
      cleanedText = extracted.cleanedText
      pills = extracted.pills

      if (cleanedText) {
        console.log(`✅ Pill extraction successful (attempt ${attempt + 1})`)
        console.log(`   Original: "${input.substring(0, 60)}..."`)
        console.log(`   Cleaned:  "${cleanedText.substring(0, 60)}..."`)
        console.log(`   Pills:    ${JSON.stringify(pills)}`)
        break
      }

      if (attempt < 2) {
        console.log(`⚠️  No text extracted, retrying (attempt ${attempt + 1}/3)...`)
        await page.waitForTimeout(100) // Short retry delay
      }
    }

    // Fail fast if pill extraction didn't work
    if (!cleanedText) {
      throw new Error(
        `Pill extraction failed for test ${testId}. Extracted: "${cleanedText}". Pills: ${JSON.stringify(pills)}. This means editorRef isn't exposed or extraction logic failed.`
      )
    }

    console.log('📦 Extracted cleaned text:', JSON.stringify(cleanedText))
    console.log('💊 Extracted pills:', JSON.stringify(pills, null, 2))

    // Send request with both cleaned text and pills to API
    const response = await fetch(`${API_BASE_URL}/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: cleanedText, // No fallback - fail if extraction failed
        pills: Object.keys(pills).length > 0 ? pills : undefined,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`API error: ${error.error?.message || response.statusText}`)
    }

    const result = (await response.json()) as IntakeResult

    // Wait a bit more to ensure all console logs are captured
    await page.waitForTimeout(500)

    // Take final screenshot before closing
    await page.screenshot({ path: '.ai/debug-screenshot-final.png' })
    console.log('📸 Final screenshot saved to .ai/debug-screenshot-final.png')

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
): Promise<PolicyAnalysisResult | undefined> {
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

  return (await response.json()) as PolicyAnalysisResult
}
