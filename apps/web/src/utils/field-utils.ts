/**
 * Field Utilities
 *
 * Utility functions for field-related operations.
 * Implements DRY principle - single source for field calculations.
 */

import type { UserProfile } from '@repo/shared'

export function calculateCapturedCount(profile: UserProfile): number {
  return Object.keys(profile).filter((key) => {
    const value = profile[key as keyof UserProfile]
    return value !== undefined && value !== null && value !== ''
  }).length
}

export function calculateTotalRequired(capturedCount: number, missingFieldsCount: number): number {
  return capturedCount + missingFieldsCount
}
