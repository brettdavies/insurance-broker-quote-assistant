/**
 * Bundle Analyzer Unit Tests
 */

import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import type { Carrier, PolicySummary, UserProfile } from '@repo/shared'
import { createTestCarrier } from '../../../__tests__/fixtures/knowledge-pack'
import * as knowledgePackRAG from '../../knowledge-pack-rag'
import { analyzeBundleOptions } from '../bundle-analyzer'

describe('analyzeBundleOptions', () => {
  const createTestPolicy = (productType: string, premium: number): PolicySummary => ({
    state: 'CA',
    productType: productType as any,
    premiums: { annual: premium },
  })

  const createTestCustomer = (
    existingPolicies?: Array<{ product: string; premium: number; carrier: string }>
  ): UserProfile => ({
    state: 'CA',
    existingPolicies: existingPolicies as any,
  })

  const createBundleDiscount = () => ({
    _id: 'disc_bundle',
    name: { _id: 'fld_name', value: 'Multi-Policy Bundle', _sources: [] },
    percentage: { _id: 'fld_pct', value: 15, _sources: [] },
    products: { _id: 'fld_products', value: ['auto', 'home'], _sources: [] },
    states: { _id: 'fld_states', value: ['CA', 'TX'], _sources: [] },
    requirements: {
      _id: 'fld_reqs',
      value: {
        bundleProducts: ['auto', 'home'],
        description: 'Bundle discount',
      },
      _sources: [],
    },
    stackable: { _id: 'fld_stack', value: true, _sources: [] },
  })

  // Helper to create a mock that returns discounts from a specific carrier
  const createMockForCarrier = (carrier: Carrier) => {
    // Mock getCarrierByName so the actual helper functions can use it
    spyOn(knowledgePackRAG, 'getCarrierByName').mockImplementation((carrierName: string) => {
      if (carrierName.toLowerCase() === carrier.name.toLowerCase()) {
        return carrier
      }
      return undefined
    })

    // Mock getCarrierBundleDiscounts to filter discounts by state
    spyOn(knowledgePackRAG, 'getCarrierBundleDiscounts').mockImplementation(
      (carrierName: string, stateCode: string) => {
        if (carrierName.toLowerCase() !== carrier.name.toLowerCase()) {
          return []
        }
        return carrier.discounts.filter((d) => {
          const states = d.states?.value || []
          return states.includes(stateCode.toUpperCase())
        })
      }
    )

    // Don't mock the helper functions - let them use the actual implementation
    // They will call getCarrierByName (which we mocked above) and use getFieldValue
  }

  afterEach(() => {
    // Restore original implementations
    ;(knowledgePackRAG.getCarrierByName as any).mockRestore?.()
    ;(knowledgePackRAG.getCarrierBundleDiscounts as any).mockRestore?.()
  })

  it('should return empty array when policy missing state or product', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [createBundleDiscount()])
      .carrier as Carrier
    createMockForCarrier(carrier)

    expect(analyzeBundleOptions(carrier, {} as PolicySummary)).toHaveLength(0)
    expect(analyzeBundleOptions(carrier, { state: 'CA' } as PolicySummary)).toHaveLength(0)
    expect(analyzeBundleOptions(carrier, { productType: 'auto' } as PolicySummary)).toHaveLength(0)
  })

  it('should identify bundle opportunity when client has partial bundle', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [createBundleDiscount()])
      .carrier as Carrier
    createMockForCarrier(carrier)
    const policy = createTestPolicy('auto', 1000)

    const bundleOptions = analyzeBundleOptions(carrier, policy)
    expect(bundleOptions).toHaveLength(1)
    expect(bundleOptions[0]?.product).toBe('home')
    expect(bundleOptions[0]?.requiredActions[0]).toContain('Add home')
  })

  it('should not return opportunity when client has all bundle products', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [createBundleDiscount()])
      .carrier as Carrier
    createMockForCarrier(carrier)
    const policy = createTestPolicy('auto', 1000)
    const customer = createTestCustomer([{ product: 'home', premium: 1200, carrier: 'GEICO' }])

    const bundleOptions = analyzeBundleOptions(carrier, policy, customer)
    expect(bundleOptions).toHaveLength(0)
  })

  it('should not return opportunity when client has none of bundle products', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [createBundleDiscount()])
      .carrier as Carrier
    createMockForCarrier(carrier)
    const policy = createTestPolicy('renters', 500)

    const bundleOptions = analyzeBundleOptions(carrier, policy)
    expect(bundleOptions).toHaveLength(0)
  })

  it('should calculate estimated savings for bundle opportunity', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [createBundleDiscount()])
      .carrier as Carrier
    createMockForCarrier(carrier)
    const policy = createTestPolicy('auto', 1000)

    const bundleOptions = analyzeBundleOptions(carrier, policy)
    expect(bundleOptions[0]?.estimatedSavings).toBeGreaterThan(0)
  })

  it('should include citation in bundle opportunity', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [createBundleDiscount()])
      .carrier as Carrier
    createMockForCarrier(carrier)
    const policy = createTestPolicy('auto', 1000)

    const bundleOptions = analyzeBundleOptions(carrier, policy)
    expect(bundleOptions[0]?.citation).toBeDefined()
    expect(bundleOptions[0]?.citation.id).toBe('disc_bundle')
    expect(bundleOptions[0]?.citation.type).toBe('discount')
  })

  it('should handle multiple bundle discounts', () => {
    const bundle1 = createBundleDiscount()
    const bundle2 = {
      ...createBundleDiscount(),
      _id: 'disc_bundle2',
      requirements: {
        _id: 'fld_reqs2',
        value: {
          bundleProducts: ['auto', 'renters'],
          description: 'Auto + Renters bundle',
        },
        _sources: [],
      },
    }

    const carrier = createTestCarrier(
      'GEICO',
      ['CA'],
      ['auto', 'home', 'renters'],
      [bundle1, bundle2]
    ).carrier as Carrier
    createMockForCarrier(carrier)
    const policy = createTestPolicy('auto', 1000)

    const bundleOptions = analyzeBundleOptions(carrier, policy)
    expect(bundleOptions.length).toBeGreaterThanOrEqual(1)
  })

  it('should handle existing policies in bundle analysis', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [createBundleDiscount()])
      .carrier as Carrier
    createMockForCarrier(carrier)
    const policy = createTestPolicy('home', 1200)
    const customer = createTestCustomer([{ product: 'auto', premium: 1000, carrier: 'GEICO' }])

    // Client has auto (existing) and home (current), so no opportunity
    const bundleOptions = analyzeBundleOptions(carrier, policy, customer)
    expect(bundleOptions).toHaveLength(0)
  })

  it('should filter out products not available from carrier', () => {
    // Carrier only offers auto and home, not renters
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [createBundleDiscount()])
      .carrier as Carrier
    createMockForCarrier(carrier)
    const policy = createTestPolicy('auto', 1000)

    const bundleOptions = analyzeBundleOptions(carrier, policy)
    // Should only return 'home' (carrier offers it), not 'renters' (carrier doesn't offer it)
    expect(bundleOptions.length).toBeGreaterThanOrEqual(1)
    expect(bundleOptions.every((opt) => opt.product === 'home')).toBe(true)
  })

  it('should return empty array when carrier does not operate in state', () => {
    // Carrier operates in TX but not CA
    const carrier = createTestCarrier('GEICO', ['TX'], ['auto', 'home'], [createBundleDiscount()])
      .carrier as Carrier
    createMockForCarrier(carrier)
    const policy = createTestPolicy('auto', 1000)
    policy.state = 'CA' // Policy is in CA, but carrier doesn't operate there

    const bundleOptions = analyzeBundleOptions(carrier, policy)
    expect(bundleOptions).toHaveLength(0)
  })
})
