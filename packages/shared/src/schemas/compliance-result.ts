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
  violations: z.array(z.string()).nullish(), // List of prohibited phrases detected
  replacementMessage: z.string().nullish(), // Licensed-agent handoff message if violations detected
  disclaimers: z.array(z.string()).nullish(), // Selected disclaimers if passed
  state: z.string().nullish(), // State used for disclaimer selection
  productType: z.string().nullish(), // Product used for disclaimer selection
})

export type ComplianceResult = z.infer<typeof complianceResultSchema>
