/**
 * Batch Field Extractor
 *
 * Extracts all normalized fields from broker notes text.
 * Coordinates all individual extractors and handles overlapping matches.
 */

import type { NormalizedField } from '../types'
import { extractState } from './state-extractor'
import { extractProductType } from './product-type-extractor'
import { extractCurrentCarrier, extractZip } from './text-extractors'
import { extractCleanRecord, extractOwnsHome } from './boolean-extractors'
import {
  extractAge,
  extractDrivers,
  extractHouseholdSize,
  extractKids,
  extractVehicles,
} from './numeric-extractors'

/**
 * Extract all normalized fields from broker notes
 * Returns array of normalized fields that can be converted to pills
 *
 * Note: This extracts direct fields only. householdSize inference should be done
 * separately after all fields are extracted to avoid overwriting explicit values.
 */
export function extractNormalizedFields(text: string): NormalizedField[] {
  const fields: NormalizedField[] = []
  const processedRanges: Array<{ start: number; end: number }> = []

  // Helper to check if range overlaps with already processed ranges
  const isOverlapping = (start: number, end: number): boolean => {
    return processedRanges.some((range) => {
      return !(end <= range.start || start >= range.end)
    })
  }

  // Extract all field types (order matters - more specific patterns first)
  const extractors = [
    extractState, // Extract state codes/names (must come before productType to handle "CA auto")
    extractProductType, // Extract product types (after state to handle "CA auto" pattern)
    extractCurrentCarrier, // Extract "has geico" → currentCarrier: "GEICO"
    extractCleanRecord, // Extract "clean record 5yrs" → cleanRecord5Yr: true
    extractVehicles, // Extract "2 cars" → vehicles: 2
    extractDrivers, // Extract "2 drivers" → drivers: 2
    extractKids, // Extract "2 kids" → kids: 2
    extractHouseholdSize, // Extract explicit household size mentions
    extractOwnsHome,
    extractZip, // Extract "zip 90210" → zip: "90210"
    extractAge,
  ]

  for (const extractor of extractors) {
    const field = extractor(text)
    if (field && !isOverlapping(field.startIndex, field.endIndex)) {
      fields.push(field)
      processedRanges.push({ start: field.startIndex, end: field.endIndex })
    }
  }

  // Sort by start index
  return fields.sort((a, b) => a.startIndex - b.startIndex)
}
