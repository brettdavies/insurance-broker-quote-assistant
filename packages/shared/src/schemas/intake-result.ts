import { z } from 'zod'
import { userProfileSchema, type UserProfile } from './user-profile'
import { decisionTraceSchema, type DecisionTrace } from './decision-trace'

/**
 * Intake Result Schema
 *
 * Complete output from conversational intake flow, ready for broker to finalize quote.
 *
 * @see docs/architecture/4-data-models.md#45-intakeresult
 */

/**
 * Route Decision Stub
 * Will be fully defined in future story (routing engine)
 */
export const routeDecisionStubSchema = z.object({
  primaryCarrier: z.string().optional(),
  eligibleCarriers: z.array(z.string()).optional(),
  matchScore: z.number().optional(),
})

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
  route: routeDecisionStubSchema.optional(), // Stub for routing engine
  opportunities: z.array(opportunityStubSchema).optional(), // Stub for discount engine
  prefill: prefillPacketStubSchema.optional(), // Stub for prefill packet
  pitch: z.string().optional(), // Agent-ready savings pitch (empty string for MVP)
  complianceValidated: z.boolean().default(true), // Compliance filter result
  trace: decisionTraceSchema.optional(), // Decision trace for audit logging
})

export type IntakeResult = z.infer<typeof intakeResultSchema>

