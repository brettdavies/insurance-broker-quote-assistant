/**
 * Discount Stacking Validator
 *
 * Validates which discounts can be combined based on stacking rules
 * from knowledge pack and carrier-specific limits.
 *
 * @see docs/stories/2.3.discount-rules-engine.md#task-3
 */

import type { Carrier, Discount } from '@repo/shared'
import { getFieldValue } from '../../utils/field-helpers'

/**
 * Stacking validation result
 */
export interface StackingValidationResult {
  validCombinations: string[][] // Array of opportunity ID arrays that can combine
  conflicts: Array<{ opportunity1: string; opportunity2: string; reason: string }> // Pairs that cannot combine
  maxStackable?: number // Maximum number of stackable discounts (if carrier has limit)
}

/**
 * Validate discount stacking rules
 *
 * @param opportunities - Array of opportunities with citation IDs
 * @param carrier - Carrier from knowledge pack
 * @returns Stacking validation result
 */
export function validateStacking(
  opportunities: Array<{ citation: { id: string } }>,
  carrier: Carrier
): StackingValidationResult {
  const result: StackingValidationResult = {
    validCombinations: [],
    conflicts: [],
  }

  // Get carrier max stackable discounts limit (if any)
  // Note: Carrier doesn't have metadata field, maxStackableDiscounts would be in discount metadata
  // For now, check if any discount has maxStackableDiscounts in its metadata
  let maxStackable: number | undefined
  for (const discount of carrier.discounts) {
    const discountMaxStackable = discount.metadata?.maxStackableDiscounts
    if (discountMaxStackable !== undefined) {
      maxStackable = discountMaxStackable
      break // Use first found value
    }
  }
  if (maxStackable !== undefined) {
    result.maxStackable = maxStackable
  }

  // Build a map of discount IDs to their stackable status
  const discountStackableMap = new Map<string, boolean>()
  const discountMap = new Map<string, Discount>()

  // Fetch discounts from knowledge pack using citation IDs
  for (const opportunity of opportunities) {
    const discountId = opportunity.citation.id
    const discount = carrier.discounts.find((d) => d._id === discountId)
    if (discount) {
      discountMap.set(discountId, discount)
      const stackable = getFieldValue(discount.stackable, true)
      discountStackableMap.set(discountId, stackable)
    }
  }

  // Check all pairs of opportunities for stacking compatibility
  for (let i = 0; i < opportunities.length; i++) {
    const opp1 = opportunities[i]
    if (!opp1) continue
    const opp1Id = opp1.citation.id
    const opp1Stackable = discountStackableMap.get(opp1Id) ?? true
    const discount1 = discountMap.get(opp1Id)

    for (let j = i + 1; j < opportunities.length; j++) {
      const opp2 = opportunities[j]
      if (!opp2) continue
      const opp2Id = opp2.citation.id
      const opp2Stackable = discountStackableMap.get(opp2Id) ?? true
      const discount2 = discountMap.get(opp2Id)

      // Both discounts must be stackable to combine
      if (!opp1Stackable || !opp2Stackable) {
        result.conflicts.push({
          opportunity1: opp1Id,
          opportunity2: opp2Id,
          reason: 'One or both discounts are not stackable',
        })
        continue
      }

      // If carrier has max stackable limit, check if we exceed it
      if (maxStackable !== undefined && maxStackable < 2) {
        result.conflicts.push({
          opportunity1: opp1Id,
          opportunity2: opp2Id,
          reason: `Carrier allows maximum ${maxStackable} stackable discount(s)`,
        })
        continue
      }

      // Check if discounts have conflicting requirements
      // (e.g., both require different products, or mutually exclusive conditions)
      if (discount1 && discount2) {
        const requirements1 = getFieldValue(discount1.requirements, {}) as {
          bundleProducts?: string[]
          mustHaveProducts?: string[]
        }
        const requirements2 = getFieldValue(discount2.requirements, {}) as {
          bundleProducts?: string[]
          mustHaveProducts?: string[]
        }

        // Check for conflicting bundle requirements
        const bundle1 = requirements1.bundleProducts || requirements1.mustHaveProducts || []
        const bundle2 = requirements2.bundleProducts || requirements2.mustHaveProducts || []

        // If both are bundle discounts with different product requirements, they might conflict
        if (bundle1.length > 0 && bundle2.length > 0) {
          // Check if bundle products overlap (if they don't, they might conflict)
          const overlap = bundle1.some((p) => bundle2.includes(p))
          if (!overlap && bundle1.length > 1 && bundle2.length > 1) {
            // Different bundle requirements might conflict
            result.conflicts.push({
              opportunity1: opp1Id,
              opportunity2: opp2Id,
              reason: 'Conflicting bundle product requirements',
            })
            continue
          }
        }
      }

      // If we get here, the pair can stack
      // Add to valid combinations (avoid duplicates)
      const combination = [opp1Id, opp2Id].sort()
      const exists = result.validCombinations.some(
        (c) => c.length === combination.length && c.every((id, idx) => id === combination[idx])
      )
      if (!exists) {
        result.validCombinations.push(combination)
      }
    }
  }

  // If carrier has max stackable limit, filter valid combinations
  if (maxStackable !== undefined) {
    result.validCombinations = result.validCombinations.filter(
      (combo) => combo.length <= maxStackable
    )
  }

  return result
}
