/**
 * PillInteractionPlugin - Handles pill interactions (delete, double-click, navigation)
 *
 * Implements:
 * - Backspace/Delete: Removes entire pill atomically
 * - Double-click: Reverts pill to plain text for editing
 * - Arrow keys: Navigate around pills (skip over them, don't enter)
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createRangeSelection,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  type RangeSelection,
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

    // Handle arrow left to navigate around pills
    const removeArrowLeftListener = editor.registerCommand(
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

    // Handle arrow right to navigate around pills
    const removeArrowRightListener = editor.registerCommand(
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

    return () => {
      removeBackspaceListener()
      removeDeleteListener()
      removeArrowLeftListener()
      removeArrowRightListener()
      removeClickListener()
    }
  }, [editor])

  return null
}
