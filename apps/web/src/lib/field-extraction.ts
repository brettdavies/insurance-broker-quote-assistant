/**
 * Field Extraction Utilities
 *
 * Shared utilities for extracting fields from different schemas (UserProfile, PolicySummary)
 * and organizing them by category for display in the sidebar.
 */

import type { FieldItemData } from '@/components/shared/FieldItem'
import { COMMAND_TO_FIELD_NAME, FIELD_METADATA } from '@/config/shortcuts'
import type { FieldCommand } from '@/config/shortcuts'
import type { PolicySummary } from '@repo/shared'
import { unifiedFieldMetadata } from '@repo/shared'
import type { UserProfile } from '@repo/shared'
import { userProfileFieldMetadata } from '@repo/shared'

/**
 * Category mapping for UserProfile fields
 */
const USER_PROFILE_CATEGORY_MAP: Record<string, string> = {
  'Identity & Contact': 'identity',
  Location: 'location',
  Product: 'product',
  Household: 'details',
  Vehicle: 'details',
  Property: 'details',
  Eligibility: 'details',
  Coverage: 'details',
}

const USER_PROFILE_CATEGORY_LABELS: Record<string, string> = {
  identity: 'Identity',
  location: 'Location',
  product: 'Product',
  details: 'Details',
}

/**
 * Extract fields from UserProfile and organize by category
 */
export function extractUserProfileFields(
  profile: UserProfile,
  confidence?: Record<string, number>,
  inferredFields?: Partial<UserProfile>,
  inferenceReasons?: Record<string, string>
): Record<string, FieldItemData[]> {
  const fieldsByCategory: Record<string, FieldItemData[]> = {
    identity: [],
    location: [],
    product: [],
    details: [],
  }

  // Track which fields we've already added (to avoid duplicates)
  const addedFields = new Set<string>()

  // First, iterate through all fields from UserProfile metadata (known fields)
  for (const [field, metadata] of Object.entries(userProfileFieldMetadata)) {
    const command = field as FieldCommand
    const fieldName = COMMAND_TO_FIELD_NAME[command]
    const fieldMetadata = FIELD_METADATA[command]

    if (!fieldName || !fieldMetadata) continue

    // Map metadata category to display category
    const displayCategory = USER_PROFILE_CATEGORY_MAP[metadata.category] || 'details'

    // Check if field exists in profile
    const profileValue = (profile as Record<string, unknown>)[fieldName]

    // Handle different value types
    if (profileValue !== undefined && profileValue !== null && profileValue !== '') {
      let displayValue: string | number | boolean = profileValue as string | number | boolean

      // Format boolean values
      if (typeof profileValue === 'boolean') {
        displayValue = profileValue ? 'Yes' : 'No'
      }

      // Determine if field is inferred (check if it exists in inferredFields object)
      const isInferred = inferredFields
        ? (inferredFields as Record<string, unknown>)[fieldName] !== undefined
        : false

      fieldsByCategory[displayCategory]?.push({
        name: fieldMetadata.label,
        value: displayValue,
        category: displayCategory,
        fieldKey: fieldName,
        confidence: confidence?.[fieldName],
        isInferred,
        inferenceReason: isInferred ? inferenceReasons?.[fieldName] : undefined,
      })

      addedFields.add(fieldName)
    }
  }

  // Second, iterate through inferredFields to add fields that are ONLY inferred (not in profile)
  if (inferredFields) {
    for (const [fieldName, inferredValue] of Object.entries(inferredFields)) {
      // Skip if already added (field exists in profile)
      if (addedFields.has(fieldName)) continue

      // Skip if value is invalid
      if (inferredValue === undefined || inferredValue === null || inferredValue === '') continue

      // Find metadata for this field
      // Try to find by field name in unifiedFieldMetadata
      const metadata = unifiedFieldMetadata[fieldName]
      if (!metadata) continue // Skip if no metadata found

      // Map metadata category to display category
      const displayCategory = USER_PROFILE_CATEGORY_MAP[metadata.category] || 'details'

      let displayValue: string | number | boolean = inferredValue as string | number | boolean

      // Format boolean values
      if (typeof inferredValue === 'boolean') {
        displayValue = inferredValue ? 'Yes' : 'No'
      }

      // This is an inferred-only field (not in profile)
      fieldsByCategory[displayCategory]?.push({
        name: metadata.label,
        value: displayValue,
        category: displayCategory,
        fieldKey: fieldName,
        confidence: confidence?.[fieldName],
        isInferred: true, // Always inferred if only in inferredFields
        inferenceReason: inferenceReasons?.[fieldName],
      })
    }
  }

  return fieldsByCategory
}

/**
 * Category mapping for PolicySummary fields
 * Maps unified metadata categories to display categories
 */
const POLICY_CATEGORY_MAP: Record<string, string> = {
  'Policy Information': 'policy',
  'Contact Information': 'policy', // User contact fields go in policy category
  Location: 'policy', // Location fields go in policy category
  Coverage: 'coverage',
  Deductibles: 'deductibles',
  Premiums: 'premiums',
  Dates: 'dates',
  Metadata: 'metadata', // Hidden category for confidence scores
}

/**
 * Category labels for PolicySummary display
 */
const POLICY_CATEGORY_LABELS: Record<string, string> = {
  policy: 'Policy Information',
  coverage: 'Coverage Limits',
  deductibles: 'Deductibles',
  premiums: 'Premiums',
  dates: 'Effective Dates',
}

/**
 * Extract fields from PolicySummary and organize by category
 * Uses unifiedFieldMetadata directly, filtering for policy flow fields
 * Handles nested objects (coverageLimits, deductibles, premiums, effectiveDates)
 */
export function extractPolicySummaryFields(
  summary: PolicySummary,
  confidence?: PolicySummary['confidence']
): Record<string, FieldItemData[]> {
  const fieldsByCategory: Record<string, FieldItemData[]> = {
    policy: [],
    coverage: [],
    deductibles: [],
    premiums: [],
    dates: [],
  }

  // Get all PolicySummary field keys
  const policyFields = Object.keys(summary) as Array<keyof PolicySummary>

  // Extract fields using unified metadata
  for (const fieldKey of policyFields) {
    if (fieldKey === 'confidence') continue // Skip confidence object

    const metadata = unifiedFieldMetadata[fieldKey as string]
    if (!metadata) continue // Skip if not in unified metadata

    // Only process fields that apply to policy flow
    if (!metadata.flows.includes('policy')) continue

    const value = summary[fieldKey]

    if (value === undefined || value === null) continue

    // Handle nested objects
    if (metadata.fieldType === 'object' && metadata.nestedFields) {
      const nestedObj = value as Record<string, unknown>
      const category = POLICY_CATEGORY_MAP[metadata.category] || 'policy'

      // Extract nested fields
      for (const [nestedKey, nestedMetadata] of Object.entries(metadata.nestedFields)) {
        const nestedValue = nestedObj[nestedKey]
        if (nestedValue !== undefined && nestedValue !== null) {
          const nestedCategory = POLICY_CATEGORY_MAP[nestedMetadata.category] || category
          fieldsByCategory[nestedCategory]?.push({
            name: nestedMetadata.label,
            value: nestedValue as string | number,
            category: nestedCategory,
            fieldKey: `${String(fieldKey)}.${nestedKey}`, // e.g., "coverageLimits.liability"
            confidence: confidence?.[fieldKey as keyof typeof confidence],
          })
        }
      }
    } else {
      // Handle flat fields
      const category = POLICY_CATEGORY_MAP[metadata.category] || 'policy'
      fieldsByCategory[category]?.push({
        name: metadata.label,
        value: value as string | number,
        category,
        fieldKey: String(fieldKey),
        confidence: confidence?.[fieldKey as keyof typeof confidence],
      })
    }
  }

  return fieldsByCategory
}

/**
 * Get category labels for UserProfile
 */
export function getUserProfileCategoryLabels(): Record<string, string> {
  return USER_PROFILE_CATEGORY_LABELS
}

/**
 * Get category labels for PolicySummary
 */
export function getPolicySummaryCategoryLabels(): Record<string, string> {
  return POLICY_CATEGORY_LABELS
}
