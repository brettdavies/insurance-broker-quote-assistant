/**
 * Unit Tests for Prefill Generator Service
 *
 * @see docs/stories/1.8.prefill-packet-generation.md#task-10
 */

import { describe, expect, it } from 'bun:test'
import type { MissingField, RouteDecision, UserProfile } from '@repo/shared'
import {
  generateLeadHandoffSummary,
  generatePrefillPacket,
  getMissingFields,
} from '../prefill-generator'

describe('getMissingFields', () => {
  it('should detect missing critical fields for auto product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
      // Missing vehicles and drivers (critical)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'vehicles' && f.priority === 'critical')).toBe(true)
    expect(missing.some((f) => f.field === 'drivers' && f.priority === 'critical')).toBe(true)
  })

  it('should detect missing important fields for auto product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
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
      productLine: 'auto',
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
      productLine: 'home',
      // Missing propertyType (critical)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'propertyType' && f.priority === 'critical')).toBe(true)
  })

  it('should detect missing important fields for home product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'home',
      propertyType: 'single-family',
      // Missing constructionYear and squareFeet (important)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'constructionYear' && f.priority === 'important')).toBe(
      true
    )
    expect(missing.some((f) => f.field === 'squareFeet' && f.priority === 'important')).toBe(true)
  })

  it('should detect missing critical fields for renters product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'renters',
      // Missing propertyType (critical)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'propertyType' && f.priority === 'critical')).toBe(true)
  })

  it('should detect missing critical fields for umbrella product', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'umbrella',
      // Missing existingPolicies (critical)
    }

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'existingPolicies' && f.priority === 'critical')).toBe(
      true
    )
  })

  it('should always require state and productLine', () => {
    const profile: UserProfile = {}

    const missing = getMissingFields(profile)
    expect(missing.some((f) => f.field === 'state' && f.priority === 'critical')).toBe(true)
    expect(missing.some((f) => f.field === 'productLine' && f.priority === 'critical')).toBe(true)
  })

  it('should return empty array when all fields present', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123',
      garage: 'attached',
    }

    const missing = getMissingFields(profile)
    // Should only have state and productLine (already present)
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
      productLine: 'auto',
    }

    const summary = generateLeadHandoffSummary(profile, mockRoute, [])
    expect(summary.some((note) => note.includes('California'))).toBe(true)
  })

  it('should include product-specific guidance for auto', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
    }

    const summary = generateLeadHandoffSummary(profile, mockRoute, [])
    expect(summary.some((note) => note.includes('Auto insurance'))).toBe(true)
  })

  it('should include missing fields checklist', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
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
      productLine: 'auto',
    }

    const summary = generateLeadHandoffSummary(profile, mockRoute, [])
    expect(summary.some((note) => note.includes('Routing rationale'))).toBe(true)
    expect(summary.some((note) => note.includes(mockRoute.rationale))).toBe(true)
  })

  it('should include alternative carriers', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
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
      productLine: 'auto',
      vehicles: 2,
      drivers: 1,
      vins: 'ABC123 DEF456',
      garage: 'attached',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    expect(prefill.fullName).toBe('John Doe')
    expect(prefill.email).toBe('john@example.com')
    expect(prefill.phone).toBe('555-1234')
    expect(prefill.address).toBe('90210')
    expect(prefill.state).toBe('CA')
    expect(prefill.productLine).toBe('auto')
    expect(prefill.carrier).toBe('GEICO')
    expect(prefill.vehicles).toBe(2)
    expect(prefill.drivers).toBe(1)
    expect(prefill.vins).toBe('ABC123 DEF456')
    expect(prefill.garage).toBe('attached')
    expect(prefill.routingDecision).toBe(mockRoute.rationale)
    expect(prefill.disclaimers).toEqual(mockDisclaimers)
    expect(prefill.reviewedByLicensedAgent).toBe(false)
    expect(prefill.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO 8601 format
  })

  it('should generate prefill packet with partial UserProfile', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
      vehicles: 1,
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    expect(prefill.state).toBe('CA')
    expect(prefill.productLine).toBe('auto')
    expect(prefill.vehicles).toBe(1)
    expect(prefill.fullName).toBeUndefined()
    expect(prefill.email).toBeUndefined()
  })

  it('should map home product fields correctly', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'home',
      propertyType: 'single-family',
      constructionYear: 2000,
      squareFeet: 2000,
      roofType: 'asphalt',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    expect(prefill.propertyType).toBe('single-family')
    expect(prefill.yearBuilt).toBe(2000)
    expect(prefill.squareFeet).toBe(2000)
    expect(prefill.roofType).toBe('asphalt')
  })

  it('should include missing fields in prefill packet', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    expect(prefill.missingFields.length).toBeGreaterThan(0)
    expect(
      prefill.missingFields.some((f) => f.field === 'vehicles' && f.priority === 'critical')
    ).toBe(true)
  })

  it('should include agent notes with lead handoff summary', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    expect(prefill.agentNotes).toBeDefined()
    expect(Array.isArray(prefill.agentNotes)).toBe(true)
    expect(prefill.agentNotes?.length).toBeGreaterThan(0)
  })

  it('should set reviewedByLicensedAgent to false', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)

    expect(prefill.reviewedByLicensedAgent).toBe(false)
  })

  it('should throw error if state is missing', () => {
    const profile: UserProfile = {
      productLine: 'auto',
    }

    const missingFields = getMissingFields(profile)
    expect(() => {
      generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)
    }).toThrow('State and productLine are required')
  })

  it('should throw error if productLine is missing', () => {
    const profile: UserProfile = {
      state: 'CA',
    }

    const missingFields = getMissingFields(profile)
    expect(() => {
      generatePrefillPacket(profile, mockRoute, missingFields, mockDisclaimers)
    }).toThrow('State and productLine are required')
  })

  it('should handle empty missingFields array', () => {
    const profile: UserProfile = {
      state: 'CA',
      productLine: 'auto',
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
      productLine: 'auto',
    }

    const missingFields = getMissingFields(profile)
    const prefill = generatePrefillPacket(profile, mockRoute, missingFields, [])
    expect(prefill.disclaimers).toEqual([])
  })
})
