/**
 * Notes Panel Component
 *
 * Unified notes component with inline pill system for key-value pairs.
 * Uses Lexical editor for production-ready pill handling with support for:
 * - Undo/redo
 * - Cursor management
 * - Copy/paste
 * - IME input
 * - Atomic pill deletion
 */

import { CompliancePanel } from '@/components/layout/CompliancePanel'
import { KeyValueEditor } from '@/components/shared/KeyValueEditor'
import { FieldModal } from '@/components/shortcuts/FieldModal'
import { RoutingStatus } from '@/components/sidebar/RoutingStatus'
import { useComplianceDisclaimers } from '@/hooks/useComplianceDisclaimers'
import { usePillInjection } from '@/hooks/usePillInjection'
import { useRouting } from '@/hooks/useRouting'
import { type ActionCommand, type FieldCommand, useSlashCommands } from '@/hooks/useSlashCommands'
import { type UserProfile, unifiedFieldMetadata } from '@repo/shared'
import { useCallback, useState } from 'react'
import { InferredFieldsSection } from './InferredFieldsSection'
import { FieldInjectionPlugin } from './plugins/FieldInjectionPlugin'
import { PillFieldExtractionPlugin } from './plugins/PillFieldExtractionPlugin'

interface NotesPanelProps {
  mode?: 'intake' | 'policy'
  onFieldExtracted?: (fields: Record<string, string | number | boolean>) => void
  onFieldRemoved?: (fieldName: string) => void
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
  autoFocus?: boolean
  // Inferred fields (optional - populated by inference engine in future stories)
  inferredFields?: Partial<UserProfile>
  inferenceReasons?: Record<string, string>
  confidence?: Record<string, number>
  onDismissInference?: (fieldName: string) => void
  onEditInference?: (fieldName: string, value: unknown) => void
  onConvertToKnown?: (fieldName: string, value: unknown) => void
  onConvertToKnownFromPill?: (fieldName: string) => void
  // Profile for compliance disclaimers
  profile?: UserProfile
}

export function NotesPanel({
  mode = 'intake',
  onFieldExtracted,
  onFieldRemoved,
  onContentChange,
  onActionCommand,
  onCommandError,
  editorRef,
  autoFocus = false,
  inferredFields = {},
  inferenceReasons = {},
  confidence = {},
  onDismissInference = () => {},
  onEditInference = () => {},
  onConvertToKnown = () => {},
  onConvertToKnownFromPill = () => {},
  profile = {},
}: NotesPanelProps) {
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [currentField, setCurrentField] = useState<FieldCommand | null>(null)
  const [fieldValue, setFieldValue] = useState<string | null>(null)
  const [content, setContent] = useState('')

  // Inferred field modal state (Story 4.4)
  const [inferredModalOpen, setInferredModalOpen] = useState(false)
  const [inferredModalField, setInferredModalField] = useState<{
    fieldName: string
    fieldLabel: string
    value: unknown
  } | null>(null)

  const handleFieldCommand = useCallback((command: FieldCommand) => {
    setCurrentField(command)
    setFieldModalOpen(true)
  }, [])

  // Inferred field modal handlers (Story 4.4)
  const handleEditInferenceLocal = useCallback((fieldName: string, value: unknown) => {
    const metadata = unifiedFieldMetadata[fieldName]
    setInferredModalField({
      fieldName,
      fieldLabel: metadata?.label || fieldName,
      value,
    })
    setInferredModalOpen(true)
  }, [])

  const handleSaveInferred = useCallback(
    (fieldName: string, value: unknown) => {
      onEditInference(fieldName, value)
      setInferredModalOpen(false)
    },
    [onEditInference]
  )

  // Get pill injection hook for converting inferred fields to known
  const editor = editorRef?.current?.getEditor() ?? null
  const { injectPill } = usePillInjection(editor)

  // Handle converting inferred field to known from Check button (inferred fields section)
  const handleConvertToKnownLocal = useCallback(
    (fieldName: string, value: unknown) => {
      // Inject pill into editor (textbox is source of truth)
      if (fieldName) {
        injectPill(fieldName, value)
      }
      // Pill injection will trigger PillFieldExtractionPlugin which calls onFieldExtracted
      // to update the profile. We just need to remove suppression and re-run inference.
      // Use a small delay to ensure pill extraction completes first
      setTimeout(() => {
        onConvertToKnownFromPill(fieldName)
      }, 0)
    },
    [onConvertToKnownFromPill, injectPill]
  )

  const handleSaveKnown = useCallback(
    (fieldName: string, value: unknown) => {
      // Pill injection is already handled in useFieldModalHandlers.handleSaveKnown
      // The pill injection will trigger PillFieldExtractionPlugin which updates the profile.
      // We just need to remove suppression and re-run inference.
      // Note: This callback is only used as a fallback if onSaveKnownFromPill is not provided
      onConvertToKnown(fieldName, value)
      setInferredModalOpen(false)
    },
    [onConvertToKnown]
  )

  const handleDeleteInferred = useCallback(
    (fieldName: string) => {
      onDismissInference(fieldName)
      setInferredModalOpen(false)
    },
    [onDismissInference]
  )

  const handleActionCommandLocal = useCallback(
    (command: ActionCommand) => {
      // Pass all action commands to parent - no local handling
      onActionCommand?.(command)
    },
    [onActionCommand]
  )

  const { commandIndicator } = useSlashCommands({
    onFieldCommand: handleFieldCommand,
    onActionCommand: handleActionCommandLocal,
    onCommandError: (command) => {
      // Pass error to parent component
      onCommandError?.(command)
    },
  })

  const handleContentChange = useCallback(
    (text: string) => {
      setContent(text)
      onContentChange?.(text)
    },
    [onContentChange]
  )

  const handleFieldSubmit = useCallback((value: string) => {
    setFieldValue(value)
    setFieldModalOpen(false)
  }, [])

  const handleFieldInjectionComplete = useCallback(() => {
    setFieldValue(null)
    setCurrentField(null)
  }, [])

  const placeholder =
    mode === 'intake'
      ? 'Type notes... (k:2 for kids, v:3 for vehicles, /k for modal, /help for shortcuts)'
      : 'Type policy details... (carrier:GEICO, premium:1200, /help for shortcuts)'

  // Fetch disclaimers from backend API when state or product changes
  const disclaimers = useComplianceDisclaimers(profile)

  // Fetch routing decision reactively when profile changes (intake mode only)
  const routeDecision = useRouting(profile)

  return (
    <>
      <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
        {/* Command Indicator */}
        {commandIndicator && (
          <div className="bg-primary-600 px-6 py-2 font-mono text-sm text-white">
            {commandIndicator}
          </div>
        )}

        {/* Notes Input Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <KeyValueEditor
            placeholder={placeholder}
            onContentChange={handleContentChange}
            onFieldRemoved={onFieldRemoved}
            editorRef={editorRef}
            autoFocus={autoFocus}
            contentEditableClassName="focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-400 min-h-[200px] w-full rounded-md border border-gray-300 bg-white p-4 font-mono text-sm text-gray-900 transition-all duration-200 ease-out placeholder:text-gray-500 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            additionalPlugins={
              <>
                <PillFieldExtractionPlugin onFieldExtracted={onFieldExtracted} />
                <FieldInjectionPlugin
                  fieldCommand={currentField}
                  value={fieldValue}
                  onComplete={handleFieldInjectionComplete}
                />
              </>
            }
          />

          {/* Inferred Fields Section */}
          <InferredFieldsSection
            inferredFields={inferredFields}
            inferenceReasons={inferenceReasons}
            confidence={confidence}
            onDismiss={onDismissInference}
            onEdit={handleEditInferenceLocal}
            onConvertToKnown={handleConvertToKnownLocal}
          />

          {/* Compliance Panel (directly below Inferred Fields Section) */}
          <div className="mt-4">
            <CompliancePanel mode={mode} disclaimers={disclaimers} />
          </div>

          {/* Routing Status (directly below Compliance Panel, intake mode only) */}
          <div className="mt-4">
            <RoutingStatus route={routeDecision} mode={mode} />
          </div>
        </div>
      </div>

      {/* Slash command field modal (legacy) */}
      <FieldModal
        open={fieldModalOpen}
        onOpenChange={setFieldModalOpen}
        field={currentField}
        onSubmit={handleFieldSubmit}
      />

      {/* Inferred field modal (Story 4.4 + 4.5) */}
      {inferredModalField && (
        <FieldModal
          open={inferredModalOpen}
          onOpenChange={setInferredModalOpen}
          isInferred={true}
          fieldName={inferredModalField.fieldName}
          fieldLabel={inferredModalField.fieldLabel}
          currentValue={inferredModalField.value}
          reasoning={inferenceReasons[inferredModalField.fieldName]}
          confidence={confidence[inferredModalField.fieldName]}
          onDelete={() => handleDeleteInferred(inferredModalField.fieldName)}
          onSaveInferred={(value) => handleSaveInferred(inferredModalField.fieldName, value)}
          onSaveKnown={(value) => handleSaveKnown(inferredModalField.fieldName, value)}
          onSaveKnownFromPill={() => {
            // Pill injection triggers profile update via extraction
            // Just remove suppression and re-run inference
            onConvertToKnownFromPill(inferredModalField.fieldName)
            setInferredModalOpen(false)
          }}
          editor={editorRef?.current?.getEditor() ?? null}
        />
      )}
    </>
  )
}
