/**
 * Unified Chat Interface Component
 *
 * Main orchestrator component that combines Notes Panel, Sidebar, and Compliance Panel.
 * Follows SOLID, STAR, ORP, SCP, and DRY principles through composition of focused hooks.
 *
 * Single Responsibility: Component composition and orchestration only
 */

import { Header } from '@/components/layout/Header'
import type { ActionCommand } from '@/hooks/useSlashCommands'
import { useUnifiedChatHooks } from '@/hooks/useUnifiedChatHooks'
import { useUnifiedChatState } from '@/hooks/useUnifiedChatState'
import { calculateCapturedCount, calculateTotalRequired } from '@/utils/field-utils'
import { useCallback, useEffect, useState } from 'react'
import { UnifiedChatLayout } from './UnifiedChatLayout'
import { UnifiedChatModals } from './UnifiedChatModals'

interface UnifiedChatInterfaceProps {
  mode?: 'intake' | 'policy'
  isActive?: boolean
  onContentChange?: (content: string) => void
  onActionCommand?: (command: ActionCommand) => void
  onCommandError?: (command: string) => void
  editorRef?: React.MutableRefObject<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
    getTextWithoutPills: () => string
    getEditor: () => import('lexical').LexicalEditor
  } | null>
}

export function UnifiedChatInterface({
  mode = 'intake',
  isActive = false,
  onContentChange,
  onActionCommand,
  onCommandError,
  editorRef: externalEditorRef,
}: UnifiedChatInterfaceProps) {
  // Core state management
  const {
    state,
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
  } = useUnifiedChatState()

  const {
    profile,
    missingFields,
    latestIntakeResult,
    policySummary,
    policyAnalysisResult,
    hasBackendMissingFields,
    fieldModalOpen,
    currentField,
    helpModalOpen,
  } = state

  // Reset key for forcing NotesPanel remount
  const [resetKey, setResetKey] = useState(0)

  // Composed hooks
  const {
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
  } = useUnifiedChatHooks({
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
    policyAnalysisResult,
    hasBackendMissingFields,
    currentField,
    onContentChange,
    onActionCommand,
    onCommandError,
  })

  // Calculate missing fields when profile changes
  useEffect(() => {
    calculateMissingFieldsFromProfile()
  }, [calculateMissingFieldsFromProfile])

  // Merge parent callbacks with local handlers
  const handleActionCommandMerged = useCallback(
    (command: ActionCommand) => {
      handleActionCommand(command)
      onActionCommand?.(command)
    },
    [handleActionCommand, onActionCommand]
  )

  // Calculate field counts
  const capturedCount = calculateCapturedCount(profile)
  const totalRequired = calculateTotalRequired(capturedCount, missingFields.length)

  // Handle reset - increment reset key to force NotesPanel remount
  const handleReset = useCallback(() => {
    handleActionCommand('reset')
    setResetKey((prev) => prev + 1)
  }, [handleActionCommand])

  return (
    <>
      <Header
        mode={mode}
        isActive={isActive}
        onHelpClick={() => setHelpModalOpen(true)}
        onPrefillClick={handleExportCommand}
        onResetClick={handleReset}
      />

      <UnifiedChatLayout
        mode={mode}
        isActive={isActive}
        resetKey={resetKey}
        profile={profile}
        missingFields={missingFields}
        capturedCount={capturedCount}
        totalRequired={totalRequired}
        latestIntakeResult={latestIntakeResult}
        policySummary={policySummary}
        policyAnalysisResult={policyAnalysisResult}
        isAnalyzing={policyAnalysisMutation.isPending}
        inferredFields={inferredFields}
        inferenceReasons={inferenceReasons}
        inferenceConfidence={inferenceConfidence}
        editorRef={editorRef}
        uploadPanelFileInputRef={uploadPanelFileInputRef}
        uploadPanelEditorRef={uploadPanelEditorRef}
        onPolicyExtracted={(summary) => {
          setPolicySummary(summary)
          if (!isActive) {
            handleContentChange('')
          }
        }}
        onContentChange={handleContentChange}
        onFieldExtracted={handleFieldExtractedBase}
        onFieldRemoved={handleFieldRemovedBase}
        onActionCommand={handleActionCommandMerged}
        onCommandError={handleCommandError}
        onFieldClick={handleFieldClick}
        onDismissInference={handleDismissInference}
        onEditInference={handleEditInference}
        onConvertToKnown={handleConvertToKnown}
        onConvertToKnownFromPill={handleConvertToKnownFromPill}
      />

      <UnifiedChatModals
        fieldModalOpen={fieldModalOpen}
        setFieldModalOpen={setFieldModalOpen}
        fieldCommand={getFieldCommand()}
        currentFieldValue={currentField?.value?.toString()}
        onFieldModalSubmit={handleFieldModalSubmit}
        helpModalOpen={helpModalOpen}
        setHelpModalOpen={setHelpModalOpen}
        inferredModalOpen={inferredModalOpen}
        setInferredModalOpen={setInferredModalOpen}
        inferredModalField={inferredModalField}
        inferenceReasons={inferenceReasons}
        inferenceConfidence={inferenceConfidence}
        editor={editorRef.current?.getEditor() ?? null}
        onDeleteInferred={handleDismissInference}
        onSaveInferred={handleEditInference}
        onSaveKnown={handleConvertToKnown}
        onSaveKnownFromPill={handleConvertToKnownFromPill}
      />
    </>
  )
}
