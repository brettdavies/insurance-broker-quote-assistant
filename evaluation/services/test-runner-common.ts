/**
 * Test Runner Common Utilities
 *
 * Shared utilities for both conversational and policy test runners.
 * Follows DRY principle - extracted from test-runner.ts.
 */

import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'

export const FRONTEND_URL = process.env.EVALUATION_FRONTEND_URL || 'http://localhost:3000'
export const API_BASE_URL = process.env.EVALUATION_API_URL || 'http://localhost:7070/api'

/**
 * Browser context with console logging
 */
export interface BrowserContext {
  page: Page
  close: () => Promise<void>
  consoleLogs: Array<{ type: string; text: string }>
}

/**
 * Create a shared browser instance for multiple tests
 *
 * This is 60x faster than launching a new browser per test.
 * Use with createBrowserContext() to create isolated contexts per test.
 */
export async function createBrowser(): Promise<Browser> {
  return await chromium.launch({ headless: false })
}

/**
 * Create a fresh browser context (isolated tab) from an existing browser
 *
 * Each context is completely isolated - separate cookies, localStorage, etc.
 * This prevents state pollution between tests while reusing the browser instance.
 */
export async function createBrowserContext(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext()
  const page = await context.newPage()

  // Capture all console logs
  const consoleLogs: Array<{ type: string; text: string }> = []
  page.on('console', (msg) => {
    const text = msg.text()
    const type = msg.type()
    consoleLogs.push({ type, text })
    // Also log to Node.js console for real-time viewing
    console.log(`[Browser ${type.toUpperCase()}]`, text)
  })

  return {
    page,
    close: async () => await context.close(), // Close context only, not browser
    consoleLogs,
  }
}

/**
 * API fetch wrapper with error handling
 */
export async function fetchAPI<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  // Get response body as text first (in case JSON parsing fails)
  const responseText = await response.text()

  if (!response.ok) {
    // Try to parse error response as JSON
    let errorMessage = response.statusText
    try {
      const error = JSON.parse(responseText)
      errorMessage = error.error?.message || error.message || response.statusText
    } catch {
      // If JSON parsing fails, use response text or status text
      errorMessage = responseText || response.statusText
    }
    throw new Error(
      `API error (${response.status}): ${errorMessage}\nResponse body preview: ${responseText.substring(0, 500)}`
    )
  }

  // Try to parse response as JSON
  try {
    return JSON.parse(responseText) as T
  } catch (error) {
    throw new Error(
      `Failed to parse JSON response from ${url}\nStatus: ${response.status} ${response.statusText}\nResponse body preview: ${responseText.substring(0, 500)}`
    )
  }
}
