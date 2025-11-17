/**
 * Metrics Validator
 *
 * Validates that evaluation metrics meet target thresholds.
 */

import { METRIC_THRESHOLDS } from './report-constants'
import type { EvaluationReport } from './report-generator'

/**
 * Validate that metrics meet target thresholds
 */
export function validateMetrics(report: EvaluationReport): void {
  const { overallMetrics } = report
  const errors: string[] = []

  if (overallMetrics.routingAccuracy < METRIC_THRESHOLDS.ROUTING_ACCURACY) {
    errors.push(
      `Routing accuracy ${overallMetrics.routingAccuracy}% below ${METRIC_THRESHOLDS.ROUTING_ACCURACY}% threshold`
    )
  }

  if (overallMetrics.intakeCompleteness < METRIC_THRESHOLDS.INTAKE_COMPLETENESS) {
    errors.push(
      `Intake completeness ${overallMetrics.intakeCompleteness}% below ${METRIC_THRESHOLDS.INTAKE_COMPLETENESS}% threshold`
    )
  }

  // Only validate pitch clarity for policy tests (not conversational)
  if (
    overallMetrics.policy.testCount > 0 &&
    overallMetrics.pitchClarityAverage < METRIC_THRESHOLDS.PITCH_CLARITY
  ) {
    errors.push(
      `Pitch clarity ${overallMetrics.pitchClarityAverage}% below ${METRIC_THRESHOLDS.PITCH_CLARITY}% threshold`
    )
  }

  if (overallMetrics.compliancePassRate < METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE) {
    errors.push(
      `Compliance pass rate ${overallMetrics.compliancePassRate}% below ${METRIC_THRESHOLDS.COMPLIANCE_PASS_RATE}% threshold`
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
