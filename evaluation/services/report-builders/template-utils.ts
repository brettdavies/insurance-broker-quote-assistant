/**
 * Template utilities for report generation
 */

import type { TestResult } from '../../types'
import { extractPrefillPacket, extractTrace } from '../shared/data-extractors'
import { formatFlowType, formatProduct, formatStatus } from '../shared/formatters'
import { buildTraceSectionSafely, calculateTokenUsage } from './data-extractors'
import { buildMetricsTableRows } from './metrics-builder'
import { buildErrorSection } from './section-builders'
import { buildFieldComparisonSection } from './section-builders'
import { buildTestInputSection } from './section-builders'

/**
 * Build template replacement values
 */
export function buildTemplateReplacements(result: TestResult): Record<string, string> {
  const trace = extractTrace(result)
  const tokenUsage = calculateTokenUsage(result)

  return {
    testName: result.testCase.name,
    testId: result.testCase.id,
    flowType: formatFlowType(result.testCase.type),
    testStatus: formatStatus(result.passed),
    carrier: result.testCase.carrier || 'N/A',
    state: result.testCase.state || 'N/A',
    product: formatProduct(result.testCase.product),
    metricsTableRows: buildMetricsTableRows(result),
    errorSection: buildErrorSection(result),
    testInputSection: buildTestInputSection(result),
    fieldComparisonSection: buildFieldComparisonSection(result),
    traceSection: buildTraceSectionSafely(result.testCase.id, trace, result),
    prefillPacket: extractPrefillPacket(result),
    inputTokens: tokenUsage.inputTokens.toLocaleString(),
    outputTokens: tokenUsage.outputTokens.toLocaleString(),
    cost: tokenUsage.cost,
    timestamp: new Date().toISOString(),
  }
}
