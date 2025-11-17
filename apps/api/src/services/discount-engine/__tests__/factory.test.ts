/**
 * Discount Evaluator Factory Unit Tests
 */

import { describe, expect, it } from 'bun:test'
import type { Discount } from '@repo/shared'
import { BundleDiscountEvaluator } from '../evaluators/bundle-evaluator'
import { SingleProductDiscountEvaluator } from '../evaluators/single-product-evaluator'
import { getDiscountEvaluator } from '../factory'

describe('getDiscountEvaluator', () => {
  const createTestDiscount = (
    bundleProducts?: string[],
    discountType?: 'bundle' | 'driver' | 'lifestyle' | 'loyalty' | 'other'
  ): Discount => ({
    _id: 'disc_test',
    name: { _id: 'fld_name', value: 'Test Discount', _sources: [] },
    percentage: { _id: 'fld_pct', value: 10, _sources: [] },
    products: { _id: 'fld_products', value: ['auto'], _sources: [] },
    states: { _id: 'fld_states', value: ['CA'], _sources: [] },
    requirements: {
      _id: 'fld_reqs',
      value: {
        bundleProducts,
        description: 'Test',
      },
      _sources: [],
    },
    metadata: discountType
      ? ({ discountType, evaluationPriority: 'medium' } as Discount['metadata'])
      : undefined,
  })

  describe('bundle discount detection', () => {
    it('should return BundleDiscountEvaluator for bundle discounts', () => {
      const discount = createTestDiscount(['auto', 'home'])
      const evaluator = getDiscountEvaluator(discount)

      expect(evaluator).toBeInstanceOf(BundleDiscountEvaluator)
    })

    it('should detect bundle by bundleProducts in requirements', () => {
      const discount = createTestDiscount(['auto', 'home', 'renters'])
      const evaluator = getDiscountEvaluator(discount)

      expect(evaluator).toBeInstanceOf(BundleDiscountEvaluator)
    })

    it('should detect bundle by metadata discountType', () => {
      const discount = createTestDiscount(undefined, 'bundle')
      const evaluator = getDiscountEvaluator(discount)

      expect(evaluator).toBeInstanceOf(BundleDiscountEvaluator)
    })

    it('should prioritize bundleProducts over metadata', () => {
      const discount = createTestDiscount(['auto', 'home'], 'driver')
      const evaluator = getDiscountEvaluator(discount)

      // bundleProducts should take precedence
      expect(evaluator).toBeInstanceOf(BundleDiscountEvaluator)
    })
  })

  describe('single product discount detection', () => {
    it('should return SingleProductDiscountEvaluator for driver discounts', () => {
      const discount = createTestDiscount(undefined, 'driver')
      const evaluator = getDiscountEvaluator(discount)

      expect(evaluator).toBeInstanceOf(SingleProductDiscountEvaluator)
    })

    it('should return SingleProductDiscountEvaluator for lifestyle discounts', () => {
      const discount = createTestDiscount(undefined, 'lifestyle')
      const evaluator = getDiscountEvaluator(discount)

      expect(evaluator).toBeInstanceOf(SingleProductDiscountEvaluator)
    })

    it('should return SingleProductDiscountEvaluator for loyalty discounts', () => {
      const discount = createTestDiscount(undefined, 'loyalty')
      const evaluator = getDiscountEvaluator(discount)

      expect(evaluator).toBeInstanceOf(SingleProductDiscountEvaluator)
    })

    it('should return SingleProductDiscountEvaluator for other discounts', () => {
      const discount = createTestDiscount(undefined, 'other')
      const evaluator = getDiscountEvaluator(discount)

      expect(evaluator).toBeInstanceOf(SingleProductDiscountEvaluator)
    })

    it('should return SingleProductDiscountEvaluator when no metadata', () => {
      const discount = createTestDiscount()
      const evaluator = getDiscountEvaluator(discount)

      expect(evaluator).toBeInstanceOf(SingleProductDiscountEvaluator)
    })

    it('should return SingleProductDiscountEvaluator for single product bundleProducts', () => {
      const discount = createTestDiscount(['auto']) // Single product, not a bundle
      const evaluator = getDiscountEvaluator(discount)

      expect(evaluator).toBeInstanceOf(SingleProductDiscountEvaluator)
    })
  })
})
