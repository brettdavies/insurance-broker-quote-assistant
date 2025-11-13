/**
 * Metrics Calculator
 *
 * Calculates evaluation metrics for test cases with flow-specific requirements:
 * - Conversational: routing, intake completeness, prefill, compliance
 * - Policy: intake completeness, discount accuracy, pitch clarity, compliance
 */

import type {
  IntakeResult,
  PolicyAnalysisResult,
  PolicySummary,
  RouteDecision,
  UserProfile,
} from '../../packages/shared/src/index'
import type { TestCase } from '../types'

export interface TestMetrics {
  routingAccuracy: number // Conversational only (N/A for policy = 100)
  intakeCompleteness: number // Both flows
  discountAccuracy: number // Policy only (N/A for conversational = 100)
  pitchClarity: number // Policy only (N/A for conversational = 0)
  prefillCompleteness: number // Conversational only (N/A for policy = 100)
  compliancePassed: boolean // Both flows
}

/**
 * Calculate metrics for a test case
 */
export function calculateMetrics(testCase: TestCase, actualResponse: unknown): TestMetrics {
  if (!actualResponse) {
    return {
      routingAccuracy: 0,
      intakeCompleteness: 0,
      discountAccuracy: 0,
      pitchClarity: 0,
      prefillCompleteness: 0,
      compliancePassed: false,
    }
  }

  if (testCase.type === 'conversational') {
    return calculateConversationalMetrics(testCase, actualResponse as IntakeResult)
  }
  return calculatePolicyMetrics(testCase, actualResponse as PolicyAnalysisResult)
}

/**
 * Calculate metrics for conversational intake test case
 * Per PEAK6 spec: conversational flow does NOT require pitch or discount detection
 */
function calculateConversationalMetrics(testCase: TestCase, response: IntakeResult): TestMetrics {
  const routingAccuracy = calculateRoutingAccuracy(testCase.expectedRoute, response.route)
  const intakeCompleteness = calculateFieldCompleteness(testCase.expectedProfile, response.profile)
  const prefillCompleteness = calculatePrefillCompleteness(response.prefill)

  // Compliance check: both complianceValidated AND expected disclaimers must be present
  const compliancePassed =
    response.complianceValidated === true &&
    verifyDisclaimers(testCase.expectedDisclaimers, response.disclaimers)

  return {
    routingAccuracy,
    intakeCompleteness,
    discountAccuracy: 100, // N/A for conversational (not required by spec)
    pitchClarity: 0, // N/A for conversational (not required by spec)
    prefillCompleteness,
    compliancePassed,
  }
}

/**
 * Calculate metrics for policy analysis test case
 * Per PEAK6 spec: policy flow DOES require pitch generation and discount detection
 */
function calculatePolicyMetrics(testCase: TestCase, response: PolicyAnalysisResult): TestMetrics {
  const intakeCompleteness = calculateFieldCompleteness(
    testCase.expectedPolicy,
    response.currentPolicy
  )
  const discountAccuracy = calculateDiscountAccuracy(
    testCase.expectedOpportunities,
    response.opportunities
  )
  const pitchClarity = scorePitchClarity(response.pitch || '', response.opportunities || [])

  // Compliance check: both complianceValidated AND expected disclaimers must be present
  const compliancePassed =
    response.complianceValidated === true &&
    verifyDisclaimers(testCase.expectedDisclaimers, response.disclaimers)

  return {
    routingAccuracy: 100, // N/A for policy analysis (not applicable)
    intakeCompleteness,
    discountAccuracy,
    pitchClarity,
    prefillCompleteness: 100, // N/A for policy (not applicable)
    compliancePassed,
  }
}

/**
 * Calculate routing accuracy by comparing expected vs actual carrier
 * Passes if expected carrier is either the primary carrier OR in tiedCarriers array
 */
function calculateRoutingAccuracy(
  expectedRoute?: RouteDecision,
  actualRoute?: RouteDecision
): number {
  if (!expectedRoute || !actualRoute) return 0

  // Check if expected carrier is the primary carrier
  const isPrimary = expectedRoute.primaryCarrier === actualRoute.primaryCarrier

  // Check if expected carrier is in tied carriers (when there's a tie)
  const isTied = actualRoute.tiedCarriers?.includes(expectedRoute.primaryCarrier) || false

  // Pass if expected carrier is either primary or tied
  return isPrimary || isTied ? 100 : 0
}

/**
 * Calculate discount detection accuracy by comparing expected vs actual discounts
 */
function calculateDiscountAccuracy(
  expectedOpportunities?: Array<{ discount: string; percentage?: number; annualSavings?: number }>,
  actualOpportunities?: Array<{ discountName: string; percentage?: number; annualSavings?: number }>
): number {
  // If no expected discounts, consider it 100% accurate (nothing to detect)
  if (!expectedOpportunities || expectedOpportunities.length === 0) return 100

  // If expected discounts but got none, 0% accuracy
  if (!actualOpportunities || actualOpportunities.length === 0) return 0

  // Count how many expected discounts were detected
  const matchedCount = expectedOpportunities.filter((expected) =>
    actualOpportunities.some((actual) => actual.discountName === expected.discount)
  ).length

  return Math.round((matchedCount / expectedOpportunities.length) * 100)
}

/**
 * Calculate field completeness percentage
 */
function calculateFieldCompleteness(
  expected?: UserProfile | PolicySummary,
  actual?: UserProfile | PolicySummary
): number {
  if (!expected || !actual) return 0

  const expectedObj = expected as Record<string, unknown>
  const actualObj = actual as Record<string, unknown>

  const expectedFields = Object.keys(expectedObj).filter((key) => {
    const value = expectedObj[key]
    return value !== undefined && value !== null && value !== ''
  })

  if (expectedFields.length === 0) return 100

  const matchedFields = expectedFields.filter((key) => {
    const expectedValue = expectedObj[key]
    const actualValue = actualObj[key]

    // Case-insensitive comparison for carrier fields
    if (
      key === 'currentCarrier' &&
      typeof expectedValue === 'string' &&
      typeof actualValue === 'string'
    ) {
      return expectedValue.toLowerCase() === actualValue.toLowerCase()
    }

    return JSON.stringify(expectedValue) === JSON.stringify(actualValue)
  })

  return Math.round((matchedFields.length / expectedFields.length) * 100)
}

/**
 * Score pitch clarity using rubric (0-100 points)
 * Rubric: 25 points each for: "because" rationale, discount percentages, dollar savings, citations
 */
function scorePitchClarity(pitch: string, opportunities: unknown[]): number {
  let score = 0

  // Check for "because" rationale (25 points)
  if (/\bbecause\b/i.test(pitch)) score += 25

  // Check for discount percentages (25 points)
  if (/%\s*off|\d+%\s*(discount|savings|off)/i.test(pitch)) score += 25

  // Check for dollar savings (25 points)
  if (/\$\d+|\d+\s*dollars?/i.test(pitch)) score += 25

  // Check for citations (25 points)
  if (/\[.*?\]|disc_\w+|cite_\w+/i.test(pitch)) score += 25

  return score
}

/**
 * Calculate prefill packet completeness
 * Checks if prefill packet exists and has required structured fields
 */
function calculatePrefillCompleteness(prefill: unknown): number {
  if (!prefill || typeof prefill !== 'object') return 0

  const prefillObj = prefill as Record<string, unknown>

  // Required fields for structured IQuote Pro prefill packet
  const requiredFields = [
    'profile', // UserProfile object with complete shopper data
    'routing', // RouteDecision object with carrier recommendations
    'missingFields', // Array of missing fields with priorities
    'disclaimers', // Array of compliance disclaimers
    'generatedAt', // ISO 8601 timestamp
  ]

  const presentFields = requiredFields.filter((field) => {
    const value = prefillObj[field]
    // Check for both existence and non-empty values
    if (value === undefined || value === null) return false
    // Arrays should have length check
    if (Array.isArray(value)) return true // Empty arrays are valid
    // Objects should be non-empty
    if (typeof value === 'object') return Object.keys(value).length > 0
    return true
  })

  return Math.round((presentFields.length / requiredFields.length) * 100)
}

/**
 * Verify that expected disclaimers are present in actual disclaimers
 * Uses substring matching to allow for partial matches
 *
 * @param expectedDisclaimers - Array of expected disclaimer substrings from test case
 * @param actualDisclaimers - Array of actual disclaimers from API response
 * @returns true if all expected disclaimers are present (or no expected disclaimers), false otherwise
 */
function verifyDisclaimers(expectedDisclaimers?: string[], actualDisclaimers?: string[]): boolean {
  // If no expected disclaimers, pass (nothing to verify)
  if (!expectedDisclaimers || expectedDisclaimers.length === 0) return true

  // If expected disclaimers but no actual disclaimers, fail
  if (!actualDisclaimers || actualDisclaimers.length === 0) return false

  // Check if all expected disclaimers are present in actual disclaimers (substring matching)
  return expectedDisclaimers.every((expectedDisclaimer) =>
    actualDisclaimers.some((actualDisclaimer) => actualDisclaimer.includes(expectedDisclaimer))
  )
}
