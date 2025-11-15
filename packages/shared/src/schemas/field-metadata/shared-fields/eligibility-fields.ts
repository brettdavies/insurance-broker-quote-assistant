/**
 * Eligibility Fields
 *
 * Fields related to eligibility requirements.
 */

import type { UnifiedFieldMetadata } from '../../unified-field-metadata'

export const eligibilityFields: Record<string, UnifiedFieldMetadata> = {
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
}
