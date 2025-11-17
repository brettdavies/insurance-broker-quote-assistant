/**
 * Data extraction utilities for report generation
 *
 * Report-builder specific data extraction functions.
 * Shared extraction functions are in ../shared/data-extractors.ts
 */

import type { DecisionTrace } from '@repo/shared'
import type { TestResult } from '../../types'
import { extractTrace } from '../shared/data-extractors'
import { formatCurrency } from '../shared/formatters'
import { calculateCost, extractTokenUsage } from '../token-tracker'
import { buildTraceSection } from '../trace-section-builder'

/**
 * Calculate token usage from result
 */
export function calculateTokenUsage(result: TestResult): {
  inputTokens: number
  outputTokens: number
  cost: string
} {
  const trace = extractTrace(result)
  if (!trace) {
    return { inputTokens: 0, outputTokens: 0, cost: '$0.00' }
  }

  const { inputTokens, outputTokens } = extractTokenUsage(trace)
  const cost = calculateCost(inputTokens, outputTokens)

  return {
    inputTokens,
    outputTokens,
    cost: formatCurrency(cost),
  }
}

/**
 * Build trace section safely
 */
export function buildTraceSectionSafely(
  testId: string,
  trace: unknown,
  result: TestResult
): string {
  if (!trace || typeof trace !== 'object') {
    return 'No trace data available'
  }

  try {
    return buildTraceSection(testId, trace as DecisionTrace, result)
  } catch (error) {
    return `Error building trace section: ${error}`
  }
}
