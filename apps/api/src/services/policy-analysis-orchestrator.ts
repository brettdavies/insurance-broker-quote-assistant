import type { PolicyAnalysisResult, PolicySummary } from '@repo/shared'
import { DEFAULT_GEMINI_MODEL } from '@repo/shared'
import { createDecisionTrace, logDecisionTrace } from '../utils/decision-trace'
import * as knowledgePackRAG from './knowledge-pack-rag'
import type { LLMProvider } from './llm-provider'
import { analyzeBundleOpportunities } from './policy-analysis-orchestrator/steps/analyze-bundles'
import { applyComplianceFilter } from './policy-analysis-orchestrator/steps/apply-compliance'
import { generatePitch } from './policy-analysis-orchestrator/steps/generate-pitch'
import { runPolicyAnalysis } from './policy-analysis-orchestrator/steps/run-analysis'
import { validateOpportunities } from './policy-analysis-orchestrator/steps/validate-opportunities'
import { validatePolicyAndGetCarrier } from './policy-analysis-orchestrator/steps/validate-policy'

export interface PolicyAnalysisOrchestratorOptions {
  policySummary: PolicySummary
  policyText?: string
  llmProvider: LLMProvider
}

export interface PolicyAnalysisOrchestratorResult {
  result: PolicyAnalysisResult
  analysisTokens: number
  pitchTokens: number
}

/**
 * Policy Analysis Orchestrator
 *
 * Orchestrates the complete policy analysis flow:
 * 1. Validates policy summary
 * 2. Gets carrier from knowledge pack
 * 3. Analyzes policy using LLM agent
 * 4. Analyzes bundle options
 * 5. Validates opportunities
 * 6. Generates pitch
 * 7. Applies compliance filter
 * 8. Creates decision trace
 */
export async function orchestratePolicyAnalysis(
  options: PolicyAnalysisOrchestratorOptions
): Promise<PolicyAnalysisOrchestratorResult> {
  const { policySummary, policyText, llmProvider } = options

  // Step 1: Validate policy summary and get carrier
  const carrier = validatePolicyAndGetCarrier(policySummary)

  // Step 2: Run policy analysis
  const { result: rawAnalysisResult, tokens: analysisTokens } = await runPolicyAnalysis(
    policySummary,
    policyText,
    llmProvider
  )

  // Step 3: Analyze bundle opportunities
  const { uniqueBundleOptions, bundleOptionsFromAnalyzer } = await analyzeBundleOpportunities(
    carrier,
    policySummary,
    rawAnalysisResult.bundleOptions
  )

  // Step 4: Validate opportunities
  const { validatedOpportunities, validationResults } = await validateOpportunities(
    rawAnalysisResult.opportunities,
    policySummary,
    carrier
  )

  // Step 5: Generate pitch
  const { pitch: initialPitch, tokens: pitchTokens } = await generatePitch(
    validatedOpportunities,
    uniqueBundleOptions,
    rawAnalysisResult.deductibleOptimizations,
    policySummary,
    llmProvider
  )

  // Step 6: Apply compliance filter
  const complianceResult = await applyComplianceFilter(initialPitch, policySummary)

  // If compliance check failed, replace pitch with replacement message
  let pitch = initialPitch
  if (!complianceResult.passed && complianceResult.replacementMessage) {
    pitch = complianceResult.replacementMessage
  }

  // Add disclaimers to pitch if available
  if (complianceResult.disclaimers && complianceResult.disclaimers.length > 0) {
    pitch += `\n\n${complianceResult.disclaimers.join('\n')}`
  }

  // Step 7: Create decision trace
  const decisionTrace = createDecisionTrace(
    'policy',
    {
      policyText: policyText?.substring(0, 1000) || '',
      policySummaryProvided: true,
    },
    {
      method: 'key-value',
      fields: policySummary,
      confidence: policySummary.confidence,
    },
    [
      {
        agent: 'policy-analysis-agent',
        model: DEFAULT_GEMINI_MODEL,
        totalTokens: analysisTokens,
      },
      {
        agent: 'pitch-generator',
        model: DEFAULT_GEMINI_MODEL,
        totalTokens: pitchTokens,
      },
    ],
    undefined, // routingDecision
    {
      passed: complianceResult.passed,
      violations: complianceResult.violations,
      disclaimersAdded: complianceResult.disclaimers?.length || 0,
      state: policySummary.state ?? undefined,
      productType: policySummary.productType ?? undefined,
    }
  )

  // Add discount validation results to trace
  if (validationResults) {
    decisionTrace.discountValidation = {
      rulesEvaluated: validationResults.rulesEvaluated,
      opportunitiesValidated: validatedOpportunities.length,
      confidenceScores: validationResults.confidenceScores,
      stackingResults: validationResults.stackingResults,
    }
  }

  // Add analysis results to trace
  decisionTrace.outputs = {
    opportunities: validatedOpportunities,
    bundleOptions: uniqueBundleOptions,
    deductibleOptimizations: rawAnalysisResult.deductibleOptimizations,
    pitch,
    complianceValidated: complianceResult.passed,
  }

  // Add bundle analysis results to decision trace
  if (bundleOptionsFromAnalyzer.length > 0) {
    decisionTrace.bundleAnalysis = {
      currentProduct: policySummary.productType || '',
      bundleOpportunities: bundleOptionsFromAnalyzer.map((opt) => ({
        product: opt.product,
        estimatedSavings: opt.estimatedSavings,
        requiredActions: opt.requiredActions,
      })),
      carrierAvailabilityChecks: [
        {
          carrier: carrier.name,
          state: policySummary.state || '',
          operatesInState: knowledgePackRAG.getCarrierStateAvailability(
            carrier.name,
            policySummary.state || ''
          ),
          availableProducts: knowledgePackRAG.getCarrierProductsForState(
            carrier.name,
            policySummary.state || ''
          ),
        },
      ],
      citations: bundleOptionsFromAnalyzer.map((opt) => opt.citation),
    }
  }

  await logDecisionTrace(decisionTrace)

  // Step 8: Return PolicyAnalysisResult
  const finalResult: PolicyAnalysisResult = {
    currentPolicy: policySummary,
    opportunities: validatedOpportunities,
    bundleOptions: uniqueBundleOptions,
    deductibleOptimizations: rawAnalysisResult.deductibleOptimizations,
    pitch,
    complianceValidated: complianceResult.passed,
    disclaimers: complianceResult.disclaimers,
    trace: decisionTrace,
  }

  return {
    result: finalResult,
    analysisTokens,
    pitchTokens,
  }
}
