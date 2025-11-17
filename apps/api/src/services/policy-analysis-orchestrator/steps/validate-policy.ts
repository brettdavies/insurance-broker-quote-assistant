/**
 * Validate Policy Step
 *
 * Validates policy summary and retrieves carrier from knowledge pack.
 */

import type { Carrier, PolicySummary } from '@repo/shared'
import * as knowledgePackRAG from '../../knowledge-pack-rag'

/**
 * Validate policy summary and get carrier
 */
export function validatePolicyAndGetCarrier(policySummary: PolicySummary): Carrier {
  // Validate policy summary has minimum required fields
  if (!policySummary.carrier || !policySummary.state || !policySummary.productType) {
    throw new Error(
      'Policy summary missing required fields: carrier, state, and productType are required'
    )
  }

  // Get carrier from knowledge pack
  const carrier = knowledgePackRAG.getCarrierByName(policySummary.carrier)
  if (!carrier) {
    throw new Error(`Carrier "${policySummary.carrier}" not found in knowledge pack`)
  }

  return carrier
}
