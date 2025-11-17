/**
 * Confidence Score Calculator
 *
 * Calculates confidence score (0-100) for validated opportunities
 * based on policy data completeness, customer profile availability,
 * and discount rule clarity.
 *
 * @see docs/stories/2.3.discount-rules-engine.md#task-5
 */

import type { PolicySummary, UserProfile } from '@repo/shared'
import type { ValidationDetails } from '@repo/shared'
import type { Opportunity } from '@repo/shared'

/**
 * Confidence score breakdown by factor
 */
export interface ConfidenceScoreBreakdown {
  policyDataCompleteness: number // 0-40 points
  customerProfileAvailability: number // 0-30 points
  discountRuleClarity: number // 0-30 points
  total: number // 0-100 points
}

/**
 * Calculate confidence score for an opportunity
 *
 * @param opportunity - Opportunity being validated
 * @param policy - Policy summary
 * @param customerData - Optional customer profile data
 * @param validationDetails - Validation details from eligibility checks
 * @returns Confidence score (0-100) with breakdown
 */
export function calculateConfidenceScore(
  opportunity: Opportunity,
  policy: PolicySummary,
  customerData: UserProfile | undefined,
  validationDetails: ValidationDetails
): ConfidenceScoreBreakdown {
  // Factor 1: Policy data completeness (0-40 points)
  let policyDataCompleteness = 0
  if (policy.state) policyDataCompleteness += 10
  if (policy.productType) policyDataCompleteness += 10
  if (policy.premiums?.annual) policyDataCompleteness += 10
  if (policy.carrier) policyDataCompleteness += 10

  // Factor 2: Customer profile availability (0-30 points)
  let customerProfileAvailability = 0
  if (customerData) {
    customerProfileAvailability += 10 // Profile provided
    if (customerData.age !== undefined) customerProfileAvailability += 5
    if (customerData.cleanRecord3Yr !== undefined) customerProfileAvailability += 5
    // Additional fields that might be present (check if they exist)
    if ('goodStudent' in customerData && customerData.goodStudent !== undefined)
      customerProfileAvailability += 5
    if (
      ('military' in customerData && customerData.military !== undefined) ||
      ('veteran' in customerData && customerData.veteran !== undefined)
    )
      customerProfileAvailability += 5
  }

  // Factor 3: Discount rule clarity (0-30 points)
  let discountRuleClarity = 0
  const eligibilityChecks = validationDetails.eligibilityChecks
  if (eligibilityChecks.discountFound) discountRuleClarity += 10
  if (eligibilityChecks.eligibilityValidated) discountRuleClarity += 10
  if (eligibilityChecks.savingsCalculated) discountRuleClarity += 10

  // Penalize for missing data
  if (validationDetails.missingData.length > 0) {
    const missingPenalty = Math.min(validationDetails.missingData.length * 2, 10)
    discountRuleClarity = Math.max(0, discountRuleClarity - missingPenalty)
  }

  const total = policyDataCompleteness + customerProfileAvailability + discountRuleClarity

  return {
    policyDataCompleteness,
    customerProfileAvailability,
    discountRuleClarity,
    total: Math.min(100, Math.max(0, total)), // Clamp to 0-100
  }
}
