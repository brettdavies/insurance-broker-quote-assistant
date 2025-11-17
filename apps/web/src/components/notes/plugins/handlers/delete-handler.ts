/**
 * Delete Handler
 *
 * Handles delete key to remove pills atomically.
 */

import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_DELETE_COMMAND,
  type LexicalEditor,
} from 'lexical'
import { $isPillNode, type PillNode } from '../../nodes/PillNode'

/**
 * Create delete handler
 */
export function createDeleteHandler(
  editor: LexicalEditor,
  removePillAndNotify: (node: PillNode) => void
) {
  return editor.registerCommand(
    KEY_DELETE_COMMAND,
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

        // Check if cursor is right before a pill
        const nextSibling = node.getNextSibling()
        const text = node.getTextContent()
        if (
          $isPillNode(nextSibling) &&
          selection.isCollapsed() &&
          selection.anchor.offset === text.length
        ) {
          removePillAndNotify(nextSibling)
          event?.preventDefault()
          return true
        }
      }

      return false
    },
    COMMAND_PRIORITY_LOW
  )
}
