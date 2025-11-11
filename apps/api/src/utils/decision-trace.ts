import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { DecisionTrace } from '@repo/shared'

/**
 * Decision Trace Logger
 *
 * Logs decision traces to compliance log file for regulatory audit trail.
 * All traces are written to `logs/compliance.log` in JSON format.
 *
 * @see docs/architecture/4-data-models.md#48-decisiontrace
 */

const COMPLIANCE_LOG_FILE = process.env.COMPLIANCE_LOG_FILE || './logs/compliance.log'

/**
 * Creates a decision trace object with current timestamp
 */
export function createDecisionTrace(
  flow: 'conversational' | 'policy',
  inputs: Record<string, unknown>,
  extraction?: {
    method: 'key-value' | 'llm'
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
  }>,
  routingDecision?: Record<string, unknown>,
  complianceCheck?: {
    passed: boolean
    violations?: string[]
    disclaimersAdded?: number
    state?: string
    productLine?: string
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
          productLine: complianceCheck.productLine,
        }
      : undefined,
  }
}

/**
 * Logs decision trace to compliance log file
 * Ensures log directory exists before writing
 */
export async function logDecisionTrace(trace: DecisionTrace): Promise<void> {
  try {
    // Ensure logs directory exists
    const logDir = join(process.cwd(), 'logs')
    try {
      await mkdir(logDir, { recursive: true })
    } catch {
      // Directory might already exist, ignore error
    }

    // Write trace as JSON line (one trace per line for easy parsing)
    const logLine = `${JSON.stringify(trace)}\n`
    const logPath = process.env.COMPLIANCE_LOG_FILE || COMPLIANCE_LOG_FILE

    await writeFile(logPath, logLine, { flag: 'a' }) // Append mode
  } catch (error) {
    // Log error to console but don't throw (compliance logging shouldn't break request)
    console.error('Failed to write decision trace to compliance log:', error)
  }
}
