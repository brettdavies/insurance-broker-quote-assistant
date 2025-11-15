/**
 * Identity & Contact Fields
 *
 * Fields related to personal identity and contact information.
 */

import type { UnifiedFieldMetadata } from '../../unified-field-metadata'

export const identityFields: Record<string, UnifiedFieldMetadata> = {
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
}
