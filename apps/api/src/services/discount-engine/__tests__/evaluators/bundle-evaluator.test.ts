/**
 * Bundle Discount Evaluator Unit Tests
 */

import { describe, expect, it } from 'bun:test'
import type { Discount, PolicySummary, UserProfile } from '@repo/shared'
import { BundleDiscountEvaluator } from '../../evaluators/bundle-evaluator'

describe('BundleDiscountEvaluator', () => {
  const createTestDiscount = (bundleProducts?: string[]): Discount => ({
    _id: 'disc_bundle',
    name: { _id: 'fld_name', value: 'Multi-Policy Bundle', _sources: [] },
    percentage: { _id: 'fld_pct', value: 15, _sources: [] },
    products: { _id: 'fld_products', value: ['auto', 'home'], _sources: [] },
    states: { _id: 'fld_states', value: ['CA'], _sources: [] },
    requirements: {
      _id: 'fld_reqs',
      value: {
        bundleProducts: bundleProducts || ['auto', 'home'],
        description: 'Bundle discount',
      },
      _sources: [],
    },
  })

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

  describe('calculateSavings', () => {
    it('should calculate bundle savings across multiple products', () => {
      const evaluator = new BundleDiscountEvaluator()
      const discount = createTestDiscount(['auto', 'home'])
      const policy = createTestPolicy('auto', 1000)
      const customer = createTestCustomer([
        { product: 'home', premium: 1200, carrier: 'GEICO' },
      ])

      const result = evaluator.calculateSavings(discount, policy, customer)
      // 15% of (1000 + 1200) = 330
      expect(result.annualDollars).toBe(330)
      expect(result.explanation).toContain('auto + home bundle')
    })

    it('should calculate bundle savings for single product when no existing policies', () => {
      const evaluator = new BundleDiscountEvaluator()
      const discount = createTestDiscount(['auto', 'home'])
      const policy = createTestPolicy('auto', 1000)

      const result = evaluator.calculateSavings(discount, policy)
      // Falls back to single product: 15% of 1000 = 150
      expect(result.annualDollars).toBe(150)
    })

    it('should handle single product bundle (fallback)', () => {
      const evaluator = new BundleDiscountEvaluator()
      const discount = createTestDiscount(['auto']) // Single product, not really a bundle
      const policy = createTestPolicy('auto', 1000)

      const result = evaluator.calculateSavings(discount, policy)
      // Falls back to single product calculation
      expect(result.annualDollars).toBe(150) // 15% of 1000
      expect(result.explanation).toContain('auto')
    })

    it('should include only matching existing policies in bundle calculation', () => {
      const evaluator = new BundleDiscountEvaluator()
      const discount = createTestDiscount(['auto', 'home'])
      const policy = createTestPolicy('auto', 1000)
      const customer = createTestCustomer([
        { product: 'home', premium: 1200, carrier: 'GEICO' },
        { product: 'renters', premium: 500, carrier: 'GEICO' }, // Not in bundle
      ])

      const result = evaluator.calculateSavings(discount, policy, customer)
      // Only auto + home: 15% of (1000 + 1200) = 330
      expect(result.annualDollars).toBe(330)
    })

    it('should handle zero premium', () => {
      const evaluator = new BundleDiscountEvaluator()
      const discount = createTestDiscount(['auto', 'home'])
      const policy = createTestPolicy('auto', 0)

      const result = evaluator.calculateSavings(discount, policy)
      expect(result.annualDollars).toBe(0)
    })
  })

  describe('evaluateEligibility', () => {
    it('should use base evaluator for eligibility checks', () => {
      const evaluator = new BundleDiscountEvaluator()
      const discount = createTestDiscount(['auto', 'home'])
      const policy = createTestPolicy('auto', 1000)
      const customer = createTestCustomer([
        { product: 'home', premium: 1200, carrier: 'GEICO' },
      ])

      const result = evaluator.evaluateEligibility(discount, policy, customer)
      // Should check product requirements (mustHaveProducts: auto, home)
      expect(result.eligible).toBe(true)
    })

    it('should fail when bundle products not all present', () => {
      const evaluator = new BundleDiscountEvaluator()
      const discount = createTestDiscount(['auto', 'home'])
      // Update discount to require both products
      discount.requirements = {
        _id: 'fld_reqs',
        value: {
          bundleProducts: ['auto', 'home'],
          mustHaveProducts: ['auto', 'home'], // Require both products
          description: 'Bundle discount',
        },
        _sources: [],
      }
      const policy = createTestPolicy('auto', 1000)
      // No existing home policy

      const result = evaluator.evaluateEligibility(discount, policy)
      expect(result.eligible).toBe(false)
      expect(result.missingRequirements.some((m) => m.includes('home'))).toBe(
        true
      )
    })
  })
})

