/**
 * useUnifiedChatCallbacks Hook
 *
 * Manages callback handlers for content changes, field modal, and command errors.
 *
 * Single Responsibility: Callback handler creation only
 */

import type { toast as ToastFn } from '@/components/ui/use-toast'
import type { FieldCommand } from '@/hooks/useSlashCommands'
import { showFieldCapturedToast, showFieldRemovedToast } from '@/utils/toast-helpers'
import { unifiedFieldMetadata } from '@repo/shared'
import { useCallback } from 'react'

interface UseUnifiedChatCallbacksParams {
  editorContentRef: React.MutableRefObject<string>
  runInference: () => void
  onContentChange?: (content: string) => void
  toast: typeof ToastFn
  currentField: { key: string; value?: string | number | boolean } | null
  handleFieldModalSubmitBase: (fieldKey: string, value: string) => void
  setFieldModalOpen: (open: boolean) => void
  setCurrentField: (field: { key: string; value?: string | number | boolean } | null) => void
  onCommandError?: (command: string) => void
}

export function useUnifiedChatCallbacks({
  editorContentRef,
  runInference,
  onContentChange,
  toast,
  currentField,
  handleFieldModalSubmitBase,
  setFieldModalOpen,
  setCurrentField,
  onCommandError,
}: UseUnifiedChatCallbacksParams) {
  const handleContentChange = useCallback(
    (content: string) => {
      editorContentRef.current = content
      runInference()
      onContentChange?.(content)
    },
    [runInference, onContentChange, editorContentRef]
  )

  const handleFieldModalSubmit = useCallback(
    (value: string) => {
      if (currentField) {
        handleFieldModalSubmitBase(currentField.key, value)
        setFieldModalOpen(false)
        setCurrentField(null)
      }
    },
    [currentField, handleFieldModalSubmitBase, setFieldModalOpen, setCurrentField]
  )

  const handleCommandError = useCallback(
    (command: string) => {
      toast({
        title: 'Invalid command',
        description: `Command "/${command}" not found. Type /help for available commands.`,
        variant: 'destructive',
        duration: 3000,
      })
      onCommandError?.(command)
    },
    [toast, onCommandError]
  )

  const getFieldCommand = useCallback((): FieldCommand | null => {
    return currentField
      ? currentField.key in unifiedFieldMetadata
        ? (currentField.key as FieldCommand)
        : null
      : null
  }, [currentField])

  return {
    handleContentChange,
    handleFieldModalSubmit,
    handleCommandError,
    getFieldCommand,
  }
}
