/**
 * Location Fields
 *
 * Fields related to geographic location.
 */

import type { UnifiedFieldMetadata } from '../../unified-field-metadata'

export const locationFields: Record<string, UnifiedFieldMetadata> = {
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
}
