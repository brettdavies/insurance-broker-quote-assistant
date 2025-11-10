// Test setup for Bun test with DOM environment
import { beforeAll } from 'bun:test'
import '@testing-library/jest-dom'
// Preload React to ensure JSX runtime is available
import 'react/jsx-runtime'

// Setup DOM environment using happy-dom
beforeAll(() => {
  // Import happy-dom and set it up
  if (typeof globalThis.document === 'undefined') {
    const { Window } = require('happy-dom')
    const window = new Window()
    const { document } = window
    globalThis.window = window as unknown as Window & typeof globalThis
    globalThis.document = document
    globalThis.HTMLElement = window.HTMLElement
    globalThis.Element = window.Element
    globalThis.navigator = window.navigator

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
})
