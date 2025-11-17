/**
 * usePillTransformation Hook
 *
 * Transforms text nodes into pill nodes in the Lexical editor.
 * Handles cursor position preservation and pill deduplication.
 * Single Responsibility: Pill transformation logic only
 */

import { $createPillNode, $isPillNode } from '@/components/notes/nodes/PillNode'
import { normalizeFieldName, unifiedFieldMetadata } from '@repo/shared'
import type { ParsedKeyValue } from '@repo/shared'
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  type LexicalNode,
  TextNode,
} from 'lexical'

/**
 * Transform text node into pills
 *
 * @param textNode - TextNode to transform
 * @param parsed - Parsed key-value pairs from text
 */
export function transformTextToPills(textNode: TextNode, parsed: ParsedKeyValue[]): void {
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

  // Get all existing pills in the editor to check for duplicates (for single-instance fields)
  const root = $getRoot()
  const existingPills = new Map<string, ReturnType<typeof $createPillNode>>()

  // Traverse the editor tree to find all PillNodes
  const traverseNodes = (node: LexicalNode) => {
    if ($isPillNode(node)) {
      const fieldName = node.getFieldName()
      if (fieldName) {
        // Normalize field name for comparison
        const normalizedFieldName = normalizeFieldName(fieldName)
        const metadata = unifiedFieldMetadata[normalizedFieldName]
        // Only track single-instance fields for deduplication
        if (metadata?.singleInstance) {
          existingPills.set(normalizedFieldName, node)
        }
      }
    }

    // Traverse children if this is an ElementNode
    if ('getChildren' in node && typeof node.getChildren === 'function') {
      const children = node.getChildren()
      for (const child of children) {
        traverseNodes(child)
      }
    }
  }

  // Start traversal from root
  const rootChildren = root.getChildren()
  for (const child of rootChildren) {
    traverseNodes(child)
  }

  let currentOffset = 0
  const nodesToInsert: Array<TextNode | ReturnType<typeof $createPillNode>> = []
  let targetNode: TextNode | ReturnType<typeof $createPillNode> | null = null
  let targetOffset = 0
  // Track pills being created in this batch to prevent duplicates within the same transformation
  const pillsInBatch = new Set<string>()

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

    // Normalize field name to ensure consistency (even though it should already be normalized from parsing)
    const normalizedFieldName = match.fieldName ? normalizeFieldName(match.fieldName) : null
    const metadata = normalizedFieldName ? unifiedFieldMetadata[normalizedFieldName] : null

    // Check if this is a single-instance field and if we've already processed it in this batch
    if (normalizedFieldName && metadata?.singleInstance && pillsInBatch.has(normalizedFieldName)) {
      // Skip duplicate within the same batch - just update the offset and continue
      currentOffset = match.index + match.original.length
      continue
    }

    const existingPill =
      normalizedFieldName && metadata?.singleInstance
        ? existingPills.get(normalizedFieldName)
        : null

    let pillNode: ReturnType<typeof $createPillNode>
    if (existingPill) {
      // Update existing pill instead of creating a new one
      // Remove the existing pill from the editor (it will be replaced)
      existingPill.remove()
      // Create updated pill node with normalized field name
      pillNode = $createPillNode({
        key: normalizedFieldName || match.key, // Use normalized field name as key
        value: match.value,
        validation: match.validation,
        fieldName: normalizedFieldName || match.fieldName, // Use normalized field name
      })
      nodesToInsert.push(pillNode)
      // Track this pill in the batch
      if (normalizedFieldName && metadata?.singleInstance) {
        pillsInBatch.add(normalizedFieldName)
      }
    } else {
      // No existing pill, create new one with normalized field name
      pillNode = $createPillNode({
        key: normalizedFieldName || match.key, // Use normalized field name as key
        value: match.value,
        validation: match.validation,
        fieldName: normalizedFieldName || match.fieldName, // Use normalized field name
      })
      nodesToInsert.push(pillNode)
      // Track this pill in the batch
      if (normalizedFieldName && metadata?.singleInstance) {
        pillsInBatch.add(normalizedFieldName)
      }
    }

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
