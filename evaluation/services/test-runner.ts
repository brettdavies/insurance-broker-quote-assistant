/**
 * Test Runner Orchestrator
 *
 * Delegates test execution to flow-specific runners.
 * Follows OCP (Open/Closed Principle): Open for extension (add new runners), closed for modification.
 */

import type { TestCase, TestResult } from '../types'
import { runConversationalTest } from './conversational-test-runner'
import { runPolicyTest } from './policy-test-runner'

/**
 * Run a single test case (orchestrator)
 *
 * Delegates to the appropriate flow-specific test runner based on test type.
 */
export async function runTestCase(testCase: TestCase): Promise<TestResult> {
  if (testCase.type === 'conversational') {
    return await runConversationalTest(testCase)
  }

  if (testCase.type === 'policy') {
    return await runPolicyTest(testCase)
  }

  throw new Error(`Unknown test type: ${testCase.type}`)
}
