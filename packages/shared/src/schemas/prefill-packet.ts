import { z } from 'zod'
import { type MissingField, missingFieldSchema } from './missing-field'
import { routeDecisionSchema } from './route-decision'
import { userProfileSchema } from './user-profile'

/**
 * Prefill Packet Schema
 *
 * IQuote Pro pre-fill packet for broker handoff to licensed agents.
 * Uses structured format with nested objects for type safety and easier import/export.
 *
 * Contains:
 * - Complete shopper profile (UserProfile) with all extracted fields
 * - Routing decision (RouteDecision) with carrier recommendations and rationale
 * - Missing fields checklist with priority indicators
 * - Compliance disclaimers based on state/product
 *
 * @see docs/stories/1.8.prefill-packet-generation.md
 * @see docs/architecture/4-data-models.md#47-prefillpacket
 */

export const prefillPacketSchema = z.object({
  // Core structured data
  profile: userProfileSchema, // Complete user profile with all extracted fields
  routing: routeDecisionSchema, // Full routing decision with carriers, scores, and rationale

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
