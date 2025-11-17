/**
 * KeyValuePlugin - Lexical plugin for unified field extraction
 *
 * Triggers extraction ONLY on delimiter keys (space, comma, period, enter).
 * Extracts from FULL editor content in a SINGLE call to the centralized engine.
 * Uses the SAME extraction logic as backend for consistency.
 *
 * Single Responsibility: Plugin registration and delimiter-based extraction triggering
 */

import { parseKeyValueSyntax } from '@/lib/pill-parser'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import type { UserProfile } from '@repo/shared'
import { normalizeFieldName, normalizeFieldValue, unifiedFieldMetadata } from '@repo/shared'
import {
  $getRoot,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_SPACE_COMMAND,
  TextNode,
} from 'lexical'
import { useEffect } from 'react'
import { $createPillNode, $isPillNode, type PillNode } from '../nodes/PillNode'

interface KeyValuePluginProps {
  /** Callback to receive extracted UserProfile for state updates */
  onFieldsExtracted?: (userProfile: UserProfile) => void
  /** Current suppressed fields (from userProfile._suppressed) */
  suppressedFields?: string[]
}

export function KeyValuePlugin({ onFieldsExtracted, suppressedFields }: KeyValuePluginProps): null {
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
        const allPillNodes: PillNode[] = []

        // Recursively collect all text nodes and pill nodes
        // biome-ignore lint/suspicious/noExplicitAny: Lexical nodes can be various types
        function collectNodes(node: any) {
          if ($isPillNode(node)) {
            // Collect pill nodes to include their fields in inference
            allPillNodes.push(node)
            return
          }

          if ($isTextNode(node)) {
            allTextNodes.push(node)
          } else {
            const children = node.getChildren ? node.getChildren() : []
            for (const child of children) {
              collectNodes(child)
            }
          }
        }

        for (const child of root.getChildren()) {
          collectNodes(child)
        }

        // Build plain text from NON-pill text nodes only (avoids extracting from already-processed text)
        const fullText = allTextNodes.map((node) => node.getTextContent()).join('')

        // Extract fields from pill nodes to include in known fields for inference
        // Pill nodes already have normalized field names, but we normalize again to be safe
        const pillFields: Array<{ fieldName: string; value: unknown }> = []
        for (const pillNode of allPillNodes) {
          const rawFieldName = pillNode.getFieldName() || pillNode.getFieldKey()
          // Normalize field name (handles shortcuts, aliases, etc.)
          const fieldName = normalizeFieldName(rawFieldName)
          const rawValue = pillNode.getValue()

          // Normalize value using the same logic as extraction engine
          let finalValue: unknown = rawValue
          if (typeof rawValue === 'string') {
            const normalized = normalizeFieldValue(fieldName, rawValue)
            if (normalized !== null) {
              finalValue = normalized
              // CRITICAL: For numeric fields, convert string to number
              // normalizeFieldValue returns strings, but inference rules expect numbers for numeric fields
              const metadata = unifiedFieldMetadata[fieldName]
              if (metadata?.fieldType === 'numeric' && typeof normalized === 'string') {
                const numValue = Number.parseInt(normalized, 10)
                if (!Number.isNaN(numValue)) {
                  finalValue = numValue
                }
              } else if (metadata?.fieldType === 'boolean' && typeof normalized === 'string') {
                // Convert boolean strings to actual booleans
                const lower = normalized.toLowerCase()
                if (lower === 'true' || lower === 'yes' || lower === '1') {
                  finalValue = true
                } else if (lower === 'false' || lower === 'no' || lower === '0') {
                  finalValue = false
                }
              }
            } else {
              // If normalization fails, try basic type conversion
              const numValue = Number(rawValue)
              const boolValue =
                rawValue.toLowerCase() === 'true' || rawValue.toLowerCase() === 'false'
              finalValue = boolValue
                ? rawValue.toLowerCase() === 'true'
                : !Number.isNaN(numValue) && rawValue.trim() !== ''
                  ? numValue
                  : rawValue
            }
          }

          pillFields.push({ fieldName, value: finalValue })
        }

        console.log('[KeyValuePlugin] Plain text (excluding pills):', fullText)
        console.log('[KeyValuePlugin] Text nodes:', allTextNodes.length)
        console.log('[KeyValuePlugin] Pill nodes:', allPillNodes.length)
        console.log(
          '[KeyValuePlugin] Pill fields:',
          pillFields.map((f) => `${f.fieldName}:${f.value}`).join(', ')
        )

        // Make SINGLE call to centralized extraction engine
        // Pass suppressedFields so extraction engine can remove them
        // Pass pillFields so they can be included in known fields for inference
        const { pills, userProfile } = parseKeyValueSyntax(fullText, suppressedFields, pillFields)

        console.log('[KeyValuePlugin] Extracted pills:', pills.length)
        console.log('[KeyValuePlugin] UserProfile:', userProfile)

        // Emit userProfile to parent component for state updates
        // userProfile contains known fields in main object, inferred in _inferred object
        if (onFieldsExtracted) {
          onFieldsExtracted(userProfile)
        }

        // processedText is the single source of truth - it contains deduplicated pills from text
        // Existing pills that should be kept are already in the editor and don't need to be recreated
        // We only need to:
        // 1. Remove existing pills that are being replaced (same field name as a new pill)
        // 2. Create pills from processedText for fields extracted from text

        // Step 1: Remove existing pills that are being replaced by new fields
        // If a new pill has the same normalized field name as an existing pill, remove the old one
        const newFieldNames = new Set(pills.map((p) => p.fieldName).filter(Boolean))
        for (const pillNode of allPillNodes) {
          const pillFieldName = pillNode.getFieldName() || pillNode.getFieldKey()
          const normalizedPillFieldName = normalizeFieldName(pillFieldName)

          // If this pill's field name matches a new field, remove the old pill
          if (normalizedPillFieldName && newFieldNames.has(normalizedPillFieldName)) {
            console.log(
              '[KeyValuePlugin] Removing old pill (replaced):',
              normalizedPillFieldName,
              '=',
              pillNode.getValue()
            )
            pillNode.remove()
          }
        }

        if (pills.length === 0) {
          return
        }

        // Step 2: For each pill in processedText, find its location and create it
        // processedText already has deduplication applied, so we just need to create pills
        for (const field of pills) {
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
  }, [editor, onFieldsExtracted, suppressedFields])

  return null
}
