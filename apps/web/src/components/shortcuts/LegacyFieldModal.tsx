/**
 * LegacyFieldModal Component
 *
 * Legacy mode FieldModal (slash command editing).
 * Single Responsibility: Legacy mode UI only
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { COMMAND_TO_FIELD_NAME, FIELD_METADATA, FIELD_TYPE } from '@/config/shortcuts'
import type { FieldCommand } from '@/hooks/useSlashCommands'
import {
  getEnumOptionsForCombobox,
  getInputTypeForField,
  getPlaceholderForField,
  unifiedFieldMetadata,
} from '@repo/shared'
import { FieldModalButtons } from './FieldModalButtons'
import { FieldModalInput } from './FieldModalInput'

interface LegacyFieldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  field: FieldCommand
  value: string
  error: string
  isNumericField: boolean
  handleNumericChange: (value: string) => void
  onChange: (value: string) => void
  onSubmit: () => void
  onEnterSelect?: (value: string) => void // Callback when Enter selects an item in Combobox
}

export function LegacyFieldModal({
  open,
  onOpenChange,
  field,
  value,
  error,
  isNumericField,
  handleNumericChange,
  onChange,
  onSubmit,
  onEnterSelect,
}: LegacyFieldModalProps) {
  const metadata = FIELD_METADATA[field]
  if (!metadata) return null

  // Get unified metadata to check for enum options
  // Use field directly if not in COMMAND_TO_FIELD_NAME (fields without shortcuts)
  const fieldName = COMMAND_TO_FIELD_NAME[field] || field
  const unifiedMetadata = unifiedFieldMetadata[fieldName]
  const hasOptions = Boolean(unifiedMetadata?.options && unifiedMetadata.options.length > 0)

  // If field has a shortcut, use it; otherwise use the normalized field name
  const shortcutKey =
    metadata.shortcut && metadata.shortcut.length > 0 ? metadata.shortcut : fieldName || field
  const shortcutPrefix = `${shortcutKey}:`

  const inputType = getInputTypeForField(field, FIELD_TYPE[field])
  const placeholder = getPlaceholderForField(field, FIELD_TYPE[field])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{metadata.label}</DialogTitle>
          <DialogDescription>{metadata.question}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FieldModalInput
            value={value}
            onChange={onChange}
            onEnterSelect={onEnterSelect}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Submit when Enter is pressed (either from typing or Combobox selection)
                if (value) {
                  onSubmit()
                }
              }
              if (e.key === 'Escape') {
                onOpenChange(false)
              }
            }}
            prefix={shortcutPrefix}
            fieldName={fieldName}
            fieldType={FIELD_TYPE[field] || 'string'}
            hasOptions={hasOptions}
            options={unifiedMetadata?.options}
            isNumericField={isNumericField}
            handleNumericChange={handleNumericChange}
          />
          {error && <div className="text-error text-sm">{error}</div>}
          <FieldModalButtons
            mode="legacy"
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
