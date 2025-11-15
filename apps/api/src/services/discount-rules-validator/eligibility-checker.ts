/**
 * Eligibility Checker
 *
 * Checks eligibility for discount opportunities.
 */

import type { Carrier, Opportunity, PolicySummary, UserProfile, ValidationDetails } from '@repo/shared'
import { getDiscountEvaluator } from '../discount-engine/factory'
import * as knowledgePackRAGModule from '../knowledge-pack-rag'

type KnowledgePackRAG = typeof knowledgePackRAGModule

/**
 * Check eligibility for an opportunity
 */
export function checkEligibility(
  opportunity: Opportunity,
  policy: PolicySummary,
  carrier: Carrier,
  customerData: UserProfile | undefined,
  knowledgePackRAG: KnowledgePackRAG,
  validationDetails: ValidationDetails
): {
  eligible: boolean
  citationFile: string
  discount: Carrier['discounts'][number]
  discountCarrier: Carrier
} | null {
  // Fetch discount from knowledge pack using citation ID
  const discountLookup = knowledgePackRAG.getDiscountById(opportunity.citation.id)
  if (!discountLookup) {
    validationDetails.rulesEvaluated.push({
      rule: 'Discount lookup by citation ID',
      citation: opportunity.citation,
      result: 'fail',
    })
    validationDetails.missingData.push('Discount not found in knowledge pack')
    return null
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

  // Re-validate eligibility using existing discount engine evaluator
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

  return {
    eligible: eligibilityResult.eligible,
    citationFile,
    discount,
    discountCarrier,
  }
}
