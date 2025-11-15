/**
 * Double-Click Handler
 *
 * Handles double-click to revert pill to plain text.
 */

import {
  $getNodeByKey,
  $isTextNode,
  TextNode,
  type LexicalEditor,
} from 'lexical'
import { $isPillNode } from '../../nodes/PillNode'

/**
 * Create double-click handler
 */
export function createDoubleClickHandler(editor: LexicalEditor) {
  function handleDoubleClick(event: MouseEvent) {
    const target = event.target as HTMLElement

    if (!target.hasAttribute('data-pill')) {
      return
    }

    const nodeKey = target.getAttribute('data-pill-node-key')

    if (!nodeKey) {
      return
    }

    editor.update(() => {
      const node = $getNodeByKey(nodeKey)

      if (!$isPillNode(node)) {
        return
      }

      // Convert pill back to plain text - completely remove pill knowledge
      // It becomes regular text that will be re-detected via normal codepath
      const text = node.getTextContent()

      // Get surrounding text nodes to merge with
      const prevSibling = node.getPreviousSibling()
      const nextSibling = node.getNextSibling()

      // Create text node from pill content
      const textNode = new TextNode(text)

      // Replace pill with text node
      node.replace(textNode)

      // Check both siblings independently - merge all three if both exist
      const hasPrevText = $isTextNode(prevSibling)
      const hasNextText = $isTextNode(nextSibling)

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
        const nextText = nextSibling.getTextContent()
        const mergedText = new TextNode(text + nextText)
        textNode.replace(mergedText)
        nextSibling.remove()
        // Position cursor at end of pill text (before next text)
        mergedText.select(text.length, text.length)
      } else {
        // No siblings - just position cursor at end
        textNode.select(text.length, text.length)
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
