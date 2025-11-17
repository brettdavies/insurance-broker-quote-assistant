/**
 * Types for report builders
 */

import type { TestMetrics } from '../metrics-calculator'

/**
 * Metric configuration for building metric table rows
 */
export interface MetricConfig {
  key: keyof TestMetrics
  label: string
  expected: string
  formatValue: (value: number) => string
  formatExpected: (value: number) => string
  isPassing: (value: number) => boolean
  applicableToFlow: (flowType: 'conversational' | 'policy') => boolean
}
