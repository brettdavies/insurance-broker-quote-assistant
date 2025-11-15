/**
 * useMissingFieldsCalculator Hook
 *
 * Calculates missing fields from current profile state.
 *
 * Single Responsibility: Missing fields calculation only
 */

import { FIELD_METADATA } from '@/config/shortcuts'
import { calculateMissingFields, convertMissingFieldsToInfo } from '@/lib/missing-fields'
import type { IntakeResult } from '@repo/shared'
import type { UserProfile } from '@repo/shared'
import { useCallback } from 'react'

interface UseMissingFieldsCalculatorParams {
  profile: UserProfile
  latestIntakeResult: IntakeResult | null
  hasBackendMissingFields: boolean
  setMissingFields: (fields: import('@/components/sidebar/MissingFields').MissingField[]) => void
}

export function useMissingFieldsCalculator({
  profile,
  latestIntakeResult,
  hasBackendMissingFields,
  setMissingFields,
}: UseMissingFieldsCalculatorParams) {
  const calculateMissingFieldsFromProfile = useCallback(() => {
    // Only calculate frontend missing fields if we don't have backend ones yet
    if (hasBackendMissingFields) {
      return
    }

    // Get carrier/state from latest intake result if available
    const carrier = latestIntakeResult?.route?.primaryCarrier
    const state = profile.state || latestIntakeResult?.profile?.state
    const productType = profile.productType || latestIntakeResult?.profile?.productType

    const calculated = calculateMissingFields(
      profile,
      productType ?? undefined,
      state ?? undefined,
      carrier
    )

    // Convert to MissingField format for component
    const fieldMetadata = calculated.map((field) => {
      const metadata = FIELD_METADATA[field.fieldKey as keyof typeof FIELD_METADATA]
      const displayName = metadata?.label || field.fieldKey
      return {
        name: displayName,
        priority: field.priority,
        fieldKey: field.fieldKey,
      }
    })

    setMissingFields(fieldMetadata)
  }, [profile, latestIntakeResult, hasBackendMissingFields, setMissingFields])

  return {
    calculateMissingFieldsFromProfile,
  }
}
