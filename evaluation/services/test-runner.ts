/**
 * Test Runner
 *
 * Executes test cases against API endpoints and collects results.
 */

import type { TestCase, TestResult } from '../types'
import { calculateMetrics } from './metrics-calculator'

const API_BASE_URL = process.env.EVALUATION_API_URL || 'http://localhost:7070/api'

/**
 * Run a single test case against the API
 */
export async function runTestCase(testCase: TestCase): Promise<TestResult> {
  try {
    const actualResponse = await callApi(testCase)
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
 * Call appropriate API endpoint based on test case type
 */
async function callApi(testCase: TestCase): Promise<unknown> {
  if (testCase.type === 'conversational') {
    return callIntakeEndpoint(testCase.input || '')
  }
  return callPolicyAnalyzeEndpoint(testCase.policyInput, testCase.expectedPolicy)
}

/**
 * Call /api/intake endpoint
 */
async function callIntakeEndpoint(input: string): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: input }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`API error: ${error.error?.message || response.statusText}`)
  }

  return response.json()
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
): Promise<unknown> {
  // API requires policySummary (PolicySummary object), policyText is optional
  // Use expectedPolicy if available, otherwise try to use policyInput if it's an object
  const policySummary =
    expectedPolicy || (typeof policyInput !== 'string' ? policyInput : undefined)
  const policyText = typeof policyInput === 'string' ? policyInput : undefined

  if (!policySummary) {
    throw new Error('PolicySummary is required for /api/policy/analyze endpoint')
  }

  const response = await fetch(`${API_BASE_URL}/policy/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      policySummary,
      ...(policyText ? { policyText } : {}),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`API error: ${error.error?.message || response.statusText}`)
  }

  return response.json()
}
