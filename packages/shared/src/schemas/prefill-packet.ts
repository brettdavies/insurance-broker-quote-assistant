import { z } from 'zod'
import { type MissingField, missingFieldSchema } from './missing-field'
import { userProfileSchema } from './user-profile'

/**
 * Prefill Packet Schema
 *
 * IQuote Pro pre-fill packet for broker handoff to licensed agents.
 * Uses structured format with nested objects for type safety and easier import/export.
 *
 * Contains:
 * - Complete shopper profile (UserProfile) with all extracted fields
 * - Simplified routing decision (carrier and rationale only - no internal scores)
 * - Broker/agent contact information (required for compliance)
 * - Missing fields checklist with priority indicators
 * - Compliance disclaimers based on state/product
 *
 * Note: Full routing decision with match scores and all carriers is kept in IntakeResult
 * for internal compliance logs. The prefill packet only shows the recommended carrier.
 *
 * @see docs/stories/1.8.prefill-packet-generation.md
 * @see docs/architecture/4-data-models.md#47-prefillpacket
 */

/**
 * Simplified Routing Decision for Prefill Packet
 * Only includes information needed by the carrier, not internal scores or alternatives
 */
export const prefillRoutingSchema = z.object({
  primaryCarrier: z.string(), // Recommended carrier name
  confidence: z.number().min(0).max(1), // Confidence in recommendation (0-1)
  rationale: z.string(), // Brief explanation of why this carrier was selected
})

export type PrefillRouting = z.infer<typeof prefillRoutingSchema>

/**
 * Broker/Agent Information Schema
 * Required for compliance and commission tracking
 */
export const brokerInfoSchema = z.object({
  agentName: z.string(), // Licensed agent name
  agentLicenseNumber: z.string(), // State-issued license number
  licenseState: z.string(), // State where license is issued (e.g., "CA", "TX")
  licenseExpiration: z.string(), // License expiration date (YYYY-MM-DD)
  npn: z.string(), // National Producer Number (unique identifier across all states)
  brokerageName: z.string(), // Agency/brokerage name
  agentPhone: z.string(), // Agent contact phone
  agentEmail: z.string(), // Agent contact email
  agencyAddress: z.string().optional(), // Optional agency address
})

export type BrokerInfo = z.infer<typeof brokerInfoSchema>

export const prefillPacketSchema = z.object({
  // Core structured data
  profile: userProfileSchema, // Complete user profile with all extracted fields
  routing: prefillRoutingSchema, // Simplified routing (carrier and rationale only)

  // Broker/Agent information (required for compliance)
  broker: brokerInfoSchema, // Licensed agent information

  // Missing fields checklist
  missingFields: z.array(missingFieldSchema), // Fields needed for quote with priority indicators

  // Compliance
  disclaimers: z.array(z.string()), // Compliance disclaimers from compliance filter

  // Broker workflow fields
  agentNotes: z.array(z.string()).optional(), // Talking points for licensed agent
  reviewedByLicensedAgent: z.boolean().default(false), // Always false until broker reviews
  generatedAt: z.string(), // ISO 8601 timestamp of generation
})

export type PrefillPacket = z.infer<typeof prefillPacketSchema>
