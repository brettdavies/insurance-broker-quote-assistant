/**
 * Double-Click Handler
 *
 * Handles double-click to revert pill to plain text.
 */

import { $getNodeByKey, $isTextNode, type LexicalEditor, TextNode } from 'lexical'
import { $isPillNode, type PillNode } from '../../nodes/PillNode'

/**
 * Create double-click handler
 */
export function createDoubleClickHandler(
  editor: LexicalEditor,
  notifyFieldRemoved?: (node: PillNode) => void
) {
  function handleDoubleClick(event: MouseEvent) {
    const target = event.target as HTMLElement

    if (!target.hasAttribute('data-pill')) {
      return
    }

    const nodeKey = target.getAttribute('data-pill-node-key')

    if (!nodeKey) {
      return
    }

    // Prevent default double-click behavior (text selection)
    event.preventDefault()
    event.stopPropagation()

    editor.update(() => {
      const node = $getNodeByKey(nodeKey)

      if (!$isPillNode(node)) {
        return
      }

      // Capture all info before replacement (node will be replaced and invalidated)
      const fieldName = node.getFieldName()
      const validation = node.getValidation()
      // Use getTextContent() which returns key:value format
      // This ensures we get the full key:value string (e.g., "state:TX")
      const text = node.getTextContent()

      // Verify text is not empty
      if (!text || text.trim().length === 0) {
        return
      }

      // Get surrounding text nodes to merge with (before replacement)
      const prevSibling = node.getPreviousSibling()
      const nextSibling = node.getNextSibling()

      // Check both siblings independently - merge all three if both exist
      const hasPrevText = $isTextNode(prevSibling)
      const hasNextText = $isTextNode(nextSibling)

      // Create text node from pill content (key:value format)
      const textNode = new TextNode(text)

      // Replace pill with text node first
      node.replace(textNode)

      // Now handle merging with siblings (textNode is now in the tree)
      if (hasPrevText && hasNextText) {
        // Both siblings are text nodes - merge all three
        const prevText = prevSibling.getTextContent()
        const nextText = nextSibling.getTextContent()
        const mergedText = new TextNode(prevText + text + nextText)
        prevSibling.replace(mergedText)
        textNode.remove()
        nextSibling.remove()
        // Position cursor at end of pill text (before next text)
        mergedText.select(prevText.length + text.length, prevText.length + text.length)
      } else if (hasPrevText) {
        // Only previous sibling exists - merge with it
        const prevText = prevSibling.getTextContent()
        const mergedText = new TextNode(prevText + text)
        prevSibling.replace(mergedText)
        textNode.remove()
        // Position cursor at end of merged text (after pill text)
        mergedText.select(prevText.length + text.length, prevText.length + text.length)
      } else if (hasNextText) {
        // Only next sibling exists - merge with it
        // After replacement, textNode is where the pill was, so we can replace it with merged text
        const nextText = nextSibling.getTextContent()
        const mergedText = new TextNode(text + nextText)
        textNode.replace(mergedText)
        nextSibling.remove()
        // Position cursor at end of pill text (before next text)
        mergedText.select(text.length, text.length)
      } else {
        // No siblings - textNode is already in place, just position cursor at end
        textNode.select(text.length, text.length)
      }

      // Notify that the pill is being removed (reverted to text)
      // This ensures the field is removed from the profile
      // Do this after replacement to avoid accessing replaced node
      if (notifyFieldRemoved && fieldName && validation === 'valid') {
        // Create a temporary node-like object for notification
        // We can't use the original node after replace, so we capture the info first
        // Notify outside of editor.update() to avoid nested updates
        setTimeout(() => {
          const tempNode = {
            getFieldName: () => fieldName,
            getValidation: () => validation,
          } as PillNode
          notifyFieldRemoved(tempNode)
        }, 0)
      }
    })
  }

  return (rootElement: HTMLElement | null, prevRootElement: HTMLElement | null) => {
    if (prevRootElement) {
      prevRootElement.removeEventListener('dblclick', handleDoubleClick)
    }
    if (rootElement) {
      rootElement.addEventListener('dblclick', handleDoubleClick)
    }
  }
}
