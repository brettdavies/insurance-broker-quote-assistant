/**
 * Discount Rules Validator Service
 *
 * Validates discount opportunities identified by Policy Analysis Agent
 * against knowledge pack rules using existing discount engine evaluators.
 *
 * 100% deterministic - no LLM calls, pure functions only.
 *
 * @see docs/stories/2.3.discount-rules-engine.md
 */

import type {
  Carrier,
  Opportunity,
  PolicySummary,
  UserProfile,
  ValidatedOpportunity,
  ValidationDetails,
} from '@repo/shared'
import { logInfo } from '../utils/logger'
import { validateStacking } from './discount-rules-validator/stacking-validator'
import { validateSingleOpportunity } from './discount-rules-validator/opportunity-validator'
import * as knowledgePackRAGModule from './knowledge-pack-rag'

type KnowledgePackRAG = typeof knowledgePackRAGModule

/**
 * Discount Rules Validator
 */
export class DiscountRulesValidator {
  constructor(private knowledgePackRAG: KnowledgePackRAG = knowledgePackRAGModule) {}

  /**
   * Validate opportunities against knowledge pack rules
   *
   * @param opportunities - Opportunities identified by Policy Analysis Agent
   * @param policy - Policy summary
   * @param carrier - Carrier from knowledge pack
   * @param customerData - Optional customer profile data
   * @returns Array of validated opportunities with confidence scores
   */
  async validateOpportunities(
    opportunities: Opportunity[],
    policy: PolicySummary,
    carrier: Carrier,
    customerData?: UserProfile
  ): Promise<ValidatedOpportunity[]> {
    const validatedOpportunities: ValidatedOpportunity[] = []
    const rulesEvaluated: ValidationDetails['rulesEvaluated'] = []

    // Step 1: Validate stacking rules for all opportunities
    const stackingResult = validateStacking(opportunities, carrier)

    // Step 2: Validate each opportunity individually
    for (const opportunity of opportunities) {
      const validationResult = await validateSingleOpportunity(
        opportunity,
        policy,
        carrier,
        customerData,
        stackingResult,
        this.knowledgePackRAG
      )

      if (validationResult) {
        validatedOpportunities.push(validationResult)
        rulesEvaluated.push(...validationResult.validationDetails.rulesEvaluated)
      }
    }

    await logInfo('Discount rules validation completed', {
      opportunitiesCount: opportunities.length,
      validatedCount: validatedOpportunities.length,
      rulesEvaluatedCount: rulesEvaluated.length,
    })

    return validatedOpportunities
  }

}
