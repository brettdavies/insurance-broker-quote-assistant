/**
 * InferredFieldModal Component
 *
 * Inferred mode FieldModal (3-button layout with reasoning/confidence).
 * Single Responsibility: Inferred mode UI only
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getEnumOptionsForCombobox, unifiedFieldMetadata } from '@repo/shared'
import { FieldModalButtons } from './FieldModalButtons'
import { FieldModalInput } from './FieldModalInput'

interface InferredFieldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fieldName?: string
  fieldLabel?: string
  value: string
  error: string
  isNumericField: boolean
  handleNumericChange: (value: string) => void
  onChange: (value: string) => void
  reasoning?: string
  confidence?: number
  currentValue?: unknown
  onDelete?: () => void
  onSaveInferred?: () => void
  onSaveKnown?: () => void
}

export function InferredFieldModal({
  open,
  onOpenChange,
  fieldName,
  fieldLabel,
  value,
  error,
  isNumericField,
  handleNumericChange,
  onChange,
  reasoning,
  confidence,
  currentValue,
  onDelete,
  onSaveInferred,
  onSaveKnown,
}: InferredFieldModalProps) {
  const title = fieldLabel ? `${fieldLabel} (Inferred)` : 'Edit Field'
  const showConfidence = confidence !== undefined && confidence < 0.9

  // Get unified metadata to check for enum options
  const unifiedMetadata = fieldName ? unifiedFieldMetadata[fieldName] : null
  const hasOptions = Boolean(unifiedMetadata?.options && unifiedMetadata.options.length > 0)

  // If field has a shortcut, use it; otherwise use the normalized field name
  const shortcutKey =
    unifiedMetadata?.shortcut && unifiedMetadata.shortcut.length > 0
      ? unifiedMetadata.shortcut
      : fieldName || ''
  const shortcutPrefix = `${shortcutKey}:`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <FieldModalInput
            value={value}
            onChange={onChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (value !== String(currentValue ?? '')) {
                  onSaveInferred?.()
                }
              }
              if (e.key === 'Escape') {
                onOpenChange(false)
              }
            }}
            prefix={shortcutPrefix}
            fieldName={fieldName}
            fieldType={unifiedMetadata?.fieldType || 'string'}
            hasOptions={hasOptions}
            options={unifiedMetadata?.options}
            isNumericField={isNumericField}
            handleNumericChange={handleNumericChange}
          />

          {/* Reasoning section (inferred only) */}
          {reasoning && (
            <div className="space-y-2 border-t border-gray-700 pt-3">
              <p className="text-sm font-bold">Reasoning:</p>
              <p className="text-sm text-[#a3a3a3]">{reasoning}</p>
            </div>
          )}

          {/* Confidence section (inferred only, if <90%) */}
          {showConfidence && (
            <div className="border-t border-gray-700 pt-2">
              <p className="text-xs italic text-[#737373]">
                Confidence: {Math.round(confidence * 100)}%
              </p>
            </div>
          )}

          {error && <div className="text-error text-sm">{error}</div>}

          <FieldModalButtons
            mode="inferred"
            onCancel={() => onOpenChange(false)}
            onDelete={onDelete}
            onSaveInferred={onSaveInferred}
            onSaveKnown={onSaveKnown}
            saveInferredDisabled={value === String(currentValue ?? '')}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
