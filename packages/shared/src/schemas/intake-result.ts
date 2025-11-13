import { z } from 'zod'
import { type DecisionTrace, decisionTraceSchema } from './decision-trace'
import { type MissingField, missingFieldSchema } from './missing-field'
import { prefillPacketSchema } from './prefill-packet'
import {
  type Citation,
  type RouteDecision,
  citationSchema,
  routeDecisionSchema,
} from './route-decision'
import { type UserProfile, userProfileSchema } from './user-profile'

/**
 * Intake Result Schema
 *
 * Complete output from conversational intake flow, ready for broker to finalize quote.
 *
 * @see docs/architecture/4-data-models.md#45-intakeresult
 */

// Re-export routing schemas for backward compatibility
export { type Citation, type RouteDecision, citationSchema, routeDecisionSchema }

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
