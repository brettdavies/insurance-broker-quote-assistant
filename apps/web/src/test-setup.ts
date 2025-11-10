// Test setup for Bun test with DOM environment
import { beforeAll } from 'bun:test'

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
  }
})
