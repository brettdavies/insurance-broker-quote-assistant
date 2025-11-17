/**
 * useInferredFieldHandlers Hook
 *
 * Manages inferred field operations: dismissal, editing, and conversion to known.
 * Works directly with userProfile._suppressed and userProfile._inferred.
 *
 * Single Responsibility: Inferred field handling logic only
 */

import type { toast as ToastFn } from '@/components/ui/use-toast'
import type { UserProfile } from '@repo/shared'
import { useCallback } from 'react'

interface UseInferredFieldHandlersParams {
  profile: UserProfile
  updateProfile: (updates: Partial<UserProfile>) => void
  toast: typeof ToastFn
}

export function useInferredFieldHandlers({
  profile,
  updateProfile,
  toast,
}: UseInferredFieldHandlersParams) {
  const handleDismissInference = useCallback(
    (fieldName: string) => {
      // Add to _suppressed array
      const suppressed = profile._suppressed || []
      if (!suppressed.includes(fieldName)) {
        updateProfile({
          _suppressed: [...suppressed, fieldName],
        })
      }

      // Remove from _inferred if present
      if (profile._inferred && profile._inferred[fieldName] !== undefined) {
        const newInferred = { ...profile._inferred }
        delete newInferred[fieldName]
        updateProfile({
          _inferred: Object.keys(newInferred).length > 0 ? newInferred : undefined,
        })
      }

      toast({
        title: 'Field dismissed',
        description: `${fieldName} will not be inferred again this session`,
        duration: 3000,
      })
    },
    [profile, updateProfile, toast]
  )

  const handleEditInference = useCallback(
    (fieldName: string, value: unknown) => {
      // Update inferred field in _inferred object
      const inferred = profile._inferred || {}
      updateProfile({
        _inferred: {
          ...inferred,
          [fieldName]: value,
        },
      })
    },
    [profile, updateProfile]
  )

  const handleConvertToKnown = useCallback(
    (fieldName: string, value: unknown) => {
      // Remove from _suppressed if present
      const suppressed = profile._suppressed || []
      const newSuppressed = suppressed.filter((f) => f !== fieldName)

      // Remove from _inferred if present
      const inferred = profile._inferred || {}
      const newInferred = { ...inferred }
      delete newInferred[fieldName]

      // Add to main profile as known field
      updateProfile({
        [fieldName]: value,
        _suppressed: newSuppressed.length > 0 ? newSuppressed : undefined,
        _inferred: Object.keys(newInferred).length > 0 ? newInferred : undefined,
      })

      toast({
        title: 'Field saved',
        description: `${fieldName} saved as known field`,
        duration: 3000,
      })
    },
    [profile, updateProfile, toast]
  )

  // Handler for when pill is injected (textbox is source of truth)
  // Only removes from _suppressed and _inferred - profile update comes from pill extraction
  const handleConvertToKnownFromPill = useCallback(
    (fieldName: string) => {
      // Remove from _suppressed if present
      const suppressed = profile._suppressed || []
      const newSuppressed = suppressed.filter((f) => f !== fieldName)

      // Remove from _inferred if present
      const inferred = profile._inferred || {}
      const newInferred = { ...inferred }
      delete newInferred[fieldName]

      updateProfile({
        _suppressed: newSuppressed.length > 0 ? newSuppressed : undefined,
        _inferred: Object.keys(newInferred).length > 0 ? newInferred : undefined,
      })

      toast({
        title: 'Field saved',
        description: `${fieldName} saved as known field`,
        duration: 3000,
      })
    },
    [profile, updateProfile, toast]
  )

  return {
    handleDismissInference,
    handleEditInference,
    handleConvertToKnown,
    handleConvertToKnownFromPill,
  }
}
