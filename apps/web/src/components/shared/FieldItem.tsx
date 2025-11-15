/**
 * Field Item Component
 *
 * Shared component for displaying a single field with name, value, confidence, and click handler.
 * Used by both CapturedFields (UserProfile) and PolicyFields (PolicySummary).
 *
 * Supports known vs inferred field styling:
 * - Known fields: normal color (#f5f5f5), info icon (ℹ️), entire row clickable
 * - Inferred fields: muted color (#a3a3a3), info icon (ℹ️) + dismiss button (✕), entire row clickable
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info, X } from 'lucide-react'

export interface FieldItemData {
  name: string
  value: string | number | boolean | undefined
  confidence?: number
  fieldKey: string
  category?: string // Optional category for grouping
  isInferred?: boolean // Whether field is inferred (vs explicitly extracted)
  inferenceReason?: string // Reasoning for inferred fields
}

interface FieldItemProps {
  field: FieldItemData
  onClick: (fieldKey: string, currentValue?: string | number | boolean) => void
  onDismiss?: (fieldKey: string) => void
}

export function FieldItem({ field, onClick, onDismiss }: FieldItemProps) {
  const showConfidence =
    field.isInferred && field.confidence !== undefined && field.confidence < 0.9
  const confidencePercent = field.confidence ? Math.round(field.confidence * 100) : 0

  // Text color based on known vs inferred
  const textColor = field.isInferred ? 'text-[#a3a3a3]' : 'text-[#f5f5f5]'
  const valueColor = field.isInferred
    ? 'text-[#a3a3a3] dark:text-[#a3a3a3]'
    : 'text-gray-700 dark:text-gray-300'

  // Tooltip content based on field type
  const tooltipContent = field.isInferred
    ? `${field.name} - Click to edit/dismiss`
    : `${field.name} - Click to edit`

  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center justify-between rounded-md p-1.5 text-left transition-all duration-200 ease-out hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={() => onClick(field.fieldKey, field.value)}
    >
      <div className="flex items-center gap-2">
        <span className={`text-field-name font-normal ${textColor}`}>{field.name}:</span>
        <span className={`text-field-value font-normal ${valueColor}`}>{String(field.value)}</span>
        {showConfidence && (
          <span className="text-xs italic text-[#737373]">({confidencePercent}%)</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          {/* Info icon with tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="opacity-60 transition-opacity hover:opacity-100"
                aria-label={tooltipContent}
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                {field.isInferred && field.inferenceReason ? field.inferenceReason : tooltipContent}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Dismiss button (only for inferred fields) */}
          {field.isInferred && onDismiss && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="opacity-60 transition-colors hover:text-[#ef4444] hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDismiss(field.fieldKey)
                  }}
                  aria-label="Dismiss inference"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Dismiss inference</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </button>
  )
}
