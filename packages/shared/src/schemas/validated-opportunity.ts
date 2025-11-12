import { z } from 'zod'
import { opportunitySchema } from './opportunity'

/**
 * Validated Opportunity Schema
 *
 * Extends Opportunity with validation fields including confidence score,
 * validation details, documentation requirements, and stacking information.
 *
 * @see docs/stories/2.3.discount-rules-engine.md
 */

/**
 * Validation Details Schema
 * Contains information about rules evaluated, missing data, and eligibility checks
 */
export const validationDetailsSchema = z.object({
  rulesEvaluated: z.array(
    z.object({
      rule: z.string(), // Rule description
      citation: z.object({
        id: z.string(), // cuid2 ID
        type: z.string(), // Entity type (e.g., "discount")
        carrier: z.string(), // Carrier name
        file: z.string(), // Source file path
      }),
      result: z.enum(['pass', 'fail', 'partial']), // Evaluation result
    })
  ),
  missingData: z.array(z.string()), // Array of missing data fields
  eligibilityChecks: z.object({
    discountFound: z.boolean(), // Whether discount was found in knowledge pack
    eligibilityValidated: z.boolean(), // Whether eligibility was validated
    savingsCalculated: z.boolean(), // Whether savings were calculated
    stackingValidated: z.boolean(), // Whether stacking was validated
  }),
})

export type ValidationDetails = z.infer<typeof validationDetailsSchema>

/**
 * Validated Opportunity Schema
 * Extends Opportunity with validation metadata
 */
export const validatedOpportunitySchema = opportunitySchema.extend({
  confidenceScore: z.number().min(0).max(100), // Confidence score (0-100)
  validationDetails: validationDetailsSchema, // Validation details
  requiresDocumentation: z.boolean(), // Whether discount requires documentation
  documentationRequirements: z.array(z.string()).optional(), // Documentation requirements
  stackableWith: z.array(z.string()).optional(), // Array of opportunity IDs that can combine
  validatedAt: z.string(), // ISO timestamp of validation
})

export type ValidatedOpportunity = z.infer<typeof validatedOpportunitySchema>

