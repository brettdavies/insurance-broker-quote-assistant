/**
 * KeyValuePlugin - Lexical plugin for unified field extraction
 *
 * Triggers extraction ONLY on delimiter keys (space, comma, period, enter).
 * Extracts from FULL editor content in a SINGLE call to the orchestrator.
 * Uses the SAME extraction logic as backend for consistency.
 *
 * Single Responsibility: Plugin registration and delimiter-based extraction triggering
 */

import { parseKeyValueSyntax } from '@/lib/pill-parser'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getRoot,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_SPACE_COMMAND,
  TextNode,
} from 'lexical'
import { useEffect } from 'react'
import { $createPillNode, $isPillNode } from '../nodes/PillNode'

export function KeyValuePlugin(): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    /**
     * Extract fields from full editor content and create pills
     * Called ONLY on delimiter keys (space, comma, period, enter)
     */
    function extractAndCreatePills() {
      editor.update(() => {
        const root = $getRoot()
        const allTextNodes: TextNode[] = []

        // Recursively collect all text nodes (skip pill nodes to avoid extracting from already-processed text)
        function collectTextNodes(node: any) {
          // Skip pill nodes - they're already processed
          if ($isPillNode(node)) {
            return
          }

          if ($isTextNode(node)) {
            allTextNodes.push(node)
          } else {
            const children = node.getChildren ? node.getChildren() : []
            for (const child of children) {
              collectTextNodes(child)
            }
          }
        }

        root.getChildren().forEach((child) => {
          collectTextNodes(child)
        })

        // Build plain text from NON-pill text nodes only (avoids extracting from corrupted "state:IL" text)
        const fullText = allTextNodes.map((node) => node.getTextContent()).join('')

        console.log('[KeyValuePlugin] Plain text (excluding pills):', fullText)
        console.log('[KeyValuePlugin] Text nodes:', allTextNodes.length)

        // Make SINGLE call to unified orchestrator
        const parsed = parseKeyValueSyntax(fullText)

        console.log('[KeyValuePlugin] Parsed fields:', parsed.length)

        if (parsed.length === 0) {
          return
        }

        // For each parsed field, create a pill
        for (const field of parsed) {
          // Skip fields without a fieldName
          if (!field.fieldName) {
            continue
          }

          // Find the text node containing this field's original text (case-insensitive)
          for (const node of allTextNodes) {
            const nodeText = node.getTextContent()
            const originalText = field.original

            // Case-insensitive search
            const lowerNodeText = nodeText.toLowerCase()
            const lowerOriginalText = originalText.toLowerCase()

            if (lowerNodeText.includes(lowerOriginalText)) {
              // Split the node and insert pill (using case-insensitive index)
              const startIndex = lowerNodeText.indexOf(lowerOriginalText)
              const endIndex = startIndex + originalText.length

              // Split text: before | pill | after
              const beforeText = nodeText.slice(0, startIndex)
              const afterText = nodeText.slice(endIndex)

              // Create pill node
              const pillNode = $createPillNode({
                key: field.fieldName,
                value: field.value,
                validation: field.validation,
                fieldName: field.fieldName,
              })

              // Replace node with: beforeNode + pillNode + afterNode
              if (beforeText) {
                const beforeNode = new TextNode(beforeText)
                node.insertBefore(beforeNode)
              }

              node.insertBefore(pillNode)

              if (afterText) {
                const afterNode = new TextNode(afterText)
                node.insertBefore(afterNode)
              }

              // Remove original node
              node.remove()

              console.log('[KeyValuePlugin] Created pill:', field.fieldName, '=', field.value)

              // Only replace first occurrence
              break
            }
          }
        }
      })
    }

    // Register command handler for SPACE key
    const removeSpaceListener = editor.registerCommand(
      KEY_SPACE_COMMAND,
      () => {
        // Let space be inserted first, then extract
        setTimeout(() => {
          extractAndCreatePills()
        }, 0)
        return false // Allow default behavior
      },
      COMMAND_PRIORITY_LOW
    )

    // Register command handler for ENTER key
    const removeEnterListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        // Let enter be inserted first, then extract
        setTimeout(() => {
          extractAndCreatePills()
        }, 0)
        return false // Allow default behavior
      },
      COMMAND_PRIORITY_LOW
    )

    // Register keyboard event handler for COMMA and PERIOD
    const removeKeyDownListener = editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement) {
        prevRootElement.removeEventListener('keydown', handleKeyDown)
      }
      if (rootElement) {
        rootElement.addEventListener('keydown', handleKeyDown)
      }
    })

    function handleKeyDown(event: KeyboardEvent) {
      // Check for comma or period
      if (event.key === ',' || event.key === '.') {
        // Let key be inserted first, then extract
        setTimeout(() => {
          extractAndCreatePills()
        }, 0)
      }
    }

    return () => {
      removeSpaceListener()
      removeEnterListener()
      removeKeyDownListener()
    }
  }, [editor])

  return null
}
