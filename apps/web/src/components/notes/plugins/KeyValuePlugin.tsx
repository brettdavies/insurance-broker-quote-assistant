/**
 * KeyValuePlugin - Lexical plugin for key-value pill transformation
 *
 * Detects key-value syntax (e.g., k:5, deps:4) in text nodes and transforms
 * them into PillNode instances with proper validation.
 */

import { parseKeyValueSyntax } from '@/lib/key-value-parser'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, $getSelection, $isRangeSelection, $isTextNode, TextNode } from 'lexical'
import { useEffect } from 'react'
import { $createPillNode, $isPillNode } from '../nodes/PillNode'

export function KeyValuePlugin(): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    // Register a text content listener to detect key-value patterns
    const removeUpdateListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        const anchorNode = selection.anchor.getNode()
        if (!$isTextNode(anchorNode)) return

        // Get the text content
        const text = anchorNode.getTextContent()
        if (!text) return

        // Parse key-value syntax
        const parsed = parseKeyValueSyntax(text)
        if (parsed.length === 0) return

        // Transform matches into pills
        editor.update(() => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection)) return

          const anchorNode = selection.anchor.getNode()
          if (!$isTextNode(anchorNode)) return

          const text = anchorNode.getTextContent()
          const parsed = parseKeyValueSyntax(text)

          if (parsed.length === 0) return

          // Process each match and replace with pill
          let offset = 0
          const parent = anchorNode.getParent()
          if (!parent) return

          for (const match of parsed) {
            const matchIndex = text.indexOf(match.original, offset)
            if (matchIndex === -1) continue

            // Split text node at match boundaries
            const beforeText = text.substring(offset, matchIndex)
            const afterText = text.substring(matchIndex + match.original.length)

            // Create pill node
            const pillNode = $createPillNode({
              key: match.key,
              value: match.value,
              validation: match.validation,
              fieldName: match.fieldName,
            })

            // Replace the text node with: beforeText + pill + (new text node for afterText)
            if (offset === 0 && matchIndex === 0) {
              // Pill is at the start
              anchorNode.setTextContent(afterText)
              anchorNode.insertBefore(pillNode)
            } else if (beforeText) {
              // Pill is in the middle or end
              const beforeNode = new TextNode(beforeText)
              anchorNode.insertBefore(beforeNode)
              anchorNode.insertBefore(pillNode)
              anchorNode.setTextContent(afterText)
            } else {
              // Pill immediately follows previous content
              anchorNode.insertBefore(pillNode)
              anchorNode.setTextContent(afterText)
            }

            // Add a space after the pill for better UX
            if (afterText && !afterText.startsWith(' ')) {
              const spaceNode = new TextNode(' ')
              pillNode.insertAfter(spaceNode)
            }

            offset = matchIndex + match.original.length
          }
        })
      })
    })

    // Register a mutation listener to detect when text changes
    const removeMutationListener = editor.registerMutationListener(TextNode, (mutatedNodes) => {
      editor.update(() => {
        for (const [nodeKey, mutation] of mutatedNodes) {
          if (mutation === 'updated' || mutation === 'created') {
            const node = $getNodeByKey(nodeKey)
            if (!$isTextNode(node)) continue

            const text = node.getTextContent()
            const parsed = parseKeyValueSyntax(text)

            if (parsed.length === 0) continue

            // Transform text into pills
            transformTextToPills(node, parsed)
          }
        }
      })
    })

    return () => {
      removeUpdateListener()
      removeMutationListener()
    }
  }, [editor])

  return null
}

/**
 * Helper function to transform text node into pills
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
