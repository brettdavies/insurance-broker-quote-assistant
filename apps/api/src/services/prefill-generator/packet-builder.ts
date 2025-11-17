/**
 * Packet Builder
 *
 * Builds prefill packets from user profile, routing, and missing fields.
 */

import type {
  MissingField,
  PrefillPacket,
  ProducerInfo,
  RouteDecision,
  UserProfile,
} from '@repo/shared'
import { getProductByCode, getStateByCode } from '../knowledge-pack-rag'
import { createPrefillRouting } from './routing-builder'

/**
 * Get hardcoded producer information
 * TODO: In production, this would come from authenticated user session or environment config
 *
 * @returns ProducerInfo with hardcoded demo producer details
 */
function getProducerInfo(): ProducerInfo {
  return {
    producerName: 'Sarah Johnson',
    producerLicenseNumber: 'TX-0123456',
    licenseState: 'TX',
    licenseExpiration: '2026-12-31',
    npn: '18765432', // National Producer Number
    producerPhone: '(512) 555-1234',
    producerEmail: 'sarah.johnson@example.com',
    brokerageName: 'Example Insurance Agency',
    brokerageAddress: '123 Insurance Way, Austin, TX 78701',
  }
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
 * Creates structured PrefillPacket with complete profile and routing data.
 * Uses nested objects for type safety and easier import/export to broker systems.
 *
 * Note: Full routing decision with match scores is kept in IntakeResult for compliance logs.
 * The prefill packet only shows the recommended carrier (not alternatives or internal scores).
 *
 * @param profile - User profile with captured shopper data
 * @param route - Route decision from routing engine
 * @param missingFields - Missing fields checklist (can be empty array)
 * @param disclaimers - Compliance disclaimers from compliance filter
 * @returns PrefillPacket ready for broker handoff
 */
export async function generatePrefillPacket(
  profile: UserProfile,
  route: RouteDecision,
  missingFields: MissingField[],
  disclaimers: string[]
): Promise<PrefillPacket> {
  // Handle edge cases: missing required fields
  if (!profile.state || !profile.productType || !profile.age) {
    throw new Error('State, productType, and age are required for prefill packet generation')
  }

  // Log prefill generation start
  const { logDebug } = await import('../../utils/logger')
  await logDebug('Prefill generator: Starting prefill packet generation', {
    type: 'prefill_generation_start',
    routePrimaryCarrier: route.primaryCarrier,
    routeEligibleCarriers: route.eligibleCarriers,
    routeEligibleCarriersCount: route.eligibleCarriers.length,
    profileState: profile.state,
    profileProductType: profile.productType,
  })

  // Create simplified routing for prefill
  const prefillRouting = createPrefillRouting(route)

  await logDebug('Prefill generator: Prefill routing created', {
    type: 'prefill_routing_created',
    primaryCarrier: prefillRouting.primaryCarrier,
    eligibleCarriers: prefillRouting.eligibleCarriers,
    eligibleCarriersCount: prefillRouting.eligibleCarriers.length,
    confidence: prefillRouting.confidence,
  })

  // Create structured prefill packet
  const prefill: PrefillPacket = {
    profile, // Complete user profile with all extracted fields
    routing: prefillRouting, // Simplified routing (no internal scores or alternatives)
    producer: getProducerInfo(), // Licensed agent information (hardcoded for demo)
    missingFields: missingFields.length > 0 ? missingFields : [],
    disclaimers: disclaimers.length > 0 ? disclaimers : [],
    producerNotes: generateLeadHandoffSummary(profile, route, missingFields),
    reviewedByLicensedAgent: false,
    generatedAt: new Date().toISOString(),
  }

  await logDebug('Prefill generator: Prefill packet generated', {
    type: 'prefill_packet_generated',
    hasRouting: !!prefill.routing,
    routingPrimaryCarrier: prefill.routing.primaryCarrier,
    routingEligibleCarriers: prefill.routing.eligibleCarriers,
    routingEligibleCarriersCount: prefill.routing.eligibleCarriers.length,
  })

  return prefill
}
