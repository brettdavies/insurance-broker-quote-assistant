import { z } from 'zod'
import { type DecisionTrace, decisionTraceSchema } from './decision-trace'
import { type MissingField, missingFieldSchema } from './missing-field'
import { prefillPacketSchema } from './prefill-packet'
import { type UserProfile, userProfileSchema } from './user-profile'

/**
 * Intake Result Schema
 *
 * Complete output from conversational intake flow, ready for broker to finalize quote.
 *
 * @see docs/architecture/4-data-models.md#45-intakeresult
 */

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

/**
 * Discount Opportunity Schema
 * Represents a discount with eligibility status and savings calculation
 */
export const discountOpportunitySchema = z.object({
  discountId: z.string(),
  discountName: z.string(),
  percentage: z.number(),
  annualSavings: z.number(),
  missingRequirements: z.array(z.string()),
  metRequirements: z.array(z.string()).optional(),
  citation: citationSchema,
  stackable: z.boolean(),
  requiresDocumentation: z.boolean().optional(),
})

export type DiscountOpportunity = z.infer<typeof discountOpportunitySchema>

/**
 * Intake Result Schema
 * MVP version with stubs for future components
 */
export const intakeResultSchema = z.object({
  profile: userProfileSchema,
  missingFields: z.array(missingFieldSchema), // Array of missing fields with priority indicators
  extractionMethod: z.enum(['key-value', 'llm']).optional(), // Extraction method used (AC5)
  confidence: z.record(z.number().min(0).max(1)).optional(), // Field-level confidence scores (AC5)
  route: routeDecisionSchema.optional(), // Routing decision from routing engine
  opportunities: z.array(discountOpportunitySchema).optional(), // Discount opportunities from discount engine
  prefill: prefillPacketSchema.optional(), // Prefill packet for broker handoff
  pitch: z.string().optional(), // Agent-ready savings pitch (empty string for MVP)
  complianceValidated: z.boolean().default(true), // Compliance filter result
  disclaimers: z.array(z.string()).optional(), // Compliance disclaimers selected based on state/product
  trace: decisionTraceSchema.optional(), // Decision trace for audit logging
})

export type IntakeResult = z.infer<typeof intakeResultSchema>
