import type { UserProfile } from '@repo/shared'

/**
 * Type Guards and Safe Assignment Utilities
 *
 * Provides type-safe utilities for dynamic field assignment.
 */

/**
 * Type guard to check if a key is a valid UserProfile field
 */
export function isUserProfileField(key: string): key is keyof UserProfile {
  const validFields: Array<keyof UserProfile> = [
    'name',
    'email',
    'phone',
    'state',
    'zip',
    'address',
    'age',
    'householdSize',
    'vehicles',
    'ownsHome',
    'cleanRecord3Yr',
    'currentCarrier',
    'premiums',
    'existingPolicies',
    'kids',
    'garage',
    'vins',
    'productType',
    'propertyType',
    'yearBuilt',
    'roofType',
    'squareFeet',
    'drivers',
    'creditScore',
    'cleanRecord5Yr',
  ]
  return validFields.includes(key as keyof UserProfile)
}

/**
 * Safely assign a numeric value to a UserProfile field
 */
export function assignNumericField(
  profile: Partial<UserProfile>,
  fieldName: string,
  value: number
): void {
  if (isUserProfileField(fieldName)) {
    const typedField = fieldName as keyof UserProfile
    // Type-safe assignment for numeric fields
    if (
      typedField === 'age' ||
      typedField === 'kids' ||
      typedField === 'householdSize' ||
      typedField === 'vehicles' ||
      typedField === 'creditScore' ||
      typedField === 'yearBuilt' ||
      typedField === 'squareFeet' ||
      typedField === 'drivers'
    ) {
      profile[typedField] = value as UserProfile[typeof typedField]
    }
  }
}

/**
 * Safely assign a boolean value to a UserProfile field
 */
export function assignBooleanField(
  profile: Partial<UserProfile>,
  fieldName: string,
  value: boolean
): void {
  if (isUserProfileField(fieldName)) {
    const typedField = fieldName as keyof UserProfile
    // Type-safe assignment for boolean fields
    if (
      typedField === 'ownsHome' ||
      typedField === 'cleanRecord3Yr' ||
      typedField === 'cleanRecord5Yr'
    ) {
      profile[typedField] = value as UserProfile[typeof typedField]
    }
  }
}

/**
 * Safely assign a string value to a UserProfile field
 */
export function assignStringField(
  profile: Partial<UserProfile>,
  fieldName: string,
  value: string
): void {
  if (isUserProfileField(fieldName)) {
    const typedField = fieldName as keyof UserProfile
    // Type-safe assignment for string fields
    if (
      typedField === 'name' ||
      typedField === 'email' ||
      typedField === 'phone' ||
      typedField === 'state' ||
      typedField === 'zip' ||
      typedField === 'address' ||
      typedField === 'currentCarrier' ||
      typedField === 'garage' ||
      typedField === 'vins' ||
      typedField === 'roofType'
    ) {
      profile[typedField] = value as UserProfile[typeof typedField]
    }
  }
}
