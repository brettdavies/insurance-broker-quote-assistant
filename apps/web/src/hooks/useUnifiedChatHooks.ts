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
import { useInferenceEngine } from '@/hooks/useInferenceEngine'
import { useInferredFieldHandlers } from '@/hooks/useInferredFieldHandlers'
import { useInferredFieldModal } from '@/hooks/useInferredFieldModal'
import { useIntake } from '@/hooks/useIntake'
import { useIntakeCallbacks } from '@/hooks/useIntakeCallbacks'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useMissingFieldsCalculator } from '@/hooks/useMissingFieldsCalculator'
import { usePolicyAnalysis } from '@/hooks/usePolicyAnalysis'
import { usePolicyAnalysisTrigger } from '@/hooks/usePolicyAnalysisTrigger'
import type { ActionCommand } from '@/hooks/useSlashCommands'
import { useSuppressionManager } from '@/hooks/useSuppressionManager'
import { useUnifiedChatCallbacks } from '@/hooks/useUnifiedChatCallbacks'
import { showFieldCapturedToast, showFieldRemovedToast } from '@/utils/toast-helpers'
import type { IntakeResult, UserProfile } from '@repo/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

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
  const suppression = useSuppressionManager()

  // Editor refs management
  const { editorRef, editorContentRef, uploadPanelFileInputRef, uploadPanelEditorRef } =
    useEditorRefs({
      externalEditorRef,
      profile,
    })

  // Inferred field modal state
  const { inferredModalOpen, inferredModalField, setInferredModalOpen, openModal } =
    useInferredFieldModal()

  // Inference engine hook
  const {
    inferredFields,
    inferenceReasons,
    inferenceConfidence,
    runInference,
    clearInference,
    updateInferredField,
    inferenceTimeoutRef,
    existingInferredRef,
  } = useInferenceEngine({
    suppression,
    editorRef,
    profileRef,
  })

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
        runInference()
      },
      [toast, runInference]
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
  })

  // Inferred field handlers hook
  const {
    handleDismissInference,
    handleEditInference,
    handleConvertToKnown,
    handleConvertToKnownFromPill,
  } = useInferredFieldHandlers({
    suppression,
    updateProfile,
    updateInferredField,
    runInference,
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
      runInference,
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
    setInferredModalOpen: () => {},
    setInferredModalField: () => {},
    inferenceTimeoutRef,
    existingInferredRef,
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
