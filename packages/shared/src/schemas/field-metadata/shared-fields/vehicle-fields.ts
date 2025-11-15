/**
 * Vehicle Fields
 *
 * Fields related to vehicles and driving records.
 */

import type { UnifiedFieldMetadata } from '../../unified-field-metadata'

export const vehicleFields: Record<string, UnifiedFieldMetadata> = {
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
    // Part of known vs inferred pills architecture (Epic 4: Field Extraction Bulletproofing)
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
}
