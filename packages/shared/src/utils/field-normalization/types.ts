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
  // biome-ignore lint/suspicious/noExplicitAny: Value can be various complex types including nested structures
  value: string | number | boolean | any[] | Record<string, any> | null
  originalText: string
  startIndex: number
  endIndex: number
}
