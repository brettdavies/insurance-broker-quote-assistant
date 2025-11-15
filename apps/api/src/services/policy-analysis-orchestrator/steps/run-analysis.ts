/**
 * Run Analysis Step
 *
 * Runs policy analysis using the Policy Analysis Agent.
 */

import type { PolicySummary } from '@repo/shared'
import { logError } from '../../../utils/logger'
import type { LLMProvider } from '../../llm-provider'
import { PolicyAnalysisAgent } from '../../policy-analysis-agent'

/**
 * Run policy analysis
 */
export async function runPolicyAnalysis(
  policySummary: PolicySummary,
  policyText: string | undefined,
  llmProvider: LLMProvider
): Promise<{
  result: Awaited<ReturnType<PolicyAnalysisAgent['analyzePolicy']>>
  tokens: number
  time: number
}> {
  const analysisAgent = new PolicyAnalysisAgent(llmProvider)

  try {
    const result = await analysisAgent.analyzePolicy(policySummary, policyText)
    return {
      result,
      tokens: result._metadata?.tokensUsed || 0,
      time: result._metadata?.analysisTime || 0,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await logError('Policy analysis failed', error as Error, {
      type: 'policy_analysis_error',
      carrier: policySummary.carrier,
      state: policySummary.state,
      errorMessage,
    })
    throw error
  }
}
