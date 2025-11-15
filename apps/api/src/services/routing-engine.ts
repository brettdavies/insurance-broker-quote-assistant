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

import type { RouteDecision, UserProfile } from '@repo/shared'
import { getFieldValue } from '../utils/field-helpers'
import { getAllCarriers as defaultGetAllCarriers } from './knowledge-pack-loader'
import { extractCitations } from './routing/citation-extractor'
import { calculateConfidence } from './routing/confidence-calculator'
import { evaluateEligibility, type EligibilityResult } from './routing/eligibility-evaluator'
import { calculateMatchScore } from './routing/match-scorer'
import { rankCarriers, type CarrierMatch } from './routing/carrier-ranker'
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
  // Handle edge cases: missing state or productType
  if (!profile.state || !profile.productType) {
    return createNoEligibleCarriersDecision(
      !profile.state ? 'State is required for routing' : 'Product type is required for routing'
    )
  }

  // Get all carriers from knowledge pack
  const allCarriers = getAllCarriersFn()

  // Filter carriers by state and product availability
  const stateProductFiltered = allCarriers.filter((carrier) => {
    const operatesIn = getFieldValue(carrier.operatesIn, [])
    const products = getFieldValue(carrier.products, [])

    return (
      profile.state &&
      profile.productType &&
      operatesIn.includes(profile.state) &&
      products.includes(profile.productType)
    )
  })

  // If no carriers match state/product, return early
  if (stateProductFiltered.length === 0) {
    return createNoEligibleCarriersDecision(
      `No carriers available for ${profile.productType} insurance in ${profile.state}`
    )
  }

  // Evaluate eligibility for each carrier
  const carrierMatches: CarrierMatch[] = stateProductFiltered.map((carrier) => {
    const eligibilityResult = evaluateEligibility(carrier, profile)
    const matchScore = calculateMatchScore(carrier, eligibilityResult, profile)

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

  // If no carriers pass eligibility, return explanation
  if (eligibleMatches.length === 0) {
    const reasons = carrierMatches.map((m) => `${m.carrier.name}: ${m.explanation}`).join('; ')
    return createNoEligibleCarriersDecision(`No carriers meet eligibility requirements: ${reasons}`)
  }

  // Rank carriers by match score
  const rankedCarriers = rankCarriers(eligibleMatches)

  // Select primary carrier (highest score)
  if (rankedCarriers.length === 0) {
    return createNoEligibleCarriersDecision('No eligible carriers found after ranking')
  }
  const topCarrier = rankedCarriers[0]
  if (!topCarrier) {
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
  const confidence = calculateConfidence(rankedCarriers, profile)

  // Generate rationale
  const rationale = generateRationale(rankedCarriers, profile, carrierMatches, primaryCarrier)

  // Extract citations for eligible carriers
  const citations = extractCitations(rankedCarriers)

  return {
    primaryCarrier: primaryCarrier.carrier.name,
    tiedCarriers,
    eligibleCarriers: rankedCarriers.map((m) => m.carrier.name),
    matchScores: Object.fromEntries(rankedCarriers.map((m) => [m.carrier.name, m.matchScore])),
    confidence,
    rationale,
    citations,
  }
}


/**
 * Create RouteDecision for no eligible carriers scenario
 *
 * @param explanation - Explanation of why no carriers are eligible
 * @returns RouteDecision with empty eligibleCarriers and confidence 0.0
 */
function createNoEligibleCarriersDecision(explanation: string): RouteDecision {
  return {
    primaryCarrier: '',
    eligibleCarriers: [],
    confidence: 0.0,
    rationale: explanation,
    citations: [],
  }
}
