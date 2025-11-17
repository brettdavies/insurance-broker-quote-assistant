/**
 * useUnifiedChatHooks Hook
 *
 * Composes all hooks needed for the unified chat interface.
 * Reduces complexity in the main component by grouping related hooks.
 *
 * Single Responsibility: Hook composition only
 */

import { useToast } from '@/components/ui/use-toast'
import { useActionCommands } from '@/hooks/useActionCommands'
import { useEditorRefs } from '@/hooks/useEditorRefs'
import { useExportHandlers } from '@/hooks/useExportHandlers'
import { useFieldClickHandler } from '@/hooks/useFieldClickHandler'
import { useFieldHandlers } from '@/hooks/useFieldHandlers'
import { useInferredFieldHandlers } from '@/hooks/useInferredFieldHandlers'
import { useInferredFieldModal } from '@/hooks/useInferredFieldModal'
import { useIntake } from '@/hooks/useIntake'
import { useIntakeCallbacks } from '@/hooks/useIntakeCallbacks'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useMissingFieldsCalculator } from '@/hooks/useMissingFieldsCalculator'
import { usePolicyAnalysis } from '@/hooks/usePolicyAnalysis'
import { usePolicyAnalysisTrigger } from '@/hooks/usePolicyAnalysisTrigger'
import type { ActionCommand } from '@/hooks/useSlashCommands'
import { useUnifiedChatCallbacks } from '@/hooks/useUnifiedChatCallbacks'
import { showFieldCapturedToast, showFieldRemovedToast } from '@/utils/toast-helpers'
import type { IntakeResult, UserProfile } from '@repo/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

interface UseUnifiedChatHooksParams {
  mode: 'intake' | 'policy'
  externalEditorRef?: React.MutableRefObject<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
    getTextWithoutPills: () => string
    getEditor: () => import('lexical').LexicalEditor
  } | null>
  profile: UserProfile
  profileRef: React.MutableRefObject<UserProfile>
  updateProfile: (updates: Partial<UserProfile>) => void
  removeField: (fieldName: string) => void
  setMissingFields: (fields: import('@/components/sidebar/MissingFields').MissingField[]) => void
  setLatestIntakeResult: (result: IntakeResult | null) => void
  setPolicySummary: (summary: import('@repo/shared').PolicySummary | undefined) => void
  setPolicyAnalysisResult: (result: import('@repo/shared').PolicyAnalysisResult | undefined) => void
  setHasBackendMissingFields: (value: boolean) => void
  setFieldModalOpen: (open: boolean) => void
  setCurrentField: (field: { key: string; value?: string | number | boolean } | null) => void
  setHelpModalOpen: (open: boolean) => void
  setPrefillModalOpen: (open: boolean) => void
  setPrefillData: (prefill: import('@repo/shared').PrefillPacket | null) => void
  reset: () => void
  latestIntakeResult: IntakeResult | null
  policySummary?: import('@repo/shared').PolicySummary
  policyAnalysisResult?: import('@repo/shared').PolicyAnalysisResult
  hasBackendMissingFields: boolean
  currentField: { key: string; value?: string | number | boolean } | null
  onContentChange?: (content: string) => void
  onActionCommand?: (command: ActionCommand) => void
  onCommandError?: (command: string) => void
}

export function useUnifiedChatHooks({
  mode,
  externalEditorRef,
  profile,
  profileRef,
  updateProfile,
  removeField,
  setMissingFields,
  setLatestIntakeResult,
  setPolicySummary,
  setPolicyAnalysisResult,
  setHasBackendMissingFields,
  setFieldModalOpen,
  setCurrentField,
  setHelpModalOpen,
  setPrefillModalOpen,
  setPrefillData,
  reset,
  latestIntakeResult,
  policySummary,
  hasBackendMissingFields,
  policyAnalysisResult,
  currentField,
  onContentChange,
  onActionCommand,
  onCommandError,
}: UseUnifiedChatHooksParams) {
  // External dependencies
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const policyAnalysisMutation = usePolicyAnalysis()
  const intakeMutation = useIntake()

  // Editor refs management
  const { editorRef, editorContentRef, uploadPanelFileInputRef, uploadPanelEditorRef } =
    useEditorRefs({
      externalEditorRef,
      profile,
    })

  // Inferred field modal state
  const { inferredModalOpen, inferredModalField, setInferredModalOpen, openModal } =
    useInferredFieldModal()

  // Derive inferred fields from profile._inferred
  const inferredFields = useMemo(() => profile._inferred || {}, [profile._inferred])
  // Default inference reasons (can be enhanced later to store in userProfile)
  const inferenceReasons = useMemo(() => {
    const reasons: Record<string, string> = {}
    for (const fieldName of Object.keys(inferredFields)) {
      reasons[fieldName] = 'Inferred from extracted fields'
    }
    return reasons
  }, [inferredFields])
  // Default confidence (can be enhanced later to store in userProfile)
  const inferenceConfidence = useMemo(() => {
    const confidence: Record<string, number> = {}
    for (const fieldName of Object.keys(inferredFields)) {
      confidence[fieldName] = 0.85 // Default high confidence
    }
    return confidence
  }, [inferredFields])

  // Field handlers hook
  const {
    handleFieldExtracted: handleFieldExtractedBase,
    handleFieldRemoved: handleFieldRemovedBase,
    handleFieldModalSubmit: handleFieldModalSubmitBase,
  } = useFieldHandlers({
    profileRef,
    updateProfile,
    removeField,
    editorRef,
    onFieldExtracted: useCallback(
      (changedFields: Record<string, string | number | boolean>) => {
        setTimeout(() => {
          for (const [key, value] of Object.entries(changedFields)) {
            showFieldCapturedToast(toast, key, value)
          }
        }, 0)
        // Inference now happens in extraction engine, no need to call runInference
      },
      [toast]
    ),
    onFieldRemoved: useCallback(
      (fieldName: string) => {
        setTimeout(() => {
          showFieldRemovedToast(toast, fieldName)
        }, 0)
      },
      [toast]
    ),
  })

  // Export handlers hook
  const { handleExportCommand, handleCopyCommand } = useExportHandlers({
    profile,
    latestIntakeResult,
    policyAnalysisResult,
    mode,
    toast,
    onPrefillModalOpen: (prefill) => {
      setPrefillData(prefill)
      setPrefillModalOpen(true)
    },
  })

  // Inferred field handlers hook
  const {
    handleDismissInference,
    handleEditInference,
    handleConvertToKnown,
    handleConvertToKnownFromPill,
  } = useInferredFieldHandlers({
    profile,
    updateProfile,
    toast,
  })

  // Intake callbacks hook
  const { handleIntakeSuccess, handleIntakeError } = useIntakeCallbacks({
    setLatestIntakeResult,
    updateProfile,
    setHasBackendMissingFields,
    setMissingFields,
    toast,
  })

  // Unified chat callbacks hook
  const { handleContentChange, handleFieldModalSubmit, handleCommandError, getFieldCommand } =
    useUnifiedChatCallbacks({
      editorContentRef,
      onContentChange,
      toast,
      currentField,
      handleFieldModalSubmitBase,
      setFieldModalOpen,
      setCurrentField,
      onCommandError,
    })

  // Action commands hook
  const { handleActionCommand } = useActionCommands({
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
    onIntakeSuccess: handleIntakeSuccess,
    onIntakeError: handleIntakeError,
    toast,
  })

  // Field click handler hook
  const { handleFieldClick } = useFieldClickHandler({
    inferredFields,
    setCurrentField,
    setFieldModalOpen,
    openInferredModal: openModal,
  })

  // Missing fields calculator hook
  const { calculateMissingFieldsFromProfile } = useMissingFieldsCalculator({
    profile,
    latestIntakeResult,
    hasBackendMissingFields,
    setMissingFields,
  })

  // Policy analysis trigger hook
  usePolicyAnalysisTrigger({
    mode,
    policySummary,
    policyAnalysisMutation,
    setPolicyAnalysisResult,
    toast,
  })

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    onFocusPolicyUpload: () => {
      if (uploadPanelFileInputRef.current) {
        uploadPanelFileInputRef.current.click()
      } else if (uploadPanelEditorRef.current) {
        uploadPanelEditorRef.current.focus()
      }
    },
  })

  return {
    editorRef,
    editorContentRef,
    uploadPanelFileInputRef,
    uploadPanelEditorRef,
    inferredModalOpen,
    inferredModalField,
    setInferredModalOpen,
    inferredFields,
    inferenceReasons,
    inferenceConfidence,
    handleFieldExtractedBase,
    handleFieldRemovedBase,
    handleExportCommand,
    handleDismissInference,
    handleEditInference,
    handleConvertToKnown,
    handleConvertToKnownFromPill,
    handleContentChange,
    handleFieldModalSubmit,
    handleCommandError,
    getFieldCommand,
    handleActionCommand,
    handleFieldClick,
    calculateMissingFieldsFromProfile,
    policyAnalysisMutation,
  }
}
