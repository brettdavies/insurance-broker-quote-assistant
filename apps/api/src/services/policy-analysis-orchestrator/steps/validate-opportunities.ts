/**
 * Validate Opportunities Step
 *
 * Validates opportunities using Discount Rules Validator.
 */

import type { Carrier, PolicySummary, ValidatedOpportunity } from '@repo/shared'
import { logError } from '../../../utils/logger'
import { DiscountRulesValidator } from '../../discount-rules-validator'
import * as knowledgePackRAG from '../../knowledge-pack-rag'
import type { Opportunity } from '@repo/shared'

/**
 * Validate opportunities
 */
export async function validateOpportunities(
  opportunities: Opportunity[],
  policySummary: PolicySummary,
  carrier: Carrier
): Promise<{
  validatedOpportunities: ValidatedOpportunity[]
  validationResults: {
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
  } | null
}> {
  const discountValidator = new DiscountRulesValidator(knowledgePackRAG)
  // Initialize with raw opportunities as fallback (will be replaced if validation succeeds)
  let validatedOpportunities: ValidatedOpportunity[] = opportunities.map((opp) => ({
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
  }))

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
      opportunities,
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
    const { validateStacking } = await import('../../discount-rules-validator/stacking-validator')
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

  return {
    validatedOpportunities,
    validationResults,
  }
}
