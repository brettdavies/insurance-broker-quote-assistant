/**
 * Boolean Field Extractors
 *
 * Extracts boolean field values from broker notes text.
 * Handles patterns for home ownership and clean driving record.
 */

import type { NormalizedField } from '../types'

/**
 * Extract home ownership status from broker notes
 * Looks for patterns like "owns home", "homeowner", "rents", "renting", etc.
 */
export function extractOwnsHome(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Positive indicators - handle end of string with $ anchor
  const ownsPatterns = [
    /\b(owns\s+home|homeowner|owns\s+house|owns\s+property|home\s+owner)(?:\s|$|\.|,)/i,
    /\b(owns\s+home|homeowner|owns\s+house|owns\s+property|home\s+owner)$/i, // End of string
  ]

  for (const pattern of ownsPatterns) {
    const ownsMatch = text.match(pattern)
    if (ownsMatch) {
      const startIndex = ownsMatch.index ?? 0
      // Extract just the matched phrase without trailing punctuation
      const phraseMatch = ownsMatch[0].match(
        /\b(owns\s+home|homeowner|owns\s+house|owns\s+property|home\s+owner)\b/i
      )
      if (phraseMatch?.[1] && phraseMatch.index !== undefined) {
        const phraseStartIndex = startIndex + phraseMatch.index
        return {
          fieldName: 'ownsHome',
          value: true,
          originalText: phraseMatch[1],
          startIndex: phraseStartIndex,
          endIndex: phraseStartIndex + phraseMatch[1].length,
        }
      }
    }
  }
  return null
}

/**
 * Extract clean driving record from broker notes
 * Looks for patterns like:
 * - "clean record 3yrs", "clean record 5 years", "no accidents 3 years"
 * - "3 years clean", "5 clean", "3yr clean" (number-first patterns)
 */
export function extractCleanRecord(text: string): NormalizedField | null {
  const lowerText = text.toLowerCase()

  // Pattern 1: "clean record X years/yrs" or "no accidents X years/yrs"
  const cleanRecordPattern =
    /\b(clean record|no accidents|accident[- ]free)\s+(\d+)\s*(?:years?|yrs?)(?:\s|$|\.|\,)/i
  const match1 = text.match(cleanRecordPattern)
  if (match1?.[2]) {
    const years = Number.parseInt(match1[2], 10)
    if (!Number.isNaN(years) && years > 0) {
      const startIndex = match1.index ?? 0
      const fieldName = years >= 5 ? 'cleanRecord5Yr' : 'cleanRecord3Yr'
      return {
        fieldName,
        value: true,
        originalText: match1[0],
        startIndex,
        endIndex: startIndex + match1[0].length,
      }
    }
  }

  // Pattern 2: "X years clean" or "X clean" (number-first patterns)
  // Matches: "3 years clean", "5 clean", "3yr clean", "5yrs clean"
  const reversedPattern = /\b(\d+)\s*(?:years?|yrs?)?\s+clean(?:\s+record)?(?:\s|$|\.|\,)/i
  const match2 = text.match(reversedPattern)
  if (match2?.[1]) {
    const years = Number.parseInt(match2[1], 10)
    if (!Number.isNaN(years) && years > 0) {
      const startIndex = match2.index ?? 0
      const fieldName = years >= 5 ? 'cleanRecord5Yr' : 'cleanRecord3Yr'
      return {
        fieldName,
        value: true,
        originalText: match2[0],
        startIndex,
        endIndex: startIndex + match2[0].length,
      }
    }
  }

  return null
}
