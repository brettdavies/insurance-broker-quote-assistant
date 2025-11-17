/**
 * Existing Policies Inference
 *
 * Infers existing insurance policies from currentCarrier and productType fields.
 */

import type { NormalizedField } from '../types'

/**
 * Infer existingPolicies from currentCarrier and productType fields
 * Only infers if both currentCarrier and productType are present
 *
 * Inference rules:
 * - If currentCarrier AND productType are both present → creates a policy with that carrier and product
 * - Example: "has geico" + "CA auto" → existingPolicies: [{carrier: "GEICO", product: "auto"}]
 *
 * @param extractedFields - Map of already extracted fields
 * @returns Array of inferred policies (may be empty if insufficient data)
 */
export function inferExistingPolicies(
  extractedFields: Map<string, NormalizedField>
): Array<{ carrier: string; product: 'auto' | 'home' | 'renters' | 'umbrella' }> {
  const policies: Array<{ carrier: string; product: 'auto' | 'home' | 'renters' | 'umbrella' }> = []

  // Check if we have both currentCarrier and productType
  const carrierField = extractedFields.get('currentCarrier')
  const productField = extractedFields.get('productType')

  if (carrierField && productField) {
    const carrier = String(carrierField.value)
    const product = String(productField.value) as 'auto' | 'home' | 'renters' | 'umbrella'

    // Validate product type
    if (['auto', 'home', 'renters', 'umbrella'].includes(product)) {
      policies.push({
        carrier,
        product,
      })
    }
  }

  return policies
}
