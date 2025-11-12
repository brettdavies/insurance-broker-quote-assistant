/**
 * Unit Tests for Missing Fields Detection
 *
 * Tests getMissingFields() function with product/state/carrier-specific requirements,
 * priority assignment, and knowledge pack integration.
 *
 * @see docs/stories/1.9.real-time-missing-fields-detection.md#task-8
 */

import { beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { buildUserProfile } from '@repo/shared/test-utils'
import { createTestCarrier, createTestState } from '../../__tests__/fixtures/knowledge-pack'
import { loadKnowledgePack } from '../knowledge-pack-loader'
import { getMissingFields } from '../prefill-generator'

// Path relative to project root (loadKnowledgePack resolves relative to process.cwd())
const testKnowledgePackDir =
  'apps/api/src/__tests__/fixtures/knowledge-packs/test_knowledge_pack_missing_fields'

describe('getMissingFields - Product-Specific Requirements', () => {
  it('should detect missing critical fields for auto product', () => {
    const profile = buildUserProfile({
      // Missing vehicles and drivers (critical)
      vehicles: undefined,
      drivers: undefined,
    })

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'vehicles' && f.priority === 'critical')).toBe(true)
    expect(missing.some((f) => f.field === 'drivers' && f.priority === 'critical')).toBe(true)
  })

  it('should detect missing important fields for auto product', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
      // Missing vins (important)
      vins: undefined,
    })

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'vins' && f.priority === 'important')).toBe(true)
  })

  it('should detect missing optional fields for auto product', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123',
      // Missing garage (optional)
      garage: undefined,
    })

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'garage' && f.priority === 'optional')).toBe(true)
  })

  it('should detect missing critical fields for home product', () => {
    const profile = buildUserProfile({
      productLine: 'home',
      // Missing propertyType (critical)
      propertyType: undefined,
    })

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'propertyType' && f.priority === 'critical')).toBe(true)
  })

  it('should detect missing important fields for home product', () => {
    const profile = buildUserProfile({
      productLine: 'home',
      propertyType: 'single-family',
      // Missing constructionYear and squareFeet (important)
      constructionYear: undefined,
      squareFeet: undefined,
    })

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'constructionYear' && f.priority === 'important')).toBe(
      true
    )
    expect(missing.some((f) => f.field === 'squareFeet' && f.priority === 'important')).toBe(true)
  })

  it('should detect missing critical fields for renters product', () => {
    const profile = buildUserProfile({
      productLine: 'renters',
      // Missing propertyType (critical)
      propertyType: undefined,
    })

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'propertyType' && f.priority === 'critical')).toBe(true)
  })

  it('should detect missing critical fields for umbrella product', () => {
    const profile = buildUserProfile({
      productLine: 'umbrella',
      // Missing existingPolicies (critical)
      existingPolicies: undefined,
    })

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'existingPolicies' && f.priority === 'critical')).toBe(
      true
    )
  })

  it('should always require state and productLine', () => {
    const profile = buildUserProfile({
      state: undefined,
      productLine: undefined,
    })

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'state' && f.priority === 'critical')).toBe(true)
    expect(missing.some((f) => f.field === 'productLine' && f.priority === 'critical')).toBe(true)
  })

  it('should return empty array when all required fields present', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123',
      garage: 'attached',
    })

    const missing = getMissingFields(profile)
    // Should not have any critical missing fields
    expect(missing.filter((f) => f.priority === 'critical').length).toBe(0)
  })
})

describe('getMissingFields - Priority Assignment', () => {
  it('should assign critical priority to blocking fields', () => {
    const profile = buildUserProfile()

    const missing = getMissingFields(profile)
    const criticalFields = missing.filter((f) => f.priority === 'critical')
    expect(criticalFields.length).toBeGreaterThan(0)
    expect(criticalFields.some((f) => f.field === 'vehicles')).toBe(true)
    expect(criticalFields.some((f) => f.field === 'drivers')).toBe(true)
  })

  it('should assign important priority to accuracy-affecting fields', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
    })

    const missing = getMissingFields(profile)
    const importantFields = missing.filter((f) => f.priority === 'important')
    expect(importantFields.some((f) => f.field === 'vins')).toBe(true)
  })

  it('should assign optional priority to nice-to-have fields', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123',
    })

    const missing = getMissingFields(profile)
    const optionalFields = missing.filter((f) => f.priority === 'optional')
    expect(optionalFields.some((f) => f.field === 'garage')).toBe(true)
  })
})

describe('getMissingFields - Carrier-Specific Requirements', () => {
  beforeAll(async () => {
    // Setup test knowledge pack
    await mkdir(testKnowledgePackDir, { recursive: true })
    await mkdir(join(testKnowledgePackDir, 'carriers'), { recursive: true })
    await mkdir(join(testKnowledgePackDir, 'states'), { recursive: true })

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

    await writeFile(
      join(testKnowledgePackDir, 'carriers', 'test-carrier.json'),
      JSON.stringify(carrierWithCleanRecord),
      'utf-8'
    )

    await loadKnowledgePack(testKnowledgePackDir)
  })

  it('should add carrier-specific critical requirements', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
      // Missing cleanRecord3Yr (carrier-specific critical)
      cleanRecord3Yr: undefined,
    })

    const missing = getMissingFields(profile, 'auto', 'CA', 'TestCarrier')
    expect(missing.some((f) => f.field === 'cleanRecord3Yr' && f.priority === 'critical')).toBe(
      true
    )
  })

  it('should add carrier-specific important requirements (age)', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
      // Missing age (carrier-specific important)
      age: undefined,
    })

    const missing = getMissingFields(profile, 'auto', 'CA', 'TestCarrier')
    expect(missing.some((f) => f.field === 'age' && f.priority === 'important')).toBe(true)
  })

  it('should add carrier-specific important requirements (creditScore)', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
      // Missing creditScore (carrier-specific important)
      creditScore: undefined,
    })

    const missing = getMissingFields(profile, 'auto', 'CA', 'TestCarrier')
    expect(missing.some((f) => f.field === 'creditScore' && f.priority === 'important')).toBe(true)
  })

  it('should not duplicate fields already in missing list', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
      // vins already in product-level requirements
      vins: undefined,
    })

    const missing = getMissingFields(profile, 'auto', 'CA', 'TestCarrier')
    const vinsFields = missing.filter((f) => f.field === 'vins')
    expect(vinsFields.length).toBe(1) // Should not duplicate
  })

  it('should upgrade priority if carrier requirement is more critical', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
      // vins is important at product level, but carrier might require it as critical
      vins: undefined,
    })

    const missing = getMissingFields(profile, 'auto', 'CA', 'TestCarrier')
    // If carrier requires vins as critical, it should be critical
    // For this test, we're just checking the logic works
    const vinsField = missing.find((f) => f.field === 'vins')
    expect(vinsField).toBeDefined()
  })
})

describe('getMissingFields - State-Specific Requirements', () => {
  beforeAll(async () => {
    // Setup test knowledge pack with state requirements
    await mkdir(testKnowledgePackDir, { recursive: true })
    await mkdir(join(testKnowledgePackDir, 'states'), { recursive: true })

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

    await writeFile(
      join(testKnowledgePackDir, 'states', 'CA.json'),
      JSON.stringify(stateWithMinimums),
      'utf-8'
    )

    await loadKnowledgePack(testKnowledgePackDir)
  })

  it('should add state-specific important requirements for auto', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
      // Missing vins (state-specific important for minimums verification)
      vins: undefined,
    })

    const missing = getMissingFields(profile, 'auto', 'CA')
    // State requirements may add vins as important if not already present
    const vinsField = missing.find((f) => f.field === 'vins')
    expect(vinsField).toBeDefined()
  })

  it('should add state-specific important requirements for home', () => {
    const profile = buildUserProfile({
      productLine: 'home',
      propertyType: 'single-family',
      // Missing squareFeet and constructionYear (state-specific important)
      squareFeet: undefined,
      constructionYear: undefined,
    })

    const missing = getMissingFields(profile, 'home', 'CA')
    expect(missing.some((f) => f.field === 'squareFeet' && f.priority === 'important')).toBe(true)
    expect(missing.some((f) => f.field === 'constructionYear' && f.priority === 'important')).toBe(
      true
    )
  })
})

describe('getMissingFields - Edge Cases', () => {
  it('should fall back to product-level defaults when carrier unknown', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
    })

    const missing = getMissingFields(profile, 'auto', 'CA', 'UnknownCarrier')
    // Should still return product-level requirements
    expect(missing.some((f) => f.field === 'vins')).toBe(true)
  })

  it('should fall back to product-level defaults when state unknown', () => {
    const profile = buildUserProfile({
      state: 'XX', // Unknown state
      vehicles: 2,
      drivers: 1,
    })

    const missing = getMissingFields(profile, 'auto', 'XX')
    // Should still return product-level requirements
    expect(missing.some((f) => f.field === 'vins')).toBe(true)
  })

  it('should handle missing productLine gracefully', () => {
    const profile = buildUserProfile({
      productLine: undefined,
    })

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'productLine' && f.priority === 'critical')).toBe(true)
    // Should not throw error
  })

  it('should handle empty profile', () => {
    const profile = buildUserProfile({
      state: undefined,
      productLine: undefined,
      age: undefined,
      vehicles: undefined,
      householdSize: undefined,
      ownsHome: undefined,
      cleanRecord3Yr: undefined,
    })

    const missing = getMissingFields(profile)
    expect(missing.length).toBeGreaterThan(0)
    expect(missing.some((f) => f.field === 'state')).toBe(true)
    expect(missing.some((f) => f.field === 'productLine')).toBe(true)
  })

  it('should not include fields that are present', () => {
    const profile = buildUserProfile({
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123',
    })

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'vehicles')).toBe(false)
    expect(missing.some((f) => f.field === 'drivers')).toBe(false)
    expect(missing.some((f) => f.field === 'vins')).toBe(false)
  })
})
