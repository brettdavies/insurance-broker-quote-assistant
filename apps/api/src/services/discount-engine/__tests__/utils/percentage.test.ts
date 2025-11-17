/**
 * Percentage Calculation Utilities Unit Tests
 */

import { describe, expect, it } from 'bun:test'
import type { Discount } from '@repo/shared'
import { getEffectivePercentage } from '../../utils/percentage'

describe('getEffectivePercentage', () => {
  const createTestDiscount = (
    basePercentage: number,
    stateVariations?: Discount['stateVariations'],
    productVariations?: Discount['productVariations']
  ): Discount => ({
    _id: 'disc_test',
    name: { _id: 'fld_name', value: 'Test Discount', _sources: [] },
    percentage: { _id: 'fld_pct', value: basePercentage, _sources: [] },
    products: { _id: 'fld_products', value: ['auto'], _sources: [] },
    states: { _id: 'fld_states', value: ['CA', 'TX'], _sources: [] },
    requirements: {
      _id: 'fld_reqs',
      value: { description: 'Test requirements' },
      _sources: [],
    },
    stateVariations,
    productVariations,
  })

  describe('base percentage', () => {
    it('should return base percentage when no variations', () => {
      const discount = createTestDiscount(10)
      expect(getEffectivePercentage(discount, 'CA', 'auto')).toBe(10)
      expect(getEffectivePercentage(discount, 'TX', 'auto')).toBe(10)
    })
  })

  describe('state variations', () => {
    it('should apply multiplier for state variation', () => {
      const discount = createTestDiscount(10, {
        CA: { multiplier: 0.5 },
      })
      expect(getEffectivePercentage(discount, 'CA', 'auto')).toBe(5)
      expect(getEffectivePercentage(discount, 'TX', 'auto')).toBe(10)
    })

    it('should apply absolute percentage override for state', () => {
      const discount = createTestDiscount(10, {
        CA: { percentage: 7 },
      })
      expect(getEffectivePercentage(discount, 'CA', 'auto')).toBe(7)
      expect(getEffectivePercentage(discount, 'TX', 'auto')).toBe(10)
    })

    it('should prioritize multiplier over percentage in state variation', () => {
      const discount = createTestDiscount(10, {
        CA: { multiplier: 0.5, percentage: 7 },
      })
      // Multiplier should be checked first
      expect(getEffectivePercentage(discount, 'CA', 'auto')).toBe(5)
    })

    it('should handle multiple state variations', () => {
      const discount = createTestDiscount(10, {
        CA: { multiplier: 0.5 },
        TX: { percentage: 8 },
      })
      expect(getEffectivePercentage(discount, 'CA', 'auto')).toBe(5)
      expect(getEffectivePercentage(discount, 'TX', 'auto')).toBe(8)
      expect(getEffectivePercentage(discount, 'FL', 'auto')).toBe(10)
    })
  })

  describe('product variations', () => {
    it('should apply product variation when no state variation', () => {
      const discount = createTestDiscount(10, undefined, {
        home: { percentage: 12 },
      })
      expect(getEffectivePercentage(discount, 'CA', 'auto')).toBe(10)
      expect(getEffectivePercentage(discount, 'CA', 'home')).toBe(12)
    })

    it('should not apply product variation when state variation exists', () => {
      const discount = createTestDiscount(
        10,
        { CA: { multiplier: 0.5 } },
        {
          auto: { percentage: 15 },
        }
      )
      // State variation takes precedence
      expect(getEffectivePercentage(discount, 'CA', 'auto')).toBe(5)
    })

    it('should apply product variation when no state variation for that state', () => {
      const discount = createTestDiscount(
        10,
        { CA: { multiplier: 0.5 } },
        {
          auto: { percentage: 15 },
        }
      )
      // TX has no state variation, so product variation applies
      expect(getEffectivePercentage(discount, 'TX', 'auto')).toBe(15)
    })
  })

  describe('edge cases', () => {
    it('should handle zero base percentage', () => {
      const discount = createTestDiscount(0)
      expect(getEffectivePercentage(discount, 'CA', 'auto')).toBe(0)
    })

    it('should handle zero multiplier', () => {
      const discount = createTestDiscount(10, {
        CA: { multiplier: 0 },
      })
      expect(getEffectivePercentage(discount, 'CA', 'auto')).toBe(0)
    })

    it('should handle large percentages', () => {
      const discount = createTestDiscount(50)
      expect(getEffectivePercentage(discount, 'CA', 'auto')).toBe(50)
    })
  })
})
