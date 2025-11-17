/**
 * Policy Fields Component
 *
 * Displays captured PolicySummary fields organized by category.
 * Uses shared FieldItem and FieldsByCategory components for consistency with CapturedFields.
 */

import { FieldsByCategory } from '@/components/shared/FieldsByCategory'
import { extractPolicySummaryFields, getPolicySummaryCategoryLabels } from '@/lib/field-extraction'
import type { PolicySummary } from '@repo/shared'

interface PolicyFieldsProps {
  policySummary: PolicySummary
  onFieldClick: (fieldKey: string, currentValue?: string | number | boolean) => void
}

export function PolicyFields({ policySummary, onFieldClick }: PolicyFieldsProps) {
  const fieldsByCategory = extractPolicySummaryFields(policySummary, policySummary.confidence)
  const categoryLabels = getPolicySummaryCategoryLabels()

  return (
    <FieldsByCategory
      fieldsByCategory={fieldsByCategory}
      categoryLabels={categoryLabels}
      onFieldClick={onFieldClick}
      emptyMessage="No policy fields extracted yet. Upload a policy document to extract information."
      defaultOpenCategories={['policy', 'coverage', 'deductibles', 'premiums', 'dates']}
    />
  )
}
