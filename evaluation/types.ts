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
 */
export interface TestCase {
  id: string
  name: string
  description: string
  type: 'conversational' | 'policy'
  carrier: string
  state: string
  product: string | string[]
  // Conversational test case fields
  input?: string
  expectedProfile?: UserProfile
  expectedRoute?: RouteDecision
  expectedOpportunities?: Opportunity[]
  // Policy test case fields
  policyInput?: string | PolicySummary
  expectedPolicy?: PolicySummary
  expectedBundleOptions?: BundleOption[]
  expectedDeductibleOptimizations?: DeductibleOptimization[]
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
