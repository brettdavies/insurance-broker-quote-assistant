/**
 * Conversational Test Runner
 *
 * Runs conversational intake test cases using real E2E browser automation.
 * Tests the full frontend flow: inject text → extract pills → send to API → get results.
 *
 * Follows SRP: Only handles conversational test execution.
 */

import type { Browser } from 'playwright'
import type { IntakeResult } from '../../packages/shared/src/index'
import type { TestCase, TestResult } from '../types'
import {
  extractCleanedTextAndPills,
  injectTextIntoEditor,
  waitForExtraction,
} from '../utils/browser-automation'
import { calculateMetrics } from './metrics-calculator'
import {
  FRONTEND_URL,
  createBrowserContext,
  fetchAPI,
  launchBrowser,
  printConsoleLogs,
  takeScreenshot,
} from './test-runner-common'

/**
 * Run a single conversational intake test case
 *
 * @param testCase - Test case to run
 * @param sharedBrowser - Optional shared browser instance for better performance
 */
export async function runConversationalTest(
  testCase: TestCase,
  sharedBrowser?: Browser
): Promise<TestResult> {
  if (testCase.type !== 'conversational') {
    throw new Error('This runner only handles conversational test cases')
  }

  try {
    const actualResponse = await callIntakeEndpoint(
      testCase.input || '',
      testCase.id,
      sharedBrowser
    )
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
 * Call /api/intake endpoint using real E2E browser automation
 *
 * Uses Playwright to:
 * 1. Launch browser and navigate to frontend (or reuse shared browser)
 * 2. Inject text into Lexical editor (triggers pill extraction)
 * 3. Extract cleaned text and pills from frontend React state
 * 4. Send both cleaned text and pills to API endpoint
 * 5. Return API response
 *
 * @param input - Text input to inject
 * @param testId - Test case ID for error messages
 * @param sharedBrowser - Optional shared browser instance (60x faster!)
 */
async function callIntakeEndpoint(
  input: string,
  testId: string,
  sharedBrowser?: Browser
): Promise<IntakeResult | undefined> {
  // Create browser context - either fresh browser or new context from shared browser
  const browserContext = sharedBrowser
    ? await createBrowserContext(sharedBrowser)
    : await launchBrowser()
  const { page, close, consoleLogs } = browserContext

  try {
    // Navigate to frontend
    console.log(`🌐 Navigating to ${FRONTEND_URL}...`)
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' })

    // Wait for React to render (give it extra time)
    console.log('⏳ Waiting for React to render...')
    await page.waitForTimeout(1000)

    // Take initial screenshot for debugging
    await takeScreenshot(
      page,
      'debug-screenshot-initial.png',
      'Initial screenshot saved to .ai/debug-screenshot-initial.png'
    )

    // Inject text into editor (triggers pill extraction via KeyValuePlugin)
    console.log(`⌨️  Injecting text: "${input}"`)
    await injectTextIntoEditor(page, input)

    // Wait for extraction to complete (debounce + API call)
    await waitForExtraction(page)

    // Extract cleaned text and pills from frontend with retry
    let cleanedText = ''
    let pills = {}
    let extractionError: Error | null = null

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`🔄 Attempting pill extraction (attempt ${attempt + 1}/3)...`)
        const extracted = await extractCleanedTextAndPills(page, 10000) // 10 second timeout
        cleanedText = extracted.cleanedText
        pills = extracted.pills

        if (cleanedText) {
          console.log(`✅ Pill extraction successful (attempt ${attempt + 1})`)
          console.log(`   Original: "${input.substring(0, 60)}..."`)
          console.log(`   Cleaned:  "${cleanedText.substring(0, 60)}..."`)
          console.log(`   Pills:    ${JSON.stringify(pills)}`)
          break
        }

        console.log(`⚠️  No text extracted, retrying (attempt ${attempt + 1}/3)...`)
      } catch (error) {
        extractionError = error instanceof Error ? error : new Error(String(error))
        console.error(
          `❌ Pill extraction error (attempt ${attempt + 1}/3):`,
          extractionError.message
        )

        // If timeout occurred and we have retries left, refresh the page and retry
        if (attempt < 2) {
          console.log('🔄 Refreshing page and retrying...')
          await page.reload({ waitUntil: 'networkidle' })
          await page.waitForTimeout(1000)

          // Re-inject text after refresh
          console.log(`⌨️  Re-injecting text after refresh: "${input}"`)
          await injectTextIntoEditor(page, input)
          await waitForExtraction(page)
        }
      }

      if (attempt < 2 && !cleanedText) {
        await page.waitForTimeout(500) // Wait before retry
      }
    }

    // Fail fast if pill extraction didn't work
    if (!cleanedText) {
      const errorDetails = extractionError
        ? `Last error: ${extractionError.message}`
        : 'editorRef not exposed or extraction logic failed'
      throw new Error(
        `Pill extraction failed for test ${testId} after 3 attempts. ${errorDetails}. Extracted: "${cleanedText}". Pills: ${JSON.stringify(pills)}.`
      )
    }

    console.log('📦 Extracted cleaned text:', JSON.stringify(cleanedText))
    console.log('💊 Extracted pills:', JSON.stringify(pills, null, 2))

    // Send request with both cleaned text and pills to API
    const result = await fetchAPI<IntakeResult>('/intake', 'POST', {
      message: cleanedText, // No fallback - fail if extraction failed
      pills: Object.keys(pills).length > 0 ? pills : undefined,
    })

    // Wait a bit more to ensure all console logs are captured
    await page.waitForTimeout(500)

    // Take final screenshot before closing
    await takeScreenshot(
      page,
      'debug-screenshot-final.png',
      'Final screenshot saved to .ai/debug-screenshot-final.png'
    )

    // Print all console logs
    printConsoleLogs(consoleLogs)

    return result
  } finally {
    // Always close browser
    await close()
  }
}
