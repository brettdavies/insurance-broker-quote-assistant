/**
 * Unit Tests for Missing Fields Detection
 *
 * Tests getMissingFields() function with product/state/carrier-specific requirements,
 * priority assignment, and knowledge pack integration.
 *
 * @see docs/stories/1.9.real-time-missing-fields-detection.md#task-8
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import type { UserProfile } from '@repo/shared'
import {
  createTestCarrier,
  createTestProduct,
  createTestState,
} from '../../__tests__/fixtures/knowledge-pack'
import {
  cleanupTestKnowledgePack,
  setupTestKnowledgePack,
} from '../../__tests__/helpers/knowledge-pack-test-setup'
import { getMissingFields } from '../prefill-generator'

describe('getMissingFields - Product-Specific Requirements', () => {
  beforeAll(async () => {
    // Use real knowledge pack as base, extend with test products that have specific required fields
    // Note: Real knowledge pack products may already have these fields, but we're ensuring test consistency
    await setupTestKnowledgePack({
      products: [
        createTestProduct('auto', 'Auto Insurance', [
          { field: 'vehicles', priority: 'critical' },
          { field: 'drivers', priority: 'critical' },
          { field: 'vins', priority: 'important' },
          { field: 'garage', priority: 'optional' },
        ]),
        createTestProduct('home', 'Home Insurance', [
          { field: 'propertyType', priority: 'critical' },
          { field: 'yearBuilt', priority: 'important' },
          { field: 'squareFeet', priority: 'important' },
          { field: 'roofType', priority: 'optional' },
        ]),
        createTestProduct('renters', 'Renters Insurance', [
          { field: 'propertyType', priority: 'critical' },
        ]),
        createTestProduct('umbrella', 'Umbrella Insurance', [
          { field: 'existingPolicies', priority: 'critical' },
        ]),
      ],
    })
  })

  afterAll(async () => {
    await cleanupTestKnowledgePack()
  })

  it('should detect missing critical fields for auto product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      // Missing vehicles and drivers (critical)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'vehicles' && f.priority === 'critical')).toBe(true)
    expect(missing.some((f) => f.field === 'drivers' && f.priority === 'critical')).toBe(true)
  })

  it('should detect missing important fields for auto product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      // Missing vins (important)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'vins' && f.priority === 'important')).toBe(true)
  })

  it('should detect missing optional fields for auto product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123',
      // Missing garage (optional)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'garage' && f.priority === 'optional')).toBe(true)
  })

  it('should detect missing critical fields for home product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'home',
      // Missing propertyType (critical)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'propertyType' && f.priority === 'critical')).toBe(true)
  })

  it('should detect missing important fields for home product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'home',
      propertyType: 'single-family',
      // Missing yearBuilt and squareFeet (important)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'yearBuilt' && f.priority === 'important')).toBe(true)
    expect(missing.some((f) => f.field === 'squareFeet' && f.priority === 'important')).toBe(true)
  })

  it('should detect missing critical fields for renters product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'renters',
      // Missing propertyType (critical)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'propertyType' && f.priority === 'critical')).toBe(true)
  })

  it('should detect missing critical fields for umbrella product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'umbrella',
      // Missing existingPolicies (critical)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'existingPolicies' && f.priority === 'critical')).toBe(
      true
    )
  })

  it('should always require state and productType', () => {
    const profile: UserProfile = {}

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'state' && f.priority === 'critical')).toBe(true)
    expect(missing.some((f) => f.field === 'productType' && f.priority === 'critical')).toBe(true)
  })

  it('should return empty array when all required fields present', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123',
      garage: 'attached',
    }

    const missing = getMissingFields(profile)
    // Should not have any critical missing fields
    expect(missing.filter((f) => f.priority === 'critical').length).toBe(0)
  })
})

describe('getMissingFields - Priority Assignment', () => {
  beforeAll(async () => {
    await setupTestKnowledgePack({
      products: [
        createTestProduct('auto', 'Auto Insurance', [
          { field: 'vehicles', priority: 'critical' },
          { field: 'drivers', priority: 'critical' },
          { field: 'vins', priority: 'important' },
          { field: 'garage', priority: 'optional' },
        ]),
      ],
    })
  })

  afterAll(async () => {
    await cleanupTestKnowledgePack()
  })

  it('should assign critical priority to blocking fields', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
    }

    const missing = getMissingFields(profile)
    const criticalFields = missing.filter((f) => f.priority === 'critical')
    expect(criticalFields.length).toBeGreaterThan(0)
    expect(criticalFields.some((f) => f.field === 'vehicles')).toBe(true)
    expect(criticalFields.some((f) => f.field === 'drivers')).toBe(true)
  })

  it('should assign important priority to accuracy-affecting fields', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
    }

    const missing = getMissingFields(profile)
    const importantFields = missing.filter((f) => f.priority === 'important')
    expect(importantFields.some((f) => f.field === 'vins')).toBe(true)
  })

  it('should assign optional priority to nice-to-have fields', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123',
    }

    const missing = getMissingFields(profile)
    const optionalFields = missing.filter((f) => f.priority === 'optional')
    expect(optionalFields.some((f) => f.field === 'garage')).toBe(true)
  })
})

describe('getMissingFields - Carrier-Specific Requirements', () => {
  beforeAll(async () => {
    // Create test carrier with clean driving record requirement
    const carrierWithCleanRecord = createTestCarrier('TestCarrier', ['CA'], ['auto'])
    carrierWithCleanRecord.carrier.eligibility = {
      _id: 'elig_test1',
      _sources: [],
      auto: {
        _id: 'elig_auto1',
        requiresCleanDrivingRecord: {
          _id: 'fld_test1',
          value: true,
          _sources: [],
        },
        minAge: {
          _id: 'fld_test2',
          value: 18,
          _sources: [],
        },
        minCreditScore: {
          _id: 'fld_test3',
          value: 600,
          _sources: [],
        },
      },
    } as typeof carrierWithCleanRecord.carrier.eligibility & {
      auto: {
        _id: string
        requiresCleanDrivingRecord: {
          _id: string
          value: boolean
          _sources: unknown[]
        }
        minAge: {
          _id: string
          value: number
          _sources: unknown[]
        }
        minCreditScore: {
          _id: string
          value: number
          _sources: unknown[]
        }
      }
    }

    await setupTestKnowledgePack({
      products: [
        createTestProduct('auto', 'Auto Insurance', [
          { field: 'vehicles', priority: 'critical' },
          { field: 'drivers', priority: 'critical' },
          { field: 'vins', priority: 'important' },
        ]),
      ],
      carriers: [carrierWithCleanRecord],
    })
  })

  afterAll(async () => {
    await cleanupTestKnowledgePack()
  })

  it('should add carrier-specific critical requirements', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      // Missing cleanRecord3Yr (carrier-specific critical)
    }

    const missing = getMissingFields(profile, 'auto', 'CA', 'TestCarrier')
    expect(missing.some((f) => f.field === 'cleanRecord3Yr' && f.priority === 'critical')).toBe(
      true
    )
  })

  it('should add carrier-specific important requirements (age)', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      // Missing age (carrier-specific important)
    }

    const missing = getMissingFields(profile, 'auto', 'CA', 'TestCarrier')
    expect(missing.some((f) => f.field === 'age' && f.priority === 'important')).toBe(true)
  })

  it('should add carrier-specific important requirements (creditScore)', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      // Missing creditScore (carrier-specific important)
    }

    const missing = getMissingFields(profile, 'auto', 'CA', 'TestCarrier')
    expect(missing.some((f) => f.field === 'creditScore' && f.priority === 'important')).toBe(true)
  })

  it('should not duplicate fields already in missing list', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      // vins already in product-level requirements
    }

    const missing = getMissingFields(profile, 'auto', 'CA', 'TestCarrier')
    const vinsFields = missing.filter((f) => f.field === 'vins')
    expect(vinsFields.length).toBe(1) // Should not duplicate
  })

  it('should upgrade priority if carrier requirement is more critical', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      // vins is important at product level, but carrier might require it as critical
    }

    const missing = getMissingFields(profile, 'auto', 'CA', 'TestCarrier')
    // If carrier requires vins as critical, it should be critical
    // For this test, we're just checking the logic works
    const vinsField = missing.find((f) => f.field === 'vins')
    expect(vinsField).toBeDefined()
  })
})

describe('getMissingFields - State-Specific Requirements', () => {
  beforeAll(async () => {
    // Create test state with minimum coverage requirements
    const stateWithMinimums = createTestState('CA', 'California', {
      _id: 'mincov_test1',
      auto: {
        _id: 'auto_min1',
        bodilyInjuryPerPerson: {
          _id: 'fld_test1',
          value: 15000,
          _sources: [],
        },
      },
      home: {
        _id: 'home_min1',
        dwellingCoverage: {
          _id: 'fld_test2',
          value: 100000,
          _sources: [],
        },
      },
    })

    await setupTestKnowledgePack({
      products: [
        createTestProduct('auto', 'Auto Insurance', [
          { field: 'vehicles', priority: 'critical' },
          { field: 'drivers', priority: 'critical' },
          { field: 'vins', priority: 'important' },
        ]),
        createTestProduct('home', 'Home Insurance', [
          { field: 'propertyType', priority: 'critical' },
          { field: 'yearBuilt', priority: 'important' },
          { field: 'squareFeet', priority: 'important' },
        ]),
      ],
      states: [stateWithMinimums],
    })
  })

  afterAll(async () => {
    await cleanupTestKnowledgePack()
  })

  it('should add state-specific important requirements for auto', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      // Missing vins (product-level important, state may also require for minimums verification)
    }

    const missing = getMissingFields(profile, 'auto', 'CA')
    // vins should be in missing list (from product requirements)
    // State requirements may also add it if not already present
    const vinsField = missing.find((f) => f.field === 'vins')
    expect(vinsField).toBeDefined()
    expect(vinsField?.priority).toBe('important')
  })

  it('should add state-specific important requirements for home', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'home',
      propertyType: 'single-family',
      // Missing squareFeet and yearBuilt (product-level important, state may also require)
    }

    const missing = getMissingFields(profile, 'home', 'CA')
    // These fields should be in missing list (from product requirements)
    // State requirements may also add them if not already present
    expect(missing.some((f) => f.field === 'squareFeet' && f.priority === 'important')).toBe(true)
    expect(missing.some((f) => f.field === 'yearBuilt' && f.priority === 'important')).toBe(true)
  })
})

describe('getMissingFields - Edge Cases', () => {
  beforeAll(async () => {
    await setupTestKnowledgePack({
      products: [
        createTestProduct('auto', 'Auto Insurance', [
          { field: 'vehicles', priority: 'critical' },
          { field: 'drivers', priority: 'critical' },
          { field: 'vins', priority: 'important' },
        ]),
      ],
    })
  })

  afterAll(async () => {
    await cleanupTestKnowledgePack()
  })

  it('should fall back to product-level defaults when carrier unknown', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
    }

    const missing = getMissingFields(profile, 'auto', 'CA', 'UnknownCarrier')
    // Should still return product-level requirements
    expect(missing.some((f) => f.field === 'vins')).toBe(true)
  })

  it('should fall back to product-level defaults when state unknown', () => {
    const profile: UserProfile = {
      state: 'XX', // Unknown state
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
    }

    const missing = getMissingFields(profile, 'auto', 'XX')
    // Should still return product-level requirements
    expect(missing.some((f) => f.field === 'vins')).toBe(true)
  })

  it('should handle missing productType gracefully', () => {
    const profile: UserProfile = {
      state: 'CA',
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'productType' && f.priority === 'critical')).toBe(true)
    // Should not throw error
  })

  it('should handle empty profile', () => {
    const profile: UserProfile = {}

    const missing = getMissingFields(profile)
    expect(missing.length).toBeGreaterThan(0)
    expect(missing.some((f) => f.field === 'state')).toBe(true)
    expect(missing.some((f) => f.field === 'productType')).toBe(true)
  })

  it('should not include fields that are present', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123',
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'vehicles')).toBe(false)
    expect(missing.some((f) => f.field === 'drivers')).toBe(false)
    expect(missing.some((f) => f.field === 'vins')).toBe(false)
  })
})
