// Test setup for Bun test with DOM environment
import '@testing-library/jest-dom'
// Preload React to ensure JSX runtime is available
import 'react/jsx-runtime'

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
}
