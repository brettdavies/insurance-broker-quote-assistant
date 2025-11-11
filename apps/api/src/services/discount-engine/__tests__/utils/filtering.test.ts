/**
 * Discount Filtering Utilities Unit Tests
 */

import { describe, expect, it } from 'bun:test'
import type { Discount } from '@repo/shared'
import { filterByProductAndState, filterByType } from '../../utils/filtering'

describe('filterByProductAndState', () => {
  const createTestDiscount = (
    products: string[],
    states: string[]
  ): Discount => ({
    _id: 'disc_test',
    name: { _id: 'fld_name', value: 'Test Discount', _sources: [] },
    percentage: { _id: 'fld_pct', value: 10, _sources: [] },
    products: { _id: 'fld_products', value: products, _sources: [] },
    states: { _id: 'fld_states', value: states, _sources: [] },
    requirements: {
      _id: 'fld_reqs',
      value: { description: 'Test' },
      _sources: [],
    },
  })

  it('should filter discounts by product and state', () => {
    const discounts = [
      createTestDiscount(['auto'], ['CA', 'TX']),
      createTestDiscount(['home'], ['CA']),
      createTestDiscount(['auto'], ['TX', 'FL']),
    ]

    const filtered = filterByProductAndState(discounts, 'CA', 'auto')
    expect(filtered).toHaveLength(1)
    expect(filtered[0]._id).toBe('disc_test')
  })

  it('should return empty array when no matches', () => {
    const discounts = [
      createTestDiscount(['auto'], ['TX']),
      createTestDiscount(['home'], ['CA']),
    ]

    const filtered = filterByProductAndState(discounts, 'CA', 'auto')
    expect(filtered).toHaveLength(0)
  })

  it('should handle multiple matching discounts', () => {
    const discounts = [
      createTestDiscount(['auto'], ['CA']),
      createTestDiscount(['auto'], ['CA', 'TX']),
      createTestDiscount(['auto'], ['CA', 'FL']),
    ]

    const filtered = filterByProductAndState(discounts, 'CA', 'auto')
    expect(filtered).toHaveLength(3)
  })

  it('should match discounts with multiple products', () => {
    const discounts = [
      createTestDiscount(['auto', 'home'], ['CA']),
      createTestDiscount(['home'], ['CA']),
    ]

    const filtered = filterByProductAndState(discounts, 'CA', 'auto')
    expect(filtered).toHaveLength(1)
  })

  it('should match discounts with multiple states', () => {
    const discounts = [
      createTestDiscount(['auto'], ['CA', 'TX', 'FL']),
      createTestDiscount(['auto'], ['NY']),
    ]

    const filtered = filterByProductAndState(discounts, 'TX', 'auto')
    expect(filtered).toHaveLength(1)
  })
})

describe('filterByType', () => {
  const createTestDiscount = (discountType?: string): Discount => ({
    _id: 'disc_test',
    name: { _id: 'fld_name', value: 'Test Discount', _sources: [] },
    percentage: { _id: 'fld_pct', value: 10, _sources: [] },
    products: { _id: 'fld_products', value: ['auto'], _sources: [] },
    states: { _id: 'fld_states', value: ['CA'], _sources: [] },
    requirements: {
      _id: 'fld_reqs',
      value: { description: 'Test' },
      _sources: [],
    },
    metadata: discountType
      ? { discountType: discountType as any, evaluationPriority: 'medium' }
      : undefined,
  })

  it('should filter discounts by type', () => {
    const discounts = [
      createTestDiscount('bundle'),
      createTestDiscount('driver'),
      createTestDiscount('bundle'),
      createTestDiscount('lifestyle'),
    ]

    const filtered = filterByType(discounts, 'bundle')
    expect(filtered).toHaveLength(2)
  })

  it('should return empty array when no matches', () => {
    const discounts = [
      createTestDiscount('driver'),
      createTestDiscount('lifestyle'),
    ]

    const filtered = filterByType(discounts, 'bundle')
    expect(filtered).toHaveLength(0)
  })

  it('should exclude discounts without metadata', () => {
    const discounts = [
      createTestDiscount('bundle'),
      createTestDiscount(undefined),
      createTestDiscount('driver'),
    ]

    const filtered = filterByType(discounts, 'bundle')
    expect(filtered).toHaveLength(1)
  })

  it('should handle all discount types', () => {
    const types = ['bundle', 'driver', 'lifestyle', 'loyalty', 'other'] as const
    const discounts = types.map((type) => createTestDiscount(type))

    types.forEach((type) => {
      const filtered = filterByType(discounts, type)
      expect(filtered).toHaveLength(1)
    })
  })
})

