/**
 * Result Builder Handler
 *
 * Builds the IntakeResult response from extraction, routing, and compliance data.
 */

import type {
  IntakeResult,
  MissingField,
  PolicySummary,
  PrefillPacket,
  RouteDecision,
  UserProfile,
} from '@repo/shared'
import type { DecisionTrace } from '@repo/shared'
import type { ExtractionResult } from '../../../services/conversational-extractor'
import { findApplicableDiscounts } from '../../../services/discount-engine'
import { getCarrierByName } from '../../../services/knowledge-pack-rag'
import { generatePrefillPacket, getMissingFields } from '../../../services/prefill-generator'
import { logDebug } from '../../../utils/logger'

/**
 * Build IntakeResult from extraction, routing, and compliance data
 */
export async function buildIntakeResult(
  extractionResult: ExtractionResult,
  routeDecision: RouteDecision | undefined,
  complianceResult: { passed: boolean; disclaimers?: string[]; replacementMessage?: string },
  missingFieldsForResponse: MissingField[],
  prefillPacket: PrefillPacket | undefined,
  pitch: string,
  trace: DecisionTrace,
  suppressedFields?: string[]
): Promise<IntakeResult> {
  // Find applicable discounts using discount engine
  let opportunities: IntakeResult['opportunities'] = []
  if (
    routeDecision?.primaryCarrier &&
    extractionResult.profile.state &&
    extractionResult.profile.productType
  ) {
    const carrier = getCarrierByName(routeDecision.primaryCarrier)
    if (carrier) {
      // Convert UserProfile to PolicySummary for discount engine
      // Filter out null values to match PolicySummary schema (which uses optional, not nullish)
      const profile = extractionResult.profile
      const policySummary: PolicySummary = {
        carrier: routeDecision.primaryCarrier,
        ...(profile.name && { name: profile.name }),
        ...(profile.email && { email: profile.email }),
        ...(profile.phone && { phone: profile.phone }),
        ...(profile.zip && { zip: profile.zip }),
        ...(profile.state && { state: profile.state }),
        ...(profile.address && { address: profile.address }),
        ...(profile.productType && { productType: profile.productType }),
        ...(profile.age !== null && profile.age !== undefined && { age: profile.age }),
        ...(profile.householdSize !== null &&
          profile.householdSize !== undefined && { householdSize: profile.householdSize }),
        ...(profile.ownsHome !== null &&
          profile.ownsHome !== undefined && { ownsHome: profile.ownsHome }),
        ...(profile.vehicles !== null &&
          profile.vehicles !== undefined && { vehicles: profile.vehicles }),
        ...(profile.drivers !== null &&
          profile.drivers !== undefined && { drivers: profile.drivers }),
        ...(profile.cleanRecord3Yr !== null &&
          profile.cleanRecord3Yr !== undefined && { cleanRecord3Yr: profile.cleanRecord3Yr }),
        ...(profile.cleanRecord5Yr !== null &&
          profile.cleanRecord5Yr !== undefined && { cleanRecord5Yr: profile.cleanRecord5Yr }),
        ...(profile.existingPolicies && { existingPolicies: profile.existingPolicies }),
      }

      opportunities = findApplicableDiscounts(carrier, policySummary, extractionResult.profile)
    }
  }

  // Build IntakeResult response
  const intakeResult: IntakeResult = {
    profile: extractionResult.profile, // DEPRECATED: Use extraction.known + extraction.inferred (kept for backward compatibility)
    extraction: {
      // NEW (Epic 4): Extraction details with known/inferred separation
      method: extractionResult.extractionMethod,
      known: extractionResult.known,
      inferred: extractionResult.inferred,
      suppressedFields: suppressedFields || [],
      inferenceReasons: extractionResult.inferenceReasons,
      confidence: extractionResult.confidence,
    },
    missingFields: missingFieldsForResponse,
    extractionMethod: extractionResult.extractionMethod, // DEPRECATED: Use extraction.method (kept for backward compatibility)
    confidence: extractionResult.confidence, // DEPRECATED: Use extraction.confidence (kept for backward compatibility)
    route: routeDecision, // Routing decision from routing engine
    opportunities, // Discount opportunities from discount engine
    prefill: prefillPacket, // Prefill packet for broker handoff
    pitch, // Pitch (may be replaced by compliance filter replacement message)
    complianceValidated: complianceResult.passed,
    disclaimers: complianceResult.disclaimers,
    trace,
  }

  // Log result builder output for debugging
  await logDebug('Result builder: IntakeResult built', {
    type: 'result_builder_complete',
    hasRoute: !!intakeResult.route,
    routePrimaryCarrier: intakeResult.route?.primaryCarrier,
    routeEligibleCarriers: intakeResult.route?.eligibleCarriers,
    routeEligibleCarriersCount: intakeResult.route?.eligibleCarriers?.length || 0,
    hasPrefill: !!intakeResult.prefill,
    prefillRoutingPrimaryCarrier: intakeResult.prefill?.routing?.primaryCarrier,
    prefillRoutingEligibleCarriers: intakeResult.prefill?.routing?.eligibleCarriers,
    prefillRoutingEligibleCarriersCount:
      intakeResult.prefill?.routing?.eligibleCarriers?.length || 0,
  })

  return intakeResult
}

/**
 * Generate prefill packet and missing fields
 */
export async function generatePrefillData(
  profile: UserProfile,
  routeDecision: RouteDecision | undefined,
  complianceDisclaimers: string[]
): Promise<{
  prefillPacket: PrefillPacket | undefined
  missingFields: MissingField[]
}> {
  if (!routeDecision) {
    // If no route decision, still calculate missing fields without carrier-specific requirements
    const missingFields = getMissingFields(
      profile,
      profile.productType ?? undefined,
      profile.state ?? undefined
    )
    return {
      prefillPacket: undefined,
      missingFields,
    }
  }

  try {
    // Get missing fields with carrier/state-specific requirements
    const missingFields = getMissingFields(
      profile,
      profile.productType ?? undefined,
      profile.state ?? undefined,
      routeDecision.primaryCarrier
    )
    const prefillPacket = await generatePrefillPacket(
      profile,
      routeDecision,
      missingFields,
      complianceDisclaimers
    )

    return {
      prefillPacket,
      missingFields,
    }
  } catch (error) {
    // Handle prefill generation errors gracefully: if generation fails, return undefined and log error
    // Error will be logged by caller
    const missingFields = getMissingFields(
      profile,
      profile.productType ?? undefined,
      profile.state ?? undefined,
      routeDecision.primaryCarrier
    )
    return {
      prefillPacket: undefined,
      missingFields,
    }
  }
}
