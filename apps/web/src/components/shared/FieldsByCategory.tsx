/**
 * Fields By Category Component
 *
 * Shared component for displaying fields organized by category in an Accordion.
 * Used by both CapturedFields (UserProfile) and PolicyFields (PolicySummary).
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import type { FieldItemData } from './FieldItem'
import { FieldItem } from './FieldItem'

export interface FieldsByCategoryProps {
  fieldsByCategory: Record<string, FieldItemData[]>
  categoryLabels: Record<string, string>
  onFieldClick: (fieldKey: string, currentValue?: string | number | boolean) => void
  emptyMessage?: string
  defaultOpenCategories?: string[]
}

export function FieldsByCategory({
  fieldsByCategory,
  categoryLabels,
  onFieldClick,
  emptyMessage = 'No fields captured yet.',
  defaultOpenCategories,
}: FieldsByCategoryProps) {
  const totalFields = Object.values(fieldsByCategory).reduce(
    (sum, fields) => sum + fields.length,
    0
  )

  if (totalFields === 0) {
    return (
      <Card className="border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  // Determine default open categories
  const defaultOpen = defaultOpenCategories || Object.keys(categoryLabels)

  return (
    <Accordion type="multiple" defaultValue={defaultOpen}>
      {Object.entries(fieldsByCategory).map(([category, fields]) => {
        if (fields.length === 0) return null

        return (
          <AccordionItem key={category} value={category}>
            <AccordionTrigger className="text-field-name font-semibold">
              {categoryLabels[category]} ({fields.length})
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {fields.map((field) => (
                  <FieldItem key={field.fieldKey} field={field} onClick={onFieldClick} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
