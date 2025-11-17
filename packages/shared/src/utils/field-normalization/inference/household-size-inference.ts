/**
 * Household Size Inference
 *
 * Infers household size from other indicator fields like drivers or kids.
 */

import type { NormalizedField } from '../types'

/**
 * Infer householdSize from other indicator fields
 * Only infers if householdSize is not already explicitly set
 *
 * Inference rules:
 * - If drivers is set and householdSize is not set → householdSize = drivers
 * - If kids is set and householdSize is not set → householdSize = kids + 1 (assuming 1 adult)
 * - Never overwrites an explicitly set householdSize
 *
 * @param extractedFields - Map of already extracted fields
 * @returns NormalizedField for householdSize if inferred, null otherwise
 */
export function inferHouseholdSize(
  extractedFields: Map<string, NormalizedField>
): NormalizedField | null {
  // Never overwrite an explicitly set householdSize
  if (extractedFields.has('householdSize')) {
    return null
  }

  // Infer from drivers if available
  const driversField = extractedFields.get('drivers')
  if (driversField && typeof driversField.value === 'number') {
    return {
      fieldName: 'householdSize',
      value: driversField.value,
      originalText: `(inferred from ${driversField.originalText})`,
      startIndex: driversField.startIndex,
      endIndex: driversField.endIndex,
    }
  }

  // Infer from kids if available (kids + 1 adult)
  const kidsField = extractedFields.get('kids')
  if (kidsField && typeof kidsField.value === 'number') {
    return {
      fieldName: 'householdSize',
      value: kidsField.value + 1,
      originalText: `(inferred from ${kidsField.originalText})`,
      startIndex: kidsField.startIndex,
      endIndex: kidsField.endIndex,
    }
  }

  return null
}
