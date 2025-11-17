/**
 * Shared Test Cases
 *
 * Common test case definitions reused across test files.
 * Defined once, imported everywhere to eliminate duplication.
 */

import type { UserProfile } from '../schemas/user-profile'

/**
 * Extraction test case
 */
export interface ExtractionTestCase {
  input: string
  expected: Partial<UserProfile>
  description?: string
}

/**
 * Routing test case
 */
export interface RoutingTestCase {
  profile: Partial<UserProfile>
  expectedCarriers: string[]
  description?: string
}

/**
 * Shared extraction test cases
 * Used across conversational extractor tests
 */
export const extractionTestCases: ExtractionTestCase[] = [
  {
    input: 's:CA a:30 l:auto',
    expected: {
      state: 'CA',
      age: 30,
      productType: 'auto',
    },
    description: 'Key-value syntax with state, age, and product',
  },
  {
    input: 'I need auto insurance in California',
    expected: {
      state: 'CA',
      productType: 'auto',
    },
    description: 'Natural language with state and product',
  },
  {
    input: 'I need auto insurance in California. I am 30 years old and have 2 vehicles.',
    expected: {
      state: 'CA',
      productType: 'auto',
      age: 30,
      vehicles: 2,
    },
    description: 'Natural language with multiple fields',
  },
  {
    input: 's:TX l:home a:35 h:4',
    expected: {
      state: 'TX',
      productType: 'home',
      age: 35,
      householdSize: 4,
    },
    description: 'Key-value with home insurance',
  },
  {
    input: 'Client needs renters insurance in Florida, age 25',
    expected: {
      state: 'FL',
      productType: 'renters',
      age: 25,
    },
    description: 'Natural language with renters insurance',
  },
]

/**
 * Shared routing test cases
 * Used across routing engine tests
 */
export const routingTestCases: RoutingTestCase[] = [
  {
    profile: {
      state: 'CA',
      productType: 'auto',
      age: 30,
    },
    expectedCarriers: ['GEICO', 'Progressive'],
    description: 'Standard auto insurance in California',
  },
  {
    profile: {
      state: 'TX',
      productType: 'home',
      age: 35,
      ownsHome: true,
    },
    expectedCarriers: ['GEICO'],
    description: 'Home insurance in Texas',
  },
  {
    profile: {
      state: 'FL',
      productType: 'renters',
      age: 25,
    },
    expectedCarriers: ['GEICO'],
    description: 'Renters insurance in Florida',
  },
  {
    profile: {
      state: 'NY',
      productType: 'auto',
      age: 18,
    },
    expectedCarriers: [],
    description: 'State not available (NY not in test data)',
  },
]

/**
 * Key-value parsing test cases
 */
export const keyValueTestCases = [
  {
    input: 's:CA',
    expected: { state: 'CA' },
    description: 'Single field (state)',
  },
  {
    input: 's:CA a:30',
    expected: { state: 'CA', age: 30 },
    description: 'Two fields (state, age)',
  },
  {
    input: 's:CA a:30 l:auto v:2',
    expected: { state: 'CA', age: 30, productType: 'auto', vehicles: 2 },
    description: 'Multiple fields',
  },
  {
    input: 'k:2 d:3 c:1 h:4 o:true',
    expected: {
      kids: 2, // 'k' maps to kids
      householdSize: 4, // 'd:3' maps to householdSize, but 'h:4' overwrites it (last value wins)
      vehicles: 1, // 'c' maps to vehicles (car alias)
      ownsHome: true, // 'o' maps to ownsHome
    },
    description: 'Aliases and boolean',
  },
] as const

/**
 * Natural language test cases
 */
export const naturalLanguageTestCases = [
  {
    input: 'I need auto insurance in California',
    expectedFields: ['state', 'productType'],
    description: 'Simple natural language',
  },
  {
    input: 'My client is 35 years old and needs home insurance in Texas',
    expectedFields: ['age', 'productType', 'state'],
    description: 'Natural language with age',
  },
  {
    input: 'Client has 2 vehicles and needs auto coverage in Florida',
    expectedFields: ['vehicles', 'productType', 'state'],
    description: 'Natural language with vehicles',
  },
] as const
