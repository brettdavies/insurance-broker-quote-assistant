import { z } from 'zod'

/**
 * Policy Summary Schema
 *
 * Represents extracted policy data from PDF/document upload or manual entry.
 * Includes confidence scores for each field to indicate extraction quality.
 *
 * @see docs/stories/2.1.policy-upload-pdf-parsing.md#task-4
 */

/**
 * Coverage Limits Schema
 * Represents coverage limits for different coverage types
 */
export const coverageLimitsSchema = z.object({
  liability: z.number().positive().optional(),
  propertyDamage: z.number().positive().optional(),
  comprehensive: z.number().positive().optional(),
  collision: z.number().positive().optional(),
  uninsuredMotorist: z.number().positive().optional(),
  personalInjuryProtection: z.number().positive().optional(),
  dwelling: z.number().positive().optional(),
  personalProperty: z.number().positive().optional(),
  lossOfUse: z.number().positive().optional(),
  medicalPayments: z.number().positive().optional(),
})

export type CoverageLimits = z.infer<typeof coverageLimitsSchema>

/**
 * Deductibles Schema
 * Represents deductible amounts for different coverage types
 */
export const deductiblesSchema = z.object({
  auto: z.number().nonnegative().optional(),
  home: z.number().nonnegative().optional(),
  comprehensive: z.number().nonnegative().optional(),
  collision: z.number().nonnegative().optional(),
})

export type Deductibles = z.infer<typeof deductiblesSchema>

/**
 * Premiums Schema
 * Represents premium amounts (annual, monthly, etc.)
 */
export const premiumsSchema = z.object({
  annual: z.number().positive().optional(),
  monthly: z.number().positive().optional(),
  semiAnnual: z.number().positive().optional(),
})

export type Premiums = z.infer<typeof premiumsSchema>

/**
 * Effective Dates Schema
 * Represents policy effective and expiration dates
 */
export const effectiveDatesSchema = z.object({
  effectiveDate: z.string().optional(), // ISO date string or formatted date
  expirationDate: z.string().optional(), // ISO date string or formatted date
})

export type EffectiveDates = z.infer<typeof effectiveDatesSchema>

/**
 * Confidence Scores Schema
 * Represents confidence scores (0-1) for each extracted field
 */
export const confidenceScoresSchema = z.object({
  carrier: z.number().min(0).max(1).optional(),
  state: z.number().min(0).max(1).optional(),
  productType: z.number().min(0).max(1).optional(),
  coverageLimits: z.number().min(0).max(1).optional(),
  deductibles: z.number().min(0).max(1).optional(),
  premiums: z.number().min(0).max(1).optional(),
  effectiveDates: z.number().min(0).max(1).optional(),
})

export type ConfidenceScores = z.infer<typeof confidenceScoresSchema>

/**
 * Policy Summary Schema
 * Main schema for extracted policy data
 */
export const policySummarySchema = z.object({
  carrier: z.string().optional(),
  state: z.string().optional(),
  productType: z.enum(['auto', 'home', 'renters', 'umbrella']).optional(),
  coverageLimits: coverageLimitsSchema.optional(),
  deductibles: deductiblesSchema.optional(),
  premiums: premiumsSchema.optional(),
  effectiveDates: effectiveDatesSchema.optional(),
  confidence: confidenceScoresSchema.optional(),
})

export type PolicySummary = z.infer<typeof policySummarySchema>
