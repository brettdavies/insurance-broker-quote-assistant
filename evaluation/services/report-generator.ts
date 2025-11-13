/**
 * Report Generator (Refactored)
 *
 * Generates JSON and markdown evaluation reports from test results.
 * Refactored following DRY, STAR, and SOLID principles.
 *
 * Key improvements:
 * - STAR: All constants centralized in report-constants.ts
 * - DRY: Reusable utility functions extracted to report-utils.ts
 * - SRP: Large functions broken into focused modules:
 *   - metrics-calculator.ts: Metric calculations
 *   - trace-section-builder.ts: Trace section generation
 *   - prompt-parser.ts: Prompt parsing logic
 *   - log-loader.ts: Log file loading
 *   - trace-enricher.ts: Trace enrichment with prompts
 *   - template-builder.ts: Template variable generation
 * - OCP: Extensible builders for traces and metrics
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TestResult } from '../types'
import { FILE_PATHS } from './report-constants'
import {
  type OverallMetrics,
  type TokenUsageData,
  calculateOverallMetrics,
  calculatePerCarrierRouting,
  calculatePerStateRouting,
  extractTokenUsageData,
} from './report-metrics-aggregator'
import { buildTemplateReplacements } from './template-builder'

/**
 * Evaluation report structure
 */
export interface EvaluationReport {
  timestamp: string
  overallMetrics: OverallMetrics
  perCarrierRouting: Record<string, number>
  perStateRouting: Record<string, number>
  tokenUsage: TokenUsageData
  testResults: TestResult[]
}

/**
 * Generate evaluation report from test results
 */
export async function generateReport(results: TestResult[]): Promise<EvaluationReport> {
  const timestamp = new Date().toISOString()

  // Calculate all metrics in parallel for performance
  const [overallMetrics, perCarrierRouting, perStateRouting, tokenUsage] = await Promise.all([
    Promise.resolve(calculateOverallMetrics(results)),
    Promise.resolve(calculatePerCarrierRouting(results)),
    Promise.resolve(calculatePerStateRouting(results)),
    Promise.resolve(extractTokenUsageData(results)),
  ])

  return {
    timestamp,
    overallMetrics,
    perCarrierRouting,
    perStateRouting,
    tokenUsage,
    testResults: results,
  }
}

/**
 * Generate markdown report from evaluation report
 *
 * Uses markdown template with {{variable}} placeholders.
 * Template-based approach is simple and requires no additional dependencies.
 *
 * Note: Individual reports are generated immediately after each test completes
 * in the harness for better UX (users can read results while tests are running).
 */
export async function generateMarkdownReport(report: EvaluationReport): Promise<string> {
  const template = await readFile(FILE_PATHS.REPORT_TEMPLATE, 'utf-8')

  // Build all template replacements
  const replacements = buildTemplateReplacements(
    report.timestamp,
    report.overallMetrics,
    report.perCarrierRouting,
    report.perStateRouting,
    report.tokenUsage,
    report.testResults
  )

  // Replace template variables
  return replaceTemplateVariables(template, replacements)
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
