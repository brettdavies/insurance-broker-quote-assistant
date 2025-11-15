/**
 * Key-Value Extraction
 *
 * Handles key-value syntax extraction (deterministic, free).
 * Single Responsibility: Key-value extraction only
 */

import { extractStateFromText } from '@repo/shared'
import type { UserProfile } from '@repo/shared'
import { buildProfileConfidenceMap } from '../../utils/confidence-builder'
import { parseKeyValueSyntax } from '../../utils/key-value-parser'
import type { ExtractionResult } from '../conversational-extractor'
import { validateProfile } from './profile-validator'

/**
 * Extract fields using key-value parser
 *
 * @param message - Broker message text
 * @param calculateMissingFields - Function to calculate missing fields
 * @returns Extraction result with key-value extracted fields
 */
export function extractFieldsWithKeyValue(
  message: string,
  calculateMissingFields: (profile: Partial<UserProfile>) => string[]
): ExtractionResult {
  const kvResult = parseKeyValueSyntax(message)

  // Validate extracted profile against schema
  let validatedProfile = validateProfile(kvResult.profile)

  // Apply deterministic state normalization if state is missing
  if (!validatedProfile.state) {
    const extractedState = extractStateFromText(message)
    if (extractedState) {
      validatedProfile = { ...validatedProfile, state: extractedState }
    }
  }

  // Calculate missing fields
  const missingFields = calculateMissingFields(validatedProfile)

  return {
    profile: validatedProfile,
    extractionMethod: 'key-value',
    confidence: buildProfileConfidenceMap(validatedProfile, {}, 1.0), // Key-value is always 100% confident
    missingFields,
  }
}
