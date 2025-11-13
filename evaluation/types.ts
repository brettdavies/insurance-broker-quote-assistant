/**
 * Type Definitions for Evaluation Harness
 *
 * Evaluation-specific types that reference shared types from @repo/shared
 */

import type {
  BundleOption,
  DeductibleOptimization,
  IntakeResult,
  Opportunity,
  PolicyAnalysisResult,
  PolicySummary,
  RouteDecision,
  UserProfile,
} from '../packages/shared/src/index'
import type { TestMetrics } from './services/metrics-calculator'

/**
 * Test Case Definition
 *
 * Represents a single test case for evaluation harness.
 * Uses shared types for expected values to ensure type safety.
 *
 * FLOW-SPECIFIC FIELDS:
 * - Conversational: input, expectedProfile, expectedRoute, expectedDisclaimers
 * - Policy: policyInput, expectedPolicy, expectedOpportunities, expectedBundleOptions, expectedDeductibleOptimizations, expectedDisclaimers
 *
 * Note: expectedOpportunities is IGNORED for conversational tests (not required by PEAK6 spec)
 */
export interface TestCase {
  id: string
  name: string
  description: string
  type: 'conversational' | 'policy'
  carrier: string
  state: string
  product: string | string[]

  // Conversational test case fields (PEAK6 spec requirements)
  input?: string // User message for conversational intake
  expectedProfile?: UserProfile // Expected extracted fields
  expectedRoute?: RouteDecision // Expected routing decision
  expectedDisclaimers?: string[] // Expected compliance disclaimers (substrings to match)

  // Policy test case fields (PEAK6 spec requirements)
  policyInput?: string | PolicySummary // Policy document or structured policy data
  expectedPolicy?: PolicySummary // Expected parsed policy
  expectedOpportunities?: Opportunity[] // Expected discount opportunities (POLICY ONLY - ignored for conversational)
  expectedBundleOptions?: BundleOption[] // Expected bundle opportunities (POLICY ONLY)
  expectedDeductibleOptimizations?: DeductibleOptimization[] // Expected deductible optimizations (POLICY ONLY)

  // Common fields
  missingFields?: string[]
  notes?: string
}

/**
 * Test Result
 *
 * Result of executing a test case, including actual API response and calculated metrics.
 */
export interface TestResult {
  testCase: TestCase
  passed: boolean
  error?: string
  actualResponse?: IntakeResult | PolicyAnalysisResult
  metrics?: TestMetrics
}

// Re-export TestMetrics for convenience
export type { TestMetrics } from './services/metrics-calculator'
