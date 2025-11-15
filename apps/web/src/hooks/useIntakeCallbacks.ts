/**
 * useIntakeCallbacks Hook
 *
 * Manages intake mutation success and error callbacks.
 *
 * Single Responsibility: Intake callback handling only
 */

import type { toast as ToastFn } from '@/components/ui/use-toast'
import { FIELD_METADATA } from '@/config/shortcuts'
import { logError } from '@/lib/logger'
import { convertMissingFieldsToInfo } from '@/lib/missing-fields'
import type { IntakeResult, MissingField, UserProfile } from '@repo/shared'
import { useCallback } from 'react'

interface UseIntakeCallbacksParams {
  setLatestIntakeResult: (result: IntakeResult | null) => void
  updateProfile: (updates: Partial<UserProfile>) => void
  setHasBackendMissingFields: (value: boolean) => void
  setMissingFields: (fields: import('@/components/sidebar/MissingFields').MissingField[]) => void
  toast: typeof ToastFn
}

export function useIntakeCallbacks({
  setLatestIntakeResult,
  updateProfile,
  setHasBackendMissingFields,
  setMissingFields,
  toast,
}: UseIntakeCallbacksParams) {
  const handleIntakeSuccess = useCallback(
    (result: IntakeResult) => {
      setLatestIntakeResult(result)
      updateProfile(result.profile)
      setHasBackendMissingFields(true)

      const backendMissingFields: MissingField[] = result.missingFields
      const frontendMissingFields = convertMissingFieldsToInfo(backendMissingFields)
      setMissingFields(
        frontendMissingFields.map((field) => {
          const metadata = FIELD_METADATA[field.fieldKey as keyof typeof FIELD_METADATA]
          const displayName = metadata?.label || field.fieldKey
          return {
            name: displayName,
            priority: field.priority,
            fieldKey: field.fieldKey,
          }
        })
      )

      toast({
        title: 'Extraction complete',
        description: 'Fields extracted successfully.',
        duration: 3000,
      })
    },
    [setLatestIntakeResult, updateProfile, setHasBackendMissingFields, setMissingFields, toast]
  )

  const handleIntakeError = useCallback(
    (error: Error) => {
      void logError('Failed to extract fields', error)
      toast({
        title: 'Extraction error',
        description: 'Failed to extract fields. Please try again.',
        variant: 'destructive',
        duration: 5000,
      })
    },
    [toast]
  )

  return {
    handleIntakeSuccess,
    handleIntakeError,
  }
}
