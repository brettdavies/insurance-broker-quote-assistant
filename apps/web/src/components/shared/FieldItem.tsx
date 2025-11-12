/**
 * Field Item Component
 *
 * Shared component for displaying a single field with name, value, confidence, and click handler.
 * Used by both CapturedFields (UserProfile) and PolicyFields (PolicySummary).
 */

import { Info } from 'lucide-react'

export interface FieldItemData {
  name: string
  value: string | number | boolean | undefined
  confidence?: number
  fieldKey: string
  category?: string // Optional category for grouping
}

interface FieldItemProps {
  field: FieldItemData
  onClick: (fieldKey: string, currentValue?: string | number | boolean) => void
}

export function FieldItem({ field, onClick }: FieldItemProps) {
  return (
    <button
      key={field.fieldKey}
      type="button"
      onClick={() => onClick(field.fieldKey, field.value)}
      className="flex w-full cursor-pointer items-center justify-between rounded-md p-2 text-left transition-all duration-200 ease-out hover:scale-[1.02] hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <div className="flex items-center gap-2">
        <span className="text-field-name font-semibold">{field.name}:</span>
        <span className="text-field-value text-gray-700 dark:text-gray-300">
          {String(field.value)}
        </span>
        {field.confidence !== undefined && (
          <span className="text-confidence text-xs italic text-gray-500 dark:text-gray-400">
            ({Math.round(field.confidence * 100)}%)
          </span>
        )}
      </div>
      <Info className="h-4 w-4 text-gray-400 dark:text-gray-500" />
    </button>
  )
}
