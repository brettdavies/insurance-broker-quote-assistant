/**
 * Trace Section Builder
 *
 * Builds markdown sections for trace display in reports.
 * Follows SRP and OCP (Single Responsibility, Open/Closed Principles).
 */

import type {
  DecisionTrace,
  DiscountOpportunity,
  IntakeResult,
  PolicyAnalysisResult,
} from '@repo/shared'
import type { TestCase, TestResult } from '../types'
import { TRACE_FIELDS } from './report-constants'

/**
 * LLM call data from trace
 */
interface LLMCallData {
  agent?: string
  model?: string
  systemPrompt?: string
  userPrompt?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  rawResponse?: unknown
}

/**
 * Build complete trace section for a test result
 */
export function buildTraceSection(
  testId: string,
  trace: DecisionTrace,
  testResult?: TestResult
): string {
  const sections: string[] = []

  sections.push(`### Trace: ${testId}`)

  // Extract LLM call data
  const llmCall = trace.llmCalls?.[0]

  // Build sections in order
  sections.push(buildInputSection(trace, testResult?.testCase))
  sections.push(buildLLMRequestSection(llmCall))
  sections.push(buildRawResponseSection(llmCall))
  sections.push(buildExtractionSection(trace))
  sections.push(buildRoutingSection(trace))
  sections.push(buildDiscountOpportunitiesSection(testResult))
  sections.push(buildComplianceSection(trace, testResult))
  sections.push(buildPrefillPacketSection(testResult))
  sections.push(buildRulesConsultedSection(trace))
  sections.push(buildOtherFieldsSection(trace))

  sections.push('---\n')

  return sections.filter((s) => s.length > 0).join('\n')
}

/**
 * Build input and processing section
 */
function buildInputSection(trace: DecisionTrace, testCase?: TestCase): string {
  const inputs = trace.inputs as { message?: string; pills?: unknown } | undefined
  if (!inputs) return ''

  const sections: string[] = []
  sections.push('#### Test Input & Processing\n')

  // Show original test input
  if (testCase?.input) {
    sections.push(`**Original Test Input:**\n\`\`\`\n${testCase.input}\n\`\`\`\n`)
  }

  // Show extracted pills
  if (inputs.pills && Object.keys(inputs.pills as object).length > 0) {
    sections.push(
      `\n**Extracted Pills (removed from text):**\n\`\`\`json\n${JSON.stringify(inputs.pills, null, 2)}\n\`\`\`\n`
    )
  } else {
    sections.push('\n**Extracted Pills:** None\n')
  }

  // Show cleaned message sent to LLM
  sections.push(`\n**Cleaned Message (sent to LLM):**\n\`\`\`\n${inputs.message || ''}\n\`\`\`\n`)

  return sections.join('\n')
}

/**
 * Build LLM request section
 */
function buildLLMRequestSection(llmCall?: LLMCallData): string {
  if (!llmCall || (!llmCall.systemPrompt && !llmCall.userPrompt)) return ''

  const sections: string[] = []
  sections.push('#### LLM Request\n')
  sections.push(`**Model:** ${llmCall.model || 'Unknown'}\n`)

  const promptTokens = llmCall.promptTokens || 0
  const completionTokens = llmCall.completionTokens || 0
  if (promptTokens > 0 || completionTokens > 0) {
    sections.push(`**Tokens:** ${promptTokens} input, ${completionTokens} output\n`)
  }

  if (llmCall.systemPrompt) {
    sections.push(`**System Prompt:**\n\`\`\`\n${llmCall.systemPrompt}\n\`\`\`\n`)
  }

  if (llmCall.userPrompt) {
    sections.push(`**User Prompt:**\n\`\`\`\n${llmCall.userPrompt}\n\`\`\`\n`)
  }

  sections.push(
    '**JSON Schema:** UserProfile schema (see [packages/shared/src/schemas/user-profile.ts](packages/shared/src/schemas/user-profile.ts))\n'
  )

  return sections.join('\n')
}

/**
 * Build raw LLM response section
 */
function buildRawResponseSection(llmCall?: LLMCallData): string {
  if (!llmCall?.rawResponse) return ''

  return `#### Raw LLM Response (Before Validation)\n\n\`\`\`json\n${JSON.stringify(llmCall.rawResponse, null, 2)}\n\`\`\`\n`
}

/**
 * Build extraction section
 */
function buildExtractionSection(trace: DecisionTrace): string {
  const extraction = trace.extraction as
    | { method?: string; fields?: unknown; confidence?: unknown; reasoning?: string }
    | undefined

  if (!extraction) return ''

  const sections: string[] = []
  sections.push('#### LLM Response & Extraction\n')

  // Show extraction status
  const hasFields = extraction.fields && Object.keys(extraction.fields as object).length > 0
  if (extraction.reasoning?.includes('Extraction failed')) {
    sections.push('**Status:** ❌ Extraction failed (Zod validation error)\n')
  } else if (hasFields) {
    sections.push('**Status:** ✅ Extraction successful\n')
  } else {
    sections.push('**Status:** ⚠️  Unknown\n')
  }

  // Show extracted fields
  if (extraction.fields) {
    sections.push(
      `\n**Extracted Fields:**\n\`\`\`json\n${JSON.stringify(extraction.fields, null, 2)}\n\`\`\`\n`
    )
  }

  // Show validation errors if present
  if (extraction.reasoning?.includes('Extraction failed')) {
    sections.push(`\n**Validation Errors:**\n\`\`\`\n${extraction.reasoning}\n\`\`\`\n`)
  }

  // Show full extraction data
  sections.push(
    `\n**Full Extraction Result:**\n\`\`\`json\n${JSON.stringify(trace.extraction, null, 2)}\n\`\`\`\n`
  )

  return sections.join('\n')
}

/**
 * Build routing decision section
 */
function buildRoutingSection(trace: DecisionTrace): string {
  if (!trace.routingDecision) return ''

  return `#### Routing Decision\n\n\`\`\`json\n${JSON.stringify(trace.routingDecision, null, 2)}\n\`\`\`\n`
}

/**
 * Build discount opportunities section
 */
function buildDiscountOpportunitiesSection(testResult?: TestResult): string {
  const opportunities = testResult?.actualResponse
    ? (testResult.actualResponse as IntakeResult | PolicyAnalysisResult).opportunities
    : undefined

  if (!opportunities || opportunities.length === 0) return ''

  return `#### Discount Opportunities\n\n\`\`\`json\n${JSON.stringify(opportunities, null, 2)}\n\`\`\`\n`
}

/**
 * Build compliance check section
 */
function buildComplianceSection(trace: DecisionTrace, testResult?: TestResult): string {
  if (!trace.complianceCheck) return ''

  const sections: string[] = []
  sections.push('#### Compliance Check\n')

  // Get disclaimers from actualResponse
  const actualResponse = testResult?.actualResponse as
    | IntakeResult
    | PolicyAnalysisResult
    | undefined
  const disclaimersShown = actualResponse?.disclaimers || []
  const disclaimersRequired = testResult?.testCase.expectedDisclaimers || []

  // Calculate missed disclaimers
  const disclaimersMissed = disclaimersRequired.filter(
    (required) => !disclaimersShown.some((shown) => shown.includes(required))
  )

  // Build disclaimer analysis
  const disclaimerAnalysis = {
    disclaimersRequired: disclaimersRequired.length,
    disclaimersShown: disclaimersShown.length,
    disclaimersMissed: disclaimersMissed.length,
    required: disclaimersRequired,
    shown: disclaimersShown,
    missed: disclaimersMissed,
  }

  sections.push(`\`\`\`json\n${JSON.stringify(disclaimerAnalysis, null, 2)}\n\`\`\`\n`)

  return sections.join('\n')
}

/**
 * Build prefill packet section
 */
function buildPrefillPacketSection(testResult?: TestResult): string {
  if (!testResult?.actualResponse) return ''

  const actualResponse = testResult.actualResponse as
    | IntakeResult
    | PolicyAnalysisResult
    | undefined
  const prefill = actualResponse?.prefill

  if (!prefill) return ''

  return `#### Prefill Packet (IQuote Pro Format)\n\n\`\`\`json\n${JSON.stringify(prefill, null, 2)}\n\`\`\`\n`
}

/**
 * Build rules consulted section
 */
function buildRulesConsultedSection(trace: DecisionTrace): string {
  if (!trace.rulesConsulted) return ''

  return `#### Rules Consulted\n\n\`\`\`json\n${JSON.stringify(trace.rulesConsulted, null, 2)}\n\`\`\`\n`
}

/**
 * Build other fields section
 */
function buildOtherFieldsSection(trace: DecisionTrace): string {
  const otherFields = Object.entries(trace).filter(([key]) => !TRACE_FIELDS.KNOWN.includes(key))

  if (otherFields.length === 0) return ''

  const otherData = Object.fromEntries(otherFields)
  return `#### Other Data\n\n\`\`\`json\n${JSON.stringify(otherData, null, 2)}\n\`\`\`\n`
}
