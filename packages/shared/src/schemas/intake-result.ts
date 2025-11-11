import { z } from 'zod'
import { type DecisionTrace, decisionTraceSchema } from './decision-trace'
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
  eligibleCarriers: z.array(z.string()), // All eligible carriers ranked by match quality
  matchScores: z.record(z.string(), z.number()).optional(), // Match quality scores per carrier
  confidence: z.number().min(0).max(1), // Overall confidence in routing decision (0-1)
  rationale: z.string(), // Human-readable explanation of routing decision
  citations: z.array(citationSchema), // Knowledge pack citations for each eligible carrier
})

export type RouteDecision = z.infer<typeof routeDecisionSchema>

/**
 * Route Decision Stub (deprecated - use routeDecisionSchema)
 * @deprecated Use routeDecisionSchema instead
 */
export const routeDecisionStubSchema = routeDecisionSchema.partial()

export type RouteDecisionStub = z.infer<typeof routeDecisionStubSchema>

/**
 * Opportunity Stub
 * Will be fully defined in future story (discount engine)
 */
export const opportunityStubSchema = z.object({
  discount: z.string().optional(),
  percentage: z.number().optional(),
  annualSavings: z.number().optional(),
})

export type OpportunityStub = z.infer<typeof opportunityStubSchema>

/**
 * Prefill Packet Stub
 * Will be fully defined in future story
 */
export const prefillPacketStubSchema = z.object({
  state: z.string().optional(),
  productLine: z.string().optional(),
  carrier: z.string().optional(),
})

export type PrefillPacketStub = z.infer<typeof prefillPacketStubSchema>

/**
 * Intake Result Schema
 * MVP version with stubs for future components
 */
export const intakeResultSchema = z.object({
  profile: userProfileSchema,
  missingFields: z.array(z.string()), // Array of field names still needed
  extractionMethod: z.enum(['key-value', 'llm']).optional(), // Extraction method used (AC5)
  confidence: z.record(z.number().min(0).max(1)).optional(), // Field-level confidence scores (AC5)
  route: routeDecisionSchema.optional(), // Routing decision from routing engine
  opportunities: z.array(opportunityStubSchema).optional(), // Stub for discount engine
  prefill: prefillPacketStubSchema.optional(), // Stub for prefill packet
  pitch: z.string().optional(), // Agent-ready savings pitch (empty string for MVP)
  complianceValidated: z.boolean().default(true), // Compliance filter result
  trace: decisionTraceSchema.optional(), // Decision trace for audit logging
})

export type IntakeResult = z.infer<typeof intakeResultSchema>
