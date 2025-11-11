import type { UserProfile } from './user-profile'

/**
 * Field Metadata Schema
 *
 * UI metadata for UserProfile fields including keyboard shortcuts, labels,
 * questions, categories, and field types. This file ensures all schema fields
 * have corresponding UI metadata through TypeScript type checking.
 *
 * @see packages/shared/src/schemas/user-profile.ts
 */

export interface FieldMetadata {
  shortcut: string // Single character keyboard shortcut
  label: string // Display label
  question: string // Question prompt for conversational intake
  category: string // Category for grouping in UI
  fieldType: 'numeric' | 'string' // Field type for validation/input
  aliases?: string[] // Optional aliases for field name
}

/**
 * Field Metadata Map
 *
 * Type-safe metadata for all UserProfile fields. TypeScript ensures all schema
 * fields have corresponding metadata through the `satisfies` constraint.
 */
export const userProfileFieldMetadata = {
  // Contact information
  name: {
    shortcut: 'n',
    label: 'Name',
    question: 'What is the name?',
    category: 'Identity & Contact',
    fieldType: 'string',
  },
  email: {
    shortcut: 'e',
    label: 'Email',
    question: 'What is the email address?',
    category: 'Identity & Contact',
    fieldType: 'string',
  },
  phone: {
    shortcut: 'p',
    label: 'Phone',
    question: 'What is the phone number?',
    category: 'Identity & Contact',
    fieldType: 'string',
  },

  // Location
  state: {
    shortcut: 's',
    label: 'State',
    question: 'What is the state?',
    category: 'Location',
    fieldType: 'string',
  },
  zip: {
    shortcut: 'z',
    label: 'Zip Code',
    question: 'What is the zip code?',
    category: 'Location',
    fieldType: 'string',
  },

  // Product
  productLine: {
    shortcut: 'l',
    label: 'Product Line',
    question: 'What is the product line?',
    category: 'Product',
    fieldType: 'string',
    aliases: ['product'],
  },

  // Household
  age: {
    shortcut: 'a',
    label: 'Age',
    question: 'What is the age?',
    category: 'Household',
    fieldType: 'numeric',
  },
  householdSize: {
    shortcut: 'h',
    label: 'Household Size',
    question: 'What is the household size?',
    category: 'Household',
    fieldType: 'numeric',
    aliases: ['household'],
  },
  kids: {
    shortcut: 'k',
    label: 'Kids',
    question: 'How many kids?',
    category: 'Household',
    fieldType: 'numeric',
  },
  dependents: {
    shortcut: 'd',
    label: 'Dependents',
    question: 'How many dependents?',
    category: 'Household',
    fieldType: 'numeric',
    aliases: ['deps'],
  },

  // Vehicle
  vehicles: {
    shortcut: 'v',
    label: 'Vehicles',
    question: 'How many vehicles?',
    category: 'Vehicle',
    fieldType: 'numeric',
  },
  garage: {
    shortcut: 'g',
    label: 'Garage Type',
    question: 'What is the garage type?',
    category: 'Vehicle',
    fieldType: 'string',
  },
  vins: {
    shortcut: 'i',
    label: 'VINs',
    question: 'What are the VINs?',
    category: 'Vehicle',
    fieldType: 'string',
  },
  drivers: {
    shortcut: 'r',
    label: 'Drivers',
    question: 'How many drivers?',
    category: 'Vehicle',
    fieldType: 'numeric',
  },
  drivingRecords: {
    shortcut: 'c',
    label: 'Driving Records',
    question: 'What are the driving records?',
    category: 'Vehicle',
    fieldType: 'string',
  },
  cleanRecord3Yr: {
    shortcut: 'u',
    label: 'Clean Record',
    question: 'Is there a clean record?',
    category: 'Vehicle',
    fieldType: 'string',
  },

  // Eligibility
  creditScore: {
    shortcut: 'j',
    label: 'Credit Score',
    question: 'What is the credit score?',
    category: 'Eligibility',
    fieldType: 'numeric',
    aliases: ['credit', 'score'],
  },

  // Property
  ownsHome: {
    shortcut: 'o',
    label: 'Owns Home',
    question: 'Does the client own a home?',
    category: 'Property',
    fieldType: 'string',
    aliases: ['owns'],
  },
  propertyType: {
    shortcut: 't',
    label: 'Property Type',
    question: 'What is the property type?',
    category: 'Property',
    fieldType: 'string',
  },
  constructionYear: {
    shortcut: 'y',
    label: 'Construction Year',
    question: 'What is the construction year?',
    category: 'Property',
    fieldType: 'numeric',
  },
  roofType: {
    shortcut: 'f',
    label: 'Roof Type',
    question: 'What is the roof type?',
    category: 'Property',
    fieldType: 'string',
  },
  squareFeet: {
    shortcut: 'q',
    label: 'Square Feet',
    question: 'What is the square footage?',
    category: 'Property',
    fieldType: 'numeric',
  },

  // Coverage
  currentCarrier: {
    shortcut: '',
    label: 'Current Carrier',
    question: 'What is the current carrier?',
    category: 'Coverage',
    fieldType: 'string',
  },
  currentPremium: {
    shortcut: 'm',
    label: 'Current Premium',
    question: 'What is the current premium?',
    category: 'Coverage',
    fieldType: 'numeric',
  },
  deductibles: {
    shortcut: 'b',
    label: 'Deductibles',
    question: 'What are the deductibles?',
    category: 'Coverage',
    fieldType: 'string',
  },
  limits: {
    shortcut: 'x',
    label: 'Coverage Limits',
    question: 'What are the coverage limits?',
    category: 'Coverage',
    fieldType: 'string',
  },
  existingPolicies: {
    shortcut: 'w',
    label: 'Existing Policies',
    question: 'What are the existing policies?',
    category: 'Coverage',
    fieldType: 'string',
  },
} satisfies Record<keyof UserProfile, FieldMetadata>

/**
 * Get metadata for a specific field
 */
export function getFieldMetadata(field: keyof UserProfile): FieldMetadata {
  return userProfileFieldMetadata[field]
}

/**
 * Get all field names that have shortcuts
 */
export function getFieldsWithShortcuts(): Array<keyof UserProfile> {
  return Object.entries(userProfileFieldMetadata)
    .filter(([, metadata]) => metadata.shortcut !== '')
    .map(([field]) => field as keyof UserProfile)
}

/**
 * Get shortcut key for a field
 */
export function getFieldShortcut(field: keyof UserProfile): string | undefined {
  const metadata = userProfileFieldMetadata[field]
  return metadata.shortcut || undefined
}

/**
 * Get field name from shortcut key
 */
export function getFieldFromShortcut(shortcut: string): keyof UserProfile | undefined {
  const entry = Object.entries(userProfileFieldMetadata).find(
    ([, metadata]) => metadata.shortcut === shortcut
  )
  return entry ? (entry[0] as keyof UserProfile) : undefined
}

/**
 * Get field name from alias
 */
export function getFieldFromAlias(alias: string): keyof UserProfile | undefined {
  for (const [field, metadata] of Object.entries(userProfileFieldMetadata) as Array<
    [keyof UserProfile, FieldMetadata]
  >) {
    if (metadata.aliases?.includes(alias)) {
      return field
    }
  }
  return undefined
}
