// Test setup for Bun test with DOM environment
import '@testing-library/jest-dom'
// Preload React to ensure JSX runtime is available
import 'react/jsx-runtime'

// Always ensure requestAnimationFrame is available FIRST (before DOM setup)
// This is needed for Radix UI components (Accordion, etc.) and @testing-library/react
const rafPolyfill = ((callback: FrameRequestCallback) => {
  return setTimeout(callback, 16) // ~60fps
}) as typeof requestAnimationFrame

const cafPolyfill = ((id: number) => {
  clearTimeout(id)
}) as typeof cancelAnimationFrame

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = rafPolyfill
}

if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = cafPolyfill
}

// Setup DOM environment using happy-dom synchronously
// This must run immediately when the module is imported, not in beforeAll
if (typeof globalThis.document === 'undefined') {
  const { Window } = require('happy-dom')
  const window = new Window()
  const { document } = window
  globalThis.window = window as unknown as Window & typeof globalThis
  globalThis.document = document
  globalThis.HTMLElement = window.HTMLElement
  globalThis.Element = window.Element
  globalThis.navigator = window.navigator

  // Ensure requestAnimationFrame is also on window object (happy-dom may not provide it)
  window.requestAnimationFrame = rafPolyfill
  window.cancelAnimationFrame = cafPolyfill

  // Ensure document.body exists for @testing-library/react screen queries
  if (!document.body) {
    const body = document.createElement('body')
    document.appendChild(body)
  }

  // Add KeyboardEvent constructor
  globalThis.KeyboardEvent = window.KeyboardEvent as typeof KeyboardEvent

  // Add MutationObserver for Lexical editor
  globalThis.MutationObserver = window.MutationObserver as typeof MutationObserver

  // Add getComputedStyle for Lexical editor
  if (!window.getComputedStyle) {
    ;(
      window as unknown as { getComputedStyle: () => { getPropertyValue: () => string } }
    ).getComputedStyle = () => ({
      getPropertyValue: () => '',
    })
  }
  globalThis.getComputedStyle = window.getComputedStyle

  // Add IntersectionObserver stub if needed
  if (!window.IntersectionObserver) {
    globalThis.IntersectionObserver = class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver
  }
} else {
  // Document already exists, but ensure requestAnimationFrame is on window
  if (globalThis.window && !globalThis.window.requestAnimationFrame) {
    globalThis.window.requestAnimationFrame = globalThis.requestAnimationFrame
  }
  if (globalThis.window && !globalThis.window.cancelAnimationFrame) {
    globalThis.window.cancelAnimationFrame = globalThis.cancelAnimationFrame
  }
}
