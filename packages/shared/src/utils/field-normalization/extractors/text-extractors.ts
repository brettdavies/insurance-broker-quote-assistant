/**
 * Text Field Extractors
 *
 * Extracts text field values from broker notes text.
 * Handles patterns for zip code and current carrier.
 */

import { CARRIER_NORMALIZATIONS } from '../normalizers/carrier-normalizer'
import type { NormalizedField } from '../types'

/**
 * Extract zip code from broker notes
 * Looks for patterns like "zip 90210", "90210", "zip code 90210", etc.
 */
export function extractZip(text: string): NormalizedField | null {
  // Pattern: "zip 90210" or "zip code 90210" - handle end of string with $ anchor
  // Also handle newlines, spaces, and other whitespace at end
  const zipPatterns = [
    // Match "zip 90210" at end of string (with optional trailing whitespace/newlines)
    /\bzip\s+(?:code\s+)?(\d{5}(?:-\d{4})?)\s*$/i,
    // Match "zip 90210" followed by whitespace, punctuation, or end
    /\bzip\s+(?:code\s+)?(\d{5}(?:-\d{4})?)(?:\s+|$|\.|,|;)/i,
  ]

  for (const pattern of zipPatterns) {
    const zipMatch = text.match(pattern)
    if (zipMatch?.[1]) {
      const startIndex = zipMatch.index ?? 0
      // Extract the full "zip 90210" phrase
      const phraseMatch = text.substring(startIndex).match(/zip\s+(?:code\s+)?(\d{5}(?:-\d{4})?)/i)
      if (phraseMatch) {
        return {
          fieldName: 'zip',
          value: zipMatch[1],
          originalText: phraseMatch[0],
          startIndex,
          endIndex: startIndex + phraseMatch[0].length,
        }
      }
    }
  }

  // Pattern: standalone 5-digit number near "zip" keyword - handle end of string
  const standalonePatterns = [
    // Match at end of string with optional trailing whitespace
    /\b(zip|postal|postcode|zcode)\s*:?\s*(\d{5}(?:-\d{4})?)\s*$/i,
    // Match followed by whitespace, punctuation, or end
    /\b(zip|postal|postcode|zcode)\s*:?\s*(\d{5}(?:-\d{4})?)(?:\s+|$|\.|,|;)/i,
  ]

  for (const pattern of standalonePatterns) {
    const standaloneMatch = text.match(pattern)
    if (standaloneMatch?.[2]) {
      const startIndex = standaloneMatch.index ?? 0
      return {
        fieldName: 'zip',
        value: standaloneMatch[2],
        originalText: standaloneMatch[0],
        startIndex,
        endIndex: startIndex + standaloneMatch[0].length,
      }
    }
  }

  // Pattern: "90210" as standalone (only if near zip-related keywords) - handle end of string
  const contextPatterns = [
    // Match at end of string with optional trailing whitespace
    /\b(\d{5})\s*$/,
    // Match followed by whitespace, punctuation, or end
    /\b(\d{5})(?:\s+|$|\.|,|;)/,
  ]

  for (const pattern of contextPatterns) {
    const contextMatch = text.match(pattern)
    if (contextMatch) {
      const potentialZip = contextMatch[1]
      if (potentialZip && potentialZip.length === 5) {
        const context = text.toLowerCase()
        const zipIndex = context.indexOf(potentialZip)
        const beforeContext = context.substring(Math.max(0, zipIndex - 20), zipIndex)
        if (beforeContext.match(/\b(zip|postal|postcode|address|location)\b/)) {
          const startIndex = contextMatch.index ?? 0
          return {
            fieldName: 'zip',
            value: potentialZip,
            originalText: contextMatch[0],
            startIndex,
            endIndex: startIndex + contextMatch[0].length,
          }
        }
      }
    }
  }

  return null
}

/**
 * Extract current insurance carrier from broker notes
 * Looks for patterns like "has geico", "with state farm", "current carrier is progressive"
 */
export function extractCurrentCarrier(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Pattern: "has [carrier]", "with [carrier]", "currently with [carrier]"
  const hasPattern = /\b(has|with|currently with|current carrier is?)\s+([a-z\s]+?)(?:\s|$|\.|\,)/i
  const hasMatch = text.match(hasPattern)
  if (hasMatch?.[2]) {
    const carrierText = hasMatch[2].trim().toLowerCase()
    const normalizedCarrier = CARRIER_NORMALIZATIONS[carrierText]
    if (normalizedCarrier) {
      const startIndex = hasMatch.index ?? 0
      // Find just the carrier name part
      const carrierIndex = text.toLowerCase().indexOf(carrierText, startIndex)
      return {
        fieldName: 'currentCarrier',
        value: normalizedCarrier,
        originalText: hasMatch[2],
        startIndex: carrierIndex,
        endIndex: carrierIndex + hasMatch[2].length,
      }
    }
  }

  // Pattern: standalone carrier names at end of relevant context
  for (const [carrierLower, carrierUpper] of Object.entries(CARRIER_NORMALIZATIONS)) {
    const carrierPattern = new RegExp(`\\b${carrierLower.replace(/\s+/g, '\\s+')}\\b`, 'i')
    const carrierMatch = text.match(carrierPattern)
    if (carrierMatch) {
      // Check context: should appear after keywords like "has", "with", "carrier"
      const matchIndex = carrierMatch.index ?? 0
      const beforeMatch = lowerText.substring(Math.max(0, matchIndex - 20), matchIndex)
      if (beforeMatch.match(/\b(has|with|carrier|insurance|insured by)\s*$/)) {
        return {
          fieldName: 'currentCarrier',
          value: carrierUpper,
          originalText: carrierMatch[0],
          startIndex: matchIndex,
          endIndex: matchIndex + carrierMatch[0].length,
        }
      }
    }
  }

  return null
}
