/**
 * Browser Automation Utilities
 *
 * Reusable utilities for E2E testing using Playwright.
 * Follows SRP (Single Responsibility Principle) - each function handles one operation.
 */

import type { IntakeResult, UserProfile } from '@repo/shared'
import type { Page } from 'playwright'

const FRONTEND_URL = process.env.EVALUATION_FRONTEND_URL || 'http://localhost:3000'
const EXTRACTION_TIMEOUT_MS = 10000 // 10 seconds

/**
 * Inject text into the Lexical editor on the frontend page
 *
 * Finds the contentEditable element and types text into it, which triggers
 * pill extraction via KeyValuePlugin.
 *
 * @param page - Playwright Page instance
 * @param text - Text to inject
 */
export async function injectTextIntoEditor(page: Page, text: string): Promise<void> {
  // Wait for React to mount - check for root element to have content
  console.log('⏳ Waiting for React to mount...')
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root')
      return root && root.children.length > 0
    },
    { timeout: 15000 }
  )
  console.log('✅ React mounted')

  // Wait briefly for Lexical to initialize
  await page.waitForTimeout(100)

  // Debug: Check what's on the page and find the correct editor
  const editorInfo = await page.evaluate(() => {
    const elements = Array.from(
      document.querySelectorAll('[contenteditable="true"][data-notes-input="true"]')
    )

    // Find the NotesPanel editor (for conversational intake)
    // It should be in the center/left section, not the UploadPanel on the left
    // NotesPanel editor typically has min-h-[200px] class
    const notesEditor = elements.find((el) => {
      const className = el.className
      // NotesPanel uses min-h-[200px], UploadPanel might use min-h-[150px]
      return className.includes('min-h-[200px]') || className.includes('min-h-\\[200px\\]')
    })

    return {
      totalEditors: elements.length,
      editors: elements.map((el, idx) => ({
        index: idx,
        tag: el.tagName,
        className: el.className.substring(0, 150),
        rect: el.getBoundingClientRect(),
        isNotesEditor: el === notesEditor,
      })),
      notesEditorIndex: notesEditor ? elements.indexOf(notesEditor) : -1,
    }
  })
  console.log('🔍 Editor info:', JSON.stringify(editorInfo, null, 2))

  // Select the NotesPanel editor (for conversational intake)
  // Prefer the one with min-h-[200px] or the one that's more centered/right
  const editorSelector = '[contenteditable="true"][data-notes-input="true"]'

  // If we found multiple editors, select the NotesPanel one
  if (editorInfo.totalEditors > 1 && editorInfo.notesEditorIndex >= 0) {
    // Use nth-of-type to select the correct one
    const editors = await page.locator('[contenteditable="true"][data-notes-input="true"]').all()
    if (editors.length > editorInfo.notesEditorIndex) {
      console.log(`✅ Selecting NotesPanel editor (index ${editorInfo.notesEditorIndex})`)
      // Use the specific editor by index
      await editors[editorInfo.notesEditorIndex].waitFor({ state: 'visible', timeout: 5000 })
      await editors[editorInfo.notesEditorIndex].click()
      await page.waitForTimeout(100)

      // Clear and type - use fill instead of type to ensure full text
      await editors[editorInfo.notesEditorIndex].fill('')
      await page.waitForTimeout(50)
      // Type character by character to trigger Lexical's input handlers
      await editors[editorInfo.notesEditorIndex].type(text, { delay: 20 })
      await page.waitForTimeout(200) // Wait for pill extraction
      return
    }
  }

  // Fallback: wait for any editor (single editor case)
  console.log('🔍 Waiting for editor...')
  await page.waitForSelector(editorSelector, { timeout: 10000, state: 'visible' })
  console.log('✅ Found editor')

  // Click to focus the editor
  await page.click(editorSelector)

  // Clear any existing content - use fill to ensure complete clearing
  await page.fill(editorSelector, '')
  await page.waitForTimeout(50)

  // Type the text character by character to trigger Lexical's input handlers
  await page.type(editorSelector, text, { delay: 20 })

  // Wait for pill detection (real-time ~10-50ms) + DOM updates (~50-100ms)
  await page.waitForTimeout(50)
}

/**
 * Extract cleaned text and pills from the frontend page
 *
 * Uses page.evaluate() to access React component state and call editor methods.
 * Accesses UnifiedChatInterface's editorRef and profile state.
 *
 * @param page - Playwright Page instance
 * @returns Object with cleaned text and pills
 */
export async function extractCleanedTextAndPills(
  page: Page
): Promise<{ cleanedText: string; pills: Partial<UserProfile> }> {
  const result = await page.evaluate(() => {
    // Try to access React component state via React DevTools
    const win = window as unknown as {
      __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
        renderers?: Map<
          number,
          {
            findFiberByHostInstance?: (node: Node) => unknown
            findHostInstanceByFiber?: (fiber: unknown) => Node | null
          }
        >
      }
      editorRef?: {
        current?: {
          getTextWithoutPills?: () => string
        }
      }
      profile?: Partial<UserProfile>
      __profileState?: Partial<UserProfile>
    }

    // Try to access profile state from window (exposed by UnifiedChatInterface)
    let profile: Partial<UserProfile> = {}
    let cleanedText = ''

    const winWithProfile = win as unknown as { __profileState?: Partial<UserProfile> }
    if (winWithProfile.__profileState) {
      profile = winWithProfile.__profileState
    }

    // Try window.editorRef first (if frontend exposes it)
    if (win.editorRef?.current?.getTextWithoutPills) {
      cleanedText = win.editorRef.current.getTextWithoutPills()
      if (Object.keys(profile).length === 0 && win.profile) {
        profile = win.profile
      }
      return { cleanedText, pills: profile }
    }

    // Fallback: Try to find editor element and extract text manually
    // This is a simplified approach - ideally frontend would expose editorRef
    const editorElement = document.querySelector(
      '[contenteditable="true"][data-notes-input="true"]'
    )
    if (editorElement) {
      // Get text content, but exclude pill elements
      const textNodes: string[] = []
      const walker = document.createTreeWalker(editorElement, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          // Skip if parent is a pill
          const parent = node.parentElement
          if (parent?.hasAttribute('data-pill')) {
            return NodeFilter.FILTER_REJECT
          }
          return NodeFilter.FILTER_ACCEPT
        },
      })

      let node: Node | null = null
      // biome-ignore lint/suspicious/noAssignInExpressions: Standard pattern for TreeWalker
      while ((node = walker.nextNode())) {
        if (node.textContent) {
          textNodes.push(node.textContent)
        }
      }

      const cleanedText = textNodes.join('').trim()

      // Try to extract pills from DOM (pill elements have data-key and data-value)
      const pills: Partial<UserProfile> = {}
      const pillElements = editorElement.querySelectorAll('[data-pill="true"]')
      for (const pill of pillElements) {
        const key = pill.getAttribute('data-key')
        const value = pill.getAttribute('data-value')
        const fieldName = pill.getAttribute('data-field-name')
        if (key && value) {
          // Use fieldName if available, otherwise use key
          const finalKey = fieldName || key
          // Try to parse value as number, otherwise keep as string
          const numValue = Number(value)
          if (!Number.isNaN(numValue)) {
            ;(pills as Record<string, unknown>)[finalKey] = numValue
          } else if (value === 'true' || value === 'false') {
            ;(pills as Record<string, unknown>)[finalKey] = value === 'true'
          } else {
            ;(pills as Record<string, unknown>)[finalKey] = value
          }
        }
      }

      // If we found profile from React state, use that instead (it's more reliable)
      if (Object.keys(profile).length > 0) {
        return { cleanedText, pills: profile }
      }

      return { cleanedText, pills }
    }

    // If we found profile from React state but no editor element, still return it
    if (Object.keys(profile).length > 0) {
      return { cleanedText: '', pills: profile }
    }

    return { cleanedText: '', pills: {} }
  })

  return result
}

/**
 * Wait for extraction to complete
 *
 * Waits for the debounce period (500ms) plus API call completion.
 * Polls for intake result in React state or checks for API completion.
 *
 * @param page - Playwright Page instance
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForExtraction(
  page: Page,
  timeout: number = EXTRACTION_TIMEOUT_MS
): Promise<void> {
  // Wait for debounce (500ms) + API call
  await page.waitForTimeout(200)

  // Poll for extraction result
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    // Check if intake result is available in React state
    const hasResult = await page.evaluate(() => {
      const win = window as unknown as {
        intakeResult?: IntakeResult
        __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown
      }
      return !!win.intakeResult
    })

    if (hasResult) {
      return
    }

    // Wait a bit before polling again
    await page.waitForTimeout(50)
  }
}

/**
 * Extract intake result from page state
 *
 * Uses evaluate_script to access React state or API response from page.
 *
 * @param page - Playwright Page instance
 * @returns IntakeResult if available, null otherwise
 */
export async function extractIntakeResult(page: Page): Promise<IntakeResult | null> {
  const result = await page.evaluate(() => {
    const win = window as unknown as {
      intakeResult?: IntakeResult
    }
    return win.intakeResult || null
  })

  return result
}
