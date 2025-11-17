/**
 * Data Attribute Plugin
 *
 * Adds data attributes to the contentEditable element for testing and styling.
 * Single Responsibility: DOM attribute management only
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

/**
 * Adds data attributes to contentEditable element
 */
function addAttributes(rootElement: Element): boolean {
  const contentEditable = rootElement.querySelector('[contenteditable="true"]')
  if (contentEditable) {
    contentEditable.setAttribute('data-notes-input', 'true')
    contentEditable.setAttribute('data-lexical-editor', 'true')
    contentEditable.setAttribute('role', 'textbox')
    return true
  }
  return false
}

export function DataAttributePlugin(): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Wait for editor to be ready and DOM to be available
    // Try immediately
    const rootElement = editor.getRootElement()
    if (rootElement && addAttributes(rootElement)) {
      return
    }

    // If not ready, try after a short delay (DOM might not be ready yet)
    const timeoutId = setTimeout(() => {
      const root = editor.getRootElement()
      if (root) {
        addAttributes(root)
      }
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [editor])

  return null
}
