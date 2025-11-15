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
}
