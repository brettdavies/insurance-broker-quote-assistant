/**
 * Trace Enricher
 *
 * Enriches traces with prompts and builds complete trace sections.
 * Follows SRP (Single Responsibility Principle).
 */

import type { DecisionTrace } from '@repo/shared'
import type { TestResult } from '../types'
import type { PromptEntry } from './log-loader'
import { loadTracesAndPromptsFromLogs } from './log-loader'
import { SAMPLE_LIMITS, TIME_WINDOWS } from './report-constants'
import { findClosestInTimeWindow, getMostRecent, parseTimestamp } from './report-utils'
import { buildTraceSection } from './trace-section-builder'

/**
 * Extract sample traces from test results and enrich with prompts
 */
export async function extractSampleTraces(
  results: TestResult[]
): Promise<Array<{ testId: string; trace: DecisionTrace }>> {
  const traces: Array<{ testId: string; trace: DecisionTrace }> = []

  // Load traces and prompts from logs
  const { tracesByTimestamp, promptsByTimestamp } = await loadTracesAndPromptsFromLogs()

  for (const result of results) {
    if (result.actualResponse && traces.length < SAMPLE_LIMITS.MAX_TRACES) {
      const trace = extractTrace(result.actualResponse)
      if (trace) {
        const enrichedTrace = enrichTraceWithPrompts(trace, promptsByTimestamp)
        traces.push({
          testId: result.testCase.id,
          trace: enrichedTrace,
        })
      }
    }
  }

  return traces
}

/**
 * Build markdown sections from enriched traces
 */
export function buildTraceSections(
  traces: Array<{ testId: string; trace: DecisionTrace }>,
  testResults: TestResult[]
): string {
  return traces
    .map((sample) => {
      const testResult = testResults.find((r) => r.testCase.id === sample.testId)
      return buildTraceSection(sample.testId, sample.trace, testResult)
    })
    .join('\n')
}

/**
 * Extract trace from API response
 */
function extractTrace(response: unknown): DecisionTrace | undefined {
  return (
    (response as { trace?: DecisionTrace }).trace ||
    (response as { trace?: DecisionTrace }).trace
  )
}

/**
 * Enrich trace with prompts from logs
 */
function enrichTraceWithPrompts(
  trace: DecisionTrace,
  promptsByTimestamp: Map<number, PromptEntry>
): DecisionTrace {
  // Try to find matching prompt
  const matchingPrompt = findMatchingPrompt(trace, promptsByTimestamp)

  if (!matchingPrompt) {
    return trace
  }

  const { systemPrompt, userPrompt } = matchingPrompt

  // Create llmCalls array if it doesn't exist
  if (!trace.llmCalls || trace.llmCalls.length === 0) {
    return {
      ...trace,
      llmCalls: [
        {
          agent: 'conversational-extractor',
          model: 'gemini-2.5-flash-lite',
          systemPrompt,
          userPrompt,
          rawResponse: matchingPrompt.response,
        },
      ],
    }
  }

  // Enrich existing llmCalls
  return {
    ...trace,
    llmCalls: trace.llmCalls.map((call, idx) =>
      idx === 0
        ? {
            ...call,
            systemPrompt,
            userPrompt,
            rawResponse: matchingPrompt.response,
          }
        : call
    ),
  }
}

/**
 * Find matching prompt for a trace
 */
function findMatchingPrompt(
  trace: DecisionTrace,
  promptsByTimestamp: Map<number, PromptEntry>
): PromptEntry | undefined {
  // If no prompts available, return undefined
  if (promptsByTimestamp.size === 0) {
    return undefined
  }

  // Try timestamp matching first
  if (trace.timestamp) {
    const traceTime = parseTimestamp(trace.timestamp)
    const match = findClosestInTimeWindow(traceTime, promptsByTimestamp, TIME_WINDOWS.PROMPT_MATCH_MS)
    if (match) return match
  }

  // Fallback to most recent prompt
  return getMostRecent(promptsByTimestamp)
}
