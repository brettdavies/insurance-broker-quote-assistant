/**
 * Pill Field Extraction Plugin
 *
 * Extracts fields when valid pills are created in the Lexical editor.
 * Single Responsibility: Pill field extraction only
 */

import { NUMERIC_FIELDS } from '@/config/shortcuts'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey } from 'lexical'
import { useEffect } from 'react'
import { $isPillNode, PillNode } from '../nodes/PillNode'

interface PillFieldExtractionPluginProps {
  onFieldExtracted?: (fields: Record<string, string | number | boolean>) => void
}

export function PillFieldExtractionPlugin({
  onFieldExtracted,
}: PillFieldExtractionPluginProps): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!onFieldExtracted) return

    // Listen for pill node mutations (creation)
    const removeMutationListener = editor.registerMutationListener(PillNode, (mutatedNodes) => {
      editor.getEditorState().read(() => {
        const extractedFields: Record<string, string | number | boolean> = {}

        for (const [nodeKey, mutation] of mutatedNodes) {
          if (mutation === 'created') {
            const node = $getNodeByKey(nodeKey)
            if ($isPillNode(node) && node.getValidation() === 'valid') {
              const fieldName = node.getFieldName()
              const value = node.getValue()

              if (fieldName && value) {
                // Convert to number if it's a numeric field
                if (NUMERIC_FIELDS.has(fieldName)) {
                  const numValue = Number.parseInt(value, 10)
                  if (!Number.isNaN(numValue)) {
                    extractedFields[fieldName] = numValue
                  }
                }
                // Convert boolean strings to actual booleans
                else if (value === 'true' || value === 'false') {
                  extractedFields[fieldName] = value === 'true'
                }
                // Keep as string for other fields (like zip)
                else {
                  extractedFields[fieldName] = value
                }
              }
            }
          }
        }

        // Extract fields and notify parent if any valid pills were created
        if (Object.keys(extractedFields).length > 0) {
          // Call outside of read() to avoid nested updates
          setTimeout(() => {
            onFieldExtracted(extractedFields)
          }, 0)
        }
      })
    })

    return () => {
      removeMutationListener()
    }
  }, [editor, onFieldExtracted])

  return null
}
