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

// Log file paths (logs are at workspace root: logs/)
const COMPLIANCE_LOG_PATH = join(import.meta.dir, '../../logs/compliance.log')
const PROGRAM_LOG_PATH = join(import.meta.dir, '../../logs/program.log')

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
  const sampleTraces = await extractSampleTraces(results)

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
 * Reads traces from compliance.log and enriches with prompts from program.log
 */
async function extractSampleTraces(
  results: TestResult[]
): Promise<Array<{ testId: string; trace: unknown }>> {
  const traces: Array<{ testId: string; trace: unknown }> = []

  // Load traces from compliance.log and prompts from program.log
  const { tracesByTimestamp, promptsByTimestamp } = await loadTracesAndPromptsFromLogs()

  for (const result of results) {
    if (result.actualResponse && traces.length < 5) {
      // Try to get trace from API response first
      let trace = extractTrace(result.actualResponse)

      // If trace has a timestamp, try to enrich with prompts from logs
      if (trace?.timestamp) {
        // Find matching prompt (within 5 seconds of trace timestamp)
        const traceTime = new Date(trace.timestamp).getTime()
        const matchingPrompt = findMatchingPrompt(traceTime, promptsByTimestamp)

        if (matchingPrompt && trace.llmCalls?.[0]) {
          // Use separate prompts if available, otherwise split combined prompt
          let systemPrompt: string
          let userPrompt: string

          if (
            'systemPrompt' in matchingPrompt &&
            'userPrompt' in matchingPrompt &&
            matchingPrompt.systemPrompt &&
            matchingPrompt.userPrompt
          ) {
            // Use separate prompts from log entry (new format)
            systemPrompt = matchingPrompt.systemPrompt as string
            userPrompt = matchingPrompt.userPrompt as string
          } else if (matchingPrompt.prompt) {
            // Split combined prompt into system and user prompts (old format)
            // The combined prompt format is: systemPrompt + "\n\n" + userPrompt
            const split = splitCombinedPrompt(matchingPrompt.prompt)
            systemPrompt = split.systemPrompt
            userPrompt = split.userPrompt

            // Log warning if system prompt is missing
            if (split.warning) {
              console.warn(`[Report Generator] ${split.warning} for trace at ${trace.timestamp}`)
            }
          } else {
            // No prompt available
            systemPrompt = ''
            userPrompt = ''
            console.warn(`[Report Generator] No prompt found for trace at ${trace.timestamp}`)
          }

          // Enrich trace with prompts
          trace = {
            ...trace,
            llmCalls: trace.llmCalls.map((call, idx) =>
              idx === 0 ? { ...call, systemPrompt, userPrompt } : call
            ),
          }
        }
      }

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
 * Load traces from compliance.log and prompts from program.log
 */
async function loadTracesAndPromptsFromLogs(): Promise<{
  tracesByTimestamp: Map<number, DecisionTrace>
  promptsByTimestamp: Map<
    number,
    { timestamp: string; prompt: string; systemPrompt?: string; userPrompt?: string }
  >
}> {
  const tracesByTimestamp = new Map<number, DecisionTrace>()
  const promptsByTimestamp = new Map<
    number,
    { timestamp: string; prompt: string; systemPrompt?: string; userPrompt?: string }
  >()

  try {
    // Read compliance.log (one DecisionTrace JSON per line)
    const complianceLogContent = await readFile(COMPLIANCE_LOG_PATH, 'utf-8').catch(() => '')
    for (const line of complianceLogContent.split('\n')) {
      if (line.trim()) {
        try {
          const trace = JSON.parse(line) as DecisionTrace
          if (trace.timestamp) {
            const timestamp = new Date(trace.timestamp).getTime()
            tracesByTimestamp.set(timestamp, trace)
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  } catch {
    // File doesn't exist or can't be read
  }

  try {
    // Read program.log (one JSON log entry per line)
    const programLogContent = await readFile(PROGRAM_LOG_PATH, 'utf-8').catch(() => '')
    for (const line of programLogContent.split('\n')) {
      if (line.trim()) {
        try {
          const entry = JSON.parse(line) as {
            timestamp?: string
            type?: string
            prompt?: string
            systemPrompt?: string
            userPrompt?: string
          }
          // Look for LLM prompt entries
          if (
            entry.type === 'llm_prompt' ||
            entry.type === 'llm_prompt_debug' ||
            (entry.prompt && entry.timestamp)
          ) {
            if (entry.timestamp) {
              const timestamp = new Date(entry.timestamp).getTime()

              // Prefer separate system/user prompts if available (new format)
              if (entry.systemPrompt && entry.userPrompt) {
                promptsByTimestamp.set(timestamp, {
                  timestamp: entry.timestamp,
                  prompt: `${entry.systemPrompt}\n\n${entry.userPrompt}`, // Reconstruct combined for compatibility
                  systemPrompt: entry.systemPrompt,
                  userPrompt: entry.userPrompt,
                })
              } else if (entry.prompt) {
                // Old format: try to split combined prompt
                const split = splitCombinedPrompt(entry.prompt)
                promptsByTimestamp.set(timestamp, {
                  timestamp: entry.timestamp,
                  prompt: entry.prompt,
                  systemPrompt: split.systemPrompt || undefined,
                  userPrompt: split.userPrompt,
                })
              }
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  } catch {
    // File doesn't exist or can't be read
  }

  return { tracesByTimestamp, promptsByTimestamp }
}

/**
 * Find matching prompt for a given timestamp (within 5 seconds)
 */
function findMatchingPrompt(
  traceTimestamp: number,
  promptsByTimestamp: Map<
    number,
    { timestamp: string; prompt: string; systemPrompt?: string; userPrompt?: string }
  >
): { timestamp: string; prompt: string; systemPrompt?: string; userPrompt?: string } | undefined {
  // Look for prompt within 5 seconds of trace timestamp
  for (const [promptTime, prompt] of promptsByTimestamp.entries()) {
    const timeDiff = Math.abs(promptTime - traceTimestamp)
    if (timeDiff < 5000) {
      // Within 5 seconds
      return prompt
    }
  }
  return undefined
}

/**
 * Split combined prompt into system and user prompts
 * Format: systemPrompt + "\n\n" + userPrompt
 *
 * The system prompt starts with "You are a data extraction specialist" or similar
 * The user prompt starts with "Extract insurance shopper information"
 *
 * Returns a warning flag if system prompt appears to be missing
 */
function splitCombinedPrompt(combinedPrompt: string): {
  systemPrompt: string
  userPrompt: string
  warning?: string
} {
  // Check if prompt starts with user prompt (system prompt missing)
  const startsWithUserPrompt = combinedPrompt
    .trim()
    .startsWith('Extract insurance shopper information')

  if (startsWithUserPrompt) {
    // System prompt appears to be missing - log warning
    console.warn(
      '[Report Generator] System prompt missing from log entry. ' +
        'Prompt starts with user prompt instead of system prompt. ' +
        'This may indicate the server is running old code or prompt files were not loaded correctly.'
    )
    return {
      systemPrompt: '',
      userPrompt: combinedPrompt.trim(),
      warning: 'System prompt missing from log entry',
    }
  }

  // Look for the user prompt marker (start of user prompt template)
  const userPromptStart = combinedPrompt.indexOf('Extract insurance shopper information')

  if (userPromptStart > 0) {
    // Split at the user prompt start
    const systemPrompt = combinedPrompt.substring(0, userPromptStart).trim()
    const userPrompt = combinedPrompt.substring(userPromptStart).trim()

    // Verify system prompt is not empty and contains expected content
    if (!systemPrompt || systemPrompt.length < 50) {
      console.warn(
        '[Report Generator] System prompt appears to be too short or empty after splitting. ' +
          'This may indicate the prompt format has changed.'
      )
      return {
        systemPrompt: systemPrompt || '',
        userPrompt,
        warning: 'System prompt appears to be missing or incomplete',
      }
    }

    // Check if system prompt contains expected markers
    const hasSystemPromptMarkers =
      systemPrompt.includes('You are a data extraction specialist') ||
      systemPrompt.includes('EXTRACTION RULE') ||
      systemPrompt.includes('CRITICAL:')

    if (!hasSystemPromptMarkers) {
      console.warn(
        '[Report Generator] System prompt does not contain expected markers. ' +
          'This may indicate the prompt format has changed or system prompt is missing.'
      )
      return {
        systemPrompt,
        userPrompt,
        warning: 'System prompt does not contain expected markers',
      }
    }

    // Remove any trailing newlines from system prompt
    return {
      systemPrompt: systemPrompt.replace(/\n+$/, ''),
      userPrompt,
    }
  }

  // Fallback: if we can't split, check if it starts with system prompt markers
  if (
    combinedPrompt.includes('You are a data extraction specialist') ||
    combinedPrompt.includes('EXTRACTION RULE') ||
    combinedPrompt.includes('CRITICAL:')
  ) {
    // Try to find where user prompt starts by looking for common patterns
    const patterns = [
      'Extract insurance shopper information',
      'Current notes:',
      'Already extracted fields',
    ]

    for (const pattern of patterns) {
      const idx = combinedPrompt.indexOf(pattern)
      if (idx > 100) {
        // System prompt should be at least 100 chars
        const systemPrompt = combinedPrompt.substring(0, idx).trim()
        const userPrompt = combinedPrompt.substring(idx).trim()
        return {
          systemPrompt: systemPrompt.replace(/\n+$/, ''),
          userPrompt,
        }
      }
    }
  }

  // Final fallback: return empty system prompt and full prompt as user prompt
  console.warn(
    '[Report Generator] Unable to split combined prompt. ' +
      'System prompt may be missing or prompt format is unrecognized.'
  )
  return {
    systemPrompt: '',
    userPrompt: combinedPrompt,
    warning: 'Unable to split combined prompt - system prompt may be missing',
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
      const trace = sample.trace as {
        timestamp?: string
        flow?: string
        inputs?: unknown
        extraction?: unknown
        routingDecision?: unknown
        complianceCheck?: unknown
        llmCalls?: Array<{
          agent?: string
          model?: string
          systemPrompt?: string
          userPrompt?: string
          promptTokens?: number
          completionTokens?: number
          totalTokens?: number
        }>
        rulesConsulted?: unknown
        [key: string]: unknown
      }

      // Extract LLM prompts if available
      const llmCall = trace.llmCalls?.[0]
      const systemPrompt = llmCall?.systemPrompt
      const userPrompt = llmCall?.userPrompt

      // Build trace sections
      const sections: string[] = []

      sections.push(`### Trace: ${sample.testId}`)

      // System Prompt
      if (systemPrompt) {
        sections.push(`#### System Prompt\n\n\`\`\`\n${systemPrompt}\n\`\`\`\n`)
      }

      // User Prompt
      if (userPrompt) {
        sections.push(`#### User Prompt\n\n\`\`\`\n${userPrompt}\n\`\`\`\n`)
      }

      // Inputs
      if (trace.inputs) {
        sections.push(
          `#### Inputs\n\n\`\`\`json\n${JSON.stringify(trace.inputs, null, 2)}\n\`\`\`\n`
        )
      }

      // Extraction
      if (trace.extraction) {
        sections.push(
          `#### Extraction\n\n\`\`\`json\n${JSON.stringify(trace.extraction, null, 2)}\n\`\`\`\n`
        )
      }

      // Routing Decision
      if (trace.routingDecision) {
        sections.push(
          `#### Routing Decision\n\n\`\`\`json\n${JSON.stringify(trace.routingDecision, null, 2)}\n\`\`\`\n`
        )
      }

      // Compliance Check
      if (trace.complianceCheck) {
        sections.push(
          `#### Compliance Check\n\n\`\`\`json\n${JSON.stringify(trace.complianceCheck, null, 2)}\n\`\`\`\n`
        )
      }

      // LLM Calls (without prompts, already shown above)
      if (trace.llmCalls && trace.llmCalls.length > 0) {
        const llmCallsWithoutPrompts = trace.llmCalls.map((call) => {
          const { systemPrompt: _, userPrompt: __, ...rest } = call
          return rest
        })
        sections.push(
          `#### LLM Calls\n\n\`\`\`json\n${JSON.stringify(llmCallsWithoutPrompts, null, 2)}\n\`\`\`\n`
        )
      }

      // Rules Consulted
      if (trace.rulesConsulted) {
        sections.push(
          `#### Rules Consulted\n\n\`\`\`json\n${JSON.stringify(trace.rulesConsulted, null, 2)}\n\`\`\`\n`
        )
      }

      // Other fields
      const knownFields = [
        'timestamp',
        'flow',
        'inputs',
        'extraction',
        'routingDecision',
        'complianceCheck',
        'llmCalls',
        'rulesConsulted',
      ]
      const otherFields = Object.entries(trace).filter(([key]) => !knownFields.includes(key))
      if (otherFields.length > 0) {
        const otherData = Object.fromEntries(otherFields)
        sections.push(
          `#### Other Data\n\n\`\`\`json\n${JSON.stringify(otherData, null, 2)}\n\`\`\`\n`
        )
      }

      sections.push('---\n')

      return sections.join('\n')
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
