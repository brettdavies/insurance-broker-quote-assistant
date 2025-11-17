/**
 * Field Extraction Helpers
 *
 * Helper functions for field extraction logic.
 * Single Responsibility: Field extraction helper functions only
 */

import type { NormalizedField, UserProfile } from '@repo/shared'
import { inferExistingPolicies, normalizeCarrierName } from '@repo/shared'
import type { ExtractionResult } from '../conversational-extractor'

/**
 * Normalize carrier names in profile and known/inferred fields
 *
 * @param profile - User profile
 * @param knownFields - Known fields
 * @param inferredFields - Inferred fields
 * @returns Updated profile, knownFields, and inferredFields with normalized carrier names
 */
export function normalizeCarrierNames(
  profile: Partial<UserProfile>,
  knownFields: Partial<UserProfile>,
  inferredFields: Partial<UserProfile>
): {
  profile: Partial<UserProfile>
  knownFields: Partial<UserProfile>
  inferredFields: Partial<UserProfile>
} {
  // Normalize carrier name using alias map (handles abbreviations like "pro" → "PROGRESSIVE")
  if (profile.currentCarrier) {
    profile.currentCarrier = normalizeCarrierName(profile.currentCarrier)
    // Also normalize in known/inferred fields
    if (knownFields.currentCarrier) {
      knownFields.currentCarrier = normalizeCarrierName(knownFields.currentCarrier)
    }
    if (inferredFields.currentCarrier) {
      inferredFields.currentCarrier = normalizeCarrierName(inferredFields.currentCarrier)
    }
  }

  return { profile, knownFields, inferredFields }
}

/**
 * Infer existing policies from currentCarrier and productType
 *
 * @param profile - User profile
 * @param knownFields - Known fields
 * @param inferredFields - Inferred fields
 * @param inferenceReasons - Inference reasons map
 * @returns Updated profile, inferredFields, and inferenceReasons with inferred policies
 */
export function inferPoliciesFromCarrier(
  profile: Partial<UserProfile>,
  knownFields: Partial<UserProfile>,
  inferredFields: Partial<UserProfile>,
  inferenceReasons: Record<string, string>
): {
  profile: Partial<UserProfile>
  inferredFields: Partial<UserProfile>
  inferenceReasons: Record<string, string>
} {
  // Infer existingPolicies from currentCarrier + productType
  if (profile.currentCarrier && profile.productType) {
    // Build a map for inference function
    const fieldsMap = new Map<string, NormalizedField>()
    fieldsMap.set('currentCarrier', {
      fieldName: 'currentCarrier',
      value: profile.currentCarrier,
      originalText: profile.currentCarrier,
      startIndex: 0,
      endIndex: 0,
    })
    fieldsMap.set('productType', {
      fieldName: 'productType',
      value: profile.productType,
      originalText: profile.productType,
      startIndex: 0,
      endIndex: 0,
    })

    const inferredPolicies = inferExistingPolicies(fieldsMap)
    if (inferredPolicies.length > 0) {
      profile.existingPolicies = inferredPolicies
      // Add to inferred fields if not in known
      if (!knownFields.existingPolicies) {
        inferredFields.existingPolicies = inferredPolicies
        inferenceReasons.existingPolicies = 'Inferred from currentCarrier + productType'
      }
    }
  }

  return { profile, inferredFields, inferenceReasons }
}

/**
 * Build final extraction result from processed fields
 *
 * @param profile - Final user profile
 * @param knownFields - Known fields
 * @param inferredFields - Inferred fields
 * @param confidence - Confidence scores
 * @param missingFields - Missing fields
 * @param reasoning - Optional reasoning
 * @param tokenUsage - Optional token usage
 * @param inferenceReasons - Inference reasons
 * @returns Extraction result
 */
export function buildExtractionResult(
  profile: Partial<UserProfile>,
  knownFields: Partial<UserProfile>,
  inferredFields: Partial<UserProfile>,
  confidence: Record<string, number>,
  missingFields: string[],
  reasoning?: string,
  tokenUsage?: import('../llm-provider').TokenUsage,
  inferenceReasons?: Record<string, string>
): ExtractionResult {
  return {
    profile, // Backward compatibility
    known: knownFields, // NEW: Known fields
    inferred: inferredFields, // NEW: Inferred fields
    extractionMethod: 'llm',
    confidence,
    missingFields,
    reasoning,
    tokenUsage, // Include token usage from LLM
    inferenceReasons, // NEW: Reasoning for each inferred field
  }
}
