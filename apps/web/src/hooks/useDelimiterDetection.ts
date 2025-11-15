/**
 * Delimiter Detection Utility
 *
 * Determines when to transform text to pills based on delimiters and cursor position.
 * Uses shared delimiter detection utilities with Lexical-specific selection handling.
 * Single Responsibility: Delimiter detection logic only
 */

import { parseKeyValueSyntax } from '@/lib/pill-parser'
import { shouldTransformOnDelimiter } from '@repo/shared'
import { $getSelection, $isRangeSelection, type TextNode } from 'lexical'

/**
 * Check if we should transform text to pills based on delimiter detection
 *
 * @param text - Text content
 * @param node - TextNode being checked
 * @param isEditing - Whether user is actively editing this node
 * @returns Object with shouldTransform and shouldSuppressDelimiter flags
 */
export function checkDelimiterForTransformation(
  text: string,
  node: TextNode,
  isEditing: boolean
): { shouldTransform: boolean; shouldSuppressDelimiter: boolean } {
  // Parse the text to get key-value pairs
  const parsed = parseKeyValueSyntax(text)

  if (parsed.length === 0) {
    return { shouldTransform: false, shouldSuppressDelimiter: false }
  }

  // Get cursor position
  const selection = $getSelection()
  const cursorOffset =
    $isRangeSelection(selection) && selection.isCollapsed() ? selection.anchor.offset : text.length

  // Use shared delimiter detection utility
  const result = shouldTransformOnDelimiter(text, parsed, cursorOffset)

  // If not editing, always transform if there are matches
  if (!isEditing) {
    return { shouldTransform: true, shouldSuppressDelimiter: false }
  }

  return result
}
