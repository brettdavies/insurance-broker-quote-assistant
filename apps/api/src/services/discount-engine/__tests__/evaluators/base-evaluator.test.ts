/**
 * Base Discount Evaluator Unit Tests
 */

import { describe, expect, it } from 'bun:test'
import type { Discount, PolicySummary, UserProfile } from '@repo/shared'
import { BaseDiscountEvaluator } from '../../evaluators/base-evaluator'
import type { SavingsCalculation } from '../../types'

// Concrete implementation for testing
class TestEvaluator extends BaseDiscountEvaluator {
  protected calculateTypeSpecificSavings(
    discount: Discount,
    policy: PolicySummary,
    customerData: UserProfile | undefined,
    effectivePercentage: number
  ): SavingsCalculation {
    const premium = policy.premiums?.annual || 0
    return {
      annualDollars: (premium * effectivePercentage) / 100,
      explanation: `Test ${effectivePercentage}% discount`,
    }
  }
}

describe('BaseDiscountEvaluator', () => {
  const createTestDiscount = (requirements: any, metadata?: Discount['metadata']): Discount => ({
    _id: 'disc_test',
    name: { _id: 'fld_name', value: 'Test Discount', _sources: [] },
    percentage: { _id: 'fld_pct', value: 10, _sources: [] },
    products: { _id: 'fld_products', value: ['auto'], _sources: [] },
    states: { _id: 'fld_states', value: ['CA'], _sources: [] },
    requirements: {
      _id: 'fld_reqs',
      value: {
        description: 'Test',
        ...requirements, // Merge requirements
      },
      _sources: [],
    },
    metadata,
  })

  const createTestPolicy = (): PolicySummary => ({
    state: 'CA',
    productType: 'auto',
    premiums: { annual: 1000 },
  })

  const createTestCustomer = (overrides?: Partial<UserProfile>): UserProfile => ({
    state: 'CA',
    age: 30,
    cleanRecord3Yr: true,
    ...overrides,
  })

  describe('evaluateEligibility', () => {
    it('should pass when all requirements met', () => {
      const evaluator = new TestEvaluator()
      const discount = createTestDiscount({
        description: 'Test',
      })
      const policy = createTestPolicy()
      const customer = createTestCustomer()

      const result = evaluator.evaluateEligibility(discount, policy, customer)
      expect(result.eligible).toBe(true)
      expect(result.missingRequirements).toHaveLength(0)
    })

    it('should fail when product requirement not met', () => {
      const evaluator = new TestEvaluator()
      const discount = createTestDiscount({
        mustHaveProducts: ['home'],
        description: 'Test',
      })
      const policy = createTestPolicy() // policy is 'auto'

      const result = evaluator.evaluateEligibility(discount, policy)
      expect(result.eligible).toBe(false)
      expect(result.missingRequirements.length).toBeGreaterThan(0)
    })

    it('should fail when field requirement not met', () => {
      const evaluator = new TestEvaluator()
      const discount = createTestDiscount({
        fieldRequirements: {
          age: { min: 25 },
        },
      })
      const policy = createTestPolicy()
      const customer = createTestCustomer({ age: 20 })

      const result = evaluator.evaluateEligibility(discount, policy, customer)
      // Customer is 20 but discount requires age 25+, so should be ineligible
      expect(result.eligible).toBe(false)
      expect(result.missingRequirements.length).toBeGreaterThan(0)
      expect(result.missingRequirements.some((m) => m.includes('at least 25'))).toBe(true)
    })

    it('should require customer data when field requirements exist', () => {
      const evaluator = new TestEvaluator()
      const discount = createTestDiscount({
        fieldRequirements: {
          cleanRecord3Yr: true,
        },
        description: 'Test',
      })
      const policy = createTestPolicy()

      const result = evaluator.evaluateEligibility(discount, policy)
      expect(result.eligible).toBe(false)
      expect(result.missingRequirements).toContain(
        'Customer profile data required for eligibility check'
      )
    })

    it('should call type-specific requirement checks', () => {
      class CustomEvaluator extends TestEvaluator {
        protected checkTypeSpecificRequirements(): string[] {
          return ['Custom requirement not met']
        }
      }

      const evaluator = new CustomEvaluator()
      const discount = createTestDiscount({ description: 'Test' })
      const policy = createTestPolicy()

      const result = evaluator.evaluateEligibility(discount, policy)
      expect(result.eligible).toBe(false)
      expect(result.missingRequirements).toContain('Custom requirement not met')
    })
  })

  describe('calculateSavings', () => {
    it('should calculate savings with effective percentage', () => {
      const evaluator = new TestEvaluator()
      const discount = createTestDiscount({ description: 'Test' })
      const policy = createTestPolicy()

      const result = evaluator.calculateSavings(discount, policy)
      expect(result.annualDollars).toBe(100) // 10% of 1000
      expect(result.explanation).toContain('10%')
    })

    it('should return zero savings for invalid policy data', () => {
      const evaluator = new TestEvaluator()
      const discount = createTestDiscount({ description: 'Test' })
      const policy: PolicySummary = {} // Missing state and productType

      const result = evaluator.calculateSavings(discount, policy)
      expect(result.annualDollars).toBe(0)
      expect(result.explanation).toContain('Invalid policy data')
    })

    it('should use type-specific calculation', () => {
      class CustomEvaluator extends TestEvaluator {
        protected calculateTypeSpecificSavings(
          discount: Discount,
          policy: PolicySummary,
          customerData: UserProfile | undefined,
          effectivePercentage: number
        ): SavingsCalculation {
          return {
            annualDollars: 999,
            explanation: 'Custom calculation',
          }
        }
      }

      const evaluator = new CustomEvaluator()
      const discount = createTestDiscount({ description: 'Test' })
      const policy = createTestPolicy()

      const result = evaluator.calculateSavings(discount, policy)
      expect(result.annualDollars).toBe(999)
      expect(result.explanation).toBe('Custom calculation')
    })
  })
})
