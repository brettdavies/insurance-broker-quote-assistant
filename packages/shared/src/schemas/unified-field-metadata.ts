import type { PolicySummary } from './policy-summary'
import type { UserProfile } from './user-profile'

/**
 * Unified Field Metadata Schema
 *
 * Single source of truth for all field metadata across both intake and policy flows.
 * Ensures shared fields (e.g., name, state) use the same metadata regardless of flow.
 *
 * @see packages/shared/src/schemas/user-profile.ts
 * @see packages/shared/src/schemas/policy-summary.ts
 */

export interface UnifiedFieldMetadata {
  shortcut: string // Single character keyboard shortcut (e.g., 'n' for name)
  label: string // Display label
  question: string // Question prompt for conversational intake (optional for policy-only fields)
  description?: string // Concise field description for LLM schema (e.g., "Age in years" instead of "What is the age?")
  category: string // Category for grouping in UI
  fieldType: 'string' | 'numeric' | 'date' | 'object' | 'boolean' // Field type for validation/input
  aliases?: string[] // Optional aliases for field name (e.g., ['product'] for productLine)
  flows: ('intake' | 'policy')[] // Which flows this field applies to
  nestedFields?: Record<string, UnifiedFieldMetadata> // For nested objects (coverageLimits, deductibles, etc.)
  min?: number // Minimum value for numeric fields
  max?: number // Maximum value for numeric fields
}

/**
 * Unified Field Metadata Map
 *
 * Combines UserProfile and PolicySummary fields into a single metadata system.
 * Shared fields (name, state, etc.) use the same metadata for both flows.
 */
export const unifiedFieldMetadata: Record<string, UnifiedFieldMetadata> = {
  // ============================================================================
  // Shared Fields (used in both intake and policy flows)
  // ============================================================================

  name: {
    shortcut: 'n',
    label: 'Name',
    question: 'What is the name?',
    description: 'Full name',
    category: 'Identity & Contact',
    fieldType: 'string',
    flows: ['intake', 'policy'],
  },

  email: {
    shortcut: 'e',
    label: 'Email',
    question: 'What is the email address?',
    description: 'Email address',
    category: 'Identity & Contact',
    fieldType: 'string',
    flows: ['intake', 'policy'],
  },

  phone: {
    shortcut: 'p',
    label: 'Phone',
    question: 'What is the phone number?',
    description: 'Phone number',
    category: 'Identity & Contact',
    fieldType: 'string',
    flows: ['intake', 'policy'],
  },

  state: {
    shortcut: 's',
    label: 'State',
    question: 'What is the state?',
    description: 'US state code',
    category: 'Location',
    fieldType: 'string',
    flows: ['intake', 'policy'],
  },

  zip: {
    shortcut: 'z',
    label: 'Zip Code',
    question: 'What is the zip code?',
    description: 'Zip code',
    category: 'Location',
    fieldType: 'string',
    flows: ['intake', 'policy'],
  },

  address: {
    shortcut: '',
    label: 'Address',
    question: 'What is the address?',
    description: 'Street address',
    category: 'Location',
    fieldType: 'string',
    flows: ['intake', 'policy'],
  },

  // ============================================================================
  // Additional shared fields that are useful for policy analysis
  // ============================================================================

  age: {
    shortcut: 'a',
    label: 'Age',
    question: 'What is the age?',
    description: 'Age in years',
    category: 'Household',
    fieldType: 'numeric',
    flows: ['intake', 'policy'], // Used for age-based discounts and eligibility
    min: 0,
    max: 150,
  },

  cleanRecord3Yr: {
    shortcut: '3',
    label: 'Clean Record (3 Years)',
    question: 'Is there a clean driving record for the past 3 years?',
    description: 'Clean driving record for 3 years',
    category: 'Vehicle',
    fieldType: 'boolean',
    aliases: ['clean', 'cleanRecord', 'cleanrecord3yr'],
    flows: ['intake', 'policy'], // Used for safe driver discounts (very common)
  },

  cleanRecord5Yr: {
    shortcut: '5',
    label: 'Clean Record (5 Years)',
    question: 'Is there a clean driving record for the past 5 years?',
    description: 'Clean driving record for 5 years',
    category: 'Vehicle',
    fieldType: 'boolean',
    flows: ['intake', 'policy'], // Used for premium safe driver discounts
  },

  ownsHome: {
    shortcut: 'o',
    label: 'Owns Home',
    question: 'Does the client own a home?',
    description: 'Home ownership status',
    category: 'Property',
    fieldType: 'boolean',
    flows: ['intake', 'policy'], // Used for bundle discounts (auto+home)
  },

  creditScore: {
    shortcut: 'j',
    label: 'Credit Score',
    question: 'What is the credit score?',
    description: 'Credit score',
    category: 'Eligibility',
    fieldType: 'numeric',
    aliases: ['credit', 'score'],
    flows: ['intake', 'policy'], // Used for credit-based pricing
    min: 300,
    max: 850,
  },

  propertyType: {
    shortcut: 't',
    label: 'Property Type',
    question: 'What is the property type?',
    description: 'Property type',
    category: 'Property',
    fieldType: 'string',
    aliases: ['property', 'propertytype', 'prop'],
    flows: ['intake', 'policy'], // Used for home insurance analysis
  },

  yearBuilt: {
    shortcut: '',
    label: 'Year Built',
    question: 'What year was the property built?',
    description: 'Year property was built',
    category: 'Property',
    fieldType: 'numeric',
    flows: ['intake', 'policy'],
    min: 1800,
    max: 2100,
  },

  roofType: {
    shortcut: '',
    label: 'Roof Type',
    question: 'What is the roof type?',
    description: 'Roof type',
    category: 'Property',
    fieldType: 'string',
    flows: ['intake', 'policy'],
  },

  squareFeet: {
    shortcut: '',
    label: 'Square Feet',
    question: 'What is the square footage?',
    description: 'Square footage',
    category: 'Property',
    fieldType: 'numeric',
    flows: ['intake', 'policy'],
    min: 0,
  },

  vehicles: {
    shortcut: 'v',
    label: 'Vehicles',
    question: 'How many vehicles?',
    description: 'Number of vehicles',
    category: 'Vehicle',
    fieldType: 'numeric',
    aliases: ['c', 'car'], // c/car map to vehicles
    flows: ['intake', 'policy'], // Used for multi-vehicle discounts
    min: 0,
    max: 50,
  },

  drivers: {
    shortcut: 'r',
    label: 'Drivers',
    question: 'How many drivers?',
    description: 'Number of drivers',
    category: 'Vehicle',
    fieldType: 'numeric',
    flows: ['intake', 'policy'], // Used for multi-driver discounts
    min: 0,
    max: 20,
  },

  householdSize: {
    shortcut: 'h',
    label: 'Household Size',
    question: 'What is the household size?',
    description: 'Number of people in household',
    category: 'Household',
    fieldType: 'numeric',
    aliases: ['household', 'd', 'deps', 'dependents'], // d/deps/dependents map to householdSize
    flows: ['intake', 'policy'], // Used for family discounts and bundle analysis
    min: 0,
    max: 50,
  },

  // ============================================================================
  // Intake-Only Fields (UserProfile)
  // ============================================================================

  kids: {
    shortcut: 'k',
    label: 'Kids',
    question: 'How many kids?',
    description: 'Number of children',
    category: 'Household',
    fieldType: 'numeric',
    flows: ['intake'], // Less specific than householdSize
    min: 0,
    max: 20,
  },

  garage: {
    shortcut: 'g',
    label: 'Garage Type',
    question: 'What is the garage type?',
    description: 'Garage type',
    category: 'Vehicle',
    fieldType: 'string',
    flows: ['intake'],
  },

  vins: {
    shortcut: 'i',
    label: 'VINs',
    question: 'What are the VINs?',
    description: 'Vehicle identification numbers',
    category: 'Vehicle',
    fieldType: 'string',
    flows: ['intake'],
  },

  premiums: {
    shortcut: '',
    label: 'Premiums',
    question: '',
    category: 'Premiums',
    fieldType: 'object',
    flows: ['intake', 'policy'], // Unified field for both flows
    nestedFields: {
      annual: {
        shortcut: '',
        label: 'Annual',
        question: '',
        category: 'Premiums',
        fieldType: 'numeric',
        flows: ['intake', 'policy'],
        min: 0,
      },
      monthly: {
        shortcut: '',
        label: 'Monthly',
        question: '',
        category: 'Premiums',
        fieldType: 'numeric',
        flows: ['intake', 'policy'],
        min: 0,
      },
      semiAnnual: {
        shortcut: '',
        label: 'Semi-Annual',
        question: '',
        category: 'Premiums',
        fieldType: 'numeric',
        flows: ['intake', 'policy'],
        min: 0,
      },
    },
  },

  // ============================================================================
  // Policy-Only Fields (PolicySummary)
  // ============================================================================

  carrier: {
    shortcut: 'c',
    label: 'Carrier',
    question: 'What is the carrier?',
    description: 'Insurance carrier name',
    category: 'Policy Information',
    fieldType: 'string',
    flows: ['policy'],
  },

  productType: {
    shortcut: 'l',
    label: 'Product Type',
    question: 'What is the product type?',
    description: 'Insurance product type',
    category: 'Product',
    fieldType: 'string',
    aliases: ['product', 'productLine'], // productLine is deprecated, use productType
    flows: ['intake', 'policy'], // Unified field - same as productLine in intake
  },

  coverageLimits: {
    shortcut: '',
    label: 'Coverage Limits',
    question: '',
    category: 'Coverage',
    fieldType: 'object',
    flows: ['policy'],
    nestedFields: {
      liability: {
        shortcut: '',
        label: 'Liability',
        question: '',
        category: 'Coverage',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      propertyDamage: {
        shortcut: '',
        label: 'Property Damage',
        question: '',
        category: 'Coverage',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      comprehensive: {
        shortcut: '',
        label: 'Comprehensive',
        question: '',
        category: 'Coverage',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      collision: {
        shortcut: '',
        label: 'Collision',
        question: '',
        category: 'Coverage',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      uninsuredMotorist: {
        shortcut: '',
        label: 'Uninsured Motorist',
        question: '',
        category: 'Coverage',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      personalInjuryProtection: {
        shortcut: '',
        label: 'Personal Injury Protection',
        question: '',
        category: 'Coverage',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      dwelling: {
        shortcut: '',
        label: 'Dwelling',
        question: '',
        category: 'Coverage',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      personalProperty: {
        shortcut: '',
        label: 'Personal Property',
        question: '',
        category: 'Coverage',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      lossOfUse: {
        shortcut: '',
        label: 'Loss of Use',
        question: '',
        category: 'Coverage',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      medicalPayments: {
        shortcut: '',
        label: 'Medical Payments',
        question: '',
        category: 'Coverage',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
    },
  },

  deductibles: {
    shortcut: '',
    label: 'Deductibles',
    question: '',
    category: 'Deductibles',
    fieldType: 'object',
    flows: ['policy'],
    nestedFields: {
      auto: {
        shortcut: '',
        label: 'Auto',
        question: '',
        category: 'Deductibles',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      home: {
        shortcut: '',
        label: 'Home',
        question: '',
        category: 'Deductibles',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      comprehensive: {
        shortcut: '',
        label: 'Comprehensive',
        question: '',
        category: 'Deductibles',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
      collision: {
        shortcut: '',
        label: 'Collision',
        question: '',
        category: 'Deductibles',
        fieldType: 'numeric',
        flows: ['policy'],
        min: 0,
      },
    },
  },

  effectiveDates: {
    shortcut: '',
    label: 'Effective Dates',
    question: '',
    category: 'Dates',
    fieldType: 'object',
    flows: ['policy'],
    nestedFields: {
      effectiveDate: {
        shortcut: '',
        label: 'Effective Date',
        question: '',
        category: 'Dates',
        fieldType: 'date',
        flows: ['policy'],
      },
      expirationDate: {
        shortcut: '',
        label: 'Expiration Date',
        question: '',
        category: 'Dates',
        fieldType: 'date',
        flows: ['policy'],
      },
    },
  },
}

/**
 * Field definitions only - utilities are in unified-field-metadata-utils.ts
 *
 * @see packages/shared/src/schemas/unified-field-metadata-utils.ts
 */
