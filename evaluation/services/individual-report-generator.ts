/**
 * Individual Report Generator
 *
 * Generates detailed markdown reports for individual test cases.
 * One report file per test case with comprehensive trace details.
 *
 * Follows SOLID principles:
 * - SRP: Single responsibility (generate one report)
 * - DRY: Reuses trace-section-builder for trace details
 * - OCP: Open/closed - metric builders are extensible
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TestResult } from '../types'
import { buildTemplateReplacements } from './report-builders/template-utils'
import { INDIVIDUAL_REPORT_TEMPLATE_PATH } from './report-constants'
import { getTestCaseFileName } from './shared/data-extractors'
import { replaceTemplatePlaceholders } from './shared/template-utils'

/**
 * Generate individual report for a test case
 */
export async function generateIndividualReport(
  result: TestResult,
  outputDir: string
): Promise<string> {
  // Load template
  const template = await readFile(INDIVIDUAL_REPORT_TEMPLATE_PATH, 'utf-8')

  // Build replacements
  const replacements = buildTemplateReplacements(result)

  // Replace placeholders
  const output = replaceTemplatePlaceholders(template, replacements)

  // Write to file
  const fileName = getTestCaseFileName(result.testCase)
  const outputPath = join(outputDir, `${fileName}.md`)
  await writeFile(outputPath, output)

  return outputPath
}
