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

import type {
  Carrier,
  Citation,
  ProductEligibility,
  RouteDecision,
  UserProfile,
} from '@repo/shared'
import { MISSING_FIELD_PENALTY } from '@repo/shared'
import { getFieldValue } from '../utils/field-helpers'
import { getAllCarriers as defaultGetAllCarriers } from './knowledge-pack-loader'
import { defaultEvaluatorFactory } from './routing/eligibility/evaluator-factory'

/**
 * Eligibility evaluation result
 */
interface EligibilityResult {
  eligible: boolean
  missingFields: string[]
  explanation: string
}

/**
 * Carrier match with score and eligibility
 */
interface CarrierMatch {
  carrier: Carrier
  eligible: boolean
  matchScore: number
  missingFields: string[]
  explanation: string
}

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
 * Evaluate eligibility for a carrier based on product-specific rules
 *
 * Uses strategy pattern with evaluator factory to allow extensible eligibility checks.
 * New eligibility rules can be added by registering new evaluators without modifying this function.
 *
 * @param carrier - Carrier to evaluate
 * @param profile - User profile with eligibility fields
 * @param evaluatorFactory - Optional evaluator factory (defaults to defaultEvaluatorFactory)
 * @returns EligibilityResult with eligible flag, missing fields, and explanation
 */
function evaluateEligibility(
  carrier: Carrier,
  profile: UserProfile,
  evaluatorFactory = defaultEvaluatorFactory
): EligibilityResult {
  if (!profile.productType) {
    return {
      eligible: false,
      missingFields: ['productType'],
      explanation: 'Product type is required for eligibility evaluation',
    }
  }
  const productType = profile.productType
  const eligibility = carrier.eligibility[productType]

  // If no eligibility rules defined for this product, carrier is eligible
  if (!eligibility) {
    return {
      eligible: true,
      missingFields: [],
      explanation: 'No eligibility restrictions defined',
    }
  }

  const allMissingFields: string[] = []
  const allReasons: string[] = []

  // Run all registered evaluators
  const evaluators = evaluatorFactory.getAllEvaluators()
  for (const evaluator of evaluators) {
    const result = evaluator.evaluate(eligibility, profile, productType)
    allMissingFields.push(...result.missingFields)
    allReasons.push(...result.reasons)
  }

  // Check state-specific eligibility rules if present
  if (eligibility.stateSpecific && profile.state) {
    const stateRules = eligibility.stateSpecific[profile.state]
    if (stateRules && typeof stateRules === 'object') {
      // State-specific rules could have additional requirements
      // For now, we'll just note that state-specific rules exist
      // Future: implement state-specific rule evaluation
    }
  }

  // Carrier is eligible if no reasons to exclude
  const eligible = allReasons.length === 0

  // Deduplicate missing fields
  const uniqueMissingFields = Array.from(new Set(allMissingFields))

  return {
    eligible,
    missingFields: uniqueMissingFields,
    explanation: allReasons.length > 0 ? allReasons.join('; ') : 'Eligible',
  }
}

/**
 * Calculate match score for a carrier
 *
 * @param carrier - Carrier to score
 * @param eligibilityResult - Eligibility evaluation result
 * @param profile - User profile
 * @returns Match score (0-1, higher is better)
 */
function calculateMatchScore(
  carrier: Carrier,
  eligibilityResult: EligibilityResult,
  profile: UserProfile
): number {
  // Base score: 1.0 if eligible, 0.0 if not
  if (!eligibilityResult.eligible) {
    return 0.0
  }

  let score = 1.0

  // Deduct points for missing optional fields (lower data completeness)
  const missingFieldPenalty = eligibilityResult.missingFields.length * MISSING_FIELD_PENALTY
  score -= missingFieldPenalty

  // Bonus points for carriers with compensation data (broker preference)
  if (carrier.compensation) {
    score += 0.05
  }

  // Ensure score stays in valid range
  return Math.max(0.0, Math.min(1.0, score))
}

/**
 * Rank carriers by match score (descending)
 *
 * @param matches - Carrier matches to rank
 * @returns Sorted array of carrier matches (highest score first)
 */
function rankCarriers(matches: CarrierMatch[]): CarrierMatch[] {
  return [...matches].sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Calculate overall confidence score
 *
 * @param rankedCarriers - Carriers ranked by match score
 * @param profile - User profile
 * @returns Confidence score (0-1)
 */
function calculateConfidence(rankedCarriers: CarrierMatch[], profile: UserProfile): number {
  if (rankedCarriers.length === 0) {
    return 0.0
  }

  // Calculate data completeness score
  const requiredFields = ['state', 'productType']
  const optionalFields = ['age', 'vehicles']
  const providedFields =
    requiredFields.length +
    optionalFields.filter((field) => profile[field as keyof UserProfile] !== undefined).length
  const totalFields = requiredFields.length + optionalFields.length
  const completenessScore = providedFields / totalFields

  // Average of top 3 carriers' match scores, weighted by data completeness
  const top3Scores = rankedCarriers.slice(0, 3).map((m) => m.matchScore)
  const avgMatchScore = top3Scores.reduce((sum, score) => sum + score, 0) / top3Scores.length

  // Weighted combination: 70% match score, 30% data completeness
  return avgMatchScore * 0.7 + completenessScore * 0.3
}

/**
 * Generate human-readable rationale for routing decision
 *
 * @param rankedCarriers - Carriers ranked by match score
 * @param profile - User profile
 * @param allMatches - All carrier matches (including ineligible)
 * @param selectedPrimary - The actual selected primary carrier (after tiebreaker logic)
 * @returns Rationale string
 */
function generateRationale(
  rankedCarriers: CarrierMatch[],
  profile: UserProfile,
  allMatches: CarrierMatch[],
  selectedPrimary: CarrierMatch
): string {
  if (rankedCarriers.length === 0) {
    return 'No eligible carriers found'
  }

  const primary = selectedPrimary
  if (!primary) {
    return 'No eligible carriers found'
  }
  const parts: string[] = []

  // Explain primary carrier selection
  parts.push(
    `Selected ${primary.carrier.name} as primary carrier (match score: ${primary.matchScore.toFixed(2)})`
  )

  // List alternatives if any (exclude the selected primary carrier)
  const alternativeCarriers = rankedCarriers.filter((m) => m.carrier.name !== primary.carrier.name)
  if (alternativeCarriers.length > 0) {
    const alternatives = alternativeCarriers
      .map((m) => `${m.carrier.name} (${m.matchScore.toFixed(2)})`)
      .join(', ')
    parts.push(`Alternatives: ${alternatives}`)
  }

  // Note missing data affecting confidence
  const allMissingFields = new Set<string>()
  for (const m of rankedCarriers) {
    for (const field of m.missingFields) {
      allMissingFields.add(field)
    }
  }

  if (allMissingFields.size > 0) {
    const missingList = Array.from(allMissingFields).join(', ')
    parts.push(`Note: Missing fields (${missingList}) may affect accuracy`)
  }

  return parts.join('. ')
}

/**
 * Extract citations from eligible carriers
 *
 * @param rankedCarriers - Carriers ranked by match score
 * @returns Array of citation objects
 */
function extractCitations(rankedCarriers: CarrierMatch[]): Citation[] {
  return rankedCarriers.map((match) => {
    const carrier = match.carrier
    const sourceFile =
      carrier._sources[0]?.pageFile ||
      `knowledge_pack/carriers/${carrier.name.toLowerCase().replace(/\s+/g, '-')}.json`

    return {
      id: carrier._id,
      type: 'carrier',
      carrier: carrier._id,
      file: sourceFile,
    }
  })
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
