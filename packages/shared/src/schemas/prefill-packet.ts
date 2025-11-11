import { z } from 'zod'
import { type MissingField, missingFieldSchema } from './missing-field'

/**
 * Prefill Packet Schema
 *
 * IQuote Pro pre-fill packet stub for broker handoff to licensed agents.
 * Contains all captured shopper data, routing decision, missing fields checklist,
 * and compliance disclaimers.
 *
 * @see docs/stories/1.8.prefill-packet-generation.md
 * @see docs/architecture/4-data-models.md#47-prefillpacket
 */

export const prefillPacketSchema = z.object({
  // Contact Information
  fullName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),

  // Quote Essentials (required)
  state: z.string(), // US state code (required)
  productLine: z.enum(['auto', 'home', 'renters', 'umbrella']), // Product type (required)
  carrier: z.string().optional(), // Primary carrier from routing decision

  // Product-Specific Data - Auto
  vehicles: z.number().int().nonnegative().optional(),
  drivers: z.number().int().nonnegative().optional(),
  primaryUse: z.string().optional(), // Vehicle primary use (e.g., "commute", "pleasure")
  annualMileage: z.number().int().nonnegative().optional(),
  vins: z.string().optional(), // Vehicle Identification Numbers (can be multiple, space-separated)
  garage: z.string().optional(), // Garage type

  // Product-Specific Data - Home
  homeValue: z.number().int().positive().optional(),
  yearBuilt: z.number().int().positive().optional(), // Construction year
  constructionType: z.string().optional(),
  squareFeet: z.number().int().positive().optional(),
  roofType: z.string().optional(),
  propertyType: z
    .enum(['single-family', 'condo', 'townhouse', 'mobile-home', 'duplex', 'apartment'])
    .optional(),

  // Product-Specific Data - Renters
  personalProperty: z.number().int().positive().optional(), // Personal property value
  liability: z.number().int().positive().optional(), // Liability coverage amount

  // Routing & Agent Notes
  routingDecision: z.string(), // Explanation from RouteDecision.rationale (required)
  agentNotes: z.array(z.string()).optional(), // Talking points for licensed agent
  missingFields: z.array(missingFieldSchema), // Missing fields with priority indicators (required)
  eligibleCarriers: z.array(z.string()).optional(), // Alternative carriers from routing

  // Compliance
  disclaimers: z.array(z.string()), // Compliance disclaimers from compliance filter (required)
  reviewedByLicensedAgent: z.boolean().default(false), // Always false - requires broker review
  generatedAt: z.string(), // ISO 8601 timestamp (required)
})

export type PrefillPacket = z.infer<typeof prefillPacketSchema>
