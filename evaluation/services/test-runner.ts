/**
 * Test Runner Orchestrator
 *
 * Delegates test execution to flow-specific runners.
 * Follows OCP (Open/Closed Principle): Open for extension (add new runners), closed for modification.
 */

import type { Browser } from 'playwright'
import type { TestCase, TestResult } from '../types'
import { runConversationalTest } from './conversational-test-runner'
import { runPolicyTest } from './policy-test-runner'

/**
 * Run a single test case (orchestrator)
 *
 * Delegates to the appropriate flow-specific test runner based on test type.
 *
 * @param testCase - Test case to run
 * @param sharedBrowser - Optional shared browser instance for better performance
 */
export async function runTestCase(
  testCase: TestCase,
  sharedBrowser?: Browser
): Promise<TestResult> {
  if (testCase.type === 'conversational') {
    return await runConversationalTest(testCase, sharedBrowser)
  }

  if (testCase.type === 'policy') {
    return await runPolicyTest(testCase, sharedBrowser)
  }

  throw new Error(`Unknown test type: ${testCase.type}`)
}
