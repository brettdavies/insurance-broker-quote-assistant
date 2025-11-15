/**
 * Delimiter Detection Utilities
 *
 * Determines when to transform text to pills based on delimiters and field types.
 * Used by frontend Lexical plugin for real-time pill transformation.
 */

import { type FieldTypeConfig, buildFieldTypeConfig } from './key-value-parser'
import type { ParsedKeyValue } from './types'

/**
 * Get valid delimiters for a field based on its type
 *
 * @param fieldName - Field name to check
 * @param fieldTypeConfig - Field type configuration
 * @returns Array of valid delimiter characters
 */
export function getValidDelimitersForField(
  fieldName: string | undefined,
  fieldTypeConfig?: FieldTypeConfig
): string[] {
  const config = fieldTypeConfig || buildFieldTypeConfig()

  if (!fieldName) {
    return [' ', ',', '.']
  }

  // Multi-word fields: spaces are part of value, only comma/period are delimiters
  if (config.multiWordFields.has(fieldName)) {
    return [',', '.']
  }

  // Email fields: periods are part of value, only space is delimiter
  if (fieldName === 'email') {
    return [' ']
  }

  // Zip fields: dashes are part of value, space/comma/period are delimiters
  if (fieldName === 'zip') {
    return [' ', ',', '.']
  }

  // Numeric fields with commas: commas are part of value (thousands separator), only space is delimiter
  // This is determined at runtime based on value content, not field type alone

  // Default: space, comma, or period are delimiters
  return [' ', ',', '.']
}

/**
 * Check if we should transform based on delimiter position
 *
 * @param text - Full text content
 * @param parsed - Parsed key-value results
 * @param cursorOffset - Current cursor offset in text
 * @param fieldTypeConfig - Field type configuration
 * @returns Object with shouldTransform and shouldSuppressDelimiter flags
 */
export function shouldTransformOnDelimiter(
  text: string,
  parsed: ParsedKeyValue[],
  cursorOffset: number,
  fieldTypeConfig?: FieldTypeConfig
): { shouldTransform: boolean; shouldSuppressDelimiter: boolean } {
  const config = fieldTypeConfig || buildFieldTypeConfig()

  // Check if text ends with a delimiter (space, comma, period)
  const textEndsWithDelimiter = /[\s,\.]$/.test(text)
  if (textEndsWithDelimiter && parsed.length > 0) {
    const lastMatch = parsed[parsed.length - 1]
    if (lastMatch) {
      const matchEnd = text.lastIndexOf(lastMatch.original) + lastMatch.original.length
      // Only transform if delimiter immediately follows match
      const charAtMatchEnd = text[matchEnd]
      if (
        matchEnd < text.length &&
        charAtMatchEnd !== undefined &&
        /[\s,\.]/.test(charAtMatchEnd)
      ) {
        return { shouldTransform: true, shouldSuppressDelimiter: false }
      }
    }
  }

  // Check cursor position relative to parsed values
  if (parsed.length > 0) {
    const lastParsed = parsed[parsed.length - 1]
    if (!lastParsed) {
      return { shouldTransform: false, shouldSuppressDelimiter: false }
    }

    const valueStart = text.lastIndexOf(lastParsed.original)
    const valueEndsAt = valueStart + lastParsed.original.length
    const isTypingValue = cursorOffset > valueStart && cursorOffset <= valueEndsAt
    const charBeforeCursor = text[cursorOffset - 1]

    // Check field type to determine valid delimiters
    const fieldName = lastParsed.fieldName
    const isMultiWordField = fieldName ? config.multiWordFields.has(fieldName) : false
    const isEmailField = fieldName === 'email'
    const isNumericField = fieldName ? config.numericFields.has(fieldName) : false
    const isZipField = fieldName === 'zip'
    const valueContainsAt = lastParsed.value.includes('@')
    const valueContainsComma = lastParsed.value.includes(',')

    // Get special characters allowed for this field
    const allowedSpecialChars = fieldName ? config.specialCharFields[fieldName] || [] : []
    const valueHasSpecialChars = allowedSpecialChars.some((char) => lastParsed.value.includes(char))

    // Helper: Check if next chars look like a new key:value pattern
    const checkNextKeyValuePattern = (): boolean => {
      const textAfterCursor = text.slice(cursorOffset)
      return /^\s+\w+:/.test(textAfterCursor)
    }

    let shouldTransform = false
    let shouldSuppressDelimiter = false

    // If typing within a value:
    if (isTypingValue) {
      // Multi-word fields: spaces are part of value, stop at comma/period/next key:value pattern
      if (isMultiWordField) {
        shouldTransform =
          charBeforeCursor === ',' || charBeforeCursor === '.' || checkNextKeyValuePattern()
      }
      // Zip fields (not multi-word): dashes are part of value, only space/comma/period are delimiters
      else if (isZipField && valueHasSpecialChars) {
        shouldTransform =
          charBeforeCursor === ' ' || charBeforeCursor === ',' || charBeforeCursor === '.'
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
          charBeforeCursor === ' ' || charBeforeCursor === ',' || charBeforeCursor === '.'
      }
    }
    // If cursor is after the value (at delimiter position):
    else if (cursorOffset > valueEndsAt) {
      // Multi-word fields: spaces are part of value, stop at comma/period/next key:value pattern
      if (isMultiWordField) {
        shouldTransform =
          charBeforeCursor === ',' || charBeforeCursor === '.' || checkNextKeyValuePattern()
      }
      // Zip fields (not multi-word): dashes are part of value
      else if (isZipField && valueHasSpecialChars) {
        shouldTransform =
          charBeforeCursor === ' ' || charBeforeCursor === ',' || charBeforeCursor === '.'
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
          charBeforeCursor === ' ' || charBeforeCursor === ',' || charBeforeCursor === '.'
      }

      // Check for duplicate delimiter suppression (only for spaces at end)
      if (shouldTransform && cursorOffset === text.length && charBeforeCursor === ' ') {
        const textWithoutDelimiter = text.slice(0, -1)
        // Check if we have duplicate spaces
        const charBeforeDelimiter = text.length > 1 ? text[text.length - 2] : null
        if (charBeforeDelimiter === ' ') {
          // We have duplicate spaces - suppress the last one
          shouldSuppressDelimiter = true
        }
      }
    }
    // Cursor before value - don't transform
    else {
      shouldTransform = false
    }

    return { shouldTransform, shouldSuppressDelimiter }
  }

  // No parsed values yet - use standard delimiters
  const charBeforeCursor = text[cursorOffset - 1]
  const isAtDelimiter =
    charBeforeCursor === ' ' || charBeforeCursor === ',' || charBeforeCursor === '.'
  const endsWithDelimiter = text.endsWith(' ') || text.endsWith(',') || text.endsWith('.')

  return {
    shouldTransform: isAtDelimiter || endsWithDelimiter,
    shouldSuppressDelimiter: false,
  }
}
