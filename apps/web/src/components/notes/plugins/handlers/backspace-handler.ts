/**
 * Backspace Handler
 *
 * Handles backspace key to remove pills atomically.
 */

import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  type LexicalEditor,
} from 'lexical'
import { $isPillNode, type PillNode } from '../../nodes/PillNode'

/**
 * Create backspace handler
 */
export function createBackspaceHandler(
  editor: LexicalEditor,
  removePillAndNotify: (node: PillNode) => void
) {
  return editor.registerCommand(
    KEY_BACKSPACE_COMMAND,
    (event) => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return false

      const nodes = selection.getNodes()
      for (const node of nodes) {
        if ($isPillNode(node)) {
          removePillAndNotify(node)
          event?.preventDefault()
          return true
        }

        // Check if cursor is right after a pill
        const prevSibling = node.getPreviousSibling()
        if ($isPillNode(prevSibling) && selection.isCollapsed() && selection.anchor.offset === 0) {
          removePillAndNotify(prevSibling)
          event?.preventDefault()
          return true
        }
      }

      return false
    },
    COMMAND_PRIORITY_LOW
  )
}
