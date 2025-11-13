/**
 * KeyValuePlugin - Lexical plugin for key-value pill transformation
 *
 * Detects key-value syntax (e.g., k:5, deps:4) in text nodes and transforms
 * them into PillNode instances with proper validation.
 *
 * Uses SINGLE transformation path (mutation listener) to follow DRY/STAR principles.
 */

import {
  type FieldCommand,
  MULTI_WORD_FIELDS,
  NUMERIC_FIELDS,
  SPECIAL_CHAR_FIELDS,
} from '@/config/shortcuts'
import { parseKeyValueSyntax } from '@/lib/pill-parser'
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
            console.log('[KeyValuePlugin] Mutation detected:', mutation, 'nodeKey:', nodeKey)
            const node = $getNodeByKey(nodeKey)
            if (!$isTextNode(node)) {
              continue
            }

            const text = node.getTextContent()
            console.log('[KeyValuePlugin] Text node content:', text)
            let parsed = parseKeyValueSyntax(text)
            console.log(
              '[KeyValuePlugin] Parsed',
              parsed.length,
              'fields from text:',
              parsed.map((p) => `${p.key}:${p.value}`)
            )

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
            // 4. Text ends with a complete field value (for normalized fields like zip)
            let shouldTransform = false
            let shouldSuppressDelimiter = false

            // Check if text ends with a complete normalized field (like "Zip 90210")
            // This handles cases where normalized fields don't have trailing delimiters
            const textEndsWithCompleteField = parsed.some((match) => {
              const matchEnd = text.lastIndexOf(match.original) + match.original.length
              return matchEnd === text.length
            })

            if (textEndsWithCompleteField) {
              // If text ends with a complete field, transform it even if still editing
              // This ensures normalized fields like "Zip 90210" get transformed
              shouldTransform = true
            }

            if (isEditing && !shouldTransform) {
              // Check if cursor is at a delimiter position
              const cursorOffset = $isRangeSelection(selection) ? selection.anchor.offset : 0
              const charBeforeCursor = text[cursorOffset - 1]

              // Parse to check what we're typing
              const parsed = parseKeyValueSyntax(text)

              // Determine if we should transform based on context
              if (parsed.length > 0) {
                const lastParsed = parsed[parsed.length - 1]
                if (!lastParsed) {
                  continue
                }

                const valueStart = text.lastIndexOf(lastParsed.original)
                const valueEndsAt = valueStart + lastParsed.original.length
                const isTypingValue = cursorOffset > valueStart && cursorOffset <= valueEndsAt

                // Check field type to determine valid delimiters
                const fieldName = lastParsed.fieldName
                const isMultiWordField = fieldName
                  ? MULTI_WORD_FIELDS.has(fieldName as FieldCommand)
                  : false
                const isEmailField = fieldName === 'email'
                const isNumericField = fieldName ? NUMERIC_FIELDS.has(fieldName) : false
                const isZipField = fieldName === 'zip'
                const valueContainsAt = lastParsed.value.includes('@')
                const valueContainsComma = lastParsed.value.includes(',')

                // Get special characters allowed for this field (for non-multi-word fields like zip)
                const allowedSpecialChars = fieldName
                  ? SPECIAL_CHAR_FIELDS[fieldName as FieldCommand] || []
                  : []
                const valueHasSpecialChars = allowedSpecialChars.some((char) =>
                  lastParsed.value.includes(char)
                )

                // Helper: Check if next chars look like a new key:value pattern
                const checkNextKeyValuePattern = (): boolean => {
                  const textAfterCursor = text.slice(cursorOffset)
                  return /^\s+\w+:/.test(textAfterCursor)
                }

                // If typing within a value:
                if (isTypingValue) {
                  // Multi-word fields: spaces are part of value, stop at comma/period/next key:value pattern
                  if (isMultiWordField) {
                    shouldTransform =
                      charBeforeCursor === ',' ||
                      charBeforeCursor === '.' ||
                      checkNextKeyValuePattern()
                  }
                  // Zip fields (not multi-word): dashes are part of value, only space/comma/period are delimiters
                  else if (isZipField && valueHasSpecialChars) {
                    shouldTransform =
                      charBeforeCursor === ' ' ||
                      charBeforeCursor === ',' ||
                      charBeforeCursor === '.'
                  }
                  // Email fields: periods are part of value, only space is delimiter
                  else if (isEmailField || valueContainsAt) {
                    shouldTransform = charBeforeCursor === ' '
                  }
                  // Numeric fields: commas are part of value (for thousands), only space is delimiter
                  else if (isNumericField && valueContainsComma) {
                    shouldTransform = charBeforeCursor === ' '
                  }
                  // Other fields: space, comma, or period can be delimiters
                  else {
                    shouldTransform =
                      charBeforeCursor === ' ' ||
                      charBeforeCursor === ',' ||
                      charBeforeCursor === '.'
                  }
                }
                // If cursor is after the value (at delimiter position):
                else if (cursorOffset > valueEndsAt) {
                  // Multi-word fields: spaces are part of value, stop at comma/period/next key:value pattern
                  if (isMultiWordField) {
                    shouldTransform =
                      charBeforeCursor === ',' ||
                      charBeforeCursor === '.' ||
                      checkNextKeyValuePattern()
                  }
                  // Zip fields (not multi-word): dashes are part of value
                  else if (isZipField && valueHasSpecialChars) {
                    shouldTransform =
                      charBeforeCursor === ' ' ||
                      charBeforeCursor === ',' ||
                      charBeforeCursor === '.'
                  }
                  // Email fields: only space is delimiter
                  else if (isEmailField || valueContainsAt) {
                    shouldTransform = charBeforeCursor === ' '
                  }
                  // Numeric fields with comma: only space is delimiter
                  else if (isNumericField && valueContainsComma) {
                    shouldTransform = charBeforeCursor === ' '
                  }
                  // Other fields: space, comma, or period are delimiters
                  else {
                    shouldTransform =
                      charBeforeCursor === ' ' ||
                      charBeforeCursor === ',' ||
                      charBeforeCursor === '.'
                  }
                }
                // Cursor before value - don't transform
                else {
                  shouldTransform = false
                }
              } else {
                // No parsed values yet - use standard delimiters
                const isAtDelimiter =
                  charBeforeCursor === ' ' || charBeforeCursor === ',' || charBeforeCursor === '.'
                const endsWithDelimiter =
                  text.endsWith(' ') || text.endsWith(',') || text.endsWith('.')
                shouldTransform = isAtDelimiter || endsWithDelimiter
              }

              // If cursor is right after a delimiter and that delimiter would cause transformation,
              // we should suppress it ONLY if it creates a duplicate delimiter
              if (shouldTransform && cursorOffset === text.length && charBeforeCursor === ' ') {
                // Cursor is at the end and the last character is a space delimiter
                // Check if removing this delimiter would still leave a valid key-value pattern
                const textWithoutDelimiter = text.slice(0, -1)
                const parsedWithoutDelimiter = parseKeyValueSyntax(textWithoutDelimiter)
                if (parsedWithoutDelimiter.length > 0) {
                  // Only suppress if we have duplicate spaces
                  // (e.g., "hi k:10  " -> removing last space leaves "hi k:10 " which is fine)
                  // But if we have "hi k:10 " and press space, we get "hi k:10  " - suppress the second space
                  const charBeforeDelimiter = text.length > 1 ? text[text.length - 2] : null
                  if (charBeforeDelimiter === ' ') {
                    // We have duplicate spaces - suppress the last one
                    shouldSuppressDelimiter = true
                  } else {
                    // Single space at end - keep it, don't suppress
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

            // Capture parent reference before transformation (while node is still attached)
            const parentBeforeTransform = node.getParent()

            // Transform text into pills
            transformTextToPills(node, parsed)

            // Check for inferred householdSize that wasn't transformed into a pill
            // (because its "original" text doesn't exist in the editor)
            const inferredField = parsed.find(
              (p) => p.key === 'householdSize' && p.original.includes('(inferred from')
            )

            if (inferredField) {
              console.log('[KeyValuePlugin] Found inferred householdSize:', inferredField)
              // Get all existing pills to check if householdSize pill already exists
              const root = $getRoot()
              const allNodes = root.getAllTextNodes()
              let hasHouseholdSizePill = false

              for (const textNode of allNodes) {
                const parent = textNode.getParent()
                if ($isPillNode(parent) && parent.getFieldName() === 'householdSize') {
                  hasHouseholdSizePill = true
                  break
                }
              }

              if (!hasHouseholdSizePill) {
                console.log('[KeyValuePlugin] Creating householdSize pill directly')
                // Create pill directly (don't inject text - it won't be found for transformation)
                const pillNode = $createPillNode({
                  key: 'householdSize',
                  value: String(inferredField.value),
                  validation: 'valid',
                  fieldName: 'householdSize',
                })

                // Use captured parent reference (not detached node's parent)
                if (parentBeforeTransform) {
                  parentBeforeTransform.append(new TextNode(' ')) // Space before pill
                  parentBeforeTransform.append(pillNode)
                  console.log('[KeyValuePlugin] householdSize pill created successfully')
                } else {
                  // Fallback: append to root if parent was null
                  const root = $getRoot()
                  root.append(new TextNode(' '))
                  root.append(pillNode)
                  console.log('[KeyValuePlugin] householdSize pill created via root fallback')
                }
              } else {
                console.log('[KeyValuePlugin] Skipping householdSize pill (already exists)')
              }
            }

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

    // Track cursor position - if cursor is in or at the end of the pill text, move it to after the pill
    // CRITICAL: Must use <= (not <) to catch cursor at exact end boundary
    // This prevents cursor from being swallowed by the pill
    // See: apps/web/src/components/notes/plugins/__tests__/KeyValuePlugin.cursor.test.ts
    if (
      isInThisNode &&
      cursorOffset >= match.index &&
      cursorOffset <= match.index + match.original.length
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
      // Cursor was in or at end of pill - position after it
      const nextSibling = targetNode.getNextSibling()
      if (nextSibling && $isTextNode(nextSibling)) {
        // Position cursor at start of next text node (after the pill)
        nextSibling.select(0, 0)
      } else {
        // Create empty text node after pill for cursor
        const emptyTextNode = new TextNode('')
        targetNode.insertAfter(emptyTextNode)
        emptyTextNode.select(0, 0)
      }
    }
  } else if (isInThisNode) {
    // Cursor position wasn't tracked - try to position at end of last node
    const lastNode = nodesToInsert[nodesToInsert.length - 1]
    if (lastNode) {
      if ($isTextNode(lastNode)) {
        const textLength = lastNode.getTextContent().length
        lastNode.select(textLength, textLength)
      } else {
        // Last node is a pill - create empty text node after it
        const emptyTextNode = new TextNode('')
        lastNode.insertAfter(emptyTextNode)
        emptyTextNode.select(0, 0)
      }
    }
  }
}
