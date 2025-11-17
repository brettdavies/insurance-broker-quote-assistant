/**
 * Conversational Test Runner
 *
 * Runs conversational intake test cases using direct API calls.
 * Tests the backend extraction pipeline: send message → get extracted fields.
 *
 * Follows SRP: Only handles conversational test execution.
 */

import type { IntakeResult } from '../../packages/shared/src/index'
import type { TestCase, TestResult } from '../types'
import { calculateMetrics } from './metrics-calculator'
import { fetchAPI } from './test-runner-common'

/**
 * Run a single conversational intake test case
 *
 * @param testCase - Test case to run
 */
export async function runConversationalTest(testCase: TestCase): Promise<TestResult> {
  if (testCase.type !== 'conversational') {
    throw new Error('This runner only handles conversational test cases')
  }

  try {
    const actualResponse = await callIntakeEndpoint(testCase.input || '', testCase.id)
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
 * Call /api/intake endpoint directly
 *
 * Sends raw message to API and lets backend handle all extraction.
 *
 * @param input - Raw text input
 * @param testId - Test case ID for error messages
 */
async function callIntakeEndpoint(
  input: string,
  testId: string
): Promise<IntakeResult | undefined> {
  return await fetchAPI<IntakeResult>('/intake', 'POST', {
    message: input, // Raw message - backend extracts everything
  })
}
