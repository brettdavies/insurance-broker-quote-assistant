/**
 * Routing Engine Service
 *
 * Deterministic rules engine that routes shoppers to eligible carriers
 * based on state, product, and user profile using knowledge pack rules.
 *
 * 100% deterministic - no LLM calls, pure functions only.
 *
 * @see docs/stories/1.6.routing-rules-engine.md
 */

import type { Carrier, RouteDecision, UserProfile } from '@repo/shared'
import { getFieldValue } from '../utils/field-helpers'
import { logDebug, logInfo, logWarn } from '../utils/logger'
import { getAllCarriers as defaultGetAllCarriers } from './knowledge-pack-loader'
import { type CarrierMatch, rankCarriers } from './routing/carrier-ranker'
import { extractCitations } from './routing/citation-extractor'
import { calculateConfidence } from './routing/confidence-calculator'
import { type EligibilityResult, evaluateEligibility } from './routing/eligibility-evaluator'
import { calculateMatchScore } from './routing/match-scorer'
import { generateRationale } from './routing/rationale-generator'

/**
 * Route to eligible carriers based on user profile
 *
 * @param profile - User profile with state, productType, and optional eligibility fields
 * @param getAllCarriersFn - Optional function to get all carriers (for testing)
 * @returns RouteDecision with primary carrier, eligible carriers, scores, and rationale
 */
export function routeToCarrier(
  profile: UserProfile,
  getAllCarriersFn: () => Carrier[] = defaultGetAllCarriers
): RouteDecision {
  // Normalize state to uppercase for consistent comparison
  const normalizedState = profile.state?.trim().toUpperCase() || ''
  const normalizedProfile = {
    ...profile,
    state: normalizedState,
  }

  // Log routing start
  logInfo('Routing engine: Starting carrier routing', {
    type: 'routing_start',
    state: normalizedState,
    productType: profile.productType,
    age: profile.age,
    hasAge: profile.age !== undefined,
  })

  // Handle edge cases: missing state or productType
  // Check for both undefined/null and empty string
  const hasState = normalizedState.length > 0
  const hasProductType = profile.productType && profile.productType.trim().length > 0

  if (!hasState || !hasProductType) {
    const reason = !hasState
      ? 'State is required for routing'
      : 'Product type is required for routing'
    logWarn('Routing engine: Missing required fields', {
      type: 'routing_validation_failed',
      hasState,
      hasProductType,
      reason,
    })
    return createNoEligibleCarriersDecision(reason)
  }

  // Get all carriers from knowledge pack
  const allCarriers = getAllCarriersFn()
  logDebug('Routing engine: Loaded carriers', {
    type: 'routing_carriers_loaded',
    carrierCount: allCarriers.length,
    carrierNames: allCarriers.map((c) => c.name),
  })

  // Filter carriers by state and product availability
  const stateProductFiltered = allCarriers.filter((carrier) => {
    const operatesIn = getFieldValue(carrier.operatesIn, [] as string[])
    const products = getFieldValue(carrier.products, [] as string[])

    const stateMatch = operatesIn.includes(normalizedState)
    const productMatch = products.includes(profile.productType || '')

    logDebug('Routing engine: Checking carrier state/product match', {
      type: 'routing_carrier_filter',
      carrierName: carrier.name,
      normalizedState,
      operatesIn,
      stateMatch,
      productType: profile.productType,
      products,
      productMatch,
    })

    return stateMatch && productMatch
  })

  logInfo('Routing engine: State/product filtering complete', {
    type: 'routing_state_product_filter',
    totalCarriers: allCarriers.length,
    filteredCarriers: stateProductFiltered.length,
    matchedCarrierNames: stateProductFiltered.map((c) => c.name),
  })

  // If no carriers match state/product, return early
  if (stateProductFiltered.length === 0) {
    const reason = `No carriers available for ${profile.productType} insurance in ${normalizedState}`
    logWarn('Routing engine: No carriers match state/product', {
      type: 'routing_no_state_product_match',
      normalizedState,
      productType: profile.productType,
      allCarrierStates: allCarriers.map((c) => ({
        name: c.name,
        operatesIn: getFieldValue(c.operatesIn, []),
        products: getFieldValue(c.products, []),
      })),
    })
    return createNoEligibleCarriersDecision(reason)
  }

  // Evaluate eligibility for each carrier
  const carrierMatches: CarrierMatch[] = stateProductFiltered.map((carrier) => {
    const eligibilityResult = evaluateEligibility(carrier, normalizedProfile)
    const matchScore = calculateMatchScore(carrier, eligibilityResult, normalizedProfile)

    logDebug('Routing engine: Carrier eligibility evaluation', {
      type: 'routing_eligibility_evaluation',
      carrierName: carrier.name,
      eligible: eligibilityResult.eligible,
      matchScore,
      explanation: eligibilityResult.explanation,
      missingFields: eligibilityResult.missingFields,
    })

    return {
      carrier,
      eligible: eligibilityResult.eligible,
      matchScore,
      missingFields: eligibilityResult.missingFields,
      explanation: eligibilityResult.explanation,
    }
  })

  // Filter to only eligible carriers
  const eligibleMatches = carrierMatches.filter((match) => match.eligible)

  logInfo('Routing engine: Eligibility evaluation complete', {
    type: 'routing_eligibility_complete',
    totalEvaluated: carrierMatches.length,
    eligibleCount: eligibleMatches.length,
    ineligibleCarriers: carrierMatches
      .filter((m) => !m.eligible)
      .map((m) => ({
        name: m.carrier.name,
        explanation: m.explanation,
        missingFields: m.missingFields,
      })),
    eligibleCarriers: eligibleMatches.map((m) => ({
      name: m.carrier.name,
      matchScore: m.matchScore,
    })),
  })

  // If no carriers pass eligibility, return explanation
  if (eligibleMatches.length === 0) {
    const reasons = carrierMatches.map((m) => `${m.carrier.name}: ${m.explanation}`).join('; ')
    logWarn('Routing engine: No carriers pass eligibility', {
      type: 'routing_no_eligible_carriers',
      reasons: carrierMatches.map((m) => ({
        carrier: m.carrier.name,
        explanation: m.explanation,
        missingFields: m.missingFields,
      })),
    })
    return createNoEligibleCarriersDecision(`No carriers meet eligibility requirements: ${reasons}`)
  }

  // Rank carriers by match score
  const rankedCarriers = rankCarriers(eligibleMatches)

  logInfo('Routing engine: Carrier ranking complete', {
    type: 'routing_ranking_complete',
    rankedCarriers: rankedCarriers.map((m) => ({
      name: m.carrier.name,
      matchScore: m.matchScore,
    })),
  })

  // Select primary carrier (highest score)
  if (rankedCarriers.length === 0) {
    logWarn('Routing engine: No carriers after ranking', {
      type: 'routing_no_carriers_after_ranking',
    })
    return createNoEligibleCarriersDecision('No eligible carriers found after ranking')
  }
  const topCarrier = rankedCarriers[0]
  if (!topCarrier) {
    logWarn('Routing engine: Top carrier is undefined', {
      type: 'routing_top_carrier_undefined',
      rankedCarriersCount: rankedCarriers.length,
    })
    return createNoEligibleCarriersDecision('No eligible carriers found after ranking')
  }

  // Handle ties: collect all carriers with the top match score
  const topScore = topCarrier.matchScore
  const tiedMatches = rankedCarriers.filter((m) => m.matchScore === topScore)

  let primaryCarrier: CarrierMatch
  let tiedCarriers: string[] | undefined

  if (tiedMatches.length > 1) {
    // Multiple carriers tied for top score - apply tiebreaker
    const currentCarrier = profile.currentCarrier
    const currentCarrierMatch = tiedMatches.find(
      (m) => m.carrier.name.toLowerCase() === currentCarrier?.toLowerCase()
    )

    if (currentCarrierMatch) {
      // Prefer current carrier if it's in the tied set
      primaryCarrier = currentCarrierMatch
      tiedCarriers = tiedMatches
        .filter((m) => m.carrier.name !== currentCarrierMatch.carrier.name)
        .map((m) => m.carrier.name)
    } else {
      // Deterministic selection: alphabetical order for reproducible results
      const sortedByName = [...tiedMatches].sort((a, b) =>
        a.carrier.name.localeCompare(b.carrier.name)
      )
      const firstMatch = sortedByName[0]
      if (!firstMatch) {
        throw new Error('Unexpected: No carrier found in tied matches')
      }
      primaryCarrier = firstMatch
      tiedCarriers = sortedByName.slice(1).map((m) => m.carrier.name)
    }
  } else {
    // No tie - use top carrier
    primaryCarrier = topCarrier
    tiedCarriers = undefined
  }

  // Calculate overall confidence
  const confidence = calculateConfidence(rankedCarriers, normalizedProfile)

  // Generate rationale
  const rationale = generateRationale(
    rankedCarriers,
    normalizedProfile,
    carrierMatches,
    primaryCarrier
  )

  // Extract citations for eligible carriers
  const citations = extractCitations(rankedCarriers)

  const result: RouteDecision = {
    primaryCarrier: primaryCarrier.carrier.name,
    tiedCarriers,
    eligibleCarriers: rankedCarriers.map((m) => m.carrier.name),
    matchScores: Object.fromEntries(rankedCarriers.map((m) => [m.carrier.name, m.matchScore])),
    confidence,
    rationale,
    citations,
  }

  logInfo('Routing engine: Routing complete', {
    type: 'routing_complete',
    primaryCarrier: result.primaryCarrier,
    eligibleCarriers: result.eligibleCarriers,
    eligibleCarriersCount: result.eligibleCarriers.length,
    confidence: result.confidence,
    tiedCarriers: result.tiedCarriers,
    matchScores: result.matchScores,
  })

  return result
}

/**
 * Create RouteDecision for no eligible carriers scenario
 *
 * @param explanation - Explanation of why no carriers are eligible
 * @returns RouteDecision with empty eligibleCarriers and confidence 0
 */
function createNoEligibleCarriersDecision(explanation: string): RouteDecision {
  return {
    primaryCarrier: '',
    eligibleCarriers: [],
    confidence: 0,
    rationale: explanation,
    citations: [],
  }
}
