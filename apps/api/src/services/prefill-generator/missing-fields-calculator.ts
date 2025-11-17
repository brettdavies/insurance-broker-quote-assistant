/**
 * Missing Fields Calculator
 *
 * Calculates missing fields with priority indicators based on product, carrier, and state requirements.
 * Uses knowledge pack for product/carrier/state-specific requirements.
 */

import type { MissingField, UserProfile } from '@repo/shared'
import { checkRequiredFields, isFieldMissing } from '@repo/shared'
import {
  getCarrierFieldRequirements,
  getProductFieldRequirements,
  getStateFieldRequirements,
} from '../knowledge-pack-rag'

/**
 * Get missing fields with priority indicators
 *
 * Compares UserProfile against required fields per product type, carrier-specific,
 * and state-specific requirements. Returns structured MissingField objects.
 *
 * @param profile - User profile to check
 * @param productType - Optional product type (defaults to profile.productType)
 * @param state - Optional state code (defaults to profile.state)
 * @param carrier - Optional carrier name for carrier-specific requirements
 * @returns Array of missing fields with priority indicators
 */
export function getMissingFields(
  profile: UserProfile,
  productType?: string,
  state?: string,
  carrier?: string
): MissingField[] {
  const missing: MissingField[] = []
  const product = productType || profile.productType || undefined
  const stateCode = state || profile.state || undefined

  // Required fields for all products (from shared)
  missing.push(...checkRequiredFields(profile))

  // Get product-specific required fields from knowledge pack
  if (product) {
    const productRequirements = getProductFieldRequirements(product)
    for (const req of productRequirements) {
      // Check if field is actually missing from profile (using shared utility)
      if (isFieldMissing(profile, req.field)) {
        missing.push(req)
      }
    }
  }

  // Add carrier-specific requirements if carrier is known
  if (carrier && product) {
    const carrierRequirements = getCarrierFieldRequirements(carrier, product, stateCode)
    for (const req of carrierRequirements) {
      // Only add if field is not already in missing list and is actually missing from profile
      const alreadyMissing = missing.some((m) => m.field === req.field)
      if (!alreadyMissing) {
        // Check if field is actually missing (using shared utility)
        if (isFieldMissing(profile, req.field)) {
          missing.push(req)
        }
      } else {
        // Update priority if carrier requirement is more critical
        const existingIndex = missing.findIndex((m) => m.field === req.field)
        if (existingIndex >= 0) {
          const existing = missing[existingIndex]
          if (
            existing &&
            ((req.priority === 'critical' && existing.priority !== 'critical') ||
              (req.priority === 'important' && existing.priority === 'optional'))
          ) {
            missing[existingIndex] = req
          }
        }
      }
    }
  }

  // Add state-specific requirements if state is known
  if (stateCode && product) {
    const stateRequirements = getStateFieldRequirements(stateCode, product)
    for (const req of stateRequirements) {
      // Only add if field is not already in missing list and is actually missing from profile
      const alreadyMissing = missing.some((m) => m.field === req.field)
      if (!alreadyMissing) {
        // Check if field is actually missing (using shared utility)
        if (isFieldMissing(profile, req.field)) {
          missing.push(req)
        }
      } else {
        // Update priority if state requirement is more critical
        const existingIndex = missing.findIndex((m) => m.field === req.field)
        if (existingIndex >= 0) {
          const existing = missing[existingIndex]
          if (
            existing &&
            ((req.priority === 'critical' && existing.priority !== 'critical') ||
              (req.priority === 'important' && existing.priority === 'optional'))
          ) {
            missing[existingIndex] = req
          }
        }
      }
    }
  }

  return missing
}
