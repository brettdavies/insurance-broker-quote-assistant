/**
 * Household Fields
 *
 * Fields related to household composition.
 */

import type { UnifiedFieldMetadata } from '../../unified-field-metadata'

export const householdFields: Record<string, UnifiedFieldMetadata> = {
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
}
