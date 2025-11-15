/**
 * useInferredFieldHandlers Hook
 *
 * Manages inferred field operations: dismissal, editing, and conversion to known.
 *
 * Single Responsibility: Inferred field handling logic only
 */

import type { toast as ToastFn } from '@/components/ui/use-toast'
import type { UserProfile } from '@repo/shared'
import { useCallback } from 'react'
interface SuppressionManagerHook {
  getSuppressed: () => string[]
  addSuppression: (fieldName: string) => void
  removeSuppression: (fieldName: string) => void
  isSuppressed: (fieldName: string) => boolean
  clearSuppressed: () => void
}

interface UseInferredFieldHandlersParams {
  suppression: SuppressionManagerHook
  updateProfile: (updates: Partial<UserProfile>) => void
  updateInferredField: (fieldName: string, value: unknown) => void
  runInference: () => void
  toast: typeof ToastFn
}

export function useInferredFieldHandlers({
  suppression,
  updateProfile,
  updateInferredField,
  runInference,
  toast,
}: UseInferredFieldHandlersParams) {
  const handleDismissInference = useCallback(
    (fieldName: string) => {
      suppression.addSuppression(fieldName)
      runInference()
      toast({
        title: 'Field dismissed',
        description: `${fieldName} will not be inferred again this session`,
        duration: 3000,
      })
    },
    [suppression, runInference, toast]
  )

  const handleEditInference = useCallback(
    (fieldName: string, value: unknown) => {
      // Update inferred fields state directly (keeps field as inferred, not known)
      updateInferredField(fieldName, value)
      // Don't re-run inference here - it's just an edit to an existing inferred field
    },
    [updateInferredField]
  )

  const handleConvertToKnown = useCallback(
    (fieldName: string, value: unknown) => {
      // Remove from suppression list (if present)
      suppression.removeSuppression(fieldName)
      // Update profile with known value
      updateProfile({ [fieldName]: value })
      // Re-run inference with updated suppression list and known fields
      runInference()
      toast({
        title: 'Field saved',
        description: `${fieldName} saved as known field`,
        duration: 3000,
      })
    },
    [suppression, updateProfile, runInference, toast]
  )

  return {
    handleDismissInference,
    handleEditInference,
    handleConvertToKnown,
  }
}
