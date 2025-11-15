/**
 * Opportunity Validator
 *
 * Validates a single opportunity against knowledge pack rules.
 */

import type {
  Carrier,
  Opportunity,
  PolicySummary,
  UserProfile,
  ValidatedOpportunity,
  ValidationDetails,
} from '@repo/shared'
import { getFieldValue } from '../../utils/field-helpers'
import { calculateConfidenceScore } from './confidence-scorer'
import { checkEligibility } from './eligibility-checker'
import { calculateAndValidateSavings } from './savings-calculator'
import * as knowledgePackRAGModule from '../knowledge-pack-rag'
import type { validateStacking } from './stacking-validator'

type KnowledgePackRAG = typeof knowledgePackRAGModule

/**
 * Validate a single opportunity
 */
export async function validateSingleOpportunity(
  opportunity: Opportunity,
  policy: PolicySummary,
  carrier: Carrier,
  customerData: UserProfile | undefined,
  stackingResult: ReturnType<typeof validateStacking>,
  knowledgePackRAG: KnowledgePackRAG
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

  // Step 1: Check eligibility
  const eligibilityResult = checkEligibility(
    opportunity,
    policy,
    carrier,
    customerData,
    knowledgePackRAG,
    validationDetails
  )

  if (!eligibilityResult) {
    // Discount not found - return validated opportunity with low confidence
    return createValidatedOpportunity(
      opportunity,
      validationDetails,
      stackingResult,
      0 // Low confidence if discount not found
    )
  }

  const { discount, discountCarrier, citationFile } = eligibilityResult

  // Step 2: Calculate/validate savings
  const validatedSavings = await calculateAndValidateSavings(
    opportunity,
    policy,
    customerData,
    discount,
    validationDetails,
    citationFile
  )

  // Step 3: Check stacking validation
  validationDetails.eligibilityChecks.stackingValidated = true
  const stackableWith = stackingResult.validCombinations
    .filter((combo) => combo.includes(opportunity.citation.id))
    .flatMap((combo) => combo.filter((id) => id !== opportunity.citation.id))

  // Step 4: Extract documentation requirements
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

  // Step 5: Calculate confidence score
  const confidenceBreakdown = calculateConfidenceScore(
    opportunity,
    policy,
    customerData,
    validationDetails
  )

  // Create validated opportunity
  return createValidatedOpportunity(
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
function createValidatedOpportunity(
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
