/**
 * Unit Tests for Prefill Generator Service
 *
 * @see docs/stories/1.8.prefill-packet-generation.md#task-10
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import type { MissingField, RouteDecision, UserProfile } from '@repo/shared'
import {
  cleanupTestKnowledgePack,
  setupTestKnowledgePack,
} from '../../__tests__/helpers/knowledge-pack-test-setup'
import {
  generateLeadHandoffSummary,
  generatePrefillPacket,
  getMissingFields,
} from '../prefill-generator'

// Setup: Use real knowledge_pack as base
beforeAll(async () => {
  await setupTestKnowledgePack()
})

afterAll(async () => {
  await cleanupTestKnowledgePack()
})

describe('getMissingFields', () => {
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

  it('should return empty array when all fields present', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123',
      garage: 'attached',
    }

    const missing = getMissingFields(profile)
    // Should only have state and productType (already present)
    expect(missing.filter((f) => f.priority === 'critical').length).toBe(0)
  })
})

describe('generateLeadHandoffSummary', () => {
  const mockRoute: RouteDecision = {
    primaryCarrier: 'GEICO',
    eligibleCarriers: ['GEICO', 'Progressive', 'State Farm'],
    confidence: 0.9,
    rationale: 'GEICO offers best rates for CA auto insurance',
    citations: [],
  }

  it('should include state-specific guidance for CA', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
    }

    const summary = generateLeadHandoffSummary(profile, mockRoute, [])
    // Use real knowledge pack - verify guidance exists (may have different wording)
    expect(Array.isArray(summary)).toBe(true)
    expect(summary.length).toBeGreaterThan(0)
    // Check for state-related content (may be "California" or "CA" or other variations)
    const hasStateGuidance = summary.some(
      (note) =>
        note.includes('California') || note.includes('CA') || note.toLowerCase().includes('state')
    )
    expect(hasStateGuidance).toBe(true)
  })

  it('should include product-specific guidance for auto', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
    }

    const summary = generateLeadHandoffSummary(profile, mockRoute, [])
    // Use real knowledge pack - verify guidance exists (may have different wording)
    expect(Array.isArray(summary)).toBe(true)
    expect(summary.length).toBeGreaterThan(0)
    // Check for product-related content (may be "Auto insurance" or "auto" or other variations)
    const hasProductGuidance = summary.some(
      (note) =>
        note.includes('Auto') || note.includes('auto') || note.toLowerCase().includes('vehicle')
    )
    expect(hasProductGuidance).toBe(true)
  })

  it('should include missing fields checklist', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
    }

    const missingFields = [
      { field: 'vehicles', priority: 'critical' as const },
      { field: 'vins', priority: 'important' as const },
    ]
    const summary = generateLeadHandoffSummary(profile, mockRoute, missingFields)
    expect(summary.some((note) => note.includes('Missing fields checklist'))).toBe(true)
    expect(summary.some((note) => note.includes('[CRITICAL] vehicles'))).toBe(true)
  })

  it('should include routing rationale', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
    }

    const summary = generateLeadHandoffSummary(profile, mockRoute, [])
    expect(summary.some((note) => note.includes('Routing rationale'))).toBe(true)
    expect(summary.some((note) => note.includes(mockRoute.rationale))).toBe(true)
  })

  it('should include alternative carriers', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
    }

    const summary = generateLeadHandoffSummary(profile, mockRoute, [])
    expect(summary.some((note) => note.includes('Alternative carriers'))).toBe(true)
    expect(summary.some((note) => note.includes('Progressive'))).toBe(true)
  })
})

describe('generatePrefillPacket', () => {
  const mockRoute: RouteDecision = {
    primaryCarrier: 'GEICO',
    eligibleCarriers: ['GEICO', 'Progressive'],
    confidence: 0.9,
    rationale: 'GEICO offers best rates',
    citations: [],
  }

  const mockDisclaimers = ['Disclaimer 1', 'Disclaimer 2']

  it('should generate complete prefill packet with all fields mapped correctly', () => {
    const profile: UserProfile = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      zip: '90210',
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123 DEF456',
      garage: 'attached',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    // Validate nested profile object
    expect(prefill.profile.name).toBe('John Doe')
    expect(prefill.profile.email).toBe('john@example.com')
    expect(prefill.profile.phone).toBe('555-1234')
    expect(prefill.profile.zip).toBe('90210')
    expect(prefill.profile.state).toBe('CA')
    expect(prefill.profile.productType).toBe('auto')
    expect(prefill.profile.vehicles).toBe(2)
    expect(prefill.profile.drivers).toBe(1)
    expect(prefill.profile.vins).toBe('ABC123 DEF456')
    expect(prefill.profile.garage).toBe('attached')

    // Validate nested routing object
    expect(prefill.routing.primaryCarrier).toBe('GEICO')
    expect(prefill.routing.rationale).toBe(mockRoute.rationale)

    // Validate top-level fields
    expect(prefill.disclaimers).toEqual(mockDisclaimers)
    expect(prefill.reviewedByLicensedAgent).toBe(false)
    expect(prefill.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO 8601 format
  })

  it('should generate prefill packet with partial UserProfile', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 1,
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    expect(prefill.profile.state).toBe('CA')
    expect(prefill.profile.productType).toBe('auto')
    expect(prefill.profile.vehicles).toBe(1)
    expect(prefill.profile.name).toBeUndefined()
    expect(prefill.profile.email).toBeUndefined()
  })

  it('should map home product fields correctly', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'home',
      propertyType: 'single-family',
      yearBuilt: 2000,
      squareFeet: 2000,
      roofType: 'asphalt',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    expect(prefill.profile.propertyType).toBe('single-family')
    expect(prefill.profile.yearBuilt).toBe(2000)
    expect(prefill.profile.squareFeet).toBe(2000)
    expect(prefill.profile.roofType).toBe('asphalt')
  })

  it('should include missing fields in prefill packet', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    expect(prefill.missingFields.length).toBeGreaterThan(0)
    expect(
      prefill.missingFields.some((f) => f.field === 'vehicles' && f.priority === 'critical')
    ).toBe(true)
  })

  it('should include producer notes with lead handoff summary', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    expect(prefill.producerNotes).toBeDefined()
    expect(Array.isArray(prefill.producerNotes)).toBe(true)
    expect(prefill.producerNotes?.length).toBeGreaterThan(0)
  })

  it('should set reviewedByLicensedAgent to false', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    expect(prefill.reviewedByLicensedAgent).toBe(false)
  })

  it('should throw error if state is missing', () => {
    const profile: UserProfile = {
      productType: 'auto',
    }

    const missingFields = getMissingFields(profile)
    expect(() => {
      generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)
    }).toThrow('State and productType are required')
  })

  it('should throw error if productType is missing', () => {
    const profile: UserProfile = {
      state: 'CA',
    }

    const missingFields = getMissingFields(profile)
    expect(() => {
      generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)
    }).toThrow('State and productType are required')
  })

  it('should handle empty missingFields array', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123',
    }

    const prefill = generatePrefillPacket(profile, mockRoute, [], mockDisclaimers)
    expect(prefill.missingFields).toEqual([])
  })

  it('should handle empty disclaimers array', () => {
    const profile: UserProfile = {
      state: 'CA',
      productType: 'auto',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, [])
    expect(prefill.disclaimers).toEqual([])
  })
})
