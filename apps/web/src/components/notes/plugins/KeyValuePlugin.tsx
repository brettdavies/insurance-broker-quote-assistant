/**
 * KeyValuePlugin - Lexical plugin for key-value pill transformation
 *
 * Detects key-value syntax (e.g., k:5, deps:4) in text nodes and transforms
 * them into PillNode instances with proper validation.
 *
 * Uses SINGLE transformation path (mutation listener) to follow DRY/STAR principles.
 * Single Responsibility: Plugin registration and event handling only
 */

import { checkDelimiterForTransformation } from '@/hooks/useDelimiterDetection'
import { transformTextToPills } from '@/hooks/usePillTransformation'
import { parseKeyValueSyntax } from '@/lib/pill-parser'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getNodeByKey,
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

            // Use delimiter detection utility
            const { shouldTransform, shouldSuppressDelimiter } = checkDelimiterForTransformation(
              text,
              node,
              isEditing
            )

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
              // Adjust cursor position if it was at the end (now out of bounds)
              const selection = $getSelection()
              if ($isRangeSelection(selection) && selection.isCollapsed()) {
                const anchorNode = selection.anchor.getNode()
                if (anchorNode === node) {
                  const newOffset = Math.min(selection.anchor.offset, textToTransform.length)
                  if (newOffset !== selection.anchor.offset) {
                    node.select(newOffset, newOffset)
                  }
                }
              }
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
