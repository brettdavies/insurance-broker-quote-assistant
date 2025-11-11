/**
 * Prefill Generator Service
 *
 * Generates IQuote Pro pre-fill packet from UserProfile, RouteDecision,
 * missing fields, and disclaimers for broker handoff to licensed agents.
 *
 * @see docs/stories/1.8.prefill-packet-generation.md
 */

import type { PrefillPacket, RouteDecision, UserProfile } from '@repo/shared'

/**
 * Get missing fields with priority indicators
 *
 * Compares UserProfile against required fields per product type and returns
 * formatted checklist with priority indicators.
 *
 * @param profile - User profile to check
 * @returns Array of missing field names with priority indicators: "[CRITICAL] field", "[IMPORTANT] field", "[OPTIONAL] field"
 */
export function getMissingFields(profile: UserProfile): string[] {
  const missing: string[] = []

  // Required fields for all products
  if (!profile.state) {
    missing.push('[CRITICAL] state')
  }
  if (!profile.productLine) {
    missing.push('[CRITICAL] productLine')
  }

  // Product-specific required fields
  if (profile.productLine === 'auto') {
    if (!profile.vehicles) {
      missing.push('[CRITICAL] vehicles')
    }
    if (!profile.drivers) {
      missing.push('[CRITICAL] drivers')
    }
    if (!profile.vins) {
      missing.push('[IMPORTANT] vins')
    }
    if (!profile.garage) {
      missing.push('[OPTIONAL] garage')
    }
  } else if (profile.productLine === 'home') {
    if (!profile.propertyType) {
      missing.push('[CRITICAL] propertyType')
    }
    if (!profile.constructionYear) {
      missing.push('[IMPORTANT] constructionYear')
    }
    if (!profile.squareFeet) {
      missing.push('[IMPORTANT] squareFeet')
    }
    if (!profile.roofType) {
      missing.push('[OPTIONAL] roofType')
    }
  } else if (profile.productLine === 'renters') {
    if (!profile.propertyType) {
      missing.push('[CRITICAL] propertyType')
    }
    // Note: personalProperty not in UserProfile schema, defer to knowledge pack if needed
  } else if (profile.productLine === 'umbrella') {
    if (!profile.existingPolicies || profile.existingPolicies.length === 0) {
      missing.push('[CRITICAL] existingPolicies')
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
  missingFields: string[]
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

  // Missing fields checklist
  if (missingFields.length > 0) {
    notes.push(`Missing fields checklist: ${missingFields.join(', ')}`)
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
  missingFields: string[],
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
