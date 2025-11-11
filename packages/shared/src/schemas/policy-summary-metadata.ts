import type { PolicySummary } from './policy-summary'

/**
 * Policy Summary Field Metadata
 *
 * UI metadata for PolicySummary fields including labels, categories, and field types.
 * Similar structure to UserProfile metadata for consistency.
 */

export interface PolicyFieldMetadata {
  label: string // Display label
  category: string // Category for grouping in UI
  fieldType: 'string' | 'number' | 'date' | 'object' // Field type for validation/display
  nestedFields?: Record<string, PolicyFieldMetadata> // For nested objects like coverageLimits
}

/**
 * Policy Summary Field Metadata Map
 *
 * Type-safe metadata for all PolicySummary fields and nested fields.
 */
export const policySummaryFieldMetadata: Record<keyof PolicySummary, PolicyFieldMetadata> = {
  carrier: {
    label: 'Carrier',
    category: 'Policy Information',
    fieldType: 'string',
  },
  state: {
    label: 'State',
    category: 'Policy Information',
    fieldType: 'string',
  },
  productType: {
    label: 'Product Type',
    category: 'Policy Information',
    fieldType: 'string',
  },
  coverageLimits: {
    label: 'Coverage Limits',
    category: 'Coverage',
    fieldType: 'object',
    nestedFields: {
      liability: { label: 'Liability', category: 'Coverage', fieldType: 'number' },
      propertyDamage: {
        label: 'Property Damage',
        category: 'Coverage',
        fieldType: 'number',
      },
      comprehensive: { label: 'Comprehensive', category: 'Coverage', fieldType: 'number' },
      collision: { label: 'Collision', category: 'Coverage', fieldType: 'number' },
      uninsuredMotorist: {
        label: 'Uninsured Motorist',
        category: 'Coverage',
        fieldType: 'number',
      },
      personalInjuryProtection: {
        label: 'Personal Injury Protection',
        category: 'Coverage',
        fieldType: 'number',
      },
      dwelling: { label: 'Dwelling', category: 'Coverage', fieldType: 'number' },
      personalProperty: {
        label: 'Personal Property',
        category: 'Coverage',
        fieldType: 'number',
      },
      lossOfUse: { label: 'Loss of Use', category: 'Coverage', fieldType: 'number' },
      medicalPayments: {
        label: 'Medical Payments',
        category: 'Coverage',
        fieldType: 'number',
      },
    },
  },
  deductibles: {
    label: 'Deductibles',
    category: 'Deductibles',
    fieldType: 'object',
    nestedFields: {
      auto: { label: 'Auto', category: 'Deductibles', fieldType: 'number' },
      home: { label: 'Home', category: 'Deductibles', fieldType: 'number' },
      comprehensive: {
        label: 'Comprehensive',
        category: 'Deductibles',
        fieldType: 'number',
      },
      collision: { label: 'Collision', category: 'Deductibles', fieldType: 'number' },
    },
  },
  premiums: {
    label: 'Premiums',
    category: 'Premiums',
    fieldType: 'object',
    nestedFields: {
      annual: { label: 'Annual', category: 'Premiums', fieldType: 'number' },
      monthly: { label: 'Monthly', category: 'Premiums', fieldType: 'number' },
      semiAnnual: { label: 'Semi-Annual', category: 'Premiums', fieldType: 'number' },
    },
  },
  effectiveDates: {
    label: 'Effective Dates',
    category: 'Dates',
    fieldType: 'object',
    nestedFields: {
      effectiveDate: { label: 'Effective Date', category: 'Dates', fieldType: 'date' },
      expirationDate: { label: 'Expiration Date', category: 'Dates', fieldType: 'date' },
    },
  },
  confidence: {
    label: 'Confidence',
    category: 'Metadata',
    fieldType: 'object',
  },
}

/**
 * Category mapping for PolicySummary fields
 * Maps metadata categories to display categories
 */
export const POLICY_CATEGORY_MAP: Record<string, string> = {
  'Policy Information': 'policy',
  Coverage: 'coverage',
  Deductibles: 'deductibles',
  Premiums: 'premiums',
  Dates: 'dates',
  Metadata: 'metadata', // Hidden category for confidence scores
}

/**
 * Category labels for PolicySummary display
 */
export const POLICY_CATEGORY_LABELS: Record<string, string> = {
  policy: 'Policy Information',
  coverage: 'Coverage Limits',
  deductibles: 'Deductibles',
  premiums: 'Premiums',
  dates: 'Effective Dates',
}
