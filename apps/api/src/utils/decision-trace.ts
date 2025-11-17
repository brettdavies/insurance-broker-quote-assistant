import type { DecisionTrace } from '@repo/shared'
import { complianceLogger } from './logger'

/**
 * Decision Trace Logger
 *
 * Logs decision traces to compliance log file for regulatory audit trail.
 * Uses the central logger's compliance logger instance.
 *
 * @see docs/architecture/4-data-models.md#48-decisiontrace
 */

/**
 * Creates a decision trace object with current timestamp
 */
export function createDecisionTrace(
  flow: 'conversational' | 'policy' | 'prefill_generation',
  inputs: Record<string, unknown>,
  extraction?: {
    method: 'key-value' | 'llm' | 'prefill_generator'
    fields: Record<string, unknown>
    confidence?: Record<string, number>
    reasoning?: string
  },
  llmCalls?: Array<{
    agent: string
    model: string
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
    systemPrompt?: string
    userPrompt?: string
  }>,
  routingDecision?: Record<string, unknown>,
  complianceCheck?: {
    passed: boolean
    violations?: string[]
    disclaimersAdded?: number
    state?: string
    productType?: string
  }
): DecisionTrace {
  // Extract rulesConsulted from routing decision citations if present
  const rulesConsulted = routingDecision?.rulesEvaluated
    ? (routingDecision.rulesEvaluated as string[])
    : routingDecision?.citations
      ? (routingDecision.citations as Array<{ file: string }>).map((c) => c.file)
      : undefined

  return {
    timestamp: new Date().toISOString(),
    flow,
    inputs,
    extraction,
    routingDecision: routingDecision ? { ...routingDecision } : undefined,
    llmCalls,
    rulesConsulted,
    complianceCheck: complianceCheck
      ? {
          passed: complianceCheck.passed,
          violations: complianceCheck.violations,
          disclaimersAdded: complianceCheck.disclaimersAdded,
          state: complianceCheck.state,
          productType: complianceCheck.productType,
        }
      : undefined,
  }
}

/**
 * Logs decision trace to compliance log file using central logger
 * Ensures log directory exists before writing
 */
export async function logDecisionTrace(trace: DecisionTrace): Promise<void> {
  await complianceLogger.logDecisionTrace(trace)
}
