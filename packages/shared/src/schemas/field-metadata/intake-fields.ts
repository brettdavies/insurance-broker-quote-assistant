import type { UnifiedFieldMetadata } from '../unified-field-metadata'

/**
 * Intake-Only Field Metadata
 *
 * Fields specific to the conversational intake flow (UserProfile).
 */

export const intakeFields: Record<string, UnifiedFieldMetadata> = {
  kids: {
    shortcut: 'k',
    label: 'Kids',
    question: 'How many kids?',
    description: 'Number of children',
    category: 'Household',
    fieldType: 'numeric',
    flows: ['intake'],
    min: 0,
    max: 20,
    singleInstance: true,
    // Field-to-field inference: kids → householdSize
    infers: [
      {
        targetField: 'householdSize',
        inferValue: (kids: number) => {
          // Infer householdSize = kids + 1 (assuming 1 adult)
          if (typeof kids === 'number' && kids >= 0) {
            return kids + 1
          }
          return undefined
        },
        confidence: 'medium',
        reasoning: 'Number of kids plus one adult indicates household size',
      },
    ],
  },

  garage: {
    shortcut: 'g',
    label: 'Garage Type',
    question: 'What is the garage type?',
    description: 'Garage type',
    category: 'Vehicle',
    fieldType: 'string',
    flows: ['intake'],
    singleInstance: true,
    options: ['attached', 'detached', 'carport', 'none', 'street'],
  },

  vins: {
    shortcut: 'i',
    label: 'VINs',
    question: 'What are the VINs?',
    description: 'Vehicle identification numbers',
    category: 'Vehicle',
    fieldType: 'string',
    flows: ['intake'],
  },

  currentCarrier: {
    shortcut: '',
    label: 'Current Carrier',
    question: 'Who is the current insurance carrier?',
    description: 'Current insurance carrier name',
    category: 'Eligibility',
    fieldType: 'string',
    aliases: ['carrier'],
    flows: ['intake'],
  },

  existingPolicies: {
    shortcut: '',
    label: 'Existing Policies',
    question: 'What existing policies does the client have?',
    description: 'Existing insurance policies',
    category: 'Eligibility',
    fieldType: 'object',
    flows: ['intake'],
  },
}
