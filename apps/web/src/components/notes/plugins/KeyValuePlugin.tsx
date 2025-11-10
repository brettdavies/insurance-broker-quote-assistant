/**
 * KeyValuePlugin - Lexical plugin for key-value pill transformation
 *
 * Detects key-value syntax (e.g., k:5, deps:4) in text nodes and transforms
 * them into PillNode instances with proper validation.
 *
 * Uses SINGLE transformation path (mutation listener) to follow DRY/STAR principles.
 */

import { parseKeyValueSyntax } from '@/lib/key-value-parser'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_SPACE_COMMAND,
  TextNode,
} from 'lexical'
import { useEffect, useRef } from 'react'
import { $createPillNode } from '../nodes/PillNode'
import { $isPillNode } from '../nodes/PillNode'

export function KeyValuePlugin(): null {
  const [editor] = useLexicalComposerContext()
  const previousEditingNodeRef = useRef<TextNode | null>(null)

  useEffect(() => {
    // Single transformation path: mutation listener
    // This catches all text node changes (typing, paste, programmatic updates)
    const removeMutationListener = editor.registerMutationListener(TextNode, (mutatedNodes) => {
      editor.update(() => {
        const selection = $getSelection()

        for (const [nodeKey, mutation] of mutatedNodes) {
          if (mutation === 'updated' || mutation === 'created') {
            const node = $getNodeByKey(nodeKey)
            if (!$isTextNode(node)) {
              continue
            }

            const text = node.getTextContent()
            let parsed = parseKeyValueSyntax(text)

            if (parsed.length === 0) {
              continue
            }

            // Check if user is actively editing this specific node
            const isEditing =
              $isRangeSelection(selection) &&
              selection.isCollapsed() &&
              selection.anchor.getNode() === node

            // Track which node is being edited
            if (isEditing) {
              previousEditingNodeRef.current = node
            }

            // Transform immediately if:
            // 1. Text ends with space, comma, or period (editing complete) - ALWAYS transform
            // 2. User is not actively editing this node (moved cursor away)
            // 3. Cursor is at a delimiter position (space/comma/period immediately before cursor)
            let shouldTransform = false
            let shouldSuppressDelimiter = false

            if (isEditing) {
              // Check if cursor is at a delimiter position
              const cursorOffset = $isRangeSelection(selection) ? selection.anchor.offset : 0
              const charBeforeCursor = text[cursorOffset - 1]
              const isAtDelimiter =
                charBeforeCursor === ' ' || charBeforeCursor === ',' || charBeforeCursor === '.'

              // Also check if entire text ends with delimiter
              const endsWithDelimiter =
                text.endsWith(' ') || text.endsWith(',') || text.endsWith('.')

              shouldTransform = isAtDelimiter || endsWithDelimiter

              // If cursor is right after a delimiter and that delimiter would cause transformation,
              // we should suppress it ONLY if it creates a duplicate delimiter
              if (isAtDelimiter && cursorOffset === text.length) {
                // Cursor is at the end and the last character is a delimiter
                // Check if removing this delimiter would still leave a valid key-value pattern
                const textWithoutDelimiter = text.slice(0, -1)
                const parsedWithoutDelimiter = parseKeyValueSyntax(textWithoutDelimiter)
                if (parsedWithoutDelimiter.length > 0) {
                  // Only suppress if we have duplicate delimiters
                  // (e.g., "hi k:10  " -> removing last space leaves "hi k:10 " which is fine)
                  // But if we have "hi k:10 " and press space, we get "hi k:10  " - suppress the second space
                  const charBeforeDelimiter = text.length > 1 ? text[text.length - 2] : null
                  if (charBeforeDelimiter === charBeforeCursor) {
                    // We have duplicate delimiters - suppress the last one
                    shouldSuppressDelimiter = true
                  } else {
                    // Single delimiter at end - keep it, don't suppress
                    shouldSuppressDelimiter = false
                  }
                }
              }
            } else {
              // Not editing - always transform if there are matches
              shouldTransform = true
            }

            if (!shouldTransform) {
              // Still typing - wait for delimiter or cursor movement
              continue
            }

            // If we need to suppress the delimiter, remove it from the text before transforming
            let textToTransform = text
            if (shouldSuppressDelimiter) {
              textToTransform = text.slice(0, -1)
              // Update the node text to remove the delimiter
              node.setTextContent(textToTransform)
              // Reparse with the updated text
              parsed = parseKeyValueSyntax(textToTransform)
            }

            // Transform text into pills
            transformTextToPills(node, parsed)

            // Clear tracking if this was the node being edited
            if (previousEditingNodeRef.current === node) {
              previousEditingNodeRef.current = null
            }
          }
        }
      })
    })

    // Helper function to check the previously edited node and transform if needed
    // Called when cursor moves away (click or arrow keys)
    function checkPreviouslyEditedNode() {
      const nodeToCheck = previousEditingNodeRef.current

      if (!nodeToCheck) {
        return
      }

      editor.update(() => {
        // Check if node still exists and is still a text node
        try {
          if (!nodeToCheck.isAttached()) {
            previousEditingNodeRef.current = null
            return
          }

          if (!$isTextNode(nodeToCheck)) {
            previousEditingNodeRef.current = null
            return
          }

          const selection = $getSelection()
          const isStillEditing =
            $isRangeSelection(selection) &&
            selection.isCollapsed() &&
            selection.anchor.getNode() === nodeToCheck

          // If user moved away from this node, check if it needs transformation
          if (!isStillEditing) {
            const text = nodeToCheck.getTextContent()
            const parsed = parseKeyValueSyntax(text)

            if (parsed.length > 0) {
              // Transform immediately since cursor moved away
              transformTextToPills(nodeToCheck, parsed)
            }

            previousEditingNodeRef.current = null
          }
        } catch (error) {
          // Node might have been removed
          previousEditingNodeRef.current = null
        }
      })
    }

    // Listen for cursor movement (arrow keys) to trigger transformation
    const removeArrowLeftListener = editor.registerCommand(
      KEY_ARROW_LEFT_COMMAND,
      () => {
        // Let arrow key execute first, then check for pill transformation
        setTimeout(() => {
          checkPreviouslyEditedNode()
        }, 0)
        return false // Allow default behavior
      },
      COMMAND_PRIORITY_LOW
    )

    const removeArrowRightListener = editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      () => {
        // Let arrow key execute first, then check for pill transformation
        setTimeout(() => {
          checkPreviouslyEditedNode()
        }, 0)
        return false // Allow default behavior
      },
      COMMAND_PRIORITY_LOW
    )

    // Listen for space, comma, period to trigger transformation
    const removeSpaceListener = editor.registerCommand(
      KEY_SPACE_COMMAND,
      () => {
        // Space will be inserted, mutation listener will handle transformation
        return false // Allow default behavior
      },
      COMMAND_PRIORITY_LOW
    )

    // Listen for comma and period via keyboard events
    const removeKeyDownListener = editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement) {
        prevRootElement.removeEventListener('keydown', handleKeyDown)
      }
      if (rootElement) {
        rootElement.addEventListener('keydown', handleKeyDown, true)
      }
    })

    function handleKeyDown(event: KeyboardEvent) {
      // Check for comma or period
      // Let the key be inserted first, then mutation listener will handle transformation
      // No need to do anything here - mutation listener catches it
    }

    // Listen for click events to trigger transformation when cursor moves
    const removeClickListener = editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement) {
        prevRootElement.removeEventListener('click', handleClick)
      }
      if (rootElement) {
        rootElement.addEventListener('click', handleClick, true)
      }
    })

    function handleClick() {
      // After click, check if we need to transform pills
      setTimeout(() => {
        checkPreviouslyEditedNode()
      }, 0)
    }

    return () => {
      removeMutationListener()
      removeArrowLeftListener()
      removeArrowRightListener()
      removeSpaceListener()
      removeKeyDownListener()
      removeClickListener()
    }
  }, [editor])

  return null
}

/**
 * Helper function to transform text node into pills (STAR: Single source of truth for transformation logic)
 */
function transformTextToPills(
  textNode: TextNode,
  parsed: ReturnType<typeof parseKeyValueSyntax>
): void {
  const text = textNode.getTextContent()
  const parent = textNode.getParent()
  if (!parent) {
    return
  }

  // Get current selection to preserve cursor position
  const selection = $getSelection()
  let cursorOffset = 0
  let isInThisNode = false

  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    const anchorNode = selection.anchor.getNode()
    if (anchorNode === textNode) {
      isInThisNode = true
      cursorOffset = selection.anchor.offset
    }
  }

  // Sort matches by index to process in order
  const sortedMatches = parsed
    .map((match) => ({
      ...match,
      index: text.indexOf(match.original),
    }))
    .filter((m) => m.index !== -1)
    .sort((a, b) => a.index - b.index)

  if (sortedMatches.length === 0) return

  let currentOffset = 0
  const nodesToInsert: Array<TextNode | ReturnType<typeof $createPillNode>> = []
  let targetNode: TextNode | ReturnType<typeof $createPillNode> | null = null
  let targetOffset = 0

  for (const match of sortedMatches) {
    // Add text before the match
    if (match.index > currentOffset) {
      const beforeText = text.substring(currentOffset, match.index)
      const beforeNode = new TextNode(beforeText)
      nodesToInsert.push(beforeNode)

      // Track cursor position
      if (isInThisNode && cursorOffset >= currentOffset && cursorOffset <= match.index) {
        targetNode = beforeNode
        targetOffset = cursorOffset - currentOffset
      }
    }

    // Add pill node
    const pillNode = $createPillNode({
      key: match.key,
      value: match.value,
      validation: match.validation,
      fieldName: match.fieldName,
    })
    nodesToInsert.push(pillNode)

    // Track cursor position - if cursor is in the pill text, move it to after the pill
    if (
      isInThisNode &&
      cursorOffset >= match.index &&
      cursorOffset < match.index + match.original.length
    ) {
      targetNode = pillNode
      targetOffset = 0 // Will be set to after pill
    }

    currentOffset = match.index + match.original.length
  }

  // Add remaining text after last match
  if (currentOffset < text.length) {
    const afterText = text.substring(currentOffset)
    const afterNode = new TextNode(afterText)
    nodesToInsert.push(afterNode)

    // Track cursor position
    if (isInThisNode && cursorOffset >= currentOffset) {
      targetNode = afterNode
      targetOffset = cursorOffset - currentOffset
    }
  }

  // Replace the text node with the new nodes
  for (const node of nodesToInsert) {
    textNode.insertBefore(node)
  }
  textNode.remove()

  // Restore cursor position
  if (targetNode) {
    if ($isTextNode(targetNode)) {
      const maxOffset = Math.min(targetOffset, targetNode.getTextContent().length)
      targetNode.select(maxOffset, maxOffset)
    } else {
      // Cursor was in pill - position after it
      const nextSibling = targetNode.getNextSibling()
      if (nextSibling && $isTextNode(nextSibling)) {
        nextSibling.select(0, 0)
      } else {
        // Create empty text node after pill
        const emptyTextNode = new TextNode('')
        targetNode.insertAfter(emptyTextNode)
        emptyTextNode.select(0, 0)
      }
    }
  }
}
