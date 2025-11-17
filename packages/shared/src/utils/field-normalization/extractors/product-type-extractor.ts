/**
 * Product Type Extractor
 *
 * Extracts product type information from broker notes text.
 * Handles patterns like "auto", "CA auto", "home insurance", "renters", "umbrella", etc.
 * IMPORTANT: Does NOT match "home" from "owns home" or "homeowner" - those are handled by ownsHome extractor
 */

import type { NormalizedField } from '../types'

/**
 * Extract product type from broker notes
 * Handles patterns like "auto", "CA auto", "home insurance", "renters", "umbrella", etc.
 * IMPORTANT: Does NOT match "home" from "owns home" or "homeowner" - those are handled by ownsHome extractor
 */
export function extractProductType(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Product type patterns (order matters - more specific first)
  // We'll check context manually to avoid matching "home" from "owns home"
  // CRITICAL: Removed $ (end of string) - only match when followed by delimiter (space, comma, period)
  const patterns = [
    // "CA auto", "TX home" - state + product pattern (most specific)
    /\b([A-Z]{2})\s+(auto|home|renter|renters|umbrella)(?:\s|\.|,)/i,
    // "auto insurance", "home insurance", "renters insurance", "umbrella insurance"
    /\b(auto|home|renter|renters|umbrella)\s+insurance(?:\s|\.|,)/i,
    // Standalone product types - REMOVED $ (end of string) to prevent early matching
    /\b(auto|home|renter|renters|umbrella)(?:\s|\.|,|insurance)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      // Extract original product type from match BEFORE normalization
      // This is critical: we need the original word for position calculation
      const originalProductType = match[match.length - 1]?.toLowerCase()
      if (!originalProductType) continue

      // Normalize "renter" (singular) to "renters" (plural) for the value
      // But keep originalProductType for finding position in text
      let normalizedProductType = originalProductType
      if (originalProductType === 'renter') {
        normalizedProductType = 'renters'
      }

      if (
        normalizedProductType &&
        ['auto', 'home', 'renters', 'umbrella'].includes(normalizedProductType)
      ) {
        // Additional check: make sure "home" isn't from "owns home" or "homeowner"
        const matchIndex = match.index ?? 0
        const beforeMatch = lowerText.substring(Math.max(0, matchIndex - 10), matchIndex)
        if (normalizedProductType === 'home' && beforeMatch.match(/\b(owns|own|homeowner)\s*$/)) {
          continue // Skip this match - it's from "owns home", not product type
        }

        const startIndex = matchIndex
        // For "CA auto" pattern, extract just the product type part
        if (match.length > 2 && match[2] && match[1]?.match(/^[A-Z]{2}$/)) {
          // Find the position of the ORIGINAL product type in the match (not normalized)
          const productIndex = match[0].toLowerCase().indexOf(originalProductType)
          return {
            fieldName: 'productType',
            value: normalizedProductType, // Use normalized value
            originalText: match[2], // Original matched text
            startIndex: startIndex + productIndex,
            endIndex: startIndex + productIndex + originalProductType.length, // Use original length
          }
        }
        // Extract just the product type word, not trailing punctuation
        // Use originalProductType (not normalized) to find position in text
        const productMatch = match[0].match(new RegExp(`\\b(${originalProductType})\\b`, 'i'))
        if (productMatch?.[1] && productMatch.index !== undefined) {
          const productStartIndex = startIndex + productMatch.index
          return {
            fieldName: 'productType',
            value: normalizedProductType, // Use normalized value
            originalText: productMatch[1], // Original matched word
            startIndex: productStartIndex,
            endIndex: productStartIndex + originalProductType.length, // Use original length
          }
        }
      }
    }
  }

  return null
}
