/**
 * User Profile Schema
 *
 * Represents captured shopper information during intake conversation.
 * This is a placeholder schema - will be replaced with full schema from architecture docs.
 */

export interface UserProfile {
  state?: string
  productLine?: string
  age?: number
  kids?: number
  householdSize?: number
  vehicles?: number
  ownsHome?: boolean
  cleanRecord3Yr?: boolean
  existingPolicies?: string[]
  // Additional fields will be added as needed
  [key: string]: unknown
}

/**
 * Intake Result Schema
 *
 * Response from /api/intake endpoint containing extracted fields and routing decisions.
 * This is a placeholder schema - will be replaced with full schema from architecture docs.
 */

export interface IntakeResult {
  profile: UserProfile
  missingFields: Array<{
    name: string
    priority: 'critical' | 'important' | 'optional'
    alias?: string
  }>
  route?: {
    carriers: Array<{
      name: string
      matchScore: number
    }>
  }
  opportunities?: unknown[]
  prefill?: unknown
  pitch?: string
  complianceValidated?: boolean
  trace?: unknown
}
