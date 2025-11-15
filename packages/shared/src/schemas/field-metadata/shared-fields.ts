import type { UnifiedFieldMetadata } from '../unified-field-metadata'

/**
 * Shared Field Metadata
 *
 * Fields used in both intake and policy flows.
 * These fields have consistent metadata across both flows.
 */

export const sharedFields: Record<string, UnifiedFieldMetadata> = {
  name: {
    shortcut: 'n',
    label: 'Name',
    question: 'What is the name?',
    description: 'Full name',
    category: 'Identity & Contact',
    fieldType: 'string',
    flows: ['intake', 'policy'],
    singleInstance: true,
  },

  email: {
    shortcut: 'e',
    label: 'Email',
    question: 'What is the email address?',
    description: 'Email address',
    category: 'Identity & Contact',
    fieldType: 'string',
    flows: ['intake', 'policy'],
    singleInstance: true,
  },

  phone: {
    shortcut: 'p',
    label: 'Phone',
    question: 'What is the phone number?',
    description: 'Phone number',
    category: 'Identity & Contact',
    fieldType: 'string',
    flows: ['intake', 'policy'],
    singleInstance: true,
  },

  state: {
    shortcut: 's',
    label: 'State',
    question: 'What is the state?',
    description: 'US state code',
    category: 'Location',
    fieldType: 'string',
    flows: ['intake', 'policy'],
    singleInstance: true,
    options: [
      'AL',
      'AK',
      'AZ',
      'AR',
      'CA',
      'CO',
      'CT',
      'DE',
      'FL',
      'GA',
      'HI',
      'ID',
      'IL',
      'IN',
      'IA',
      'KS',
      'KY',
      'LA',
      'ME',
      'MD',
      'MA',
      'MI',
      'MN',
      'MS',
      'MO',
      'MT',
      'NE',
      'NV',
      'NH',
      'NJ',
      'NM',
      'NY',
      'NC',
      'ND',
      'OH',
      'OK',
      'OR',
      'PA',
      'RI',
      'SC',
      'SD',
      'TN',
      'TX',
      'UT',
      'VT',
      'VA',
      'WA',
      'WV',
      'WI',
      'WY',
      'DC',
    ],
  },

  zip: {
    shortcut: 'z',
    label: 'Zip Code',
    question: 'What is the zip code?',
    description: 'Zip code',
    category: 'Location',
    fieldType: 'string',
    flows: ['intake', 'policy'],
    singleInstance: true,
  },

  address: {
    shortcut: '',
    label: 'Address',
    question: 'What is the address?',
    description: 'Street address',
    category: 'Location',
    fieldType: 'string',
    flows: ['intake', 'policy'],
    singleInstance: true,
  },

  age: {
    shortcut: 'a',
    label: 'Age',
    question: 'What is the age?',
    description: 'Age in years',
    category: 'Household',
    fieldType: 'numeric',
    flows: ['intake', 'policy'],
    min: 0,
    max: 150,
    singleInstance: true,
  },

  cleanRecord3Yr: {
    shortcut: '3',
    label: 'Clean Record (3 Years)',
    question: 'Is there a clean driving record for the past 3 years?',
    description: 'Clean driving record for 3 years',
    category: 'Vehicle',
    fieldType: 'boolean',
    aliases: ['clean', 'cleanRecord', 'cleanrecord3yr'],
    flows: ['intake', 'policy'],
    singleInstance: true,
  },

  cleanRecord5Yr: {
    shortcut: '5',
    label: 'Clean Record (5 Years)',
    question: 'Is there a clean driving record for the past 5 years?',
    description: 'Clean driving record for 5 years',
    category: 'Vehicle',
    fieldType: 'boolean',
    flows: ['intake', 'policy'],
    singleInstance: true,
  },

  ownsHome: {
    shortcut: 'o',
    label: 'Owns Home',
    question: 'Does the client own a home?',
    description: 'Home ownership status',
    category: 'Property',
    fieldType: 'boolean',
    flows: ['intake', 'policy'],
    singleInstance: true,
  },

  creditScore: {
    shortcut: 'j',
    label: 'Credit Score',
    question: 'What is the credit score?',
    description: 'Credit score',
    category: 'Eligibility',
    fieldType: 'numeric',
    aliases: ['credit', 'score'],
    flows: ['intake', 'policy'],
    min: 300,
    max: 850,
    singleInstance: true,
  },

  propertyType: {
    shortcut: 't',
    label: 'Property Type',
    question: 'What is the property type?',
    description: 'Property type',
    category: 'Property',
    fieldType: 'string',
    aliases: ['property', 'propertytype', 'prop'],
    flows: ['intake', 'policy'],
    singleInstance: true,
    options: ['single-family', 'condo', 'townhouse', 'mobile-home', 'duplex', 'apartment'],
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
    singleInstance: true,
  },

  roofType: {
    shortcut: '',
    label: 'Roof Type',
    question: 'What is the roof type?',
    description: 'Roof type',
    category: 'Property',
    fieldType: 'string',
    flows: ['intake', 'policy'],
    singleInstance: true,
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
    max: 20000,
    singleInstance: true,
  },

  vehicles: {
    shortcut: 'v',
    label: 'Vehicles',
    question: 'How many vehicles?',
    description: 'Number of vehicles',
    category: 'Vehicle',
    fieldType: 'numeric',
    aliases: ['c', 'car'],
    flows: ['intake', 'policy'],
    min: 0,
    max: 50,
    singleInstance: true,
  },

  drivers: {
    shortcut: 'r',
    label: 'Drivers',
    question: 'How many drivers?',
    description: 'Number of drivers',
    category: 'Vehicle',
    fieldType: 'numeric',
    flows: ['intake', 'policy'],
    min: 0,
    max: 20,
    singleInstance: true,
    // Field-to-field inference: drivers → householdSize
    infers: [
      {
        targetField: 'householdSize',
        inferValue: (drivers: number) => {
          // Infer householdSize = drivers (assuming drivers = household size)
          if (typeof drivers === 'number' && drivers >= 0) {
            return drivers
          }
          return undefined
        },
        confidence: 'medium',
        reasoning: 'Number of drivers typically equals household size',
      },
    ],
  },

  householdSize: {
    shortcut: 'h',
    label: 'Household Size',
    question: 'What is the household size?',
    description: 'Number of people in household',
    category: 'Household',
    fieldType: 'numeric',
    aliases: ['household', 'd', 'deps', 'dependents'],
    flows: ['intake', 'policy'],
    min: 0,
    max: 50,
    singleInstance: true,
  },

  productType: {
    shortcut: 'l',
    label: 'Product Type',
    question: 'What is the product type?',
    description: 'Insurance product type',
    category: 'Product',
    fieldType: 'string',
    aliases: ['product', 'productLine'],
    flows: ['intake', 'policy'],
    options: ['auto', 'home', 'renters', 'umbrella'],
    // Field-to-field inference: productType → ownsHome
    // Part of known vs inferred pills architecture (Epic 4: Field Extraction Bulletproofing)
    infers: [
      {
        targetField: 'ownsHome',
        inferValue: (productType: string) => {
          if (productType === 'renters') return false // Renters don't own their home
          if (productType === 'home') return true // Home insurance requires ownership
          return undefined // No inference for other product types (auto, umbrella, etc.)
        },
        confidence: 'high',
        reasoning: 'Renters insurance implies tenant status; home insurance implies ownership',
      },
    ],
  },

  premiums: {
    shortcut: '',
    label: 'Premiums',
    question: '',
    category: 'Premiums',
    fieldType: 'object',
    flows: ['intake', 'policy'],
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
}
