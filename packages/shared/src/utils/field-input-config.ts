/**
 * Field Input Configuration Utilities
 *
 * Utilities for determining input type and placeholder based on field metadata.
 * Used by frontend FieldModal for consistent input configuration.
 */

import { unifiedFieldMetadata } from '../schemas/field-metadata'

/**
 * Get input type for a field based on its metadata
 *
 * @param fieldName - Field name (e.g., 'email', 'phone', 'age')
 * @param fieldType - Field type from metadata ('string' | 'numeric' | 'date' | 'object' | 'boolean')
 * @returns HTML input type
 */
export function getInputTypeForField(
  fieldName: string,
  fieldType: string
): 'text' | 'number' | 'email' | 'tel' {
  if (fieldType === 'numeric') {
    return 'number'
  }
  // Special cases for email and phone input types
  if (fieldName === 'email') return 'email'
  if (fieldName === 'phone') return 'tel'
  return 'text'
}

/**
 * Get placeholder text for a field based on its metadata
 *
 * @param fieldName - Field name (e.g., 'vehicles', 'creditScore', 'name')
 * @param fieldType - Field type from metadata ('string' | 'numeric' | 'date' | 'object' | 'boolean')
 * @returns Placeholder text
 */
export function getPlaceholderForField(fieldName: string, fieldType: string): string {
  if (fieldType === 'numeric') {
    // Special case: vehicles must be >= 1
    if (fieldName === 'vehicles') return '1'
    // Special case: credit score range hint
    if (fieldName === 'creditScore') return '650'
    return '0'
  }
  // Special case: name field gets example placeholder
  if (fieldName === 'name') return 'John Doe'
  return ''
}
