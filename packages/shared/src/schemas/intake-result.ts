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
 * Intake Request Schema
 *
 * Input to conversational intake flow.
 * Includes message text, known fields from pills, and suppressed fields list.
 */
export const intakeRequestSchema = z.object({
  message: z.string(),
  pills: userProfileSchema.partial().optional(),
  suppressedFields: z.array(z.string()).optional(),
})

export type IntakeRequest = z.infer<typeof intakeRequestSchema>

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
 * Extraction Result Schema
 * Contains extraction details with known/inferred field separation (Epic 4)
 */
export const extractionResultSchema = z.object({
  method: z.enum(['key-value', 'llm']), // Extraction method used
  known: userProfileSchema.partial().optional(), // Known fields (high confidence or broker-set)
  inferred: userProfileSchema.partial().optional(), // Inferred fields (medium/low confidence)
  suppressedFields: z.array(z.string()).optional(), // Fields broker dismissed
  inferenceReasons: z.record(z.string()).optional(), // Reasoning for each inferred field
  confidence: z.record(z.number().min(0).max(1)).optional(), // Field-level confidence scores
})

export type ExtractionResult = z.infer<typeof extractionResultSchema>

/**
 * Intake Result Schema
 * MVP version with stubs for future components
 */
export const intakeResultSchema = z.object({
  profile: userProfileSchema, // DEPRECATED: Use extraction.known + extraction.inferred (kept for backward compatibility)
  extraction: extractionResultSchema.optional(), // NEW (Epic 4): Extraction details with known/inferred separation
  missingFields: z.array(missingFieldSchema), // Array of missing fields with priority indicators
  extractionMethod: z.enum(['key-value', 'llm']).optional(), // DEPRECATED: Use extraction.method (kept for backward compatibility)
  confidence: z.record(z.number().min(0).max(1)).optional(), // DEPRECATED: Use extraction.confidence (kept for backward compatibility)
  route: routeDecisionSchema.optional(), // Routing decision from routing engine
  opportunities: z.array(discountOpportunitySchema).optional(), // Discount opportunities from discount engine
  prefill: prefillPacketSchema.optional(), // Prefill packet for broker handoff
  pitch: z.string().optional(), // Agent-ready savings pitch (empty string for MVP)
  complianceValidated: z.boolean().default(true), // Compliance filter result
  disclaimers: z.array(z.string()).optional(), // Compliance disclaimers selected based on state/product
  trace: decisionTraceSchema.optional(), // Decision trace for audit logging
})

export type IntakeResult = z.infer<typeof intakeResultSchema>
