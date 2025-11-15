/**
 * usePillInjection Hook
 *
 * Provides functionality to inject pill nodes into the Lexical editor at the end of the document.
 * Used when converting inferred fields to known fields via [Save Known] button.
 *
 * @example
 * ```tsx
 * const [editor] = useLexicalComposerContext()
 * const { injectPill } = usePillInjection(editor)
 *
 * function handleSaveKnown() {
 *   injectPill('ownsHome', false) // Injects [ownsHome:false] pill
 * }
 * ```
 */

import { $createPillNode } from '@/components/notes/nodes/PillNode'
import { logError } from '@/lib/logger'
import { normalizeFieldName } from '@repo/shared'
import type { LexicalEditor } from 'lexical'
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $setSelection,
  type ParagraphNode,
} from 'lexical'
import { useCallback } from 'react'

/**
 * Format a value for pill display.
 * Converts various types to their string representation for pill nodes.
 *
 * @param value - The value to format (boolean, number, string, array, object)
 * @returns String representation of the value
 *
 * @example
 * formatPillValue(true) // "true"
 * formatPillValue(42) // "42"
 * formatPillValue("FL") // "FL"
 * formatPillValue([1, 2]) // "[1,2]"
 */
export function formatPillValue(value: unknown): string {
  if (typeof value === 'boolean') {
    return value.toString() // "true" or "false"
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value)
  }
  // Handle null, undefined, or other edge cases
  return String(value)
}

/**
 * Hook for injecting pill nodes into the Lexical editor.
 *
 * @param editor - The Lexical editor instance (from useLexicalComposerContext)
 * @returns Object with injectPill function
 *
 * @example
 * ```tsx
 * const [editor] = useLexicalComposerContext()
 * const { injectPill } = usePillInjection(editor)
 *
 * // Inject a pill for a known field
 * injectPill('ownsHome', false)
 * ```
 */
export function usePillInjection(editor: LexicalEditor | null) {
  /**
   * Inject a pill node at the end of the editor content.
   *
   * Creates a pill node with the given field key and value, appends it to the
   * last paragraph (or creates a new paragraph if needed), adds a trailing space,
   * and positions the cursor after the pill.
   *
   * @param fieldKey - The field key (e.g., "ownsHome", "state", "age")
   * @param value - The field value (any type, will be converted to string)
   *
   * @example
   * injectPill('ownsHome', false) // Creates [ownsHome:false] pill
   * injectPill('state', 'FL') // Creates [state:FL] pill
   * injectPill('age', 28) // Creates [age:28] pill
   */
  const injectPill = useCallback(
    (fieldKey: string, value: unknown) => {
      if (!editor) {
        void logError('Lexical editor not available for pill injection')
        return
      }

      editor.update(() => {
        // Get root node
        const root = $getRoot()

        // Find last paragraph node (or create one if none exists)
        const lastChild = root.getLastChild()
        let paragraph: ParagraphNode

        if (lastChild && $isParagraphNode(lastChild)) {
          paragraph = lastChild
        } else {
          // No paragraph exists, create a new one
          paragraph = $createParagraphNode()
          root.append(paragraph)
        }

        // Add space before pill if last node doesn't end with whitespace
        const lastNode = paragraph.getLastChild()
        if (lastNode && !lastNode.getTextContent().endsWith(' ')) {
          paragraph.append($createTextNode(' '))
        }

        // Normalize field name to ensure consistency
        const normalizedFieldName = normalizeFieldName(fieldKey)

        // Create pill node with 'valid' validation (always valid for converted fields)
        const pillNode = $createPillNode({
          key: normalizedFieldName, // Use normalized field name as key
          value: formatPillValue(value),
          validation: 'valid',
          fieldName: normalizedFieldName, // Use normalized field name
        })

        // Append pill to paragraph
        paragraph.append(pillNode)

        // Append trailing space after pill
        paragraph.append($createTextNode(' '))

        // Position cursor at the end (after the trailing space)
        const selection = $createRangeSelection()
        selection.focus.set(paragraph.getKey(), paragraph.getChildrenSize(), 'element')
        $setSelection(selection)
      })
    },
    [editor]
  )

  return { injectPill }
}
