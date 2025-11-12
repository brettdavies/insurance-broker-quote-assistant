import { z } from 'zod'
import { productTypeEnum } from './shared-enums'
import { userContactSchema } from './user-contact'

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
 * Includes confidence for user contact fields (name, email, phone, zip, state, address)
 */
export const confidenceScoresSchema = z.object({
  // User contact fields
  name: z.number().min(0).max(1).optional(),
  email: z.number().min(0).max(1).optional(),
  phone: z.number().min(0).max(1).optional(),
  zip: z.number().min(0).max(1).optional(),
  state: z.number().min(0).max(1).optional(),
  address: z.number().min(0).max(1).optional(),
  // Policy-specific fields
  carrier: z.number().min(0).max(1).optional(),
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
 * Extends userContactSchema to include name, email, phone, zip fields
 */
export const policySummarySchema = userContactSchema.extend({
  carrier: z.string().optional(),
  productType: productTypeEnum.optional(),
  coverageLimits: coverageLimitsSchema.optional(),
  deductibles: deductiblesSchema.optional(),
  premiums: premiumsSchema.optional(),
  effectiveDates: effectiveDatesSchema.optional(),
  confidence: confidenceScoresSchema.optional(),
})

export type PolicySummary = z.infer<typeof policySummarySchema>
