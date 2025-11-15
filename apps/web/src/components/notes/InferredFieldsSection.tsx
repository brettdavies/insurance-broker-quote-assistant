/**
 * Inferred Fields Section Component
 *
 * Displays inferred fields separately from known fields below the notes textbox.
 * Part of the "known vs inferred pills" architecture (Epic 4: Field Extraction Bulletproofing).
 *
 * Features:
 * - Hides entirely if no inferred fields
 * - Groups fields by category (Identity, Location, Product, Details)
 * - Shows confidence scores if < 90%
 * - Interactive elements: info tooltip, dismiss button, edit button
 * - Collapsible card (default: expanded)
 *
 * @see docs/architecture/field-extraction-bulletproofing.md
 * @see docs/stories/4.3.add-inferred-fields-section.md
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { USER_PROFILE_CATEGORY_ORDER, getUserProfileCategoryLabels } from '@/lib/field-extraction'
import { unifiedFieldMetadata } from '@repo/shared'
import type { UserProfile } from '@repo/shared'
import { Check, Info, X } from 'lucide-react'
import { useMemo, useState } from 'react'

export interface InferredFieldsSectionProps {
  /** Inferred field values */
  inferredFields: Partial<UserProfile>
  /** Reasoning for each inferred field */
  inferenceReasons: Record<string, string>
  /** Confidence scores for each field (0-1 scale) */
  confidence: Record<string, number>
  /** Callback when user dismisses an inferred field */
  onDismiss: (fieldName: string) => void
  /** Callback when user clicks to edit an inferred field (opens modal) */
  onEdit: (fieldName: string, value: unknown) => void
  /** Callback when user converts inferred field to known field */
  onConvertToKnown: (fieldName: string, value: unknown) => void
}

interface GroupedField {
  fieldName: string
  value: unknown
  category: string
}

/**
 * Helper function to group inferred fields by display category
 *
 * Uses unified field metadata to determine category for each field,
 * then maps to display categories (identity, location, product, details)
 * to match CapturedFields ordering.
 */
function groupFieldsByCategory(inferredFields: Partial<UserProfile>): Map<string, GroupedField[]> {
  const grouped = new Map<string, GroupedField[]>()

  // Map from metadata categories to display categories (matching CapturedFields)
  const categoryMap: Record<string, string> = {
    'Identity & Contact': 'identity',
    Location: 'location',
    Product: 'product',
    Household: 'details',
    Vehicle: 'details',
    Property: 'details',
    Eligibility: 'details',
    Coverage: 'details',
  }

  for (const [fieldName, value] of Object.entries(inferredFields)) {
    const metadata = unifiedFieldMetadata[fieldName]
    if (!metadata) continue

    const metadataCategory = metadata.category
    const displayCategory = categoryMap[metadataCategory] || 'details'

    if (!grouped.has(displayCategory)) {
      grouped.set(displayCategory, [])
    }

    grouped.get(displayCategory)?.push({ fieldName, value, category: displayCategory })
  }

  return grouped
}

/**
 * Helper function to format field value for display
 */
function formatFieldValue(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  return String(value)
}

interface InferredFieldRowProps {
  fieldName: string
  value: unknown
  reasoning: string
  confidence: number
  onDismiss: () => void
  onEdit: () => void
  onConvertToKnown: () => void
}

/**
 * Individual inferred field row with interactive elements
 * Entire row is clickable
 */
function InferredFieldRow({
  fieldName,
  value,
  reasoning,
  confidence,
  onDismiss,
  onEdit,
  onConvertToKnown,
}: InferredFieldRowProps) {
  const metadata = unifiedFieldMetadata[fieldName]
  const label = metadata?.label || fieldName
  const formattedValue = formatFieldValue(value)
  const showConfidence = confidence < 0.9
  const confidencePercent = Math.round(confidence * 100)

  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center justify-between rounded-md p-1.5 text-left text-sm transition-all duration-200 ease-out hover:bg-gray-100 dark:hover:bg-gray-700"
      onClick={() => onEdit()}
    >
      <div className="flex items-center gap-2">
        <span className="select-none opacity-40">└─</span>
        <span className="font-normal text-gray-400">
          {label}: {formattedValue}
        </span>
        {showConfidence && (
          <span className="text-xs italic text-gray-500">({confidencePercent}%)</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          {/* Info icon with reasoning tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="cursor-pointer opacity-60 transition-opacity hover:opacity-100"
                aria-label="Show inference reasoning"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    e.preventDefault()
                  }
                }}
                // biome-ignore lint/a11y/useSemanticElements: Using div to avoid nested button warning
                role="button"
                tabIndex={0}
              >
                <Info className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{reasoning}</p>
            </TooltipContent>
          </Tooltip>

          {/* Dismiss button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="cursor-pointer opacity-60 transition-colors hover:text-red-500 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onDismiss()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    e.preventDefault()
                    onDismiss()
                  }
                }}
                aria-label="Dismiss inference"
                // biome-ignore lint/a11y/useSemanticElements: Using div to avoid nested button warning
                role="button"
                tabIndex={0}
              >
                <X className="h-3.5 w-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Dismiss inference</p>
            </TooltipContent>
          </Tooltip>

          {/* Convert to known button (tick icon) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="cursor-pointer opacity-60 transition-colors hover:text-green-500 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onConvertToKnown()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    e.preventDefault()
                    onConvertToKnown()
                  }
                }}
                aria-label="Convert to known field"
                // biome-ignore lint/a11y/useSemanticElements: Using div to avoid nested button warning
                role="button"
                tabIndex={0}
              >
                <Check className="h-3.5 w-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Convert to known field</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </button>
  )
}

/**
 * Inferred Fields Section Component
 *
 * Displays inferred fields in a collapsible card, grouped by category.
 * Hides entirely if no inferred fields exist.
 */
export function InferredFieldsSection({
  inferredFields,
  inferenceReasons,
  confidence,
  onDismiss,
  onEdit,
  onConvertToKnown,
}: InferredFieldsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Group fields by category (memoized to avoid re-computing on every render)
  // MUST be called before early return to satisfy Rules of Hooks
  const groupedFields = useMemo(() => groupFieldsByCategory(inferredFields), [inferredFields])

  // Hide section if no inferred fields
  if (Object.keys(inferredFields).length === 0) {
    return null
  }

  // Use shared category order and labels (same as CapturedFields)
  const categoryOrder = USER_PROFILE_CATEGORY_ORDER
  const categoryLabels = getUserProfileCategoryLabels()

  return (
    <Card className="bg-gray-850 my-4 border-gray-700">
      <CardHeader className="cursor-pointer py-3" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="flex items-center justify-between text-base font-normal text-gray-300">
          <span>Inferred Fields</span>
          <span className="text-xs text-gray-500">{isExpanded ? '[−]' : '[+]'}</span>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-4">
            {categoryOrder.map((category) => {
              const fields = groupedFields.get(category) || []
              // Hide empty categories
              if (fields.length === 0) return null

              return (
                <div key={category} className="min-w-[200px] flex-1 space-y-1">
                  <h4 className="text-sm font-medium text-gray-400">{categoryLabels[category]}:</h4>
                  {fields.map(({ fieldName, value }) => (
                    <InferredFieldRow
                      key={fieldName}
                      fieldName={fieldName}
                      value={value}
                      reasoning={inferenceReasons[fieldName] || 'No reasoning available'}
                      confidence={confidence[fieldName] || 0}
                      onDismiss={() => onDismiss(fieldName)}
                      onEdit={() => onEdit(fieldName, value)}
                      onConvertToKnown={() => onConvertToKnown(fieldName, value)}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
