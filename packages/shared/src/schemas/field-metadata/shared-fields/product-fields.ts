/**
 * Product Fields
 *
 * Fields related to insurance products and premiums.
 */

import type { UnifiedFieldMetadata } from '../../unified-field-metadata'

export const productFields: Record<string, UnifiedFieldMetadata> = {
  productType: {
    shortcut: 'l',
    label: 'Product Type',
    question: 'What is the product type?',
    description: 'Insurance product type',
    category: 'Product',
    fieldType: 'string',
    aliases: ['product'],
    flows: ['intake', 'policy'],
    singleInstance: true,
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
