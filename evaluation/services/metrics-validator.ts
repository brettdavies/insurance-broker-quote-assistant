/**
 * Metrics Validator
 *
 * Validates that evaluation metrics meet target thresholds.
 */

import type { EvaluationReport } from './report-generator'

const TARGETS = {
  routingAccuracy: 90,
  intakeCompleteness: 95,
  pitchClarity: 85,
  compliancePassRate: 100,
} as const

/**
 * Validate that metrics meet target thresholds
 */
export function validateMetrics(report: EvaluationReport): void {
  const { overallMetrics } = report
  const errors: string[] = []

  if (overallMetrics.routingAccuracy < TARGETS.routingAccuracy) {
    errors.push(
      `Routing accuracy ${overallMetrics.routingAccuracy}% below ${TARGETS.routingAccuracy}% threshold`
    )
  }

  if (overallMetrics.intakeCompleteness < TARGETS.intakeCompleteness) {
    errors.push(
      `Intake completeness ${overallMetrics.intakeCompleteness}% below ${TARGETS.intakeCompleteness}% threshold`
    )
  }

  if (overallMetrics.pitchClarityAverage < TARGETS.pitchClarity) {
    errors.push(
      `Pitch clarity ${overallMetrics.pitchClarityAverage}% below ${TARGETS.pitchClarity}% threshold`
    )
  }

  if (overallMetrics.compliancePassRate < TARGETS.compliancePassRate) {
    errors.push(
      `Compliance pass rate ${overallMetrics.compliancePassRate}% below ${TARGETS.compliancePassRate}% threshold`
    )
  }

  if (errors.length > 0) {
    console.error('\n❌ Metrics validation failed:')
    for (const error of errors) {
      console.error(`   - ${error}`)
    }
    process.exit(1)
  }

  console.log('\n✅ All metrics meet target thresholds')
}
