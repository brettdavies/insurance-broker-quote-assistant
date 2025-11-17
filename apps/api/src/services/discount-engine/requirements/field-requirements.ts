/**
 * Field Requirement Checkers
 *
 * Validates field-based discount requirements (age, driving record, etc.)
 */

import type { UserProfile } from '@repo/shared'
import type { DiscountRequirements } from '../types'

/**
 * Check age requirement
 *
 * @param ageReq - Age requirement object
 * @param customerData - Customer profile data
 * @returns Missing requirement messages
 */
function checkAgeRequirement(
  ageReq: { min?: number; max?: number },
  customerData: UserProfile
): string[] {
  const missing: string[] = []

  if (customerData.age === undefined || customerData.age === null) {
    missing.push('Age required for eligibility')
    return missing
  }

  if (ageReq.min !== undefined && customerData.age < ageReq.min) {
    missing.push(`Age must be at least ${ageReq.min} (currently ${customerData.age})`)
  }

  if (ageReq.max !== undefined && customerData.age > ageReq.max) {
    missing.push(`Age must be at most ${ageReq.max} (currently ${customerData.age})`)
  }

  return missing
}

/**
 * Check boolean field requirement
 *
 * @param fieldName - Field name to check
 * @param fieldValue - Required value (should be true)
 * @param customerData - Customer profile data
 * @param message - Error message if requirement not met
 * @returns Missing requirement message if not met, empty array if met
 */
function checkBooleanField(
  fieldName: string,
  fieldValue: boolean,
  customerData: UserProfile,
  message: string
): string[] {
  if (fieldValue !== true) {
    return []
  }

  const customerDataRecord = customerData as Record<string, unknown>
  if (!(fieldName in customerDataRecord) || !customerDataRecord[fieldName]) {
    return [message]
  }

  return []
}

/**
 * Check all field requirements
 *
 * @param requirements - Discount requirements
 * @param customerData - Customer profile data
 * @returns Array of missing requirement messages
 */
export function checkFieldRequirements(
  requirements: DiscountRequirements,
  customerData: UserProfile
): string[] {
  const missing: string[] = []
  const fieldReqs = requirements.fieldRequirements
  const fieldExclusions = requirements.fieldExclusions

  if (!fieldReqs && !fieldExclusions) {
    return missing
  }

  // Check field exclusions first (fields that MUST NOT be present or true)
  // If any exclusion is violated, the discount is not eligible
  if (fieldExclusions) {
    // cleanRecord3Yr exclusion
    if (fieldExclusions.cleanRecord3Yr === true && customerData.cleanRecord3Yr === true) {
      missing.push('Not eligible: clean driving record for past 3 years detected')
    }

    // cleanRecord5Yr exclusion
    if (fieldExclusions.cleanRecord5Yr === true && customerData.cleanRecord5Yr === true) {
      missing.push('Not eligible: clean driving record for past 5 years detected')
    }

    // If exclusions are violated, return immediately (no need to check requirements)
    if (missing.length > 0) {
      return missing
    }
  }

  // If no fieldReqs, return (all checks passed)
  if (!fieldReqs) {
    return missing
  }

  // Age check
  if (fieldReqs.age) {
    missing.push(...checkAgeRequirement(fieldReqs.age, customerData))
  }

  // Clean record checks with implication logic
  // Note: cleanRecord5Yr implies cleanRecord3Yr (5 years > 3 years)
  if (fieldReqs.cleanRecord3Yr === true) {
    // Accept either cleanRecord3Yr OR cleanRecord5Yr (5yr implies 3yr)
    const has3YrRecord = customerData.cleanRecord3Yr === true
    const has5YrRecord = customerData.cleanRecord5Yr === true

    if (!has3YrRecord && !has5YrRecord) {
      missing.push('Clean driving record for past 3 years required')
    }
  }

  // Clean record 5-year check (no implication - must have 5yr specifically)
  if (fieldReqs.cleanRecord5Yr === true) {
    missing.push(
      ...checkBooleanField(
        'cleanRecord5Yr',
        true,
        customerData,
        'Clean driving record for past 5 years required'
      )
    )
  }

  // Good student check
  missing.push(
    ...checkBooleanField(
      'goodStudent',
      fieldReqs.goodStudent === true,
      customerData,
      'Good student status required (GPA 3.0+, transcript required)'
    )
  )

  // GPA check
  if (fieldReqs.gpa?.min !== undefined) {
    const gpa = (customerData as Record<string, unknown>).gpa as number | undefined
    if (gpa === undefined || gpa < fieldReqs.gpa.min) {
      missing.push(`GPA must be at least ${fieldReqs.gpa.min}`)
    }
  }

  // Military checks
  missing.push(
    ...checkBooleanField(
      'military',
      fieldReqs.military === true,
      customerData,
      'Military service required'
    )
  )

  missing.push(
    ...checkBooleanField(
      'veteran',
      fieldReqs.veteran === true,
      customerData,
      'Veteran status required'
    )
  )

  // Home security checks
  missing.push(
    ...checkBooleanField(
      'homeSecuritySystem',
      fieldReqs.homeSecuritySystem === true,
      customerData,
      'Home security system required'
    )
  )

  missing.push(
    ...checkBooleanField(
      'deadboltLocks',
      fieldReqs.deadboltLocks === true,
      customerData,
      'Deadbolt locks required'
    )
  )

  return missing
}
