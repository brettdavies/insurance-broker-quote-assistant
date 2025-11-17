/**
 * Dynamic Height Plugin
 *
 * Dynamically adjusts editor height to always show 2 empty lines below content.
 * Single Responsibility: Height management only
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect, useRef } from 'react'

const MIN_HEIGHT = 100 // Minimum height in pixels
const EMPTY_LINES = 1 // Number of empty lines to maintain

/**
 * Calculates line height from computed styles
 */
function getLineHeight(computedStyle: CSSStyleDeclaration): number {
  const lineHeight = Number.parseFloat(computedStyle.lineHeight)
  if (!Number.isNaN(lineHeight) && lineHeight > 0) {
    return lineHeight
  }
  // Fallback: 1.5x font size
  const fontSize = Number.parseFloat(computedStyle.fontSize)
  return Number.isNaN(fontSize) ? 20 : fontSize * 1.5
}

/**
 * Finds the contentEditable element in the editor
 */
function findContentEditable(rootElement: HTMLElement | null): HTMLElement | null {
  if (!rootElement) return null

  // The rootElement might be the contentEditable itself
  if (
    rootElement.hasAttribute('contenteditable') &&
    rootElement.getAttribute('contenteditable') === 'true'
  ) {
    return rootElement
  }

  // Otherwise, search for it
  return rootElement.querySelector<HTMLElement>('[contenteditable="true"]')
}

/**
 * Updates editor height to show content + 2 empty lines
 */
function updateEditorHeight(contentEditable: HTMLElement): void {
  const computedStyle = window.getComputedStyle(contentEditable)
  const lineHeight = getLineHeight(computedStyle)
  const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0
  const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0

  // Store original height to avoid flicker
  const originalHeight = contentEditable.style.height
  const originalOverflow = contentEditable.style.overflowY

  // Temporarily set height to auto to measure natural content height
  contentEditable.style.height = 'auto'
  contentEditable.style.overflowY = 'hidden'
  contentEditable.style.minHeight = '0'

  // Force a reflow to ensure scrollHeight is accurate
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  contentEditable.offsetHeight

  // Measure the natural content height (scrollHeight includes padding)
  const contentHeight = contentEditable.scrollHeight - paddingTop - paddingBottom

  // Calculate desired height: content height + 2 line heights + padding
  const desiredHeight = contentHeight + lineHeight * EMPTY_LINES + paddingTop + paddingBottom

  // Set the height (use min-height to ensure it doesn't shrink below minimum)
  const finalHeight = Math.max(desiredHeight, MIN_HEIGHT)
  contentEditable.style.height = `${finalHeight}px`
  contentEditable.style.overflowY = 'hidden' // Prevent scrollbar
}

export function DynamicHeightPlugin(): null {
  const [editor] = useLexicalComposerContext()
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    const updateHeight = () => {
      // Cancel any pending animation frame
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }

      rafIdRef.current = requestAnimationFrame(() => {
        const rootElement = editor.getRootElement()
        const contentEditable = findContentEditable(rootElement)
        if (!contentEditable) return

        updateEditorHeight(contentEditable)
        rafIdRef.current = null
      })
    }

    // Update height on content changes
    const removeUpdateListener = editor.registerUpdateListener(() => {
      updateHeight()
    })

    // Use MutationObserver to watch for DOM changes (more reliable than just update listener)
    const rootElement = editor.getRootElement()
    let mutationObserver: MutationObserver | null = null

    if (rootElement) {
      mutationObserver = new MutationObserver(() => {
        updateHeight()
      })

      mutationObserver.observe(rootElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false,
      })
    }

    // Initial height calculation with multiple attempts (DOM might not be ready)
    const attemptInitialUpdate = () => {
      const root = editor.getRootElement()
      const contentEditable = findContentEditable(root)
      if (contentEditable) {
        updateHeight()
      } else {
        // Retry if not ready
        setTimeout(attemptInitialUpdate, 10)
      }
    }

    const timeoutId = setTimeout(attemptInitialUpdate, 0)

    // Also update on window resize (in case font size changes)
    window.addEventListener('resize', updateHeight)

    return () => {
      removeUpdateListener()
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateHeight)
      if (mutationObserver) {
        mutationObserver.disconnect()
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [editor])

  return null
}
