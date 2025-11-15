/**
 * UnifiedChatModals Component
 *
 * Renders all modals for the unified chat interface.
 *
 * Single Responsibility: Modal rendering only
 */

import { FieldModal } from '@/components/shortcuts/FieldModal'
import { HelpModal } from '@/components/shortcuts/HelpModal'
import type { FieldCommand } from '@/hooks/useSlashCommands'
import type { UserProfile } from '@repo/shared'

interface UnifiedChatModalsProps {
  fieldModalOpen: boolean
  setFieldModalOpen: (open: boolean) => void
  fieldCommand: FieldCommand | null
  currentFieldValue?: string
  onFieldModalSubmit: (value: string) => void
  helpModalOpen: boolean
  setHelpModalOpen: (open: boolean) => void
  inferredModalOpen: boolean
  setInferredModalOpen: (open: boolean) => void
  inferredModalField: {
    fieldName: string
    fieldLabel: string
    value: unknown
  } | null
  inferenceReasons: Record<string, string>
  inferenceConfidence: Record<string, number>
  editor: import('lexical').LexicalEditor | null
  onDeleteInferred: (fieldName: string) => void
  onSaveInferred: (fieldName: string, value: unknown) => void
  onSaveKnown: (fieldName: string, value: unknown) => void
}

export function UnifiedChatModals({
  fieldModalOpen,
  setFieldModalOpen,
  fieldCommand,
  currentFieldValue,
  onFieldModalSubmit,
  helpModalOpen,
  setHelpModalOpen,
  inferredModalOpen,
  setInferredModalOpen,
  inferredModalField,
  inferenceReasons,
  inferenceConfidence,
  editor,
  onDeleteInferred,
  onSaveInferred,
  onSaveKnown,
}: UnifiedChatModalsProps) {
  return (
    <>
      <FieldModal
        open={fieldModalOpen}
        onOpenChange={setFieldModalOpen}
        field={fieldCommand}
        onSubmit={onFieldModalSubmit}
        initialValue={currentFieldValue}
      />

      {inferredModalField && (
        <FieldModal
          open={inferredModalOpen}
          onOpenChange={setInferredModalOpen}
          isInferred={true}
          fieldName={inferredModalField.fieldName}
          fieldLabel={inferredModalField.fieldLabel}
          currentValue={inferredModalField.value}
          reasoning={inferenceReasons[inferredModalField.fieldName]}
          confidence={inferenceConfidence[inferredModalField.fieldName]}
          onDelete={() => {
            onDeleteInferred(inferredModalField.fieldName)
            setInferredModalOpen(false)
          }}
          onSaveInferred={(value) => {
            onSaveInferred(inferredModalField.fieldName, value)
            setInferredModalOpen(false)
          }}
          onSaveKnown={(value) => {
            onSaveKnown(inferredModalField.fieldName, value)
            setInferredModalOpen(false)
          }}
          editor={editor}
        />
      )}

      <HelpModal open={helpModalOpen} onOpenChange={setHelpModalOpen} />
    </>
  )
}
