/**
 * Arrow Handler
 *
 * Handles arrow key navigation around pills.
 */

import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  type LexicalEditor,
  TextNode,
} from 'lexical'
import { $isPillNode } from '../../nodes/PillNode'

/**
 * Create arrow left handler
 */
export function createArrowLeftHandler(editor: LexicalEditor) {
  return editor.registerCommand(
    KEY_ARROW_LEFT_COMMAND,
    (event) => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false

      const anchor = selection.anchor
      const node = anchor.getNode()

      // If we're at the start of a text node and the previous sibling is a pill
      if ($isTextNode(node) && anchor.offset === 0) {
        const prevSibling = node.getPreviousSibling()
        if ($isPillNode(prevSibling)) {
          // Skip over the pill to the node before it
          const prevPrevSibling = prevSibling.getPreviousSibling()
          if (prevPrevSibling) {
            if ($isTextNode(prevPrevSibling)) {
              const textLength = prevPrevSibling.getTextContent().length
              prevPrevSibling.select(textLength, textLength)
            } else {
              prevPrevSibling.selectEnd()
            }
            event?.preventDefault()
            return true
          }
        }
      }

      // If the current node is a pill, move to the previous node
      if ($isPillNode(node)) {
        const prevSibling = node.getPreviousSibling()
        if (prevSibling) {
          if ($isTextNode(prevSibling)) {
            const textLength = prevSibling.getTextContent().length
            prevSibling.select(textLength, textLength)
          } else {
            prevSibling.selectEnd()
          }
          event?.preventDefault()
          return true
        }
      }

      return false
    },
    COMMAND_PRIORITY_LOW
  )
}

/**
 * Create arrow right handler
 */
export function createArrowRightHandler(editor: LexicalEditor) {
  return editor.registerCommand(
    KEY_ARROW_RIGHT_COMMAND,
    (event) => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false

      const anchor = selection.anchor
      const node = anchor.getNode()

      // If we're at the end of a text node and the next sibling is a pill
      if ($isTextNode(node)) {
        const textLength = node.getTextContent().length
        if (anchor.offset === textLength) {
          const nextSibling = node.getNextSibling()
          if ($isPillNode(nextSibling)) {
            // Skip over the pill to the node after it
            const nextNextSibling = nextSibling.getNextSibling()
            if (nextNextSibling) {
              if ($isTextNode(nextNextSibling)) {
                nextNextSibling.select(0, 0)
              } else {
                nextNextSibling.selectStart()
              }
              event?.preventDefault()
              return true
            }
            // Pill is at the end - create empty text node after it and position cursor there
            const emptyTextNode = new TextNode('')
            nextSibling.insertAfter(emptyTextNode)
            emptyTextNode.select(0, 0)
            event?.preventDefault()
            return true
          }
        }
      }

      // If the current node is a pill, move to the next node
      if ($isPillNode(node)) {
        const nextSibling = node.getNextSibling()
        if (nextSibling) {
          if ($isTextNode(nextSibling)) {
            nextSibling.select(0, 0)
          } else {
            nextSibling.selectStart()
          }
          event?.preventDefault()
          return true
        }
        // Pill is at the end - create empty text node after it and position cursor there
        const emptyTextNode = new TextNode('')
        node.insertAfter(emptyTextNode)
        emptyTextNode.select(0, 0)
        event?.preventDefault()
        return true
      }

      return false
    },
    COMMAND_PRIORITY_LOW
  )
}
