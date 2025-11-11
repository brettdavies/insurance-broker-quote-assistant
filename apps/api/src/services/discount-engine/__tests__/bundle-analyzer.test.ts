/**
 * Bundle Analyzer Unit Tests
 */

import { describe, expect, it } from 'bun:test'
import type { Carrier, PolicySummary, UserProfile } from '@repo/shared'
import { analyzeBundleOptions } from '../bundle-analyzer'
import { createTestCarrier } from '../../../__tests__/fixtures/knowledge-pack'

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

  it('should return empty array when policy missing state or product', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [
      createBundleDiscount(),
    ]).carrier as Carrier

    expect(analyzeBundleOptions(carrier, {} as PolicySummary)).toHaveLength(0)
    expect(
      analyzeBundleOptions(carrier, { state: 'CA' } as PolicySummary)
    ).toHaveLength(0)
    expect(
      analyzeBundleOptions(carrier, { productType: 'auto' } as PolicySummary)
    ).toHaveLength(0)
  })

  it('should identify bundle opportunity when client has partial bundle', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [
      createBundleDiscount(),
    ]).carrier as Carrier
    const policy = createTestPolicy('auto', 1000)

    const opportunities = analyzeBundleOptions(carrier, policy)
    expect(opportunities).toHaveLength(1)
    expect(opportunities[0].missingProducts).toEqual(['home'])
    expect(opportunities[0].requiredActions[0]).toContain('Add home')
  })

  it('should not return opportunity when client has all bundle products', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [
      createBundleDiscount(),
    ]).carrier as Carrier
    const policy = createTestPolicy('auto', 1000)
    const customer = createTestCustomer([
      { product: 'home', premium: 1200, carrier: 'GEICO' },
    ])

    const opportunities = analyzeBundleOptions(carrier, policy, customer)
    expect(opportunities).toHaveLength(0)
  })

  it('should not return opportunity when client has none of bundle products', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [
      createBundleDiscount(),
    ]).carrier as Carrier
    const policy = createTestPolicy('renters', 500)

    const opportunities = analyzeBundleOptions(carrier, policy)
    expect(opportunities).toHaveLength(0)
  })

  it('should calculate estimated savings for bundle opportunity', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [
      createBundleDiscount(),
    ]).carrier as Carrier
    const policy = createTestPolicy('auto', 1000)

    const opportunities = analyzeBundleOptions(carrier, policy)
    expect(opportunities[0].estimatedSavings).toBeGreaterThan(0)
  })

  it('should include citation in bundle opportunity', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [
      createBundleDiscount(),
    ]).carrier as Carrier
    const policy = createTestPolicy('auto', 1000)

    const opportunities = analyzeBundleOptions(carrier, policy)
    expect(opportunities[0].citation).toBeDefined()
    expect(opportunities[0].citation.id).toBe('disc_bundle')
    expect(opportunities[0].citation.type).toBe('discount')
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

    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home', 'renters'], [
      bundle1,
      bundle2,
    ]).carrier as Carrier
    const policy = createTestPolicy('auto', 1000)

    const opportunities = analyzeBundleOptions(carrier, policy)
    expect(opportunities.length).toBeGreaterThanOrEqual(1)
  })

  it('should handle existing policies in bundle analysis', () => {
    const carrier = createTestCarrier('GEICO', ['CA'], ['auto', 'home'], [
      createBundleDiscount(),
    ]).carrier as Carrier
    const policy = createTestPolicy('home', 1200)
    const customer = createTestCustomer([
      { product: 'auto', premium: 1000, carrier: 'GEICO' },
    ])

    // Client has auto (existing) and home (current), so no opportunity
    const opportunities = analyzeBundleOptions(carrier, policy, customer)
    expect(opportunities).toHaveLength(0)
  })
})

