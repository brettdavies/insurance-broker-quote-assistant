/**
 * Discount Engine Types
 *
 * Shared type definitions for discount engine components
 */

import type { Carrier, Citation, Discount, PolicySummary, UserProfile } from '@repo/shared'

/**
 * Discount eligibility evaluation result
 */
export interface DiscountEligibilityResult {
  eligible: boolean
  missingRequirements: string[]
  discount: Discount
}

/**
 * Discount opportunity with calculated savings
 */
export interface DiscountOpportunity {
  discountId: string
  discountName: string
  percentage: number
  annualSavings: number
  missingRequirements: string[]
  metRequirements?: string[] // List of requirements customer meets (for eligible discounts)
  citation: Citation
  stackable: boolean
  requiresDocumentation?: boolean
}

/**
 * Bundle opportunity for adding additional products
 */
export interface BundleOpportunity {
  discountId: string
  discountName: string
  missingProducts: string[]
  estimatedSavings: number
  requiredActions: string[]
  citation: Citation
}

/**
 * Discount requirements structure (standardized)
 */
export interface DiscountRequirements {
  mustHaveProducts?: string[]
  minProducts?: number
  bundleProducts?: string[]
  eligibleProducts?: string[]
  fieldRequirements?: {
    age?: {
      min?: number
      max?: number
    }
    cleanRecord3Yr?: boolean
    cleanRecord5Yr?: boolean
    goodStudent?: boolean
    gpa?: {
      min?: number
    }
    military?: boolean
    veteran?: boolean
    homeSecuritySystem?: boolean
    deadboltLocks?: boolean
    [key: string]: unknown
  }
  fieldExclusions?: {
    cleanRecord3Yr?: boolean
    cleanRecord5Yr?: boolean
    [key: string]: unknown
  }
  description: string
}

/**
 * Savings calculation result
 */
export interface SavingsCalculation {
  annualDollars: number
  explanation: string
}

/**
 * Context for discount evaluation
 */
export interface EvaluationContext {
  policy: PolicySummary
  customerData?: UserProfile
  carrier: Carrier
}
