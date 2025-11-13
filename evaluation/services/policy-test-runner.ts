/**
 * Policy Test Runner
 *
 * Runs policy analysis test cases using direct API calls (no browser needed).
 * Tests the policy analysis flow: send policy → get savings opportunities + pitch.
 *
 * Follows SRP: Only handles policy test execution.
 */

import type { PolicyAnalysisResult } from '../../packages/shared/src/index'
import type { TestCase, TestResult } from '../types'
import { calculateMetrics } from './metrics-calculator'
import { fetchAPI } from './test-runner-common'

/**
 * Run a single policy analysis test case
 */
export async function runPolicyTest(testCase: TestCase): Promise<TestResult> {
  if (testCase.type !== 'policy') {
    throw new Error('This runner only handles policy test cases')
  }

  try {
    const actualResponse = await callPolicyAnalyzeEndpoint(
      testCase.policyInput,
      testCase.expectedPolicy
    )
    const metrics = calculateMetrics(testCase, actualResponse)

    return {
      testCase,
      passed: true,
      actualResponse,
      metrics,
    }
  } catch (error) {
    return {
      testCase,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Call /api/policy/analyze endpoint
 *
 * API expects: { policySummary: PolicySummary, policyText?: string }
 * Test cases provide: policyInput (string) and expectedPolicy (PolicySummary)
 * We use expectedPolicy as policySummary, and policyInput as optional policyText
 */
async function callPolicyAnalyzeEndpoint(
  policyInput?: string | unknown,
  expectedPolicy?: unknown
): Promise<PolicyAnalysisResult | undefined> {
  // API requires policySummary (PolicySummary object), policyText is optional
  // Use expectedPolicy if available, otherwise try to use policyInput if it's an object
  const policySummary =
    expectedPolicy || (typeof policyInput !== 'string' ? policyInput : undefined)
  const policyText = typeof policyInput === 'string' ? policyInput : undefined

  if (!policySummary) {
    throw new Error('PolicySummary is required for /api/policy/analyze endpoint')
  }

  return await fetchAPI<PolicyAnalysisResult>('/policy/analyze', 'POST', {
    policySummary,
    ...(policyText ? { policyText } : {}),
  })
}
