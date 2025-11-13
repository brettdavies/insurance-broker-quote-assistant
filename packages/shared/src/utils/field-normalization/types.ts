/**
 * Field Normalization Types
 *
 * Shared type definitions for field normalization utilities.
 */

/**
 * Normalized field extracted from natural language text
 *
 * Represents a structured field value extracted from broker notes,
 * including the original text and its position for pill creation.
 */
export interface NormalizedField {
  fieldName: string
  value: string | number | boolean
  originalText: string
  startIndex: number
  endIndex: number
}
