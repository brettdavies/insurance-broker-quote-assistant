/**
 * Prefill Generator Service
 *
 * Generates IQuote Pro pre-fill packet from UserProfile, RouteDecision,
 * missing fields, and disclaimers for broker handoff to licensed agents.
 *
 * @see docs/stories/1.8.prefill-packet-generation.md
 */

import type { MissingField, PrefillPacket, RouteDecision, UserProfile } from '@repo/shared'
import {
  getCarrierFieldRequirements,
  getProductByCode,
  getProductFieldRequirements,
  getStateByCode,
  getStateFieldRequirements,
} from './knowledge-pack-rag'

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
  const product = productType || profile.productType
  const stateCode = state || profile.state

  // Required fields for all products
  if (!profile.state) {
    missing.push({ field: 'state', priority: 'critical' })
  }
  if (!profile.productType) {
    missing.push({ field: 'productType', priority: 'critical' })
  }

  // Get product-specific required fields from knowledge pack
  if (product) {
    const productRequirements = getProductFieldRequirements(product)
    for (const req of productRequirements) {
      // Check if field is actually missing from profile
      const fieldValue = profile[req.field as keyof UserProfile]
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        // Special handling for existingPolicies (array check)
        if (req.field === 'existingPolicies') {
          const existingPolicies = profile.existingPolicies
          if (!existingPolicies || existingPolicies.length === 0) {
            missing.push(req)
          }
        } else {
          missing.push(req)
        }
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
        // Check if field is actually missing
        const fieldValue = profile[req.field as keyof UserProfile]
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
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
        // Check if field is actually missing
        const fieldValue = profile[req.field as keyof UserProfile]
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
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

/**
 * Generate lead handoff summary for licensed agent
 *
 * Creates next steps with state/product-specific guidance, missing fields checklist,
 * routing rationale, and alternative carriers.
 *
 * @param profile - User profile
 * @param route - Route decision
 * @param missingFields - Missing fields checklist
 * @returns Array of talking points for licensed agent
 */
export function generateLeadHandoffSummary(
  profile: UserProfile,
  route: RouteDecision,
  missingFields: MissingField[]
): string[] {
  const notes: string[] = []

  // Get state-specific guidance from knowledge pack
  if (profile.state) {
    const state = getStateByCode(profile.state)
    const stateGuidance = state?.prefillGuidance?.value
    if (stateGuidance && typeof stateGuidance === 'string') {
      notes.push(`State-specific guidance: ${stateGuidance}`)
    }
  }

  // Get product-specific guidance from knowledge pack
  if (profile.productType) {
    const product = getProductByCode(profile.productType)
    const productGuidance = product?.prefillGuidance?.value
    if (productGuidance && typeof productGuidance === 'string') {
      notes.push(`Product-specific guidance: ${productGuidance}`)
    }
  }

  // Missing fields checklist - format with priority indicators
  if (missingFields.length > 0) {
    const criticalFields = missingFields
      .filter((f) => f.priority === 'critical')
      .map((f) => `[CRITICAL] ${f.field}`)
    const importantFields = missingFields
      .filter((f) => f.priority === 'important')
      .map((f) => `[IMPORTANT] ${f.field}`)
    const optionalFields = missingFields
      .filter((f) => f.priority === 'optional')
      .map((f) => `[OPTIONAL] ${f.field}`)
    const allFields = [...criticalFields, ...importantFields, ...optionalFields]
    notes.push(`Missing fields checklist: ${allFields.join(', ')}`)
  }

  // Routing rationale
  if (route.rationale) {
    notes.push(`Routing rationale: ${route.rationale}`)
  }

  // Alternative carriers
  if (route.eligibleCarriers && route.eligibleCarriers.length > 1) {
    const alternatives = route.eligibleCarriers.filter((c) => c !== route.primaryCarrier)
    if (alternatives.length > 0) {
      notes.push(`Alternative carriers if primary doesn't work: ${alternatives.join(', ')}`)
    }
  }

  return notes
}

/**
 * Generate prefill packet from user profile, route decision, missing fields, and disclaimers
 *
 * Maps UserProfile fields to PrefillPacket structure, generates lead handoff summary,
 * formats missing fields with priority indicators, and embeds disclaimers.
 *
 * @param profile - User profile with captured shopper data
 * @param route - Route decision from routing engine
 * @param missingFields - Missing fields checklist (can be empty array)
 * @param disclaimers - Compliance disclaimers from compliance filter
 * @returns PrefillPacket ready for broker handoff
 */
export function generatePrefillPacket(
  profile: UserProfile,
  route: RouteDecision,
  missingFields: MissingField[],
  disclaimers: string[]
): PrefillPacket {
  // Handle edge cases: missing state/productType
  if (!profile.state || !profile.productType) {
    throw new Error('State and productType are required for prefill packet generation')
  }

  // Map contact information
  const prefill: PrefillPacket = {
    fullName: profile.name,
    email: profile.email,
    phone: profile.phone,
    address: undefined, // Construct from available fields
    state: profile.state,
    productType: profile.productType,
    carrier: route.primaryCarrier,
    routingDecision: route.rationale,
    agentNotes: generateLeadHandoffSummary(profile, route, missingFields),
    missingFields: missingFields.length > 0 ? missingFields : [],
    eligibleCarriers: route.eligibleCarriers,
    disclaimers: disclaimers.length > 0 ? disclaimers : [],
    reviewedByLicensedAgent: false,
    generatedAt: new Date().toISOString(),
  }

  // Construct address from available fields
  if (profile.zip) {
    prefill.address = profile.zip
  }

  // Map product-specific data based on productType
  if (profile.productType === 'auto') {
    prefill.vehicles = profile.vehicles
    prefill.drivers = profile.drivers
    prefill.vins = profile.vins
    prefill.garage = profile.garage
    // Note: primaryUse and annualMileage not in UserProfile schema, leave undefined
  } else if (profile.productType === 'home') {
    prefill.yearBuilt = profile.constructionYear
    prefill.squareFeet = profile.squareFeet
    prefill.roofType = profile.roofType
    prefill.propertyType = profile.propertyType
    // Note: homeValue and constructionType not in UserProfile schema, leave undefined
  } else if (profile.productType === 'renters') {
    // Note: personalProperty and liability not in UserProfile schema, leave undefined
  }

  return prefill
}
