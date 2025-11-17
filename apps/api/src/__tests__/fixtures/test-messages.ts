/**
 * Test Message Fixtures
 *
 * Realistic sample paragraphs and messages for testing conversational extraction.
 * These represent actual broker conversations and natural language inputs.
 */

export const testMessages = {
  // Simple key-value examples
  keyValue: {
    simple: 's:CA a:30 l:auto',
    multiple: 's:CA a:30 l:auto v:2 k:2 h:4',
    aliases: 'k:2 d:3 c:1 h:4 o:true',
    mixed: 'Client needs auto insurance, s:CA, a:35, v:2',
  },

  // Natural language examples (realistic broker conversations)
  naturalLanguage: {
    simple: 'I need auto insurance in California',
    complete: 'I need auto insurance in California. I am 30 years old and have 2 vehicles.',
    detailed:
      'My client is looking for auto insurance in California. They are 35 years old, have 2 kids, own a home, and have 2 vehicles. They have a clean driving record for the past 3 years.',
    conversational: [
      'I need insurance',
      'What type of insurance?',
      'Auto insurance',
      'What state?',
      'California',
      'I am 30 years old and have 2 vehicles',
    ],
    incomplete: 'I need insurance in California',
    ambiguous: 'My client needs coverage for their car in CA',
    withNumbers: 'Client is 45 years old, has 3 kids, 2 vehicles, and owns their home in Texas',
  },

  // Complex scenarios
  complex: {
    multiProduct:
      'I need both auto and home insurance in Florida. I am 40 years old, own my home, and have 2 vehicles.',
    existingPolicy:
      'I currently have auto insurance with GEICO paying $1200 per year. I want to see if I can save money.',
    bundleOpportunity:
      'I have auto insurance with State Farm and home insurance with GEICO. Can I bundle them?',
    missingInfo: 'I need insurance but I am not sure what I need. I live in New York.',
  },

  // Edge cases
  edgeCases: {
    empty: '',
    onlyPunctuation: '...',
    numbersOnly: '123 456 789',
    specialChars: 's:CA!@#$%^&*()',
    veryLong:
      'I need auto insurance in California and I have been driving for 20 years and I have never had an accident and I have a perfect driving record and I am looking for the best rates possible and I want to make sure I get good coverage',
    unicode: 'I need insurance in California. I am 30 años and have 2 vehículos.',
  },

  // Conversation history examples
  conversationHistory: {
    progressive: [
      'I need insurance',
      'What type?',
      'Auto insurance',
      'What state?',
      'California',
      'I am 30 years old',
    ],
    withContext: [
      'Client wants to switch carriers',
      'What do they currently have?',
      'Auto with GEICO, home with State Farm',
      'What state?',
      'Texas',
      'They want to bundle everything',
    ],
  },
} as const

/**
 * Expected extraction results for test messages
 * Used for validation in tests
 */
export const expectedExtractions = {
  's:CA a:30 l:auto': {
    state: 'CA',
    age: 30,
    productType: 'auto',
  },
  'I need auto insurance in California': {
    state: 'CA',
    productType: 'auto',
  },
  'I need auto insurance in California. I am 30 years old and have 2 vehicles.': {
    state: 'CA',
    productType: 'auto',
    age: 30,
    vehicles: 2,
  },
} as const
