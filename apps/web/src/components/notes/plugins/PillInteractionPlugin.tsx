/**
 * PillInteractionPlugin - Handles pill interactions (delete, double-click)
 *
 * Implements:
 * - Backspace/Delete: Removes entire pill atomically
 * - Double-click: Reverts pill to plain text for editing
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  TextNode,
} from 'lexical'
import { useEffect } from 'react'
import { $isPillNode } from '../nodes/PillNode'

export function PillInteractionPlugin(): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Handle backspace/delete to remove pills atomically
    const removeBackspaceListener = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return false

        const nodes = selection.getNodes()
        for (const node of nodes) {
          if ($isPillNode(node)) {
            node.remove()
            event?.preventDefault()
            return true
          }

          // Check if cursor is right after a pill
          const prevSibling = node.getPreviousSibling()
          if ($isPillNode(prevSibling) && selection.isCollapsed() && selection.anchor.offset === 0) {
            prevSibling.remove()
            event?.preventDefault()
            return true
          }
        }

        return false
      },
      COMMAND_PRIORITY_LOW
    )

    const removeDeleteListener = editor.registerCommand(
      KEY_DELETE_COMMAND,
      (event) => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return false

        const nodes = selection.getNodes()
        for (const node of nodes) {
          if ($isPillNode(node)) {
            node.remove()
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
            nextSibling.remove()
            event?.preventDefault()
            return true
          }
        }

        return false
      },
      COMMAND_PRIORITY_LOW
    )

    // Handle double-click to revert pill to plain text
    const removeClickListener = editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement) {
        prevRootElement.removeEventListener('dblclick', handleDoubleClick)
      }
      if (rootElement) {
        rootElement.addEventListener('dblclick', handleDoubleClick)
      }
    })

    function handleDoubleClick(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.hasAttribute('data-pill')) return

      const nodeKey = target.getAttribute('data-lexical-node-key')
      if (!nodeKey) return

      editor.update(() => {
        const node = $getNodeByKey(nodeKey)
        if (!$isPillNode(node)) return

        // Convert pill back to text
        const text = node.getTextContent()
        const textNode = new TextNode(text)
        node.replace(textNode)

        // Move cursor to end of text
        textNode.select()
      })
    }

    return () => {
      removeBackspaceListener()
      removeDeleteListener()
      removeClickListener()
    }
  }, [editor])

  return null
}
