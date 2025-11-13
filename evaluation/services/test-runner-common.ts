/**
 * Test Runner Common Utilities
 *
 * Shared utilities for both conversational and policy test runners.
 * Follows DRY principle - extracted from test-runner.ts.
 */

import type { Page } from 'playwright'
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
 * Launch browser with console logging enabled
 */
export async function launchBrowser(): Promise<BrowserContext> {
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

  return {
    page,
    close: async () => await browser.close(),
    consoleLogs,
  }
}

/**
 * Take screenshot for debugging
 */
export async function takeScreenshot(
  page: Page,
  filename: string,
  message?: string
): Promise<void> {
  await page.screenshot({ path: `.ai/${filename}` })
  if (message) {
    console.log(`📸 ${message}`)
  }
}

/**
 * Print all captured console logs
 */
export function printConsoleLogs(consoleLogs: Array<{ type: string; text: string }>): void {
  console.log(`\n${'='.repeat(80)}`)
  console.log('📋 BROWSER CONSOLE LOGS:')
  console.log('='.repeat(80))
  for (const log of consoleLogs) {
    console.log(`[${log.type.toUpperCase()}] ${log.text}`)
  }
  console.log('='.repeat(80))
  console.log(`Total console messages: ${consoleLogs.length}\n`)
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

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`API error: ${error.error?.message || response.statusText}`)
  }

  return (await response.json()) as T
}
