/**
 * Single Product Discount Evaluator Unit Tests
 */

import { describe, expect, it } from 'bun:test'
import type { Discount, PolicySummary, UserProfile } from '@repo/shared'
import { SingleProductDiscountEvaluator } from '../../evaluators/single-product-evaluator'

describe('SingleProductDiscountEvaluator', () => {
  const createTestDiscount = (percentage: number): Discount => ({
    _id: 'disc_single',
    name: { _id: 'fld_name', value: 'Safe Driver', _sources: [] },
    percentage: { _id: 'fld_pct', value: percentage, _sources: [] },
    products: { _id: 'fld_products', value: ['auto'], _sources: [] },
    states: { _id: 'fld_states', value: ['CA'], _sources: [] },
    requirements: {
      _id: 'fld_reqs',
      value: {
        mustHaveProducts: ['auto'],
        description: 'Single product discount',
      },
      _sources: [],
    },
  })

  const createTestPolicy = (productType: string, premium: number): PolicySummary => ({
    state: 'CA',
    productType: productType as any,
    premiums: { annual: premium },
  })

  describe('calculateSavings', () => {
    it('should calculate savings for single product', () => {
      const evaluator = new SingleProductDiscountEvaluator()
      const discount = createTestDiscount(10)
      const policy = createTestPolicy('auto', 1000)

      const result = evaluator.calculateSavings(discount, policy)
      expect(result.annualDollars).toBe(100) // 10% of 1000
      expect(result.explanation).toContain('10% discount on auto')
    })

    it('should handle different percentages', () => {
      const evaluator = new SingleProductDiscountEvaluator()
      const discount = createTestDiscount(15)
      const policy = createTestPolicy('auto', 2000)

      const result = evaluator.calculateSavings(discount, policy)
      expect(result.annualDollars).toBe(300) // 15% of 2000
    })

    it('should handle zero premium', () => {
      const evaluator = new SingleProductDiscountEvaluator()
      const discount = createTestDiscount(10)
      const policy = createTestPolicy('auto', 0)

      const result = evaluator.calculateSavings(discount, policy)
      expect(result.annualDollars).toBe(0)
    })

    it('should work with different product types', () => {
      const evaluator = new SingleProductDiscountEvaluator()
      const discount = createTestDiscount(10)
      const policy = createTestPolicy('home', 1500)

      const result = evaluator.calculateSavings(discount, policy)
      expect(result.annualDollars).toBe(150) // 10% of 1500
      expect(result.explanation).toContain('home')
    })
  })

  describe('evaluateEligibility', () => {
    it('should use base evaluator for eligibility checks', () => {
      const evaluator = new SingleProductDiscountEvaluator()
      const discount = createTestDiscount(10)
      const policy = createTestPolicy('auto', 1000)

      const result = evaluator.evaluateEligibility(discount, policy)
      expect(result.eligible).toBe(true)
    })

    it('should check product requirements', () => {
      const evaluator = new SingleProductDiscountEvaluator()
      const discount = createTestDiscount(10)
      const policy = createTestPolicy('home', 1000) // Wrong product

      const result = evaluator.evaluateEligibility(discount, policy)
      expect(result.eligible).toBe(false)
    })
  })
})

