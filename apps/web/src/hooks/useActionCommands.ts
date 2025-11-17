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

interface UseActionCommandsParams {
  mode: 'intake' | 'policy'
  editorRef: React.MutableRefObject<{
    getTextWithoutPills: () => string
    clear: () => void
  } | null>
  profileRef: React.MutableRefObject<UserProfile>
  profile: UserProfile
  intakeMutation: {
    mutate: (
      request: {
        message: string
        userProfile?: UserProfile
        pills?: UserProfile
        suppressedFields?: string[]
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
  profile,
  intakeMutation,
  policyAnalysisResult,
  handleExportCommand,
  handleCopyCommand,
  reset,
  setCurrentField,
  setFieldModalOpen,
  setHelpModalOpen,
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
    // Clear all state atomically
    reset()
    setCurrentField(null)
    setFieldModalOpen(false)
    setHelpModalOpen(false)

    // Clear userProfile metadata (_inferred and _suppressed)
    updateProfile({
      _inferred: undefined,
      _suppressed: undefined,
    })

    // Clear refs
    editorContentRef.current = ''

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
    updateProfile,
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

    // Build userProfile from current profile state
    // Known fields are in main profile object, inferred in _inferred, suppressed in _suppressed
    const currentProfile = profileRef.current
    const userProfile: UserProfile = {
      ...currentProfile,
      _inferred: currentProfile._inferred || {},
      _suppressed: currentProfile._suppressed || [],
    }

    const request = {
      message: cleanedText,
      userProfile: Object.keys(userProfile).length > 0 ? userProfile : undefined,
      // Legacy support (for backward compatibility)
      pills: Object.keys(currentProfile).length > 0 ? currentProfile : undefined,
      suppressedFields:
        userProfile._suppressed && userProfile._suppressed.length > 0
          ? userProfile._suppressed
          : undefined,
    }

    console.log('[Frontend] handleExtract: Calling API with request:', {
      messageLength: cleanedText.length,
      hasUserProfile: Object.keys(userProfile).length > 0,
      suppressedFieldsCount: userProfile._suppressed?.length || 0,
    })

    intakeMutation.mutate(request, {
      onSuccess: (result: IntakeResult) => {
        console.log('[Frontend] handleExtract: onSuccess called with result:', {
          hasRoute: !!result.route,
          routePrimaryCarrier: result.route?.primaryCarrier,
          routeEligibleCarriersCount: result.route?.eligibleCarriers?.length || 0,
        })
        onIntakeSuccess?.(result)
      },
      onError: (error: Error) => {
        console.error('[Frontend] handleExtract: onError called:', error)
        onIntakeError?.(error)
      },
    })
  }, [editorRef, profileRef, intakeMutation, toast, onIntakeSuccess, onIntakeError])

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
