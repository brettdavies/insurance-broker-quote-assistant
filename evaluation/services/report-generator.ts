/**
 * Report Generator
 *
 * Generates JSON and markdown evaluation reports from test results.
 * Uses template-based approach for markdown generation.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  DecisionTrace,
  IntakeResult,
  PolicyAnalysisResult,
} from '../../packages/shared/src/index'
import type { TestResult } from '../types'
import { calculateCost, extractTokenUsage } from './token-tracker'

export interface EvaluationReport {
  timestamp: string
  overallMetrics: {
    routingAccuracy: number
    intakeCompleteness: number
    pitchClarityAverage: number
    compliancePassRate: number
  }
  perCarrierRouting: Record<string, number>
  perStateRouting: Record<string, number>
  fieldCompleteness: Record<string, number>
  tokenUsage: {
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
  sampleTraces: Array<{
    testId: string
    trace: unknown
  }>
  testResults: TestResult[]
}

const TEMPLATE_MD_PATH = join(import.meta.dir, '../result/report-template.md')

/**
 * Generate evaluation report from test results
 */
export async function generateReport(results: TestResult[]): Promise<EvaluationReport> {
  const timestamp = new Date().toISOString()

  const overallMetrics = calculateOverallMetrics(results)
  const perCarrierRouting = calculatePerCarrierRouting(results)
  const perStateRouting = calculatePerStateRouting(results)
  const fieldCompleteness = calculateFieldCompleteness(results)
  const tokenUsage = extractTokenUsageData(results)
  const sampleTraces = extractSampleTraces(results)

  return {
    timestamp,
    overallMetrics,
    perCarrierRouting,
    perStateRouting,
    fieldCompleteness,
    tokenUsage,
    sampleTraces,
    testResults: results,
  }
}

/**
 * Generate markdown report from evaluation report
 *
 * Uses markdown template with {{variable}} placeholders (similar to BMAD template pattern).
 * BMAD uses YAML templates for interactive document creation workflows, but for programmatic
 * report generation, a simple markdown template with variable substitution is more appropriate
 * and requires no additional dependencies.
 */
export async function generateMarkdownReport(report: EvaluationReport): Promise<string> {
  const template = await readFile(TEMPLATE_MD_PATH, 'utf-8')
  const replacements = buildTemplateReplacements(report)
  return replaceTemplateVariables(template, replacements)
}

/**
 * Calculate overall metrics from test results
 */
function calculateOverallMetrics(results: TestResult[]) {
  const conversationalResults = results.filter((r) => r.testCase.type === 'conversational')
  const routingAccuracies = conversationalResults
    .map((r) => r.metrics?.routingAccuracy || 0)
    .filter((acc) => acc > 0)

  const routingAccuracy =
    routingAccuracies.length > 0
      ? Math.round(routingAccuracies.reduce((sum, acc) => sum + acc, 0) / routingAccuracies.length)
      : 0

  const intakeCompletenesses = results.map((r) => r.metrics?.intakeCompleteness || 0)
  const intakeCompleteness =
    intakeCompletenesses.length > 0
      ? Math.round(
          intakeCompletenesses.reduce((sum, comp) => sum + comp, 0) / intakeCompletenesses.length
        )
      : 0

  const pitchClarities = results.map((r) => r.metrics?.pitchClarity || 0)
  const pitchClarityAverage =
    pitchClarities.length > 0
      ? Math.round(
          pitchClarities.reduce((sum, clarity) => sum + clarity, 0) / pitchClarities.length
        )
      : 0

  const compliancePassed = results.filter((r) => r.metrics?.compliancePassed === true).length
  const compliancePassRate =
    results.length > 0 ? Math.round((compliancePassed / results.length) * 100) : 0

  return {
    routingAccuracy,
    intakeCompleteness,
    pitchClarityAverage,
    compliancePassRate,
  }
}

/**
 * Calculate per-carrier routing accuracy
 */
function calculatePerCarrierRouting(results: TestResult[]): Record<string, number> {
  const conversationalResults = results.filter((r) => r.testCase.type === 'conversational')
  const perCarrierStats: Record<string, { passed: number; total: number }> = {}

  for (const result of conversationalResults) {
    const carrier = result.testCase.carrier
    if (!perCarrierStats[carrier]) {
      perCarrierStats[carrier] = { passed: 0, total: 0 }
    }
    perCarrierStats[carrier].total++
    if (result.metrics?.routingAccuracy === 100) {
      perCarrierStats[carrier].passed++
    }
  }

  const accuracy: Record<string, number> = {}
  for (const [carrier, stats] of Object.entries(perCarrierStats)) {
    accuracy[carrier] = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0
  }

  return accuracy
}

/**
 * Calculate per-state routing accuracy
 */
function calculatePerStateRouting(results: TestResult[]): Record<string, number> {
  const conversationalResults = results.filter((r) => r.testCase.type === 'conversational')
  const perStateStats: Record<string, { passed: number; total: number }> = {}

  for (const result of conversationalResults) {
    const state = result.testCase.state
    if (!perStateStats[state]) {
      perStateStats[state] = { passed: 0, total: 0 }
    }
    perStateStats[state].total++
    if (result.metrics?.routingAccuracy === 100) {
      perStateStats[state].passed++
    }
  }

  const accuracy: Record<string, number> = {}
  for (const [state, stats] of Object.entries(perStateStats)) {
    accuracy[state] = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0
  }

  return accuracy
}

/**
 * Calculate field completeness (simplified)
 */
function calculateFieldCompleteness(results: TestResult[]): Record<string, number> {
  const intakeCompletenesses = results.map((r) => r.metrics?.intakeCompleteness || 0)
  const average =
    intakeCompletenesses.length > 0
      ? Math.round(
          intakeCompletenesses.reduce((sum, comp) => sum + comp, 0) / intakeCompletenesses.length
        )
      : 0

  return {
    state: average,
    productType: average,
    age: average,
    cleanRecord3Yr: average,
  }
}

/**
 * Extract token usage data from test results
 */
function extractTokenUsageData(results: TestResult[]) {
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

/**
 * Extract sample traces from test results
 */
function extractSampleTraces(results: TestResult[]): Array<{ testId: string; trace: unknown }> {
  const traces: Array<{ testId: string; trace: unknown }> = []

  for (const result of results) {
    if (result.actualResponse && traces.length < 5) {
      const trace = extractTrace(result.actualResponse)
      if (trace) {
        traces.push({
          testId: result.testCase.id,
          trace,
        })
      }
    }
  }

  return traces
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
 * Build template variable replacements
 */
function buildTemplateReplacements(report: EvaluationReport): Record<string, string> {
  const {
    overallMetrics,
    perCarrierRouting,
    perStateRouting,
    fieldCompleteness,
    tokenUsage,
    sampleTraces,
    testResults,
  } = report

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`
  const formatPercentage = (value: number) => `${value}%`

  const routingStatus = overallMetrics.routingAccuracy >= 90 ? '✅' : '❌'
  const intakeStatus = overallMetrics.intakeCompleteness >= 95 ? '✅' : '❌'
  const pitchStatus = overallMetrics.pitchClarityAverage >= 85 ? '✅' : '❌'
  const complianceStatus = overallMetrics.compliancePassRate === 100 ? '✅' : '❌'

  const overallStatus =
    overallMetrics.routingAccuracy >= 90 &&
    overallMetrics.intakeCompleteness >= 95 &&
    overallMetrics.pitchClarityAverage >= 85 &&
    overallMetrics.compliancePassRate === 100
      ? '✅ All metrics meet target thresholds'
      : '❌ Some metrics below thresholds'

  const carrierTableRows = Object.entries(perCarrierRouting)
    .map(([carrier, accuracy]) => `| ${carrier} | ${formatPercentage(accuracy)} |`)
    .join('\n')

  const stateTableRows = Object.entries(perStateRouting)
    .map(([state, accuracy]) => `| ${state} | ${formatPercentage(accuracy)} |`)
    .join('\n')

  const fieldTableRows = Object.entries(fieldCompleteness)
    .map(([field, completeness]) => `| ${field} | ${formatPercentage(completeness)} |`)
    .join('\n')

  const tokenTableRows = tokenUsage.perTest
    .map(
      (usage) =>
        `| ${usage.testId} | ${usage.inputTokens.toLocaleString()} | ${usage.outputTokens.toLocaleString()} | ${formatCurrency(usage.cost)} |`
    )
    .join('\n')

  const sampleTracesSection = sampleTraces
    .map((sample) => {
      return `### Trace: ${sample.testId}

\`\`\`json
${JSON.stringify(sample.trace, null, 2)}
\`\`\`

---
`
    })
    .join('\n')

  const testCaseDetails = testResults
    .map((result) => {
      const status = result.passed ? '✅ Pass  ' : '❌ Fail  '
      const resultMetrics = result.metrics
      const metricsSection = resultMetrics
        ? `
**Metrics:**
- Routing Accuracy: ${formatPercentage(resultMetrics.routingAccuracy || 0)}
- Intake Completeness: ${formatPercentage(resultMetrics.intakeCompleteness || 0)}
- Pitch Clarity: ${formatPercentage(resultMetrics.pitchClarity || 0)}
- Compliance: ${resultMetrics.compliancePassed ? '✅ Pass  ' : '❌ Fail  '}`
        : ''

      const errorSection = result.error ? `\n**Error:** ${result.error}` : ''

      return `### ${result.testCase.name} (ID: ${result.testCase.id})

**Type:** ${result.testCase.type}  
**Carrier:** ${result.testCase.carrier}  
**State:** ${result.testCase.state}  
**Product:** ${Array.isArray(result.testCase.product) ? result.testCase.product.join(', ') : result.testCase.product}  
**Status:** ${status}${metricsSection}${errorSection}

---
`
    })
    .join('\n')

  const passedTests = testResults.filter((r) => r.passed).length
  const failedTests = testResults.filter((r) => !r.passed).length
  const passRate = testResults.length > 0 ? Math.round((passedTests / testResults.length) * 100) : 0

  return {
    timestamp: report.timestamp,
    routingAccuracy: overallMetrics.routingAccuracy.toString(),
    intakeCompleteness: overallMetrics.intakeCompleteness.toString(),
    pitchClarity: overallMetrics.pitchClarityAverage.toString(),
    compliancePassRate: overallMetrics.compliancePassRate.toString(),
    routingStatus,
    intakeStatus,
    pitchStatus,
    complianceStatus,
    overallStatus,
    carrierTableRows: carrierTableRows || '| - | - |',
    stateTableRows: stateTableRows || '| - | - |',
    fieldTableRows: fieldTableRows || '| - | - |',
    totalInputTokens: tokenUsage.totalInputTokens.toLocaleString(),
    totalOutputTokens: tokenUsage.totalOutputTokens.toLocaleString(),
    totalCost: formatCurrency(tokenUsage.totalCost),
    tokenTableRows: tokenTableRows || '| - | - | - | - |',
    sampleTracesSection: sampleTracesSection || '_No traces available_',
    testCaseDetails: testCaseDetails || '_No test case details_',
    totalTests: testResults.length.toString(),
    passedTests: passedTests.toString(),
    failedTests: failedTests.toString(),
    passRate: formatPercentage(passRate),
  }
}

/**
 * Replace template variables with actual values
 */
function replaceTemplateVariables(template: string, replacements: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return result
}
