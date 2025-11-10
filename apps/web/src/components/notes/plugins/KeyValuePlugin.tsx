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
import { $getNodeByKey, $getSelection, $isRangeSelection, $isTextNode, TextNode } from 'lexical'
import { useEffect } from 'react'
import { $createPillNode } from '../nodes/PillNode'

export function KeyValuePlugin(): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Single transformation path: mutation listener
    // This catches all text node changes (typing, paste, programmatic updates)
    const removeMutationListener = editor.registerMutationListener(TextNode, (mutatedNodes) => {
      editor.update(() => {
        const selection = $getSelection()

        for (const [nodeKey, mutation] of mutatedNodes) {
          if (mutation === 'updated' || mutation === 'created') {
            const node = $getNodeByKey(nodeKey)
            if (!$isTextNode(node)) continue

            const text = node.getTextContent()
            const parsed = parseKeyValueSyntax(text)

            if (parsed.length === 0) continue

            // Check if user is actively editing this specific node
            const isEditing =
              $isRangeSelection(selection) &&
              selection.isCollapsed() &&
              selection.anchor.getNode() === node

            // Only skip transformation if:
            // 1. User is actively editing this node AND
            // 2. Text doesn't end with space (still typing)
            //
            // This applies to BOTH initial typing AND editing converted pills.
            // No special cases needed - same logic for all text editing.
            if (isEditing && !text.endsWith(' ')) {
              continue
            }

            // Transform text into pills
            transformTextToPills(node, parsed)
          }
        }
      })
    })

    return () => {
      removeMutationListener()
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
  if (!parent) return

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

  for (const match of sortedMatches) {
    // Add text before the match
    if (match.index > currentOffset) {
      const beforeText = text.substring(currentOffset, match.index)
      nodesToInsert.push(new TextNode(beforeText))
    }

    // Add pill node
    const pillNode = $createPillNode({
      key: match.key,
      value: match.value,
      validation: match.validation,
      fieldName: match.fieldName,
    })
    nodesToInsert.push(pillNode)

    currentOffset = match.index + match.original.length
  }

  // Add remaining text after last match
  if (currentOffset < text.length) {
    const afterText = text.substring(currentOffset)
    nodesToInsert.push(new TextNode(afterText))
  }

  // Replace the text node with the new nodes
  for (const node of nodesToInsert) {
    textNode.insertBefore(node)
  }
  textNode.remove()
}
