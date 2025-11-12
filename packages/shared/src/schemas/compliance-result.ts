import { z } from 'zod'

/**
 * Compliance Result Schema
 *
 * Result of compliance filter validation check.
 *
 * @see docs/stories/1.7.adaptive-compliance-filter.md
 */

export const complianceResultSchema = z.object({
  passed: z.boolean(), // Whether compliance check passed
  violations: z.array(z.string()).optional(), // List of prohibited phrases detected
  replacementMessage: z.string().optional(), // Licensed-agent handoff message if violations detected
  disclaimers: z.array(z.string()).optional(), // Selected disclaimers if passed
  state: z.string().optional(), // State used for disclaimer selection
  productType: z.string().optional(), // Product used for disclaimer selection
})

export type ComplianceResult = z.infer<typeof complianceResultSchema>
