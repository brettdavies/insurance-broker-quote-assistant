/**
 * Field Options Utilities
 *
 * Utilities for generating combobox/select options from field metadata.
 * Used by frontend FieldModal for enum field selection.
 */

import { unifiedFieldMetadata } from '../schemas/field-metadata'
import { STATE_NAME_TO_CODE } from './field-normalization'

/**
 * Combobox option interface
 */
export interface ComboboxOption {
  value: string
  label: string
  searchText?: string // Optional search text for filtering
}

/**
 * Get state options for combobox
 * Formats state codes with full names (e.g., "CA - California")
 *
 * @param stateCodes - Array of state codes (e.g., ['CA', 'NY', 'TX'])
 * @returns Array of combobox options with formatted labels
 */
export function getStateOptionsForCombobox(stateCodes: string[]): ComboboxOption[] {
  // Create a mapping of state codes to full names
  // Use the primary name (longest single-word name, or multi-word name)
  const stateCodeToName: Record<string, string> = {}
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    // Skip aliases (short names like "cali", "fla", etc.)
    if (name.length <= 3 && !name.includes(' ')) continue

    // Prefer longer names or multi-word names
    if (
      !stateCodeToName[code] ||
      name.length > stateCodeToName[code].length ||
      (name.includes(' ') && !stateCodeToName[code].includes(' '))
    ) {
      // Capitalize first letter of each word
      const capitalized = name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      stateCodeToName[code] = capitalized
    }
  }

  // Special case for DC
  stateCodeToName.DC = 'District of Columbia'

  return stateCodes.map((code) => {
    const fullName = stateCodeToName[code] || code
    return {
      value: code,
      label: fullName !== code ? `${code} - ${fullName}` : code,
      searchText: fullName, // Allow searching by full name
    }
  })
}

/**
 * Get enum options for combobox
 * Handles special cases (like state field) and general enum fields
 *
 * @param fieldName - Field name (e.g., 'state', 'productType')
 * @param options - Array of option values
 * @returns Array of combobox options
 */
export function getEnumOptionsForCombobox(
  fieldName: string | undefined,
  options: string[] | undefined
): ComboboxOption[] {
  if (!options) return []

  // Special handling for state field
  if (fieldName === 'state') {
    return getStateOptionsForCombobox(options)
  }

  // For other enum fields, just use the option value as both value and label
  return options.map((option) => ({
    value: option,
    label: option,
  }))
}
