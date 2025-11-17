/**
 * Savings Calculator
 *
 * Calculates and validates savings for discount opportunities.
 */

import type {
  Carrier,
  Opportunity,
  PolicySummary,
  UserProfile,
  ValidationDetails,
} from '@repo/shared'
import { SAVINGS_TOLERANCE_DOLLARS } from '@repo/shared'
import { getDiscountEvaluator } from '../discount-engine/factory'
import * as knowledgePackRAG from '../knowledge-pack-rag'

/**
 * Calculate and validate savings
 */
export async function calculateAndValidateSavings(
  opportunity: Opportunity,
  policy: PolicySummary,
  customerData: UserProfile | undefined,
  discount: Carrier['discounts'][number],
  validationDetails: ValidationDetails,
  citationFile: string
): Promise<number> {
  // Calculate/validate savings using existing discount engine
  const evaluator = getDiscountEvaluator(discount)
  const savingsResult = evaluator.calculateSavings(discount, policy, customerData)
  validationDetails.eligibilityChecks.savingsCalculated = true

  // Compare LLM-identified savings with discount engine calculated savings
  const savingsDifference = Math.abs(opportunity.annualSavings - savingsResult.annualDollars)
  const savingsMatch = savingsDifference < SAVINGS_TOLERANCE_DOLLARS

  // Get carrier name from discount lookup (needed for citation)
  const discountLookup = knowledgePackRAG.getDiscountById(discount._id)
  const carrierName = discountLookup?.carrier.name || 'Unknown'

  validationDetails.rulesEvaluated.push({
    rule: 'Savings calculation validation',
    citation: {
      id: discount._id,
      type: 'discount',
      carrier: carrierName,
      file: citationFile,
    },
    result: savingsMatch ? 'pass' : 'partial',
  })

  // Use discount engine calculated savings if there's a significant difference
  return savingsMatch ? opportunity.annualSavings : savingsResult.annualDollars
}
