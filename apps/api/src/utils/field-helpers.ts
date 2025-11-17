/**
 * Field Helper Utilities
 *
 * Provides helper functions for working with FieldWithMetadata types
 * to reduce repetition of `.value || defaultValue` patterns.
 */

import type { FieldWithMetadata } from '@repo/shared'

/**
 * Extract value from FieldWithMetadata with fallback to default
 *
 * @param field - FieldWithMetadata object or undefined
 * @param defaultValue - Default value to return if field is undefined or null
 * @returns The field value or default value
 *
 * @example
 * ```ts
 * const operatesIn = getFieldValue(carrier.operatesIn, [])
 * const products = getFieldValue(carrier.products, [])
 * ```
 */
export function getFieldValue<T>(field: FieldWithMetadata<T> | undefined, defaultValue: T): T {
  return field?.value ?? defaultValue
}
