/**
 * Field Name Normalization Utility
 *
 * Normalizes field names to use element names from unifiedFieldMetadata.
 * Ensures all field extraction paths (key-value parsing, normalized fields, modal additions)
 * use consistent field names that match the schema element names.
 */

import { unifiedFieldMetadata } from '../../schemas/field-metadata'

/**
 * Normalize field name to element name from field-metadata schemas
 *
 * This function ensures that field names from various sources (aliases, shortcuts, etc.)
 * are normalized to the canonical element name used in the schema.
 *
 * @param fieldName - Field name from any source (alias, shortcut, normalized field, etc.)
 * @returns Normalized field name (element name from unifiedFieldMetadata), or original if not found
 *
 * @example
 * normalizeFieldName('k') // Returns 'kids'
 * normalizeFieldName('productType') // Returns 'productType'
 * normalizeFieldName('product') // Returns 'productType' (if 'product' is an alias)
 */
export function normalizeFieldName(fieldName: string): string {
  if (!fieldName) return fieldName

  const lowerFieldName = fieldName.toLowerCase()

  // Check if fieldName is already an element name in unifiedFieldMetadata
  if (unifiedFieldMetadata[fieldName]) {
    return fieldName
  }

  // Check if fieldName is a shortcut
  for (const [elementName, metadata] of Object.entries(unifiedFieldMetadata)) {
    if (metadata.shortcut.toLowerCase() === lowerFieldName) {
      return elementName
    }
  }

  // Check if fieldName is an alias
  for (const [elementName, metadata] of Object.entries(unifiedFieldMetadata)) {
    if (metadata.aliases) {
      for (const alias of metadata.aliases) {
        if (alias.toLowerCase() === lowerFieldName) {
          return elementName
        }
      }
    }
  }

  // If not found, return original (may be invalid, but let validation handle it)
  return fieldName
}
