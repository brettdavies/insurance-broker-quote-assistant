/**
 * Token Tracker
 *
 * Extracts and calculates token usage and costs from decision traces.
 */

import type { DecisionTrace } from '../../packages/shared/src/index'

// OpenAI pricing (per 1M tokens) - using gpt-4o-mini as default
const GPT4O_MINI_INPUT_PRICE = 0.15 / 1_000_000 // $0.15 per 1M tokens
const GPT4O_MINI_OUTPUT_PRICE = 0.6 / 1_000_000 // $0.60 per 1M tokens

/**
 * Extract token usage from decision trace
 */
export function extractTokenUsage(trace: DecisionTrace | undefined): {
  inputTokens: number
  outputTokens: number
} {
  if (!trace || !trace.llmCalls) {
    return { inputTokens: 0, outputTokens: 0 }
  }

  let inputTokens = 0
  let outputTokens = 0

  for (const call of trace.llmCalls) {
    inputTokens += call.promptTokens || 0
    outputTokens += call.completionTokens || 0
  }

  return { inputTokens, outputTokens }
}

/**
 * Calculate cost from token usage
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  return inputTokens * GPT4O_MINI_INPUT_PRICE + outputTokens * GPT4O_MINI_OUTPUT_PRICE
}
