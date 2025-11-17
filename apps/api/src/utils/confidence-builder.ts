import type { PolicySummary, UserProfile } from '@repo/shared'

/**
 * Confidence Builder Utility
 *
 * Generic utility for building confidence score maps from extracted data and LLM confidence scores.
 */

/**
 * Default confidence score for extracted fields when LLM doesn't provide confidence
 */
const DEFAULT_CONFIDENCE = 0.8

/**
 * Build confidence map for UserProfile
 *
 * @param profile - Partial user profile
 * @param llmConfidence - Confidence scores from LLM (optional)
 * @param defaultConfidence - Default confidence for fields without LLM scores (default: 0.8)
 * @returns Confidence map with scores for each field
 */
export function buildProfileConfidenceMap(
  profile: Partial<UserProfile>,
  llmConfidence: Record<string, number> = {},
  defaultConfidence: number = DEFAULT_CONFIDENCE
): Record<string, number> {
  const confidence: Record<string, number> = {}

  // Map LLM confidence scores to profile fields
  for (const key of Object.keys(profile)) {
    const typedKey = key as keyof UserProfile
    if (profile[typedKey] !== undefined) {
      // Use LLM confidence if available, otherwise use default
      confidence[key] = llmConfidence[key] ?? defaultConfidence
    }
  }

  return confidence
}

/**
 * Build confidence map for PolicySummary
 *
 * @param policy - Partial policy summary
 * @param llmConfidence - Confidence scores from LLM (optional)
 * @param defaultConfidence - Default confidence for fields without LLM scores (default: 0.8)
 * @returns Confidence map matching PolicySummary confidence structure
 */
export function buildPolicyConfidenceMap(
  policy: Partial<PolicySummary>,
  llmConfidence: Record<string, number> = {},
  defaultConfidence: number = DEFAULT_CONFIDENCE
): PolicySummary['confidence'] {
  const confidence: PolicySummary['confidence'] = {}

  // Map LLM confidence scores to policy confidence structure
  // User contact fields
  if (policy.name !== undefined) {
    confidence.name = llmConfidence.name ?? defaultConfidence
  }
  if (policy.email !== undefined) {
    confidence.email = llmConfidence.email ?? defaultConfidence
  }
  if (policy.phone !== undefined) {
    confidence.phone = llmConfidence.phone ?? defaultConfidence
  }
  if (policy.zip !== undefined) {
    confidence.zip = llmConfidence.zip ?? defaultConfidence
  }
  if (policy.state !== undefined) {
    confidence.state = llmConfidence.state ?? defaultConfidence
  }
  if (policy.address !== undefined) {
    confidence.address = llmConfidence.address ?? defaultConfidence
  }
  // Policy-specific fields
  if (policy.carrier !== undefined) {
    confidence.carrier = llmConfidence.carrier ?? defaultConfidence
  }
  if (policy.productType !== undefined) {
    confidence.productType = llmConfidence.productType ?? defaultConfidence
  }
  if (policy.coverageLimits !== undefined) {
    confidence.coverageLimits = llmConfidence.coverageLimits ?? defaultConfidence
  }
  if (policy.deductibles !== undefined) {
    confidence.deductibles = llmConfidence.deductibles ?? defaultConfidence
  }
  if (policy.premiums !== undefined) {
    confidence.premiums = llmConfidence.premiums ?? defaultConfidence
  }
  if (policy.effectiveDates !== undefined) {
    confidence.effectiveDates = llmConfidence.effectiveDates ?? defaultConfidence
  }

  return confidence
}
