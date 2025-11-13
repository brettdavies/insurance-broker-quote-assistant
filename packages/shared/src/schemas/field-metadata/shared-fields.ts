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
  },

  cleanRecord5Yr: {
    shortcut: '5',
    label: 'Clean Record (5 Years)',
    question: 'Is there a clean driving record for the past 5 years?',
    description: 'Clean driving record for 5 years',
    category: 'Vehicle',
    fieldType: 'boolean',
    flows: ['intake', 'policy'],
  },

  ownsHome: {
    shortcut: 'o',
    label: 'Owns Home',
    question: 'Does the client own a home?',
    description: 'Home ownership status',
    category: 'Property',
    fieldType: 'boolean',
    flows: ['intake', 'policy'],
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
    aliases: ['c', 'car'],
    flows: ['intake', 'policy'],
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
    flows: ['intake', 'policy'],
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
    aliases: ['household', 'd', 'deps', 'dependents'],
    flows: ['intake', 'policy'],
    min: 0,
    max: 50,
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
