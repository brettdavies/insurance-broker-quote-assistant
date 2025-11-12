import { z } from 'zod'
import { citationSchema } from './intake-result'

/**
 * Opportunity Schema
 *
 * Savings opportunity identified by Discount Engine or Policy Analysis Agent
 * with mandatory citation for regulatory compliance.
 *
 * @see docs/architecture/4-data-models.md#44-opportunity
 */

export const opportunitySchema = z.object({
  discount: z.string(), // Discount name
  percentage: z.number().min(0).max(100), // Savings percentage
  annualSavings: z.number().nonnegative(), // Dollar amount saved per year
  requires: z.array(z.string()), // Array of qualification requirements
  citation: citationSchema, // Citation with cuid2 ID, entity type, carrier ID, source file
})

export type Opportunity = z.infer<typeof opportunitySchema>
