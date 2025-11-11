/**
 * Prefill Generator Service
 *
 * Generates IQuote Pro pre-fill packet from UserProfile, RouteDecision,
 * missing fields, and disclaimers for broker handoff to licensed agents.
 *
 * @see docs/stories/1.8.prefill-packet-generation.md
 */

import type { MissingField, PrefillPacket, RouteDecision, UserProfile } from '@repo/shared'
import { getCarrierFieldRequirements, getStateFieldRequirements } from './knowledge-pack-rag'

/**
 * Get missing fields with priority indicators
 *
 * Compares UserProfile against required fields per product type, carrier-specific,
 * and state-specific requirements. Returns structured MissingField objects.
 *
 * @param profile - User profile to check
 * @param productLine - Optional product line (defaults to profile.productLine)
 * @param state - Optional state code (defaults to profile.state)
 * @param carrier - Optional carrier name for carrier-specific requirements
 * @returns Array of missing fields with priority indicators
 */
export function getMissingFields(
  profile: UserProfile,
  productLine?: string,
  state?: string,
  carrier?: string
): MissingField[] {
  const missing: MissingField[] = []
  const product = productLine || profile.productLine
  const stateCode = state || profile.state

  // Required fields for all products
  if (!profile.state) {
    missing.push({ field: 'state', priority: 'critical' })
  }
  if (!profile.productLine) {
    missing.push({ field: 'productLine', priority: 'critical' })
  }

  // Product-specific required fields
  if (product === 'auto') {
    if (!profile.vehicles) {
      missing.push({ field: 'vehicles', priority: 'critical' })
    }
    if (!profile.drivers) {
      missing.push({ field: 'drivers', priority: 'critical' })
    }
    if (!profile.vins) {
      missing.push({ field: 'vins', priority: 'important' })
    }
    if (!profile.garage) {
      missing.push({ field: 'garage', priority: 'optional' })
    }
  } else if (product === 'home') {
    if (!profile.propertyType) {
      missing.push({ field: 'propertyType', priority: 'critical' })
    }
    if (!profile.constructionYear) {
      missing.push({ field: 'constructionYear', priority: 'important' })
    }
    if (!profile.squareFeet) {
      missing.push({ field: 'squareFeet', priority: 'important' })
    }
    if (!profile.roofType) {
      missing.push({ field: 'roofType', priority: 'optional' })
    }
  } else if (product === 'renters') {
    if (!profile.propertyType) {
      missing.push({ field: 'propertyType', priority: 'critical' })
    }
  } else if (product === 'umbrella') {
    if (!profile.existingPolicies || profile.existingPolicies.length === 0) {
      missing.push({ field: 'existingPolicies', priority: 'critical' })
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

  // State-specific guidance
  const stateGuidance: Record<string, string> = {
    CA: 'California requires additional documentation for auto insurance. Verify VIN and driving records.',
    TX: 'Texas requires proof of financial responsibility. Ensure all required documents are collected.',
    FL: 'Florida has specific requirements for property insurance. Verify property details and flood zone.',
    NY: 'New York requires additional disclosures. Ensure all state-specific forms are completed.',
    IL: 'Illinois requires verification of coverage limits. Confirm minimum coverage requirements.',
  }

  if (profile.state && stateGuidance[profile.state]) {
    notes.push(`State-specific guidance: ${stateGuidance[profile.state]}`)
  }

  // Product-specific guidance
  const productGuidance: Record<string, string> = {
    auto: 'Auto insurance requires VIN verification and driving record review. Collect all vehicle information.',
    home: 'Home insurance requires property inspection details. Verify construction year, square footage, and roof type.',
    renters:
      'Renters insurance requires personal property inventory. Collect coverage limits and liability requirements.',
    umbrella:
      'Umbrella insurance requires existing policy details. Verify underlying coverage limits.',
  }

  if (profile.productLine && productGuidance[profile.productLine]) {
    notes.push(`Product-specific guidance: ${productGuidance[profile.productLine]}`)
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
  // Handle edge cases: missing state/productLine
  if (!profile.state || !profile.productLine) {
    throw new Error('State and productLine are required for prefill packet generation')
  }

  // Map contact information
  const prefill: PrefillPacket = {
    fullName: profile.name,
    email: profile.email,
    phone: profile.phone,
    address: undefined, // Construct from available fields
    state: profile.state,
    productLine: profile.productLine,
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

  // Map product-specific data based on productLine
  if (profile.productLine === 'auto') {
    prefill.vehicles = profile.vehicles
    prefill.drivers = profile.drivers
    prefill.vins = profile.vins
    prefill.garage = profile.garage
    // Note: primaryUse and annualMileage not in UserProfile schema, leave undefined
  } else if (profile.productLine === 'home') {
    prefill.yearBuilt = profile.constructionYear
    prefill.squareFeet = profile.squareFeet
    prefill.roofType = profile.roofType
    prefill.propertyType = profile.propertyType
    // Note: homeValue and constructionType not in UserProfile schema, leave undefined
  } else if (profile.productLine === 'renters') {
    // Note: personalProperty and liability not in UserProfile schema, leave undefined
  }

  return prefill
}
