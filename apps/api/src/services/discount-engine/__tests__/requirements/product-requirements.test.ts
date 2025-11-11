/**
 * Product Requirements Unit Tests
 */

import { describe, expect, it } from 'bun:test'
import type { PolicySummary, UserProfile } from '@repo/shared'
import type { DiscountRequirements } from '../../types'
import {
  checkMustHaveProducts,
  checkMinProducts,
  checkProductRequirements,
} from '../../requirements/product-requirements'

describe('checkMustHaveProducts', () => {
  const createPolicy = (productType?: string): PolicySummary => ({
    productType: productType as any,
    state: 'CA',
    premiums: { annual: 1000 },
  })

  const createCustomerData = (
    existingPolicies?: Array<{ product: string; premium: number; carrier: string }>
  ): UserProfile => ({
    state: 'CA',
    existingPolicies: existingPolicies as any,
  })

  it('should pass when policy has required product', () => {
    const requirements: DiscountRequirements = {
      mustHaveProducts: ['auto'],
      description: 'Test',
    }
    const policy = createPolicy('auto')

    const missing = checkMustHaveProducts(requirements, policy)
    expect(missing).toHaveLength(0)
  })

  it('should fail when policy missing required product', () => {
    const requirements: DiscountRequirements = {
      mustHaveProducts: ['auto'],
      description: 'Test',
    }
    const policy = createPolicy('home')

    const missing = checkMustHaveProducts(requirements, policy)
    expect(missing).toHaveLength(1)
    expect(missing[0]).toContain('Missing required products')
  })

  it('should pass when existing policy has required product', () => {
    const requirements: DiscountRequirements = {
      mustHaveProducts: ['auto'],
      description: 'Test',
    }
    const policy = createPolicy('home')
    const customerData = createCustomerData([
      { product: 'auto', premium: 1000, carrier: 'GEICO' },
    ])

    const missing = checkMustHaveProducts(requirements, policy, customerData)
    expect(missing).toHaveLength(0)
  })

  it('should pass when multiple products required and all present', () => {
    const requirements: DiscountRequirements = {
      mustHaveProducts: ['auto', 'home'],
      description: 'Test',
    }
    const policy = createPolicy('auto')
    const customerData = createCustomerData([
      { product: 'home', premium: 1000, carrier: 'GEICO' },
    ])

    const missing = checkMustHaveProducts(requirements, policy, customerData)
    expect(missing).toHaveLength(0)
  })

  it('should fail when one of multiple products missing', () => {
    const requirements: DiscountRequirements = {
      mustHaveProducts: ['auto', 'home'],
      description: 'Test',
    }
    const policy = createPolicy('auto')

    const missing = checkMustHaveProducts(requirements, policy)
    expect(missing).toHaveLength(1)
    expect(missing[0]).toContain('home')
  })

  it('should return empty array when no mustHaveProducts requirement', () => {
    const requirements: DiscountRequirements = {
      description: 'Test',
    }
    const policy = createPolicy('auto')

    const missing = checkMustHaveProducts(requirements, policy)
    expect(missing).toHaveLength(0)
  })
})

describe('checkMinProducts', () => {
  const createPolicy = (productType?: string): PolicySummary => ({
    productType: productType as any,
    state: 'CA',
    premiums: { annual: 1000 },
  })

  const createCustomerData = (
    existingPolicies?: Array<{ product: string; premium: number; carrier: string }>
  ): UserProfile => ({
    state: 'CA',
    existingPolicies: existingPolicies as any,
  })

  it('should pass when policy meets minimum product count', () => {
    const requirements: DiscountRequirements = {
      minProducts: 1,
      description: 'Test',
    }
    const policy = createPolicy('auto')

    const missing = checkMinProducts(requirements, policy)
    expect(missing).toHaveLength(0)
  })

  it('should pass when existing policies help meet minimum', () => {
    const requirements: DiscountRequirements = {
      minProducts: 2,
      description: 'Test',
    }
    const policy = createPolicy('auto')
    const customerData = createCustomerData([
      { product: 'home', premium: 1000, carrier: 'GEICO' },
    ])

    const missing = checkMinProducts(requirements, policy, customerData)
    expect(missing).toHaveLength(0)
  })

  it('should fail when below minimum product count', () => {
    const requirements: DiscountRequirements = {
      minProducts: 2,
      description: 'Test',
    }
    const policy = createPolicy('auto')

    const missing = checkMinProducts(requirements, policy)
    expect(missing).toHaveLength(1)
    expect(missing[0]).toContain('Need at least 2 products')
    expect(missing[0]).toContain('currently have 1')
  })

  it('should return empty array when no minProducts requirement', () => {
    const requirements: DiscountRequirements = {
      description: 'Test',
    }
    const policy = createPolicy('auto')

    const missing = checkMinProducts(requirements, policy)
    expect(missing).toHaveLength(0)
  })
})

describe('checkProductRequirements', () => {
  const createPolicy = (productType?: string): PolicySummary => ({
    productType: productType as any,
    state: 'CA',
    premiums: { annual: 1000 },
  })

  it('should check both mustHaveProducts and minProducts', () => {
    const requirements: DiscountRequirements = {
      mustHaveProducts: ['auto', 'home'],
      minProducts: 2,
      description: 'Test',
    }
    const policy = createPolicy('auto')

    const missing = checkProductRequirements(requirements, policy)
    expect(missing.length).toBeGreaterThan(0)
    expect(missing.some((m) => m.includes('Missing required products'))).toBe(
      true
    )
  })

  it('should return empty array when all requirements met', () => {
    const requirements: DiscountRequirements = {
      mustHaveProducts: ['auto'],
      minProducts: 1,
      description: 'Test',
    }
    const policy = createPolicy('auto')

    const missing = checkProductRequirements(requirements, policy)
    expect(missing).toHaveLength(0)
  })
})

