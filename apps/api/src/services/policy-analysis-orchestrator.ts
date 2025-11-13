import type {
  BundleOption,
  Carrier,
  PolicyAnalysisResult,
  PolicySummary,
  ValidatedOpportunity,
} from '@repo/shared'
import { DEFAULT_GEMINI_MODEL } from '@repo/shared'
import { createDecisionTrace, logDecisionTrace } from '../utils/decision-trace'
import { logError, logInfo } from '../utils/logger'
import { validateOutput } from './compliance-filter'
import { analyzeBundleOptions } from './discount-engine'
import { DiscountRulesValidator } from './discount-rules-validator'
import * as knowledgePackRAG from './knowledge-pack-rag'
import type { LLMProvider } from './llm-provider'
import { PitchGenerator } from './pitch-generator'
import { PolicyAnalysisAgent } from './policy-analysis-agent'

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

  // Step 1: Validate policy summary has minimum required fields
  if (!policySummary.carrier || !policySummary.state || !policySummary.productType) {
    throw new Error(
      'Policy summary missing required fields: carrier, state, and productType are required'
    )
  }

  // Step 2: Get carrier from knowledge pack
  const carrier = knowledgePackRAG.getCarrierByName(policySummary.carrier)
  if (!carrier) {
    throw new Error(`Carrier "${policySummary.carrier}" not found in knowledge pack`)
  }

  // Step 3: Call Policy Analysis Agent
  const analysisAgent = new PolicyAnalysisAgent(llmProvider)
  let rawAnalysisResult: Awaited<ReturnType<PolicyAnalysisAgent['analyzePolicy']>>
  let analysisTokens = 0
  let analysisTime = 0

  try {
    const result = await analysisAgent.analyzePolicy(policySummary, policyText)
    rawAnalysisResult = result
    analysisTokens = result._metadata?.tokensUsed || 0
    analysisTime = result._metadata?.analysisTime || 0
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

  // Step 3.5: Call Bundle Analyzer to detect bundle opportunities
  let bundleOptionsFromAnalyzer: BundleOption[] = []
  try {
    bundleOptionsFromAnalyzer = analyzeBundleOptions(carrier, policySummary, undefined)
    await logInfo('Bundle analysis completed', {
      type: 'bundle_analysis_success',
      carrier: policySummary.carrier,
      state: policySummary.state,
      bundleOptionsCount: bundleOptionsFromAnalyzer.length,
    })
  } catch (error) {
    await logError('Bundle analysis failed', error as Error, {
      type: 'bundle_analysis_error',
      carrier: policySummary.carrier,
      state: policySummary.state,
    })
    // Continue with other opportunities if bundle analysis fails
    bundleOptionsFromAnalyzer = []
  }

  // Merge bundle options from analyzer with LLM-generated ones
  // Deduplicate by product to avoid showing the same opportunity twice
  const allBundleOptions = [...rawAnalysisResult.bundleOptions, ...bundleOptionsFromAnalyzer]
  const uniqueBundleOptions = allBundleOptions.reduce((acc: BundleOption[], option) => {
    const existing = acc.find((opt) => opt.product === option.product)
    if (!existing) {
      acc.push(option)
    } else {
      // Keep the one with higher estimated savings
      if (option.estimatedSavings > existing.estimatedSavings) {
        const index = acc.indexOf(existing)
        acc[index] = option
      }
    }
    return acc
  }, [])

  // Step 4: Validate opportunities using Discount Rules Validator
  const discountValidator = new DiscountRulesValidator(knowledgePackRAG)
  // Initialize with raw opportunities as fallback (will be replaced if validation succeeds)
  let validatedOpportunities: ValidatedOpportunity[] = rawAnalysisResult.opportunities.map(
    (opp) => ({
      ...opp,
      confidenceScore: 0,
      validationDetails: {
        rulesEvaluated: [],
        missingData: [],
        eligibilityChecks: {
          discountFound: false,
          eligibilityValidated: false,
          savingsCalculated: false,
          stackingValidated: false,
        },
      },
      requiresDocumentation: false,
      validatedAt: new Date().toISOString(),
    })
  )

  let validationResults: {
    rulesEvaluated: Array<{
      rule: string
      citation: { id: string; type: string; carrier: string; file: string }
      result: 'pass' | 'fail' | 'partial'
    }>
    confidenceScores: Record<string, number>
    stackingResults?: {
      validCombinations: string[][]
      conflicts: Array<{ opportunity1: string; opportunity2: string; reason: string }>
      maxStackable?: number
    }
  } | null = null

  try {
    // Note: customerData is not available in policy flow, pass undefined
    validatedOpportunities = await discountValidator.validateOpportunities(
      rawAnalysisResult.opportunities,
      policySummary,
      carrier,
      undefined // customerData not available in policy analysis flow
    )

    // Extract validation results for decision trace
    const allRulesEvaluated = validatedOpportunities.flatMap(
      (opp) => opp.validationDetails.rulesEvaluated
    )
    const confidenceScores: Record<string, number> = {}
    for (const opp of validatedOpportunities) {
      confidenceScores[opp.citation.id] = opp.confidenceScore
    }

    // Get stacking results
    const { validateStacking } = await import('./discount-rules-validator/stacking-validator')
    const stackingResults = validateStacking(validatedOpportunities, carrier)

    validationResults = {
      rulesEvaluated: allRulesEvaluated,
      confidenceScores,
      stackingResults: {
        validCombinations: stackingResults.validCombinations,
        conflicts: stackingResults.conflicts,
        maxStackable: stackingResults.maxStackable,
      },
    }
  } catch (error) {
    await logError('Discount validation failed', error as Error, {
      type: 'discount_validation_error',
      carrier: policySummary.carrier,
    })
    // Continue with unvalidated opportunities if validation fails
  }

  // Step 5: Generate pitch using Pitch Generator Agent
  const pitchGenerator = new PitchGenerator(llmProvider)
  let pitch = ''
  let pitchTokens = 0

  try {
    const pitchResult = await pitchGenerator.generatePitch(
      validatedOpportunities,
      uniqueBundleOptions,
      rawAnalysisResult.deductibleOptimizations,
      policySummary
    )
    pitch = pitchResult as string
    pitchTokens =
      (pitchResult as { _metadata?: { tokensUsed?: number } })._metadata?.tokensUsed || 0
  } catch (error) {
    await logError('Pitch generation failed in policy analyze', error as Error, {
      type: 'pitch_generation_error',
      carrier: policySummary.carrier,
    })
    // Use fallback pitch
    pitch =
      "Based on our analysis, we've identified several savings opportunities. Please review the detailed recommendations below."
  }

  // Step 6: Run compliance filter on pitch
  let complianceResult: ReturnType<typeof validateOutput>
  try {
    complianceResult = validateOutput(pitch, policySummary.state, policySummary.productType)
  } catch (error) {
    await logError('Compliance filter error in policy analyze', error as Error, {
      type: 'compliance_error',
    })
    complianceResult = {
      passed: false,
      disclaimers: [],
    }
  }

  // If compliance check failed, replace pitch with replacement message
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
      state: policySummary.state,
      productType: policySummary.productType,
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
