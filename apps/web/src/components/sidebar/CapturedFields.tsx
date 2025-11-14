/**
 * Captured Fields Component
 *
 * Displays captured UserProfile fields organized by category.
 * Uses shared FieldItem and FieldsByCategory components for consistency.
 */

import { FieldsByCategory } from '@/components/shared/FieldsByCategory'
import { extractUserProfileFields, getUserProfileCategoryLabels } from '@/lib/field-extraction'
import type { UserProfile } from '@repo/shared'

interface CapturedFieldsProps {
  profile: UserProfile
  confidence?: Record<string, number>
  onFieldClick: (fieldKey: string, currentValue?: string | number | boolean) => void
  inferredFields?: Partial<UserProfile>
  inferenceReasons?: Record<string, string>
  onDismiss?: (fieldKey: string) => void
}

export function CapturedFields({
  profile,
  confidence,
  onFieldClick,
  inferredFields,
  inferenceReasons,
  onDismiss,
}: CapturedFieldsProps) {
  const fieldsByCategory = extractUserProfileFields(
    profile,
    confidence,
    inferredFields,
    inferenceReasons
  )
  const categoryLabels = getUserProfileCategoryLabels()

  return (
    <FieldsByCategory
      fieldsByCategory={fieldsByCategory}
      categoryLabels={categoryLabels}
      onFieldClick={onFieldClick}
      onDismiss={onDismiss}
      emptyMessage="No fields captured yet. Start typing to capture information."
      defaultOpenCategories={['identity', 'location', 'product', 'details']}
    />
  )
}
