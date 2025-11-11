import { z } from 'zod'

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
 */
export const existingPolicySchema = z.object({
  product: z.enum(['auto', 'home', 'renters', 'umbrella']),
  carrier: z.string(), // Carrier ID/name matching knowledge pack carrier names
  premium: z.number().positive(), // Annual premium
})

export type ExistingPolicy = z.infer<typeof existingPolicySchema>

/**
 * User Profile Schema
 * Progressive disclosure pattern: most fields optional
 */
export const userProfileSchema = z.object({
  // Contact information
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),

  // Required for routing
  state: z.string().optional(), // US state code (required for routing, but optional for progressive disclosure)
  zip: z.string().optional(), // Zip code

  // Product type
  productLine: z.enum(['auto', 'home', 'renters', 'umbrella']).optional(),

  // Optional demographic fields
  age: z.number().int().positive().optional(),
  householdSize: z.number().int().positive().optional(),
  dependents: z.number().int().nonnegative().optional(),
  vehicles: z.number().int().nonnegative().optional(), // Required for auto, but optional for progressive disclosure
  ownsHome: z.boolean().optional(),

  // Vehicle details (for auto insurance)
  garage: z.string().optional(), // Garage type
  vins: z.string().optional(), // Vehicle Identification Numbers (can be multiple, space-separated)
  drivers: z.number().int().nonnegative().optional(), // Number of drivers
  drivingRecords: z.string().optional(), // Driving record details

  // Optional eligibility fields
  cleanRecord3Yr: z.boolean().optional(), // Clean driving record (3 years)
  creditScore: z.number().int().min(300).max(850).optional(), // Credit score (FICO range)
  propertyType: z
    .enum(['single-family', 'condo', 'townhouse', 'mobile-home', 'duplex', 'apartment'])
    .optional(), // Property type for home/renters insurance

  // Property details (for home/renters insurance)
  constructionYear: z.number().int().positive().optional(),
  roofType: z.string().optional(),
  squareFeet: z.number().int().positive().optional(),

  // Optional current policy fields (for policy analysis flow)
  currentCarrier: z.string().optional(),
  currentPremium: z.number().positive().optional(),
  deductibles: z.string().optional(), // Current deductibles
  limits: z.string().optional(), // Current coverage limits

  // Existing policies array for bundle discount analysis
  existingPolicies: z.array(existingPolicySchema).optional(),

  // Legacy field name support (kids -> householdSize)
  kids: z.number().int().nonnegative().optional(),
})

export type UserProfile = z.infer<typeof userProfileSchema>
