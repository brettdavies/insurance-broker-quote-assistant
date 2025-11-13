import { z } from 'zod'

/**
 * Citation Schema
 * References knowledge pack source for audit trail
 */
export const citationSchema = z.object({
  id: z.string(), // cuid2 ID
  type: z.string(), // Entity type (e.g., "carrier")
  carrier: z.string(), // Carrier cuid2 ID
  file: z.string(), // Source file path
})

export type Citation = z.infer<typeof citationSchema>

/**
 * Route Decision Schema
 * Complete routing decision with eligible carriers, rankings, and citations
 */
export const routeDecisionSchema = z.object({
  primaryCarrier: z.string(), // Carrier name/ID of top recommendation
  tiedCarriers: z.array(z.string()).optional(), // Carriers with equal match scores (if tie exists)
  eligibleCarriers: z.array(z.string()), // All eligible carriers ranked by match quality
  matchScores: z.record(z.string(), z.number()).optional(), // Match quality scores per carrier
  confidence: z.number().min(0).max(1), // Overall confidence in routing decision (0-1)
  rationale: z.string(), // Human-readable explanation of routing decision
  citations: z.array(citationSchema), // Knowledge pack citations for each eligible carrier
})

export type RouteDecision = z.infer<typeof routeDecisionSchema>
