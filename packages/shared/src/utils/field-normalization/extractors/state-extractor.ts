/**
 * State Extractor
 *
 * Extracts state information from broker notes text.
 * Handles patterns like "CA", "CA auto", "California", "in CA", etc.
 */

import { STATE_NAME_TO_CODE, normalizeState } from '../normalizers'
import type { NormalizedField } from '../types'

/**
 * Extract state from broker notes text
 * Looks for state mentions in common patterns
 *
 * @param text - Broker notes text
 * @returns State code if found, undefined otherwise
 *
 * @example
 * extractStateFromText("I'm in California") // "CA"
 * extractStateFromText("Looking for insurance in CA") // "CA"
 * extractStateFromText("New York resident") // "NY"
 */
export function extractStateFromText(text: string): string | undefined {
  if (!text) {
    return undefined
  }

  // Try to find state mentions in common patterns
  const patterns = [
    // "in California", "from California", "California resident"
    /\b(in|from|of|resident|located|based)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i,
    // "California" standalone
    /\b(California|Texas|Florida|New York|Illinois|New Jersey|Pennsylvania|Ohio|Georgia|North Carolina|Michigan|Virginia|Washington|Massachusetts|Tennessee|Indiana|Arizona|Missouri|Maryland|Wisconsin|Colorado|Minnesota|South Carolina|Alabama|Louisiana|Kentucky|Oregon|Oklahoma|Connecticut|Utah|Iowa|Nevada|Arkansas|Mississippi|Kansas|New Mexico|Nebraska|West Virginia|Idaho|Hawaii|New Hampshire|Maine|Montana|Rhode Island|Delaware|South Dakota|North Dakota|Alaska|Vermont|Wyoming|District of Columbia)\b/i,
    // State codes: "CA", "TX", etc.
    /\b([A-Z]{2})\b/,
  ]

  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      // Try to extract state from match
      const potentialState = matches[matches.length - 1] // Last capture group
      const normalized = normalizeState(potentialState)
      if (normalized) {
        return normalized
      }
    }
  }

  // Fallback: try normalizing entire text (for cases like "California" as full message)
  return normalizeState(text)
}

/**
 * Extract state from broker notes
 * Returns NormalizedField for state extraction (used by pill creation)
 * Handles patterns like "CA", "CA auto", "California", "in CA", etc.
 */
export function extractState(text: string): NormalizedField | null {
  const stateCode = extractStateFromText(text)
  if (!stateCode) {
    return null
  }

  // Find the position of the state in the text
  // Try to find state code first (2-letter codes)
  const codeMatch = text.match(/\b([A-Z]{2})\b/)
  if (codeMatch && normalizeState(codeMatch[1]) === stateCode) {
    const startIndex = codeMatch.index ?? 0
    return {
      fieldName: 'state',
      value: stateCode,
      originalText: codeMatch[0],
      startIndex,
      endIndex: startIndex + codeMatch[0].length,
    }
  }

  // Try to find state name
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (code === stateCode) {
      const namePattern = new RegExp(`\\b${name.replace(/\s+/g, '\\s+')}\\b`, 'i')
      const nameMatch = text.match(namePattern)
      if (nameMatch) {
        const startIndex = nameMatch.index ?? 0
        return {
          fieldName: 'state',
          value: stateCode,
          originalText: nameMatch[0],
          startIndex,
          endIndex: startIndex + nameMatch[0].length,
        }
      }
    }
  }

  // Fallback: if we found a state code but couldn't find its position, use the first 2-letter code
  if (codeMatch) {
    const startIndex = codeMatch.index ?? 0
    return {
      fieldName: 'state',
      value: stateCode,
      originalText: codeMatch[0],
      startIndex,
      endIndex: startIndex + codeMatch[0].length,
    }
  }

  return null
}
