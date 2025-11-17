/**
 * Shared data extraction utilities
 *
 * Centralized data extraction functions used across report generation.
 * Follows STAR principle (Single Truth, Authoritative Record).
 */

import type { DecisionTrace, IntakeResult, PolicyAnalysisResult } from '@repo/shared'
import type { TestCase, TestResult } from '../../types'

/**
 * Extract trace from API response or test result
 *
 * Handles both IntakeResult and PolicyAnalysisResult types.
 * Returns DecisionTrace | undefined for type safety.
 */
export function extractTrace(responseOrResult: unknown | TestResult): DecisionTrace | undefined {
  // Handle TestResult
  if (
    responseOrResult &&
    typeof responseOrResult === 'object' &&
    'actualResponse' in responseOrResult
  ) {
    const result = responseOrResult as TestResult
    if (!result.actualResponse) return undefined
    return extractTrace(result.actualResponse)
  }

  // Handle direct response
  const response = responseOrResult as
    | IntakeResult
    | PolicyAnalysisResult
    | { trace?: DecisionTrace }
    | undefined

  if (!response || typeof response !== 'object') return undefined

  // Check for trace in IntakeResult (top level)
  if ('trace' in response && response.trace) {
    return response.trace as DecisionTrace
  }

  // Check for trace in PolicyAnalysisResult (nested in extraction)
  if (
    'extraction' in response &&
    typeof response.extraction === 'object' &&
    response.extraction !== null
  ) {
    const extraction = response.extraction as { trace?: DecisionTrace }
    if (extraction.trace) {
      return extraction.trace
    }
  }

  // Fallback: check for trace property directly
  if ('trace' in response) {
    return response.trace as DecisionTrace | undefined
  }

  return undefined
}

/**
 * Extract prefill packet from IntakeResult
 */
function extractPrefillFromIntakeResult(response: IntakeResult): string {
  return JSON.stringify(response.prefill, null, 2)
}

/**
 * Extract prefill packet from PolicyAnalysisResult
 */
function extractPrefillFromPolicyResult(response: PolicyAnalysisResult): string {
  // PolicyAnalysisResult may have prefill in different location
  // Check if there's a prefill field anywhere
  if (typeof response === 'object' && response !== null) {
    for (const key of Object.keys(response)) {
      if (key.toLowerCase().includes('prefill')) {
        return JSON.stringify(response[key as keyof typeof response], null, 2)
      }
    }
  }
  return '{}'
}

/**
 * Extract prefill packet from test result
 */
export function extractPrefillPacket(result: TestResult): string {
  if (!result.actualResponse) return '{}'

  const response = result.actualResponse as IntakeResult | PolicyAnalysisResult

  // IntakeResult has prefill at top level
  if ('prefill' in response) {
    return extractPrefillFromIntakeResult(response as IntakeResult)
  }

  // PolicyAnalysisResult may have prefill in different location
  return extractPrefillFromPolicyResult(response as PolicyAnalysisResult)
}

/**
 * Get test case file name from test case
 *
 * Converts test ID to file name format:
 * - conv-01 → conversational-01
 * - policy-01 → policy-01
 */
export function getTestCaseFileName(testCase: TestCase): string {
  // Extract file name from test ID
  // conv-01 → conversational-01
  // policy-01 → policy-01
  if (testCase.id.startsWith('conv-')) {
    return `conversational-${testCase.id.replace('conv-', '')}`
  }
  if (testCase.id.startsWith('policy-')) {
    return testCase.id
  }
  return testCase.id
}
