/**
 * FieldModalInput Component
 *
 * Input component for FieldModal with prefix display.
 * Single Responsibility: Input UI rendering only
 */

import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import {
  getEnumOptionsForCombobox,
  getInputTypeForField,
  getPlaceholderForField,
} from '@repo/shared'
import type { UnifiedFieldMetadata } from '@repo/shared'

interface FieldModalInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  onEnterSelect?: (value: string) => void // Callback when Enter selects an item in Combobox
  prefix: string
  fieldName?: string
  fieldType?: string
  hasOptions: boolean
  options?: string[]
  isNumericField: boolean
  handleNumericChange?: (value: string) => void
}

export function FieldModalInput({
  value,
  onChange,
  onKeyDown,
  onEnterSelect,
  prefix,
  fieldName,
  fieldType,
  hasOptions,
  options,
  isNumericField,
  handleNumericChange,
}: FieldModalInputProps) {
  // Boolean fields should use combobox with true/false options
  const isBooleanField = fieldType === 'boolean'
  const booleanOptions: string[] = ['true', 'false']

  // Use combobox if field has enum options OR is a boolean field
  const shouldUseCombobox = hasOptions || isBooleanField
  const comboboxOptions: ComboboxOption[] = shouldUseCombobox
    ? isBooleanField
      ? getEnumOptionsForCombobox(fieldName, booleanOptions)
      : getEnumOptionsForCombobox(fieldName, options)
    : []

  return (
    <div className="flex items-center rounded-md border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800">
      <span className="px-3 py-2 font-mono text-sm text-gray-500 dark:text-gray-400">{prefix}</span>
      {shouldUseCombobox ? (
        <Combobox
          options={comboboxOptions}
          value={value}
          onChange={onChange}
          onEnterSelect={onEnterSelect}
          placeholder="Type to search..."
          className="border-0 focus-visible:ring-0"
          autoFocus
          onKeyDown={onKeyDown}
        />
      ) : (
        <Input
          type={
            isNumericField
              ? 'text'
              : fieldName && fieldType
                ? getInputTypeForField(fieldName, fieldType)
                : 'text'
          }
          value={value}
          onChange={(e) => {
            if (isNumericField && handleNumericChange) {
              handleNumericChange(e.target.value)
            } else {
              onChange(e.target.value)
            }
          }}
          placeholder={fieldName && fieldType ? getPlaceholderForField(fieldName, fieldType) : ''}
          className="border-0 focus-visible:ring-0"
          autoFocus
          onKeyDown={onKeyDown}
        />
      )}
    </div>
  )
}
