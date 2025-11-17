/**
 * FieldModalButtons Component
 *
 * Button layout for FieldModal.
 * Single Responsibility: Button UI rendering only
 */

import { Button } from '@/components/ui/button'

interface FieldModalButtonsProps {
  mode: 'legacy' | 'inferred'
  onCancel: () => void
  onSubmit?: () => void
  onDelete?: () => void
  onSaveInferred?: () => void
  onSaveKnown?: () => void
  saveInferredDisabled?: boolean
}

export function FieldModalButtons({
  mode,
  onCancel,
  onSubmit,
  onDelete,
  onSaveInferred,
  onSaveKnown,
  saveInferredDisabled = false,
}: FieldModalButtonsProps) {
  if (mode === 'legacy') {
    return (
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>Submit</Button>
      </div>
    )
  }

  // Inferred mode: 3-button layout
  return (
    <div className="flex justify-end gap-2 border-t border-gray-700 pt-3">
      <Button variant="destructive" onClick={onDelete}>
        Delete
      </Button>
      <Button variant="secondary" onClick={onSaveInferred} disabled={saveInferredDisabled}>
        Save Inferred
      </Button>
      <Button variant="default" onClick={onSaveKnown}>
        Save Known
      </Button>
    </div>
  )
}
