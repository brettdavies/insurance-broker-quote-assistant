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
  const patterns = [
    // "CA auto", "TX home" - state + product pattern (most specific)
    /\b([A-Z]{2})\s+(auto|home|renters|umbrella)(?:\s|$|\.|,)/i,
    // "auto insurance", "home insurance", "renters insurance", "umbrella insurance"
    /\b(auto|home|renters|umbrella)\s+insurance(?:\s|$|\.|,)/i,
    // Standalone product types - we'll check context after matching
    /\b(auto|home|renters|umbrella)(?:\s|$|\.|,|insurance)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      // Extract product type (last capture group that's a product type)
      const productType = match[match.length - 1]?.toLowerCase()
      if (productType && ['auto', 'home', 'renters', 'umbrella'].includes(productType)) {
        // Additional check: make sure "home" isn't from "owns home" or "homeowner"
        const matchIndex = match.index ?? 0
        const beforeMatch = lowerText.substring(Math.max(0, matchIndex - 10), matchIndex)
        if (productType === 'home' && beforeMatch.match(/\b(owns|own|homeowner)\s*$/)) {
          continue // Skip this match - it's from "owns home", not product type
        }

        const startIndex = matchIndex
        // For "CA auto" pattern, extract just the product type part
        if (match.length > 2 && match[2] && match[1]?.match(/^[A-Z]{2}$/)) {
          // Find the position of the product type in the match
          const productIndex = match[0].toLowerCase().indexOf(productType)
          return {
            fieldName: 'productType',
            value: productType,
            originalText: match[2],
            startIndex: startIndex + productIndex,
            endIndex: startIndex + productIndex + productType.length,
          }
        }
        // Extract just the product type word, not trailing punctuation
        const productMatch = match[0].match(new RegExp(`\\b(${productType})\\b`, 'i'))
        if (productMatch?.[1] && productMatch.index !== undefined) {
          const productStartIndex = startIndex + productMatch.index
          return {
            fieldName: 'productType',
            value: productType,
            originalText: productMatch[1],
            startIndex: productStartIndex,
            endIndex: productStartIndex + productType.length,
          }
        }
      }
    }
  }

  return null
}
