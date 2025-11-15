/**
 * Field Name Resolver
 *
 * Resolves field names from aliases, shortcuts, and other identifiers.
 * Uses unifiedFieldMetadata as the single source of truth.
 */

import { unifiedFieldMetadata } from '../../schemas/field-metadata'
import { normalizeFieldName } from '../field-normalization'

/**
 * Build field aliases map from unifiedFieldMetadata
 * Maps shortcuts and aliases to canonical field names
 */
export function buildFieldAliasesMap(): Record<string, string> {
  const aliases: Record<string, string> = {}

  for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
    // Add shortcut → field name mapping
    if (metadata.shortcut) {
      aliases[metadata.shortcut.toLowerCase()] = fieldName
    }

    // Add field name itself as alias
    aliases[fieldName.toLowerCase()] = fieldName

    // Add aliases from metadata
    if (metadata.aliases) {
      for (const alias of metadata.aliases) {
        aliases[alias.toLowerCase()] = fieldName
      }
    }
  }

  return aliases
}

/**
 * Get field name from key alias
 *
 * @param key - Key alias (e.g., "k", "kids")
 * @param aliasesMap - Optional pre-built aliases map (for performance)
 * @returns Full field name or undefined if not found
 */
export function getFieldNameFromAlias(
  key: string,
  aliasesMap?: Record<string, string>
): string | undefined {
  const aliases = aliasesMap || buildFieldAliasesMap()
  const normalizedKey = normalizeFieldName(key)
  return aliases[normalizedKey.toLowerCase()] || aliases[key.toLowerCase()]
}
