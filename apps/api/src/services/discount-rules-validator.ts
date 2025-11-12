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
import { getFieldValue } from '../utils/field-helpers'
import { logInfo } from '../utils/logger'
import { getDiscountEvaluator } from './discount-engine/factory'
import { calculateConfidenceScore } from './discount-rules-validator/confidence-scorer'
import { validateStacking } from './discount-rules-validator/stacking-validator'
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
      const validationResult = await this.validateSingleOpportunity(
        opportunity,
        policy,
        carrier,
        customerData,
        stackingResult
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

  /**
   * Validate a single opportunity
   */
  private async validateSingleOpportunity(
    opportunity: Opportunity,
    policy: PolicySummary,
    carrier: Carrier,
    customerData: UserProfile | undefined,
    stackingResult: ReturnType<typeof validateStacking>
  ): Promise<ValidatedOpportunity | null> {
    const validationDetails: ValidationDetails = {
      rulesEvaluated: [],
      missingData: [],
      eligibilityChecks: {
        discountFound: false,
        eligibilityValidated: false,
        savingsCalculated: false,
        stackingValidated: false,
      },
    }

    // Step 1: Fetch discount from knowledge pack using citation ID
    const discountLookup = this.knowledgePackRAG.getDiscountById(opportunity.citation.id)
    if (!discountLookup) {
      validationDetails.rulesEvaluated.push({
        rule: 'Discount lookup by citation ID',
        citation: opportunity.citation,
        result: 'fail',
      })
      validationDetails.missingData.push('Discount not found in knowledge pack')
      // Still return validated opportunity with low confidence
      return this.createValidatedOpportunity(
        opportunity,
        validationDetails,
        stackingResult,
        0 // Low confidence if discount not found
      )
    }

    const { discount, carrier: discountCarrier } = discountLookup
    validationDetails.eligibilityChecks.discountFound = true

    // Use citation file path from opportunity if available, otherwise construct from carrier
    const citationFile =
      opportunity.citation.file ||
      `knowledge_pack/carriers/${discountCarrier.name.toLowerCase().replace(/\s+/g, '-')}.json`

    validationDetails.rulesEvaluated.push({
      rule: 'Discount lookup by citation ID',
      citation: {
        id: discount._id,
        type: 'discount',
        carrier: discountCarrier.name,
        file: citationFile,
      },
      result: 'pass',
    })

    // Step 2: Re-validate eligibility using existing discount engine evaluator
    const evaluator = getDiscountEvaluator(discount)
    const eligibilityResult = evaluator.evaluateEligibility(discount, policy, customerData)

    validationDetails.eligibilityChecks.eligibilityValidated = true
    if (!eligibilityResult.eligible) {
      validationDetails.missingData.push(...eligibilityResult.missingRequirements)
      validationDetails.rulesEvaluated.push({
        rule: 'Eligibility validation',
        citation: {
          id: discount._id,
          type: 'discount',
          carrier: discountCarrier.name,
          file: citationFile,
        },
        result: 'fail',
      })
    } else {
      validationDetails.rulesEvaluated.push({
        rule: 'Eligibility validation',
        citation: {
          id: discount._id,
          type: 'discount',
          carrier: discountCarrier.name,
          file: citationFile,
        },
        result: 'pass',
      })
    }

    // Step 3: Calculate/validate savings using existing discount engine
    const savingsResult = evaluator.calculateSavings(discount, policy, customerData)
    validationDetails.eligibilityChecks.savingsCalculated = true

    // Compare LLM-identified savings with discount engine calculated savings
    const savingsDifference = Math.abs(opportunity.annualSavings - savingsResult.annualDollars)
    const savingsMatch = savingsDifference < 10 // Allow $10 difference for rounding

    validationDetails.rulesEvaluated.push({
      rule: 'Savings calculation validation',
      citation: {
        id: discount._id,
        type: 'discount',
        carrier: discountCarrier.name,
        file: citationFile,
      },
      result: savingsMatch ? 'pass' : 'partial',
    })

    // Use discount engine calculated savings if there's a significant difference
    const validatedSavings = savingsMatch ? opportunity.annualSavings : savingsResult.annualDollars

    // Step 4: Check stacking validation
    validationDetails.eligibilityChecks.stackingValidated = true
    const stackableWith = stackingResult.validCombinations
      .filter((combo) => combo.includes(opportunity.citation.id))
      .flatMap((combo) => combo.filter((id) => id !== opportunity.citation.id))

    // Step 5: Extract documentation requirements
    const requiresDocumentation = discount.metadata?.requiresDocumentation || false
    const documentationRequirements: string[] = []
    if (requiresDocumentation) {
      const description = getFieldValue(discount.description, '')
      if (description) {
        // Extract documentation requirements from description
        // Look for phrases like "requires transcript", "requires proof", etc.
        const docPatterns = [
          /requires?\s+(?:a\s+)?(?:transcript|proof|documentation|certificate|verification)/gi,
          /must\s+provide\s+(?:a\s+)?(?:transcript|proof|documentation|certificate|verification)/gi,
        ]
        for (const pattern of docPatterns) {
          const matches = description.match(pattern)
          if (matches) {
            documentationRequirements.push(...matches.map((m: string) => m.trim()))
          }
        }
      }
      if (documentationRequirements.length === 0) {
        documentationRequirements.push('Documentation required (see discount description)')
      }
    }

    // Step 6: Calculate confidence score
    const confidenceBreakdown = calculateConfidenceScore(
      opportunity,
      policy,
      customerData,
      validationDetails
    )

    // Create validated opportunity
    return this.createValidatedOpportunity(
      {
        ...opportunity,
        annualSavings: validatedSavings, // Use validated savings
      },
      validationDetails,
      stackingResult,
      confidenceBreakdown.total,
      stackableWith,
      requiresDocumentation,
      documentationRequirements
    )
  }

  /**
   * Create validated opportunity from validation results
   */
  private createValidatedOpportunity(
    opportunity: Opportunity,
    validationDetails: ValidationDetails,
    stackingResult: ReturnType<typeof validateStacking>,
    confidenceScore: number,
    stackableWith?: string[],
    requiresDocumentation = false,
    documentationRequirements: string[] = []
  ): ValidatedOpportunity {
    return {
      ...opportunity,
      confidenceScore,
      validationDetails,
      requiresDocumentation,
      documentationRequirements:
        documentationRequirements.length > 0 ? documentationRequirements : undefined,
      stackableWith: stackableWith && stackableWith.length > 0 ? stackableWith : undefined,
      validatedAt: new Date().toISOString(),
    }
  }
}
