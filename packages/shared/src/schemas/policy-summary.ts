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
  liability: z.number().positive().nullish(),
  propertyDamage: z.number().positive().nullish(),
  comprehensive: z.number().positive().nullish(),
  collision: z.number().positive().nullish(),
  uninsuredMotorist: z.number().positive().nullish(),
  personalInjuryProtection: z.number().positive().nullish(),
  dwelling: z.number().positive().nullish(),
  personalProperty: z.number().positive().nullish(),
  lossOfUse: z.number().positive().nullish(),
  medicalPayments: z.number().positive().nullish(),
})

export type CoverageLimits = z.infer<typeof coverageLimitsSchema>

/**
 * Deductibles Schema
 * Represents deductible amounts for different coverage types
 */
export const deductiblesSchema = z.object({
  auto: z.number().nonnegative().nullish(),
  home: z.number().nonnegative().nullish(),
  comprehensive: z.number().nonnegative().nullish(),
  collision: z.number().nonnegative().nullish(),
})

export type Deductibles = z.infer<typeof deductiblesSchema>

/**
 * Premiums Schema
 * Represents premium amounts (annual, monthly, etc.)
 */
export const premiumsSchema = z.object({
  annual: z.number().positive().nullish(),
  monthly: z.number().positive().nullish(),
  semiAnnual: z.number().positive().nullish(),
})

export type Premiums = z.infer<typeof premiumsSchema>

/**
 * Effective Dates Schema
 * Represents policy effective and expiration dates
 */
export const effectiveDatesSchema = z.object({
  effectiveDate: z.string().nullish(), // ISO date string or formatted date
  expirationDate: z.string().nullish(), // ISO date string or formatted date
})

export type EffectiveDates = z.infer<typeof effectiveDatesSchema>

/**
 * Confidence Scores Schema
 * Represents confidence scores (0-1) for each extracted field
 * Includes confidence for user contact fields (name, email, phone, zip, state, address)
 */
export const confidenceScoresSchema = z.object({
  // User contact fields
  name: z.number().min(0).max(1).nullish(),
  email: z.number().min(0).max(1).nullish(),
  phone: z.number().min(0).max(1).nullish(),
  zip: z.number().min(0).max(1).nullish(),
  state: z.number().min(0).max(1).nullish(),
  address: z.number().min(0).max(1).nullish(),
  // Policy-specific fields
  carrier: z.number().min(0).max(1).nullish(),
  productType: z.number().min(0).max(1).nullish(),
  coverageLimits: z.number().min(0).max(1).nullish(),
  deductibles: z.number().min(0).max(1).nullish(),
  premiums: z.number().min(0).max(1).nullish(),
  effectiveDates: z.number().min(0).max(1).nullish(),
})

export type ConfidenceScores = z.infer<typeof confidenceScoresSchema>

/**
 * Policy Summary Schema
 * Main schema for extracted policy data
 * Extends userContactSchema to include name, email, phone, zip fields
 */
export const policySummarySchema = userContactSchema.extend({
  carrier: z.string().nullish(),
  productType: productTypeEnum.nullish(),
  coverageLimits: coverageLimitsSchema.nullish(),
  deductibles: deductiblesSchema.nullish(),
  premiums: premiumsSchema.nullish(),
  effectiveDates: effectiveDatesSchema.nullish(),
  confidence: confidenceScoresSchema.nullish(),
})

export type PolicySummary = z.infer<typeof policySummarySchema>
