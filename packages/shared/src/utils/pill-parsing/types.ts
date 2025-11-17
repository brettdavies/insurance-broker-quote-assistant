/**
 * Pill Parsing Types
 *
 * Shared types for key-value pill parsing used by both frontend and backend.
 */

export type ValidationResult = 'valid' | 'invalid_key' | 'invalid_value'

export interface ParsedKeyValue {
  key: string
  value: string
  original: string
  validation: ValidationResult
  fieldName?: string
}
