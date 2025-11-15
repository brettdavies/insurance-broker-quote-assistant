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

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { unifiedFieldMetadata } from '@repo/shared'
import type { UserProfile } from '@repo/shared'
import { Info, X } from 'lucide-react'
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
 * Helper function to group inferred fields by category
 *
 * Uses unified field metadata to determine category for each field.
 * Returns Map with category names as keys and field arrays as values.
 */
function groupFieldsByCategory(inferredFields: Partial<UserProfile>): Map<string, GroupedField[]> {
  const grouped = new Map<string, GroupedField[]>()

  for (const [fieldName, value] of Object.entries(inferredFields)) {
    const metadata = unifiedFieldMetadata[fieldName]
    if (!metadata) continue

    const category = metadata.category
    if (!grouped.has(category)) {
      grouped.set(category, [])
    }

    grouped.get(category)?.push({ fieldName, value, category })
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
}

/**
 * Individual inferred field row with interactive elements
 */
function InferredFieldRow({
  fieldName,
  value,
  reasoning,
  confidence,
  onDismiss,
  onEdit,
}: InferredFieldRowProps) {
  const metadata = unifiedFieldMetadata[fieldName]
  const label = metadata?.label || fieldName
  const formattedValue = formatFieldValue(value)
  const showConfidence = confidence < 0.9
  const confidencePercent = Math.round(confidence * 100)

  return (
    <div className="flex items-center gap-2 py-1 text-sm text-gray-400">
      <span className="select-none opacity-40">└─</span>
      <span className="font-normal">
        {label}: {formattedValue}
      </span>
      {showConfidence && (
        <span className="text-xs italic text-gray-500">({confidencePercent}%)</span>
      )}

      <TooltipProvider>
        {/* Info icon with reasoning tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="ml-1 opacity-60 transition-opacity hover:opacity-100"
              aria-label="Show inference reasoning"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{reasoning}</p>
          </TooltipContent>
        </Tooltip>

        {/* Dismiss button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="opacity-60 transition-colors hover:text-red-500 hover:opacity-100"
              onClick={onDismiss}
              aria-label="Dismiss inference"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Dismiss inference</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Edit/convert button */}
      <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={onEdit}>
        Click
      </Button>
    </div>
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

  // Category order (same as Captured Fields sidebar)
  const categoryOrder = [
    'Identity & Contact',
    'Location',
    'Product',
    'Household',
    'Vehicle',
    'Property',
    'Eligibility',
    'Premiums',
    'Details',
  ]

  return (
    <Card className="bg-gray-850 my-4 border-gray-700">
      <CardHeader className="cursor-pointer py-3" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="flex items-center justify-between text-base font-normal text-gray-300">
          <span>Inferred Fields</span>
          <span className="text-xs text-gray-500">{isExpanded ? '[−]' : '[+]'}</span>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3 pb-4">
          {categoryOrder.map((category) => {
            const fields = groupedFields.get(category) || []
            // Hide empty categories
            if (fields.length === 0) return null

            return (
              <div key={category} className="space-y-1">
                <h4 className="text-sm font-medium text-gray-400">{category}:</h4>
                {fields.map(({ fieldName, value }) => (
                  <InferredFieldRow
                    key={fieldName}
                    fieldName={fieldName}
                    value={value}
                    reasoning={inferenceReasons[fieldName] || 'No reasoning available'}
                    confidence={confidence[fieldName] || 0}
                    onDismiss={() => onDismiss(fieldName)}
                    onEdit={() => onEdit(fieldName, value)}
                  />
                ))}
              </div>
            )
          })}
        </CardContent>
      )}
    </Card>
  )
}
