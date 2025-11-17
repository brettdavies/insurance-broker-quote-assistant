/**
 * Centralized delimiter constants for field extraction
 *
 * These delimiters determine when field extraction should be triggered.
 * They are used by both frontend (KeyValuePlugin) and backend (intake handler).
 *
 * CRITICAL: This is the single source of truth for delimiters.
 * Do not define delimiters anywhere else in the codebase.
 */

/**
 * Delimiters that trigger field extraction
 * - '.' = period
 * - ',' = comma
 * - ' ' = space
 * - '\n' = newline/enter
 */
export const EXTRACTION_DELIMITERS = ['.', ',', ' ', '\n'] as const

export type ExtractionDelimiter = (typeof EXTRACTION_DELIMITERS)[number]

/**
 * Pill markers used to wrap extracted fields in processed text
 * Example: "CA auto" → "[[state:CA]] [[product:auto]]"
 */
export const PILL_MARKER_START = '[['
export const PILL_MARKER_END = ']]'

/**
 * Regex pattern to match pill markers in text
 * Matches: [[key:value]]
 */
export const PILL_MARKER_PATTERN = /\[\[([^:]+):([^\]]+)\]\]/g
