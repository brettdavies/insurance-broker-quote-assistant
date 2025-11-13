/**
 * Report Metrics Aggregator
 *
 * Aggregates metrics across multiple test results for report generation.
 * Follows SRP (Single Responsibility Principle).
 */

import type { DecisionTrace, IntakeResult, PolicyAnalysisResult } from '@repo/shared'
import type { TestResult } from '../types'
import { aggregateAccuracy, calculateAverage, filterByTestType } from './report-utils'
import { calculateCost, extractTokenUsage } from './token-tracker'

/**
 * Overall metrics for all test results
 */
export interface OverallMetrics {
  routingAccuracy: number
  intakeCompleteness: number
  discountAccuracyAverage: number
  pitchClarityAverage: number
  compliancePassRate: number
}

/**
 * Token usage data
 */
export interface TokenUsageData {
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  perTest: Array<{
    testId: string
    inputTokens: number
    outputTokens: number
    cost: number
  }>
}

/**
 * Calculate overall metrics from test results
 */
export function calculateOverallMetrics(results: TestResult[]): OverallMetrics {
  const conversationalResults = filterByTestType(results, 'conversational')

  // Routing accuracy (conversational only)
  const routingAccuracies = conversationalResults
    .map((r) => r.metrics?.routingAccuracy || 0)
    .filter((acc) => acc > 0)
  const routingAccuracy = calculateAverage(routingAccuracies)

  // Intake completeness (all results)
  const intakeCompletenesses = results.map((r) => r.metrics?.intakeCompleteness || 0)
  const intakeCompleteness = calculateAverage(intakeCompletenesses)

  // Discount accuracy (all results)
  const discountAccuracies = results.map((r) => r.metrics?.discountAccuracy || 0)
  const discountAccuracyAverage = calculateAverage(discountAccuracies)

  // Pitch clarity (all results)
  const pitchClarities = results.map((r) => r.metrics?.pitchClarity || 0)
  const pitchClarityAverage = calculateAverage(pitchClarities)

  // Compliance pass rate (all results)
  const compliancePassed = results.filter((r) => r.metrics?.compliancePassed === true).length
  const compliancePassRate =
    results.length > 0 ? Math.round((compliancePassed / results.length) * 100) : 0

  return {
    routingAccuracy,
    intakeCompleteness,
    discountAccuracyAverage,
    pitchClarityAverage,
    compliancePassRate,
  }
}

/**
 * Calculate per-carrier routing accuracy
 */
export function calculatePerCarrierRouting(results: TestResult[]): Record<string, number> {
  const conversationalResults = filterByTestType(results, 'conversational')
  return aggregateAccuracy(
    conversationalResults,
    (r) => r.testCase.carrier,
    (r) => r.metrics?.routingAccuracy === 100
  )
}

/**
 * Calculate per-state routing accuracy
 */
export function calculatePerStateRouting(results: TestResult[]): Record<string, number> {
  const conversationalResults = filterByTestType(results, 'conversational')
  return aggregateAccuracy(
    conversationalResults,
    (r) => r.testCase.state,
    (r) => r.metrics?.routingAccuracy === 100
  )
}

/**
 * Calculate field completeness (simplified - returns average for all fields)
 */
export function calculateFieldCompleteness(results: TestResult[]): Record<string, number> {
  const intakeCompletenesses = results.map((r) => r.metrics?.intakeCompleteness || 0)
  const average = calculateAverage(intakeCompletenesses)

  return {
    state: average,
    productType: average,
    age: average,
    cleanRecord3Yr: average,
  }
}

/**
 * Extract trace from API response
 */
function extractTrace(response: unknown): DecisionTrace | undefined {
  return (
    (response as IntakeResult | PolicyAnalysisResult).trace ||
    (response as { trace?: DecisionTrace }).trace
  )
}

/**
 * Extract token usage data from test results
 */
export function extractTokenUsageData(results: TestResult[]): TokenUsageData {
  let totalInputTokens = 0
  let totalOutputTokens = 0
  const perTest: Array<{
    testId: string
    inputTokens: number
    outputTokens: number
    cost: number
  }> = []

  for (const result of results) {
    if (result.actualResponse) {
      const trace = extractTrace(result.actualResponse)
      if (trace) {
        const { inputTokens, outputTokens } = extractTokenUsage(trace)
        totalInputTokens += inputTokens
        totalOutputTokens += outputTokens
        const cost = calculateCost(inputTokens, outputTokens)

        perTest.push({
          testId: result.testCase.id,
          inputTokens,
          outputTokens,
          cost,
        })
      }
    }
  }

  return {
    totalInputTokens,
    totalOutputTokens,
    totalCost: calculateCost(totalInputTokens, totalOutputTokens),
    perTest,
  }
}
