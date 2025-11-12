/**
 * Text Extraction Utility
 *
 * Single source of truth for extracting plain text from Lexical editor
 * while excluding pill nodes. Follows SRP (Single Responsibility Principle).
 */

import { $isPillNode } from '@/components/notes/nodes/PillNode'
import type { LexicalEditor } from 'lexical'
import { $getRoot, $isTextNode } from 'lexical'

/**
 * Extract plain text from Lexical editor, excluding pill nodes
 *
 * Traverses the editor state and concatenates text from TextNode instances,
 * skipping PillNode instances entirely. This provides the "cleaned" text
 * that should be sent to the LLM for further extraction.
 *
 * @param editor - Lexical editor instance
 * @returns Plain text string with pill text removed
 */
export function extractTextWithoutPills(editor: LexicalEditor): string {
  let text = ''

  editor.getEditorState().read(() => {
    const root = $getRoot()
    const children = root.getChildren()

    for (const child of children) {
      if ($isTextNode(child)) {
        text += child.getTextContent()
      } else if (!$isPillNode(child)) {
        // For other node types (like ParagraphNode), traverse their children
        // Check if node has getChildren method (ElementNode types)
        if ('getChildren' in child && typeof child.getChildren === 'function') {
          const childChildren = child.getChildren()
          for (const grandchild of childChildren) {
            if ($isTextNode(grandchild)) {
              text += grandchild.getTextContent()
            }
            // Skip pill nodes - they are not included in the text
          }
        }
      }
      // Pill nodes are skipped entirely
    }
  })

  return text.trim()
}
