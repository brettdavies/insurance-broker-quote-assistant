import { z } from 'zod'
import { premiumsSchema } from './policy-summary'
import { productTypeEnum, propertyTypeEnum } from './shared-enums'
import { userContactSchema } from './user-contact'

/**
 * User Profile Schema
 *
 * Represents captured shopper information during intake conversation.
 * Most fields are optional to support progressive disclosure pattern.
 *
 * @see docs/architecture/4-data-models.md#42-userprofile
 */

/**
 * Existing Policy Schema
 * Represents a policy the user currently has for bundle discount analysis
 * All fields are optional to prevent forced population that causes hallucinations
 */
export const existingPolicySchema = z.object({
  product: productTypeEnum.nullish(),
  carrier: z.string().nullish(), // Carrier ID/name matching knowledge pack carrier names
  premium: z.number().positive().nullish(), // Annual premium
})

export type ExistingPolicy = z.infer<typeof existingPolicySchema>

/**
 * User Profile Schema
 * Progressive disclosure pattern: most fields optional
 */
export const userProfileSchema = userContactSchema.extend({
  // Product type
  productType: productTypeEnum.nullish(),

  // Optional demographic fields
  age: z.number().int().positive().nullish(),
  householdSize: z.number().int().positive().nullish(),
  dependents: z.number().int().nonnegative().nullish(),
  vehicles: z.number().int().nonnegative().nullish(), // Required for auto, but optional for progressive disclosure
  ownsHome: z.boolean().nullish(),

  // Vehicle details (for auto insurance)
  garage: z.string().nullish(), // Garage type
  vins: z.string().nullish(), // Vehicle Identification Numbers (can be multiple, space-separated)
  drivers: z.number().int().nonnegative().nullish(), // Number of drivers
  drivingRecords: z.string().nullish(), // Driving record details

  // Optional eligibility fields
  cleanRecord3Yr: z.boolean().nullish(), // Clean driving record (3 years)
  cleanRecord5Yr: z.boolean().nullish(), // Clean driving record (5 years)
  creditScore: z.number().int().min(300).max(850).nullish(), // Credit score (FICO range)
  propertyType: propertyTypeEnum.nullish(), // Property type for home/renters insurance

  // Property details (for home/renters insurance)
  yearBuilt: z.number().int().positive().nullish(), // Construction year
  roofType: z.string().nullish(),
  squareFeet: z.number().int().positive().nullish(),

  // Optional current policy fields (for policy analysis flow)
  currentCarrier: z.string().nullish(),
  premiums: premiumsSchema.nullish(), // Current premiums (annual, monthly, semiAnnual)
  deductibles: z.string().nullish(), // Current deductibles
  limits: z.string().nullish(), // Current coverage limits

  // Existing policies array for bundle discount analysis
  existingPolicies: z.array(existingPolicySchema).nullish(),

  // Legacy field name support (kids -> householdSize)
  kids: z.number().int().nonnegative().nullish(),
})

export type UserProfile = z.infer<typeof userProfileSchema>
