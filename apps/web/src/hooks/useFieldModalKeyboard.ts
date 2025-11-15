/**
 * useFieldModalKeyboard Hook
 *
 * Handles keyboard shortcuts for FieldModal (inferred mode only).
 * Single Responsibility: Keyboard event handling only
 */

import { useEffect } from 'react'

interface UseFieldModalKeyboardParams {
  open: boolean
  isInferred: boolean
  value: string
  currentValue?: unknown
  handleDelete: () => void
  handleSaveInferred: () => void
  handleSaveKnown: () => void
}

/**
 * Hook for FieldModal keyboard shortcuts
 *
 * @param params - Keyboard handler parameters
 */
export function useFieldModalKeyboard({
  open,
  isInferred,
  value,
  currentValue,
  handleDelete,
  handleSaveInferred,
  handleSaveKnown,
}: UseFieldModalKeyboardParams): void {
  useEffect(() => {
    if (!open || !isInferred) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key: Trigger [Delete] button (inferred only)
      if (e.key === 'Delete') {
        e.preventDefault()
        handleDelete()
      }

      // Cmd+S or Enter: Trigger [Save Inferred] (inferred only, if value changed)
      if ((e.metaKey && e.key === 's') || e.key === 'Enter') {
        if (value !== String(currentValue ?? '')) {
          e.preventDefault()
          handleSaveInferred()
        }
      }

      // Cmd+Shift+S: Trigger [Save Known] (inferred only)
      if (e.metaKey && e.shiftKey && e.key === 's') {
        e.preventDefault()
        handleSaveKnown()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isInferred, value, currentValue, handleDelete, handleSaveInferred, handleSaveKnown])
}
