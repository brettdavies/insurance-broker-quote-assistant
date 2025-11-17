/**
 * Text Field Extractors
 *
 * Extracts text field values from broker notes text.
 * Handles patterns for zip code, current carrier, name, email, and phone.
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

/**
 * Extract name from broker notes
 * Looks for patterns like "John Doe,", "Mary Jane Smith\n", etc.
 * Only triggers on comma or newline (NOT end of string to avoid triggering while typing)
 * Allows multiple spaces between name parts (e.g., "John  Doe")
 */
export function extractName(text: string): NormalizedField | null {
  // Pattern: Capitalized words (allowing multiple spaces) followed by comma or newline
  // Matches: "John Doe,", "Mary Jane Smith\n", "John  Doe," (with multiple spaces)
  // Does NOT match at end of string to avoid triggering while typing
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?=[,\n])/g
  const nameMatch = text.match(namePattern)

  if (nameMatch) {
    // Take the first match (most likely to be a name)
    const matchedName = nameMatch[0]
    const matchIndex = text.indexOf(matchedName)

    if (matchIndex !== -1) {
      return {
        fieldName: 'name',
        value: matchedName.trim(),
        originalText: matchedName,
        startIndex: matchIndex,
        endIndex: matchIndex + matchedName.length,
      }
    }
  }

  return null
}

/**
 * Extract email address from broker notes
 * Looks for standalone email addresses (e.g., "user@example.com")
 * Requires valid email format with period in domain
 */
export function extractEmail(text: string): NormalizedField | null {
  // Pattern: Valid email format (local part, @, domain with period, TLD)
  // Matches: "user@example.com", "john.doe@company.co.uk"
  // Does NOT match key-value syntax (already handled by key-value-extractor)
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const emailMatch = text.match(emailPattern)

  if (emailMatch) {
    // Take the first match
    const matchedEmail = emailMatch[0]
    const matchIndex = text.indexOf(matchedEmail)

    // Skip if it's part of key-value syntax (e.g., "e:user@example.com")
    // Check if there's a colon immediately before the email with NO space (key-value syntax)
    if (matchIndex > 0) {
      const charBefore = text[matchIndex - 1]
      if (charBefore === ':') {
        // Check if it's "e:" or "email:" pattern
        const beforeEmail = text.substring(Math.max(0, matchIndex - 10), matchIndex)
        if (beforeEmail.match(/\b(e|email):$/i)) {
          return null // Already handled by key-value extractor
        }
      }
    }

    if (matchIndex !== -1) {
      return {
        fieldName: 'email',
        value: matchedEmail,
        originalText: matchedEmail,
        startIndex: matchIndex,
        endIndex: matchIndex + matchedEmail.length,
      }
    }
  }

  return null
}

/**
 * Extract phone number from broker notes
 * Looks for deterministic phone number patterns:
 * - (nnn) nnn-nnnn
 * - (nnn)nnn-nnnn
 * - nnn-nnn-nnnn
 * Normalizes to nnn-nnn-nnnn format
 */
export function extractPhone(text: string): NormalizedField | null {
  // Phone number patterns (order matters - more specific first)
  const phonePatterns = [
    // Pattern 1: (nnn) nnn-nnnn
    {
      regex: /\((\d{3})\)\s+(\d{3})-(\d{4})/g,
      normalize: (match: RegExpExecArray) => `${match[1]}-${match[2]}-${match[3]}`,
    },
    // Pattern 2: (nnn)nnn-nnnn
    {
      regex: /\((\d{3})\)(\d{3})-(\d{4})/g,
      normalize: (match: RegExpExecArray) => `${match[1]}-${match[2]}-${match[3]}`,
    },
    // Pattern 3: nnn-nnn-nnnn
    {
      regex: /\b(\d{3})-(\d{3})-(\d{4})\b/g,
      normalize: (match: RegExpExecArray) => `${match[1]}-${match[2]}-${match[3]}`,
    },
  ]

  for (const { regex, normalize } of phonePatterns) {
    regex.lastIndex = 0
    const match = regex.exec(text)
    if (match) {
      const startIndex = match.index
      const originalText = match[0]
      const normalizedValue = normalize(match)

      // Skip if it's part of key-value syntax (already handled by key-value-extractor)
      // Check if there's a colon immediately before the phone with NO space
      if (startIndex > 0) {
        const charBefore = text[startIndex - 1]
        if (charBefore === ':') {
          // Check if it's "phone:" or "p:" pattern
          const beforePhone = text.substring(Math.max(0, startIndex - 10), startIndex)
          if (beforePhone.match(/\b(phone|p):$/i)) {
            // Try next pattern or continue
            continue
          }
        }
      }

      return {
        fieldName: 'phone',
        value: normalizedValue,
        originalText,
        startIndex,
        endIndex: startIndex + originalText.length,
      }
    }
  }

  return null
}
