/**
 * Key-Value Syntax Parser
 *
 * Frontend wrapper around shared pill parsing utilities.
 * Adds frontend-specific logging.
 */

import {
  type ParsedKeyValue,
  type ValidationResult,
  buildFieldAliasesMap,
  buildFieldTypeConfig,
  extractFields as sharedExtractFields,
  getFieldNameFromAlias as sharedGetFieldNameFromAlias,
  parseKeyValueSyntax as sharedParseKeyValueSyntax,
} from '@repo/shared'
import { logWarn } from './logger'

// Re-export types for backward compatibility
export type { ParsedKeyValue, ValidationResult }

// Cache field aliases and config for performance
const fieldAliasesMap = buildFieldAliasesMap()
const fieldTypeConfig = buildFieldTypeConfig()

/**
 * Parse key-value syntax from text
 * Also includes natural language normalization (e.g., "2 drivers" → householdSize:2)
 *
 * @param text - Text containing key-value pairs (e.g., "Client needs auto, k:2 v:3")
 * @param validKeys - Optional set of valid keys (if not provided, uses all known aliases)
 * @returns Array of parsed key-value pairs with validation results
 */
export function parseKeyValueSyntax(text: string, validKeys?: Set<string>): ParsedKeyValue[] {
  try {
    return sharedParseKeyValueSyntax(text, validKeys, fieldTypeConfig, fieldAliasesMap)
  } catch (error) {
    // Log warning and return empty array on error
    logWarn('Failed to parse key-value syntax', {
      error: error instanceof Error ? error.message : String(error),
      text,
    })
    return []
  }
}

/**
 * Extract structured fields from parsed key-value pairs
 *
 * @param parsed - Array of parsed key-value pairs
 * @returns Object mapping field names to values
 */
export function extractFields(parsed: ParsedKeyValue[]): Record<string, string | number> {
  return sharedExtractFields(parsed, fieldTypeConfig)
}

/**
 * Get field name from key alias
 *
 * @param key - Key alias (e.g., "k", "kids")
 * @returns Full field name or undefined if not found
 */
export function getFieldName(key: string): string | undefined {
  return sharedGetFieldNameFromAlias(key, fieldAliasesMap)
}
