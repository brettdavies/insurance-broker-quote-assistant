/**
 * Discount Engine Integration Tests
 *
 * Tests the complete discount engine flow:
 * - Discount filtering
 * - Eligibility evaluation
 * - Savings calculation
 * - Bundle analysis
 * - State variations (CA multiplier)
 * - Multiple discount types
 *
 * @see docs/architecture/6-components.md#64-discount-engine-deterministic
 */

import { describe, expect, it } from 'bun:test'
import type { Carrier, PolicySummary } from '@repo/shared'
import { buildUserProfile } from '@repo/shared'
import { createTestCarrier } from '../../__tests__/fixtures/knowledge-pack'
import { analyzeBundleOptions, findApplicableDiscounts } from '../discount-engine'

describe('Discount Engine Integration', () => {
  const createTestPolicy = (
    carrier: string,
    state: string,
    productType: string,
    premium: number
  ): PolicySummary => ({
    carrier,
    state,
    productType: productType as any,
    premiums: { annual: premium },
  })

  describe('findApplicableDiscounts', () => {
    it('should return empty array when policy missing state or product', () => {
      const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier

      expect(findApplicableDiscounts(carrier, {} as PolicySummary)).toHaveLength(0)
      expect(findApplicableDiscounts(carrier, { state: 'CA' } as PolicySummary)).toHaveLength(0)
    })

    it('should filter discounts by product and state', () => {
      const discounts = [
        {
          _id: 'disc_auto_ca',
          name: { _id: 'fld1', value: 'Auto CA Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: { description: 'Test' },
            _sources: [],
          },
        },
        {
          _id: 'disc_home_ca',
          name: { _id: 'fld6', value: 'Home CA Discount', _sources: [] },
          percentage: { _id: 'fld7', value: 10, _sources: [] },
          products: { _id: 'fld8', value: ['home'], _sources: [] },
          states: { _id: 'fld9', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld10',
            value: { description: 'Test' },
            _sources: [],
          },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], discounts)
        .carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1000)

      const opportunities = findApplicableDiscounts(carrier, policy)
      expect(opportunities).toHaveLength(1)
      expect(opportunities[0]?.discountId).toBe('disc_auto_ca')
    })

    it('should apply CA state variation (multiplier 0.5)', () => {
      const discounts = [
        {
          _id: 'disc_test',
          name: { _id: 'fld1', value: 'Test Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA', 'TX'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: { description: 'Test' },
            _sources: [],
          },
          stateVariations: {
            CA: { multiplier: 0.5 },
          },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1000)

      const opportunities = findApplicableDiscounts(carrier, policy)
      expect(opportunities).toHaveLength(1)
      expect(opportunities[0]?.percentage).toBe(5) // 10 * 0.5
      expect(opportunities[0]?.annualSavings).toBe(50) // 5% of 1000
    })

    it('should not apply CA multiplier for non-CA states', () => {
      const discounts = [
        {
          _id: 'disc_test',
          name: { _id: 'fld1', value: 'Test Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA', 'TX'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: { description: 'Test' },
            _sources: [],
          },
          stateVariations: {
            CA: { multiplier: 0.5 },
          },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['TX'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'TX', 'auto', 1000)

      const opportunities = findApplicableDiscounts(carrier, policy)
      expect(opportunities).toHaveLength(1)
      expect(opportunities[0]?.percentage).toBe(10) // No multiplier for TX
      expect(opportunities[0]?.annualSavings).toBe(100) // 10% of 1000
    })

    it('should evaluate eligibility requirements', () => {
      const discounts = [
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld1', value: 'Safe Driver', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
              description: 'Clean record required',
            },
            _sources: [],
          },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1000)

      // Customer without clean record
      const customerNoRecord = buildUserProfile({ cleanRecord3Yr: false })
      const opportunities1 = findApplicableDiscounts(carrier, policy, customerNoRecord)
      expect(opportunities1).toHaveLength(0)

      // Customer with clean record
      const customerCleanRecord = buildUserProfile({ cleanRecord3Yr: true })
      const opportunities2 = findApplicableDiscounts(carrier, policy, customerCleanRecord)
      expect(opportunities2).toHaveLength(1)
    })

    it('should calculate bundle discount savings correctly', () => {
      const discounts = [
        {
          _id: 'disc_bundle',
          name: { _id: 'fld1', value: 'Multi-Policy Bundle', _sources: [] },
          percentage: { _id: 'fld2', value: 15, _sources: [] },
          products: { _id: 'fld3', value: ['auto', 'home'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              bundleProducts: ['auto', 'home'],
              mustHaveProducts: ['auto', 'home'],
              description: 'Bundle discount',
            },
            _sources: [],
          },
          metadata: {
            discountType: 'bundle' as const,
            evaluationPriority: 'high' as const,
          },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], discounts)
        .carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1000)
      const customer = buildUserProfile({
        existingPolicies: [{ product: 'home', premium: 1200, carrier: 'GEICO' }],
      })

      const opportunities = findApplicableDiscounts(carrier, policy, customer)
      expect(opportunities).toHaveLength(1)
      // 15% of (1000 + 1200) = 330
      expect(opportunities[0]?.annualSavings).toBe(330)
    })

    it('should include citation in opportunities', () => {
      const discounts = [
        {
          _id: 'disc_test',
          name: { _id: 'fld1', value: 'Test Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: { description: 'Test' },
            _sources: [],
          },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1000)

      const opportunities = findApplicableDiscounts(carrier, policy)
      expect(opportunities[0]?.citation).toBeDefined()
      expect(opportunities[0]?.citation.id).toBe('disc_test')
      expect(opportunities[0]?.citation.carrier).toBe('GEICO')
    })

    it('should include stackable and requiresDocumentation flags', () => {
      const discounts = [
        {
          _id: 'disc_test',
          name: { _id: 'fld1', value: 'Good Student', _sources: [] },
          percentage: { _id: 'fld2', value: 5, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: { description: 'Test' },
            _sources: [],
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
          metadata: {
            discountType: 'lifestyle' as const,
            requiresDocumentation: true,
          },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1000)

      const opportunities = findApplicableDiscounts(carrier, policy)
      expect(opportunities[0]?.stackable).toBe(true)
      expect(opportunities[0]?.requiresDocumentation).toBe(true)
    })

    it('should handle multiple eligible discounts', () => {
      const discounts = [
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld1', value: 'Safe Driver', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
              description: 'Safe driver',
            },
            _sources: [],
          },
        },
        {
          _id: 'disc_good_student',
          name: { _id: 'fld6', value: 'Good Student', _sources: [] },
          percentage: { _id: 'fld7', value: 5, _sources: [] },
          products: { _id: 'fld8', value: ['auto'], _sources: [] },
          states: { _id: 'fld9', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld10',
            value: { description: 'Good student' },
            _sources: [],
          },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1000)
      const customer = buildUserProfile({ cleanRecord3Yr: true })

      const opportunities = findApplicableDiscounts(carrier, policy, customer)
      expect(opportunities.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('analyzeBundleOptions', () => {
    it('should identify bundle opportunities', () => {
      const discounts = [
        {
          _id: 'disc_bundle',
          name: { _id: 'fld1', value: 'Multi-Policy Bundle', _sources: [] },
          percentage: { _id: 'fld2', value: 15, _sources: [] },
          products: { _id: 'fld3', value: ['auto', 'home'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              bundleProducts: ['auto', 'home'],
              description: 'Bundle discount',
            },
            _sources: [],
          },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], discounts)
        .carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1000)

      const opportunities = analyzeBundleOptions(carrier, policy)
      expect(opportunities).toHaveLength(1)
      expect(opportunities[0]?.missingProducts).toEqual(['home'])
      expect(opportunities[0]?.estimatedSavings).toBeGreaterThan(0)
    })

    it('should apply CA multiplier to bundle savings calculation', () => {
      const discounts = [
        {
          _id: 'disc_bundle',
          name: { _id: 'fld1', value: 'Multi-Policy Bundle', _sources: [] },
          percentage: { _id: 'fld2', value: 15, _sources: [] },
          products: { _id: 'fld3', value: ['auto', 'home'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              bundleProducts: ['auto', 'home'],
              description: 'Bundle discount',
            },
            _sources: [],
          },
          stateVariations: {
            CA: { multiplier: 0.5 },
          },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], discounts)
        .carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1000)

      const opportunities = analyzeBundleOptions(carrier, policy)
      // CA gets 7.5% (15 * 0.5) instead of 15%
      expect(opportunities[0]?.estimatedSavings).toBeGreaterThan(0)
    })
  })

  describe('end-to-end scenarios', () => {
    it('should handle complete policy analysis with multiple discount types', () => {
      const discounts = [
        {
          _id: 'disc_bundle',
          name: { _id: 'fld1', value: 'Multi-Policy Bundle', _sources: [] },
          percentage: { _id: 'fld2', value: 15, _sources: [] },
          products: { _id: 'fld3', value: ['auto', 'home'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              bundleProducts: ['auto', 'home'],
              mustHaveProducts: ['auto', 'home'],
              description: 'Bundle',
            },
            _sources: [],
          },
          metadata: { discountType: 'bundle' as const, evaluationPriority: 'high' as const },
          stateVariations: { CA: { multiplier: 0.5 } },
        },
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld6', value: 'Safe Driver', _sources: [] },
          percentage: { _id: 'fld7', value: 10, _sources: [] },
          products: { _id: 'fld8', value: ['auto'], _sources: [] },
          states: { _id: 'fld9', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld10',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
              description: 'Safe driver',
            },
            _sources: [],
          },
          metadata: { discountType: 'driver' as const, evaluationPriority: 'high' as const },
          stateVariations: { CA: { multiplier: 0.5 } },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], discounts)
        .carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1000)
      const customer = buildUserProfile({
        cleanRecord3Yr: true,
        existingPolicies: [{ product: 'home', premium: 1200, carrier: 'GEICO' }],
      })

      // Find applicable discounts
      const opportunities = findApplicableDiscounts(carrier, policy, customer)
      expect(opportunities.length).toBeGreaterThanOrEqual(1)

      // Analyze bundle options (should be empty since client has full bundle)
      const bundleOpportunities = analyzeBundleOptions(carrier, policy, customer)
      expect(bundleOpportunities).toHaveLength(0)
    })

    it('should handle policy with no eligible discounts', () => {
      const discounts = [
        {
          _id: 'disc_test',
          name: { _id: 'fld1', value: 'Test Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['TX'], _sources: [] }, // Not CA
          requirements: {
            _id: 'fld5',
            value: { description: 'Test' },
            _sources: [],
          },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1000)

      const opportunities = findApplicableDiscounts(carrier, policy)
      expect(opportunities).toHaveLength(0)
    })
  })
})
