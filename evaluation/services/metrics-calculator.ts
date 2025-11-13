/**
 * Metrics Calculator
 *
 * Calculates evaluation metrics for test cases: routing accuracy, intake completeness,
 * pitch clarity, and compliance pass rate.
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
  routingAccuracy: number
  intakeCompleteness: number
  discountAccuracy: number
  pitchClarity: number
  compliancePassed: boolean
}

/**
 * Calculate metrics for a test case
 */
export function calculateMetrics(testCase: TestCase, actualResponse: unknown): TestMetrics {
  if (!actualResponse) {
    return {
      routingAccuracy: 0,
      intakeCompleteness: 0,
      pitchClarity: 0,
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
 */
function calculateConversationalMetrics(testCase: TestCase, response: IntakeResult): TestMetrics {
  const routingAccuracy = calculateRoutingAccuracy(testCase.expectedRoute, response.route)
  const intakeCompleteness = calculateFieldCompleteness(testCase.expectedProfile, response.profile)
  const discountAccuracy = calculateDiscountAccuracy(
    testCase.expectedOpportunities,
    response.opportunities
  )
  const pitchClarity = scorePitchClarity(response.pitch || '', response.opportunities || [])
  const compliancePassed = response.complianceValidated === true

  return {
    routingAccuracy,
    intakeCompleteness,
    discountAccuracy,
    pitchClarity,
    compliancePassed,
  }
}

/**
 * Calculate metrics for policy analysis test case
 */
function calculatePolicyMetrics(testCase: TestCase, response: PolicyAnalysisResult): TestMetrics {
  // Routing accuracy is N/A for policy analysis
  const routingAccuracy = 100
  const intakeCompleteness = calculateFieldCompleteness(
    testCase.expectedPolicy,
    response.currentPolicy
  )
  const discountAccuracy = calculateDiscountAccuracy(
    testCase.expectedOpportunities,
    response.opportunities
  )
  const pitchClarity = scorePitchClarity(response.pitch || '', response.opportunities || [])
  const compliancePassed = response.complianceValidated === true

  return {
    routingAccuracy,
    intakeCompleteness,
    discountAccuracy,
    pitchClarity,
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
    if (key === 'currentCarrier' && typeof expectedValue === 'string' && typeof actualValue === 'string') {
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
