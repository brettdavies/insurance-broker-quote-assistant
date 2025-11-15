/**
 * useActionCommands Hook
 *
 * Manages all action command handlers (reset, help, export, copy, extract, prefill).
 * Implements Single Choice Principle - all command routing in one place.
 *
 * Single Responsibility: Action command handling only
 */

import type { toast as ToastFn } from '@/components/ui/use-toast'
import { FIELD_METADATA } from '@/config/shortcuts'
import type { ActionCommand } from '@/hooks/useSlashCommands'
import { logError } from '@/lib/logger'
import { convertMissingFieldsToInfo } from '@/lib/missing-fields'
import type { IntakeResult, PolicyAnalysisResult, UserProfile } from '@repo/shared'
import type { MissingField } from '@repo/shared'
import { useCallback } from 'react'

interface SuppressionManagerHook {
  getSuppressed: () => string[]
  addSuppression: (fieldName: string) => void
  removeSuppression: (fieldName: string) => void
  isSuppressed: (fieldName: string) => boolean
  clearSuppressed: () => void
}

interface UseActionCommandsParams {
  mode: 'intake' | 'policy'
  editorRef: React.MutableRefObject<{
    getTextWithoutPills: () => string
    clear: () => void
  } | null>
  profileRef: React.MutableRefObject<UserProfile>
  suppression: SuppressionManagerHook
  intakeMutation: {
    mutate: (
      request: {
        message: string
        pills?: UserProfile
        suppressedFields: string[]
      },
      options?: {
        onSuccess?: (result: IntakeResult) => void
        onError?: (error: Error) => void
      }
    ) => void
  }
  policyAnalysisResult?: PolicyAnalysisResult
  handleExportCommand: () => Promise<void>
  handleCopyCommand: () => Promise<void>
  reset: () => void
  setCurrentField: (field: { key: string; value?: string | number | boolean } | null) => void
  setFieldModalOpen: (open: boolean) => void
  setHelpModalOpen: (open: boolean) => void
  clearInference: () => void
  setInferredModalOpen: (open: boolean) => void
  setInferredModalField: (
    field: {
      fieldName: string
      fieldLabel: string
      value: unknown
    } | null
  ) => void
  inferenceTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
  existingInferredRef: React.MutableRefObject<Partial<UserProfile>>
  editorContentRef: React.MutableRefObject<string>
  queryClient: { clear: () => void }
  setLatestIntakeResult: (result: IntakeResult | null) => void
  updateProfile: (updates: Partial<UserProfile>) => void
  setHasBackendMissingFields: (value: boolean) => void
  setMissingFields: (fields: import('@/components/sidebar/MissingFields').MissingField[]) => void
  onActionCommand?: (command: ActionCommand) => void
  onIntakeSuccess?: (result: IntakeResult) => void
  onIntakeError?: (error: Error) => void
  toast: typeof ToastFn
}

export function useActionCommands({
  mode,
  editorRef,
  profileRef,
  suppression,
  intakeMutation,
  policyAnalysisResult,
  handleExportCommand,
  handleCopyCommand,
  reset,
  setCurrentField,
  setFieldModalOpen,
  setHelpModalOpen,
  clearInference,
  setInferredModalOpen,
  setInferredModalField,
  inferenceTimeoutRef,
  existingInferredRef,
  editorContentRef,
  queryClient,
  setLatestIntakeResult,
  updateProfile,
  setHasBackendMissingFields,
  setMissingFields,
  onActionCommand,
  onIntakeSuccess,
  onIntakeError,
  toast,
}: UseActionCommandsParams) {
  const handleReset = useCallback(() => {
    // Clear inference timeout if pending
    if (inferenceTimeoutRef.current) {
      clearTimeout(inferenceTimeoutRef.current)
      inferenceTimeoutRef.current = null
    }

    // Clear all state atomically
    reset()
    setCurrentField(null)
    setFieldModalOpen(false)
    setHelpModalOpen(false)

    // Clear suppression list
    suppression.clearSuppressed()

    // Clear inferred fields
    clearInference()
    setInferredModalOpen(false)
    setInferredModalField(null)

    // Clear refs
    existingInferredRef.current = {}
    editorContentRef.current = ''
    inferenceTimeoutRef.current = null

    // Clear TanStack Query cache
    queryClient.clear()

    // Clear editor content
    editorRef.current?.clear()

    // Notify parent to reset isActive (return to home page)
    onActionCommand?.('reset')

    toast({
      title: 'Session reset',
      description: 'All data has been cleared.',
      duration: 3000,
    })
  }, [
    reset,
    setCurrentField,
    setFieldModalOpen,
    setHelpModalOpen,
    suppression,
    clearInference,
    setInferredModalOpen,
    setInferredModalField,
    inferenceTimeoutRef,
    existingInferredRef,
    editorContentRef,
    queryClient,
    editorRef,
    onActionCommand,
    toast,
  ])

  const handleExtract = useCallback(() => {
    const cleanedText = editorRef.current?.getTextWithoutPills() || ''
    if (!cleanedText.trim()) {
      toast({
        title: 'No text to extract',
        description: 'Please enter some notes before extracting fields.',
        variant: 'destructive',
        duration: 3000,
      })
      return
    }

    const pills = profileRef.current
    intakeMutation.mutate(
      {
        message: cleanedText,
        pills: Object.keys(pills).length > 0 ? pills : undefined,
        suppressedFields: suppression.getSuppressed(),
      },
      {
        onSuccess: (result: IntakeResult) => {
          onIntakeSuccess?.(result)
        },
        onError: (error: Error) => {
          onIntakeError?.(error)
        },
      }
    )
  }, [editorRef, profileRef, intakeMutation, suppression, toast, onIntakeSuccess, onIntakeError])

  const handleActionCommand = useCallback(
    (command: ActionCommand) => {
      switch (command) {
        case 'reset':
          handleReset()
          break
        case 'help':
          setHelpModalOpen(true)
          break
        case 'export':
          if (mode === 'policy' && policyAnalysisResult) {
            handleExportCommand()
          } else {
            handleExportCommand()
          }
          break
        case 'copy':
          if (mode === 'policy' && policyAnalysisResult) {
            handleCopyCommand()
          } else {
            handleCopyCommand()
          }
          break
        case 'extract':
          handleExtract()
          break
        case 'prefill':
          handleExportCommand()
          break
        default:
          // Unknown command - should not happen due to type safety
          break
      }
    },
    [
      handleReset,
      setHelpModalOpen,
      mode,
      policyAnalysisResult,
      handleExportCommand,
      handleCopyCommand,
      handleExtract,
    ]
  )

  return {
    handleActionCommand,
  }
}
