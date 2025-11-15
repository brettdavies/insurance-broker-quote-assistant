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
    singleInstance: true,
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
    // Field-to-field inference: householdSize → kids
    // Part of known vs inferred pills architecture (Epic 4: Field Extraction Bulletproofing)
    infers: [
      {
        targetField: 'kids',
        inferValue: (householdSize: number) => {
          // If household size is 1, infer that there are 0 kids (single adult)
          if (typeof householdSize === 'number' && householdSize === 1) {
            return 0
          }
          return undefined
        },
        confidence: 'high',
        reasoning: 'Household size of 1 indicates a single adult with no children',
      },
    ],
  },
}
