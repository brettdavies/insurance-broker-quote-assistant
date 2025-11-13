/**
 * Report Utility Functions
 *
 * Reusable utility functions for report generation.
 * Follows DRY principle (Don't Repeat Yourself).
 */

import type { TestResult } from '../types'

/**
 * Calculate average of an array of numbers
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

/**
 * Calculate accuracy percentage across grouped results
 *
 * @param results - Test results to aggregate
 * @param groupBy - Function to extract group key from result
 * @param isSuccess - Function to determine if result is successful
 * @returns Record mapping group key to accuracy percentage
 */
export function aggregateAccuracy(
  results: TestResult[],
  groupBy: (r: TestResult) => string,
  isSuccess: (r: TestResult) => boolean
): Record<string, number> {
  const stats: Record<string, { passed: number; total: number }> = {}

  for (const result of results) {
    const key = groupBy(result)
    if (!stats[key]) {
      stats[key] = { passed: 0, total: 0 }
    }
    stats[key].total++
    if (isSuccess(result)) {
      stats[key].passed++
    }
  }

  const accuracy: Record<string, number> = {}
  for (const [key, stat] of Object.entries(stats)) {
    accuracy[key] = stat.total > 0 ? Math.round((stat.passed / stat.total) * 100) : 0
  }

  return accuracy
}

/**
 * Format table rows from a record of data
 *
 * @param data - Record of data to format
 * @param formatter - Function to format each row
 * @returns Markdown table rows joined with newlines
 */
export function formatTableRows<T>(
  data: Record<string, T>,
  formatter: (key: string, value: T) => string
): string {
  const rows = Object.entries(data).map(([key, value]) => formatter(key, value))
  return rows.length > 0 ? rows.join('\n') : ''
}

/**
 * Parse ISO timestamp to milliseconds
 */
export function parseTimestamp(timestamp: string): number {
  return new Date(timestamp).getTime()
}

/**
 * Format currency with 4 decimal places
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(4)}`
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number): string {
  return `${value}%`
}

/**
 * Filter results by test type
 */
export function filterByTestType(
  results: TestResult[],
  type: 'conversational' | 'policy'
): TestResult[] {
  return results.filter((r) => r.testCase.type === type)
}

/**
 * Find closest value within time window
 *
 * @param targetTime - Target timestamp in milliseconds
 * @param candidates - Map of candidate timestamps to values
 * @param windowMs - Maximum time difference in milliseconds
 * @returns Closest value within window, or undefined
 */
export function findClosestInTimeWindow<T>(
  targetTime: number,
  candidates: Map<number, T>,
  windowMs: number
): T | undefined {
  for (const [candidateTime, value] of candidates.entries()) {
    const timeDiff = Math.abs(candidateTime - targetTime)
    if (timeDiff < windowMs) {
      return value
    }
  }
  return undefined
}

/**
 * Find closest value BEFORE target time within window
 *
 * @param targetTime - Target timestamp in milliseconds
 * @param candidates - Map of candidate timestamps to values
 * @param windowMs - Maximum time difference in milliseconds
 * @returns Closest value before target within window, or undefined
 */
export function findClosestBeforeTime<T>(
  targetTime: number,
  candidates: Map<number, T>,
  windowMs: number
): { time: number; value: T } | undefined {
  let closestTime: number | null = null
  let minTimeDiff = windowMs

  for (const candidateTime of candidates.keys()) {
    const timeDiff = targetTime - candidateTime
    // Candidate should be before target (positive diff) and within window
    if (timeDiff >= 0 && timeDiff < minTimeDiff) {
      closestTime = candidateTime
      minTimeDiff = timeDiff
    }
  }

  if (closestTime !== null) {
    const value = candidates.get(closestTime)
    if (value) {
      return { time: closestTime, value }
    }
  }

  return undefined
}

/**
 * Get most recent entry from time-based map
 */
export function getMostRecent<T>(entries: Map<number, T>): T | undefined {
  if (entries.size === 0) return undefined
  const sorted = Array.from(entries.entries()).sort((a, b) => b[0] - a[0])
  return sorted[0][1]
}
