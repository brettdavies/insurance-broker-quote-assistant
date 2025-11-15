/**
 * Double-Click Handler Tests
 *
 * CRITICAL REGRESSION TESTS: These tests prevent the double-click pill reversion bug.
 *
 * The bug occurs when:
 * - User double-clicks a pill (e.g., "state:TX")
 * - Only the key part ("state:") appears as text
 * - The value part ("TX") is missing
 * - The pill remains visible instead of being replaced
 *
 * Expected behavior:
 * 1. Double-clicking a pill should replace it with the full key:value text
 * 2. The pill should be completely removed (not remain visible)
 * 3. The field should be removed from the profile if it's valid
 *
 * If any of these tests fail, the double-click reversion bug has regressed.
 */

import '../../../../../test-setup'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { $getRoot, $isTextNode, TextNode, createEditor } from 'lexical'
import {
  $createPillNode,
  $isPillNode,
  PillNode,
  type PillNode as PillNodeType,
} from '../../../nodes/PillNode'
import { createDoubleClickHandler } from '../double-click-handler'

describe('Double-Click Handler', () => {
  let editor: ReturnType<typeof createEditor>
  let rootElement: HTMLElement
  let notifyFieldRemoved: ReturnType<typeof mock>

  beforeEach(() => {
    editor = createEditor({
      nodes: [TextNode, PillNode],
      onError: () => {},
    })
    rootElement = document.createElement('div')
    notifyFieldRemoved = mock(() => {})

    // Add MouseEvent if not available (for happy-dom)
    if (typeof globalThis.MouseEvent === 'undefined') {
      globalThis.MouseEvent = class MouseEvent extends Event {} as unknown as typeof MouseEvent
    }
  })

  describe('Pill replacement with full key:value text', () => {
    it('should replace pill with full key:value text when double-clicked', async () => {
      let pillNodeKey = ''

      editor.update(() => {
        const root = $getRoot()
        const pillNode = $createPillNode({
          key: 'state',
          value: 'TX',
          validation: 'valid',
          fieldName: 'state',
        })
        root.append(pillNode)
        pillNodeKey = pillNode.getKey()
      })

      // Create handler
      const removeListener = createDoubleClickHandler(editor, notifyFieldRemoved)
      removeListener(rootElement, null)

      // Simulate double-click on the pill
      const pillElement = document.createElement('span')
      pillElement.setAttribute('data-pill', 'true')
      pillElement.setAttribute('data-pill-node-key', pillNodeKey)
      rootElement.appendChild(pillElement)

      const doubleClickEvent = new (globalThis.MouseEvent || window.MouseEvent)('dblclick', {
        bubbles: true,
        cancelable: true,
      }) as MouseEvent
      Object.defineProperty(doubleClickEvent, 'target', {
        value: pillElement,
        enumerable: true,
        configurable: true,
      })

      pillElement.dispatchEvent(doubleClickEvent)

      // Wait for editor update to complete (handler uses setTimeout)
      await new Promise((resolve) => setTimeout(resolve, 20))

      // CRITICAL: Verify pill is replaced with full key:value text
      editor.getEditorState().read(() => {
        const root = $getRoot()
        const children = root.getChildren()

        // CRITICAL: Pill should be completely removed
        const remainingPill = children.find((node) => $isPillNode(node))
        expect(remainingPill).toBeUndefined()

        // CRITICAL: Should have text node with full key:value
        const textNodes = children.filter((node) => $isTextNode(node))
        expect(textNodes.length).toBeGreaterThan(0)

        // CRITICAL: Text should contain the full key:value (not just key)
        const fullText = root.getTextContent()
        expect(fullText).toContain('state:TX')
        expect(fullText).not.toBe('state:') // Should not be just the key
      })
    })

    it('should replace pill with full key:value even when key is a shortcut', () => {
      editor.update(() => {
        const root = $getRoot()
        const pillNode = $createPillNode({
          key: 's', // shortcut for state
          value: 'CA',
          validation: 'valid',
          fieldName: 'state',
        })
        root.append(pillNode)
      })

      const removeListener = createDoubleClickHandler(editor, notifyFieldRemoved)
      removeListener(rootElement, null)

      const pillElement = document.createElement('span')
      pillElement.setAttribute('data-pill', 'true')
      pillElement.setAttribute(
        'data-pill-node-key',
        editor.getEditorState().read(() => {
          const root = $getRoot()
          const children = root.getChildren()
          const pill = children.find((node) => $isPillNode(node))
          return pill?.getKey() || ''
        })
      )
      rootElement.appendChild(pillElement)

      const doubleClickEvent = new (globalThis.MouseEvent || window.MouseEvent)('dblclick', {
        bubbles: true,
        cancelable: true,
      }) as MouseEvent
      Object.defineProperty(doubleClickEvent, 'target', {
        value: pillElement,
        enumerable: true,
        configurable: true,
      })

      pillElement.dispatchEvent(doubleClickEvent)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        const fullText = root.getTextContent()

        // CRITICAL: Should contain full key:value (s:CA), not just key (s:)
        expect(fullText).toContain('s:CA')
        expect(fullText).not.toBe('s:')
        expect(fullText).not.toContain('state:CA') // Should use original key, not fieldName
      })
    })

    it('should handle pills with numeric values', () => {
      editor.update(() => {
        const root = $getRoot()
        const pillNode = $createPillNode({
          key: 'kids',
          value: '2',
          validation: 'valid',
          fieldName: 'kids',
        })
        root.append(pillNode)
      })

      const removeListener = createDoubleClickHandler(editor, notifyFieldRemoved)
      removeListener(rootElement, null)

      const pillElement = document.createElement('span')
      pillElement.setAttribute('data-pill', 'true')
      pillElement.setAttribute(
        'data-pill-node-key',
        editor.getEditorState().read(() => {
          const root = $getRoot()
          const children = root.getChildren()
          const pill = children.find((node) => $isPillNode(node))
          return pill?.getKey() || ''
        })
      )
      rootElement.appendChild(pillElement)

      const doubleClickEvent = new (globalThis.MouseEvent || window.MouseEvent)('dblclick', {
        bubbles: true,
        cancelable: true,
      }) as MouseEvent
      Object.defineProperty(doubleClickEvent, 'target', {
        value: pillElement,
        enumerable: true,
        configurable: true,
      })

      pillElement.dispatchEvent(doubleClickEvent)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        const fullText = root.getTextContent()

        // CRITICAL: Should contain full key:value
        expect(fullText).toContain('kids:2')
        expect(fullText).not.toBe('kids:')
      })
    })
  })

  describe('Pill removal verification', () => {
    it('should completely remove pill node after double-click', () => {
      editor.update(() => {
        const root = $getRoot()
        const pillNode = $createPillNode({
          key: 'productType',
          value: 'home',
          validation: 'valid',
          fieldName: 'productType',
        })
        root.append(pillNode)
      })

      // Verify pill exists before double-click
      editor.getEditorState().read(() => {
        const root = $getRoot()
        const children = root.getChildren()
        const pill = children.find((node) => $isPillNode(node))
        expect(pill).toBeDefined()
      })

      const removeListener = createDoubleClickHandler(editor, notifyFieldRemoved)
      removeListener(rootElement, null)

      const pillElement = document.createElement('span')
      pillElement.setAttribute('data-pill', 'true')
      pillElement.setAttribute(
        'data-pill-node-key',
        editor.getEditorState().read(() => {
          const root = $getRoot()
          const children = root.getChildren()
          const pill = children.find((node) => $isPillNode(node))
          return pill?.getKey() || ''
        })
      )
      rootElement.appendChild(pillElement)

      const doubleClickEvent = new (globalThis.MouseEvent || window.MouseEvent)('dblclick', {
        bubbles: true,
        cancelable: true,
      }) as MouseEvent
      Object.defineProperty(doubleClickEvent, 'target', {
        value: pillElement,
        enumerable: true,
        configurable: true,
      })

      pillElement.dispatchEvent(doubleClickEvent)

      // CRITICAL: Verify pill is completely removed
      editor.getEditorState().read(() => {
        const root = $getRoot()
        const children = root.getChildren()
        const remainingPill = children.find((node) => $isPillNode(node))
        expect(remainingPill).toBeUndefined()
      })
    })
  })

  describe('Field removal notification', () => {
    it('should notify when valid pill is double-clicked', () => {
      editor.update(() => {
        const root = $getRoot()
        const pillNode = $createPillNode({
          key: 'state',
          value: 'TX',
          validation: 'valid',
          fieldName: 'state',
        })
        root.append(pillNode)
      })

      const removeListener = createDoubleClickHandler(editor, notifyFieldRemoved)
      removeListener(rootElement, null)

      const pillElement = document.createElement('span')
      pillElement.setAttribute('data-pill', 'true')
      pillElement.setAttribute(
        'data-pill-node-key',
        editor.getEditorState().read(() => {
          const root = $getRoot()
          const children = root.getChildren()
          const pill = children.find((node) => $isPillNode(node))
          return pill?.getKey() || ''
        })
      )
      rootElement.appendChild(pillElement)

      const doubleClickEvent = new (globalThis.MouseEvent || window.MouseEvent)('dblclick', {
        bubbles: true,
        cancelable: true,
      }) as MouseEvent
      Object.defineProperty(doubleClickEvent, 'target', {
        value: pillElement,
        enumerable: true,
        configurable: true,
      })

      pillElement.dispatchEvent(doubleClickEvent)

      // Wait for setTimeout to complete
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // CRITICAL: Should notify about field removal
          expect(notifyFieldRemoved).toHaveBeenCalled()
          resolve()
        }, 10)
      })
    })

    it('should not notify for invalid pills', () => {
      editor.update(() => {
        const root = $getRoot()
        const pillNode = $createPillNode({
          key: 'invalid',
          value: 'value',
          validation: 'invalid_key',
          fieldName: undefined,
        })
        root.append(pillNode)
      })

      const removeListener = createDoubleClickHandler(editor, notifyFieldRemoved)
      removeListener(rootElement, null)

      const pillElement = document.createElement('span')
      pillElement.setAttribute('data-pill', 'true')
      pillElement.setAttribute(
        'data-pill-node-key',
        editor.getEditorState().read(() => {
          const root = $getRoot()
          const children = root.getChildren()
          const pill = children.find((node) => $isPillNode(node))
          return pill?.getKey() || ''
        })
      )
      rootElement.appendChild(pillElement)

      const doubleClickEvent = new (globalThis.MouseEvent || window.MouseEvent)('dblclick', {
        bubbles: true,
        cancelable: true,
      }) as MouseEvent
      Object.defineProperty(doubleClickEvent, 'target', {
        value: pillElement,
        enumerable: true,
        configurable: true,
      })

      pillElement.dispatchEvent(doubleClickEvent)

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Should not notify for invalid pills
          expect(notifyFieldRemoved).not.toHaveBeenCalled()
          resolve()
        }, 10)
      })
    })
  })

  describe('Text merging with siblings', () => {
    it('should merge with previous text node', () => {
      editor.update(() => {
        const root = $getRoot()
        const beforeText = new TextNode('before ')
        const pillNode = $createPillNode({
          key: 'state',
          value: 'TX',
          validation: 'valid',
          fieldName: 'state',
        })
        root.append(beforeText, pillNode)
      })

      const removeListener = createDoubleClickHandler(editor, notifyFieldRemoved)
      removeListener(rootElement, null)

      const pillElement = document.createElement('span')
      pillElement.setAttribute('data-pill', 'true')
      pillElement.setAttribute(
        'data-pill-node-key',
        editor.getEditorState().read(() => {
          const root = $getRoot()
          const children = root.getChildren()
          const pill = children.find((node) => $isPillNode(node))
          return pill?.getKey() || ''
        })
      )
      rootElement.appendChild(pillElement)

      const doubleClickEvent = new (globalThis.MouseEvent || window.MouseEvent)('dblclick', {
        bubbles: true,
        cancelable: true,
      }) as MouseEvent
      Object.defineProperty(doubleClickEvent, 'target', {
        value: pillElement,
        enumerable: true,
        configurable: true,
      })

      pillElement.dispatchEvent(doubleClickEvent)

      editor.getEditorState().read(() => {
        const root = $getRoot()
        const fullText = root.getTextContent()

        // CRITICAL: Should merge with previous text and contain full key:value
        expect(fullText).toContain('before state:TX')
        expect(fullText).not.toContain('before state:') // Should not be missing value
      })
    })
  })
})
