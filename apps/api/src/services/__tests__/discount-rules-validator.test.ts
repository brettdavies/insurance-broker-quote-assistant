/**
 * Discount Rules Validator Unit Tests
 *
 * Tests deterministic discount validation logic:
 * - Opportunity validation against knowledge pack
 * - Eligibility re-validation using discount engine evaluators
 * - Discount stacking validation
 * - Savings calculation validation
 * - Confidence score calculation
 * - Documentation requirements flagging
 * - Decision trace logging
 *
 * 100% deterministic - no LLM calls.
 *
 * @see docs/stories/2.3.discount-rules-engine.md#task-8
 */

import { beforeEach, describe, expect, it, spyOn } from 'bun:test'
import type { Carrier, Opportunity, PolicySummary, UserProfile } from '@repo/shared'
import { buildOpportunity, buildPolicySummary, buildUserProfile } from '@repo/shared/src/test-utils'
import {
  createTestCarrier,
  createTestOpportunity,
  createTestPolicy,
} from '../../__tests__/fixtures/knowledge-pack'
import { DiscountRulesValidator } from '../discount-rules-validator'
import * as knowledgePackRAG from '../knowledge-pack-rag'

describe('DiscountRulesValidator', () => {
  let validator: DiscountRulesValidator

  beforeEach(() => {
    validator = new DiscountRulesValidator(knowledgePackRAG)
  })

  describe('validateOpportunities', () => {
    it('should validate opportunities against knowledge pack', async () => {
      const discounts = [
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld1', value: 'Safe Driver Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
              description: 'Safe driver discount',
            },
            _sources: [],
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      const customer = buildUserProfile({ cleanRecord3Yr: true })
      const opportunities = [
        createTestOpportunity('disc_safe_driver', 'Safe Driver Discount', 10, 120, 'GEICO'),
      ]

      // Mock knowledge pack RAG
      const discount = discounts[0]
      if (!discount) {
        throw new Error('Test setup error: discounts array is empty')
      }
      spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue({
        discount,
        carrier,
      })

      const validated = await validator.validateOpportunities(
        opportunities,
        policy,
        carrier,
        customer
      )

      expect(validated).toHaveLength(1)
      expect(validated[0]?.confidenceScore).toBeGreaterThan(0)
      expect(validated[0]?.validationDetails.eligibilityChecks.discountFound).toBe(true)
      expect(validated[0]?.validationDetails.eligibilityChecks.eligibilityValidated).toBe(true)
      expect(validated[0]?.validationDetails.eligibilityChecks.savingsCalculated).toBe(true)
    })

    it('should return low confidence when discount not found in knowledge pack', async () => {
      const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      const opportunities = [
        createTestOpportunity('disc_nonexistent', 'Non-existent Discount', 10, 120, 'GEICO'),
      ]

      // Mock knowledge pack RAG to return undefined
      spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue(undefined)

      const validated = await validator.validateOpportunities(opportunities, policy, carrier)

      expect(validated).toHaveLength(1)
      expect(validated[0]?.confidenceScore).toBe(0)
      expect(validated[0]?.validationDetails.eligibilityChecks.discountFound).toBe(false)
      expect(validated[0]?.validationDetails.missingData).toContain(
        'Discount not found in knowledge pack'
      )
    })

    it('should flag missing requirements when eligibility check fails', async () => {
      const discounts = [
        {
          _id: 'disc_good_student',
          name: { _id: 'fld1', value: 'Good Student Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                goodStudent: true,
              },
              description: 'Good student discount',
            },
            _sources: [],
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      // Customer profile without goodStudent field
      const customer = buildUserProfile({ cleanRecord3Yr: true })
      const opportunities = [
        createTestOpportunity('disc_good_student', 'Good Student Discount', 10, 120, 'GEICO'),
      ]

      const discount = discounts[0]
      if (!discount) {
        throw new Error('Test setup error: discounts array is empty')
      }
      spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue({
        discount,
        carrier,
      })

      const validated = await validator.validateOpportunities(
        opportunities,
        policy,
        carrier,
        customer
      )

      expect(validated).toHaveLength(1)
      expect(validated[0]?.validationDetails.eligibilityChecks.eligibilityValidated).toBe(true)
      // Should have missing requirements
      expect(validated[0]?.validationDetails.missingData.length).toBeGreaterThan(0)
    })

    it('should validate savings calculation and use discount engine value if different', async () => {
      const discounts = [
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld1', value: 'Safe Driver Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
              description: 'Safe driver discount',
            },
            _sources: [],
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      const customer = buildUserProfile({ cleanRecord3Yr: true })
      // LLM identified savings as 150, but discount engine will calculate 120 (10% of 1200)
      const opportunities = [
        createTestOpportunity('disc_safe_driver', 'Safe Driver Discount', 10, 150, 'GEICO'),
      ]

      const discount = discounts[0]
      if (!discount) {
        throw new Error('Test setup error: discounts array is empty')
      }
      spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue({
        discount,
        carrier,
      })

      const validated = await validator.validateOpportunities(
        opportunities,
        policy,
        carrier,
        customer
      )

      expect(validated).toHaveLength(1)
      // Should use discount engine calculated savings (120) instead of LLM value (150)
      expect(validated[0]?.annualSavings).toBe(120)
      // Savings validation should show partial match
      const savingsRule = validated[0]?.validationDetails.rulesEvaluated.find(
        (r) => r.rule === 'Savings calculation validation'
      )
      expect(savingsRule?.result).toBe('partial')
    })

    it('should accept LLM savings if within $10 tolerance', async () => {
      const discounts = [
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld1', value: 'Safe Driver Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
              description: 'Safe driver discount',
            },
            _sources: [],
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      const customer = buildUserProfile({ cleanRecord3Yr: true })
      // LLM identified savings as 125, discount engine calculates 120 (within $10 tolerance)
      const opportunities = [
        createTestOpportunity('disc_safe_driver', 'Safe Driver Discount', 10, 125, 'GEICO'),
      ]

      const discount = discounts[0]
      if (!discount) {
        throw new Error('Test setup error: discounts array is empty')
      }
      spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue({
        discount,
        carrier,
      })

      const validated = await validator.validateOpportunities(
        opportunities,
        policy,
        carrier,
        customer
      )

      expect(validated).toHaveLength(1)
      // Should accept LLM value since within tolerance
      expect(validated[0]?.annualSavings).toBe(125)
      const savingsRule = validated[0]?.validationDetails.rulesEvaluated.find(
        (r) => r.rule === 'Savings calculation validation'
      )
      expect(savingsRule?.result).toBe('pass')
    })
  })

  describe('Stacking Validation', () => {
    it('should identify valid stacking combinations', async () => {
      const discounts = [
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld1', value: 'Safe Driver Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
            },
            _sources: [],
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
        {
          _id: 'disc_multi_car',
          name: { _id: 'fld7', value: 'Multi-Car Discount', _sources: [] },
          percentage: { _id: 'fld8', value: 5, _sources: [] },
          products: { _id: 'fld9', value: ['auto'], _sources: [] },
          states: { _id: 'fld10', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld11',
            value: {
              fieldRequirements: {
                vehicles: { min: 2 },
              },
            },
            _sources: [],
          },
          stackable: { _id: 'fld12', value: true, _sources: [] },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      const customer = buildUserProfile({ cleanRecord3Yr: true, vehicles: 2 })
      const opportunities = [
        createTestOpportunity('disc_safe_driver', 'Safe Driver Discount', 10, 120, 'GEICO'),
        createTestOpportunity('disc_multi_car', 'Multi-Car Discount', 5, 60, 'GEICO'),
      ]

      spyOn(knowledgePackRAG, 'getDiscountById').mockImplementation((id) => {
        const discount = discounts.find((d) => d._id === id)
        return discount ? { discount, carrier } : undefined
      })

      const validated = await validator.validateOpportunities(
        opportunities,
        policy,
        carrier,
        customer
      )

      expect(validated).toHaveLength(2)
      // Both discounts are stackable, so they should be in stackableWith
      expect(validated[0]?.stackableWith).toContain('disc_multi_car')
      expect(validated[1]?.stackableWith).toContain('disc_safe_driver')
    })

    it('should identify conflicts when discounts are not stackable', async () => {
      const discounts = [
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld1', value: 'Safe Driver Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
            },
            _sources: [],
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
        {
          _id: 'disc_exclusive',
          name: { _id: 'fld7', value: 'Exclusive Discount', _sources: [] },
          percentage: { _id: 'fld8', value: 15, _sources: [] },
          products: { _id: 'fld9', value: ['auto'], _sources: [] },
          states: { _id: 'fld10', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld11',
            value: {},
            _sources: [],
          },
          stackable: { _id: 'fld12', value: false, _sources: [] }, // Not stackable
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      const customer = buildUserProfile({ cleanRecord3Yr: true })
      const opportunities = [
        createTestOpportunity('disc_safe_driver', 'Safe Driver Discount', 10, 120, 'GEICO'),
        createTestOpportunity('disc_exclusive', 'Exclusive Discount', 15, 180, 'GEICO'),
      ]

      spyOn(knowledgePackRAG, 'getDiscountById').mockImplementation((id) => {
        const discount = discounts.find((d) => d._id === id)
        return discount ? { discount, carrier } : undefined
      })

      const validated = await validator.validateOpportunities(
        opportunities,
        policy,
        carrier,
        customer
      )

      expect(validated).toHaveLength(2)
      // Exclusive discount should not be in stackableWith
      const safeDriver = validated.find((v) => v.citation.id === 'disc_safe_driver')
      const exclusive = validated.find((v) => v.citation.id === 'disc_exclusive')
      // If stackableWith exists, it should not contain the non-stackable discount
      if (safeDriver?.stackableWith) {
        expect(safeDriver.stackableWith).not.toContain('disc_exclusive')
      }
      if (exclusive?.stackableWith) {
        expect(exclusive.stackableWith).not.toContain('disc_safe_driver')
      }
    })
  })

  describe('Confidence Score Calculation', () => {
    it('should calculate high confidence with complete policy and customer data', async () => {
      const discounts = [
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld1', value: 'Safe Driver Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
              description: 'Safe driver discount',
            },
            _sources: [],
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      const customer = buildUserProfile({
        age: 30,
        cleanRecord3Yr: true,
        state: 'CA',
      })
      const opportunities = [
        createTestOpportunity('disc_safe_driver', 'Safe Driver Discount', 10, 120, 'GEICO'),
      ]

      const discount = discounts[0]
      if (!discount) {
        throw new Error('Test setup error: discounts array is empty')
      }
      spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue({
        discount,
        carrier,
      })

      const validated = await validator.validateOpportunities(
        opportunities,
        policy,
        carrier,
        customer
      )

      expect(validated).toHaveLength(1)
      // Should have high confidence (policy complete + customer profile + discount found)
      expect(validated[0]?.confidenceScore).toBeGreaterThan(70)
    })

    it('should calculate lower confidence with incomplete policy data', async () => {
      const discounts = [
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld1', value: 'Safe Driver Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
            },
            _sources: [],
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      // Policy missing premium
      const policy: PolicySummary = {
        carrier: 'GEICO',
        state: 'CA',
        productType: 'auto',
        // premiums missing
      }
      const opportunities = [
        createTestOpportunity('disc_safe_driver', 'Safe Driver Discount', 10, 120, 'GEICO'),
      ]

      const discount = discounts[0]
      if (!discount) {
        throw new Error('Test setup error: discounts array is empty')
      }
      spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue({
        discount,
        carrier,
      })

      const validated = await validator.validateOpportunities(opportunities, policy, carrier)

      expect(validated).toHaveLength(1)
      // Should have lower confidence due to missing premium
      expect(validated[0]?.confidenceScore).toBeLessThan(70)
    })

    it('should calculate lower confidence when discount not found', async () => {
      const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      const opportunities = [
        createTestOpportunity('disc_nonexistent', 'Non-existent Discount', 10, 120, 'GEICO'),
      ]

      spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue(undefined)

      const validated = await validator.validateOpportunities(opportunities, policy, carrier)

      expect(validated).toHaveLength(1)
      // Should have zero confidence when discount not found
      expect(validated[0]?.confidenceScore).toBe(0)
    })
  })

  describe('Documentation Requirements Flagging', () => {
    it('should flag discounts requiring documentation', async () => {
      const discounts = [
        {
          _id: 'disc_good_student',
          name: { _id: 'fld1', value: 'Good Student Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                goodStudent: true,
              },
              description: 'Good student discount requires transcript',
            },
            _sources: [],
          },
          metadata: {
            requiresDocumentation: true,
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      // Note: goodStudent is not a UserProfile field, but the discount validator
      // checks fieldRequirements which may include custom fields via dynamic property access
      const customer = buildUserProfile({}) as UserProfile & { goodStudent?: boolean }
      // Set goodStudent for eligibility check (discount evaluator supports dynamic fields)
      ;(customer as any).goodStudent = true
      const opportunities = [
        createTestOpportunity('disc_good_student', 'Good Student Discount', 10, 120, 'GEICO'),
      ]

      const discount = discounts[0]
      if (!discount) {
        throw new Error('Test setup error: discounts array is empty')
      }
      spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue({
        discount,
        carrier,
      })

      const validated = await validator.validateOpportunities(
        opportunities,
        policy,
        carrier,
        customer
      )

      expect(validated).toHaveLength(1)
      expect(validated[0]?.requiresDocumentation).toBe(true)
      expect(validated[0]?.documentationRequirements).toBeDefined()
      expect(validated[0]?.documentationRequirements?.length).toBeGreaterThan(0)
    })

    it('should not flag discounts without documentation requirements', async () => {
      const discounts = [
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld1', value: 'Safe Driver Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
              description: 'Safe driver discount',
            },
            _sources: [],
          },
          // No requiresDocumentation metadata
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      const customer = buildUserProfile({ cleanRecord3Yr: true })
      const opportunities = [
        createTestOpportunity('disc_safe_driver', 'Safe Driver Discount', 10, 120, 'GEICO'),
      ]

      const discount = discounts[0]
      if (!discount) {
        throw new Error('Test setup error: discounts array is empty')
      }
      spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue({
        discount,
        carrier,
      })

      const validated = await validator.validateOpportunities(
        opportunities,
        policy,
        carrier,
        customer
      )

      expect(validated).toHaveLength(1)
      expect(validated[0]?.requiresDocumentation).toBe(false)
      expect(validated[0]?.documentationRequirements).toBeUndefined()
    })
  })

  describe('Multi-Carrier and Multi-State Coverage', () => {
    const carriers = ['GEICO', 'Progressive', 'State Farm'] as const
    const states = ['CA', 'TX', 'FL', 'NY', 'IL'] as const

    // Test across 3 carriers and 5 states
    for (const carrierName of carriers) {
      for (const state of states) {
        it(`should validate opportunities for ${carrierName} in ${state}`, async () => {
          const discounts = [
            {
              _id: `disc_${carrierName.toLowerCase()}_${state.toLowerCase()}`,
              name: { _id: 'fld1', value: 'Test Discount', _sources: [] },
              percentage: { _id: 'fld2', value: 10, _sources: [] },
              products: { _id: 'fld3', value: ['auto'], _sources: [] },
              states: { _id: 'fld4', value: [state], _sources: [] },
              requirements: {
                _id: 'fld5',
                value: {
                  fieldRequirements: {
                    cleanRecord3Yr: true,
                  },
                },
                _sources: [],
              },
              stackable: { _id: 'fld6', value: true, _sources: [] },
            },
          ]

          const carrier = createTestCarrier(carrierName, [state], ['auto'], discounts)
            .carrier as Carrier
          const policy = createTestPolicy(carrierName, state, 'auto', 1200)
          const customer = buildUserProfile({ cleanRecord3Yr: true, state })
          const opportunities = [
            createTestOpportunity(
              `disc_${carrierName.toLowerCase()}_${state.toLowerCase()}`,
              'Test Discount',
              10,
              120,
              carrierName
            ),
          ]

          const discount = discounts[0]
          if (!discount) {
            throw new Error('Test setup error: discounts array is empty')
          }
          spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue({
            discount,
            carrier,
          })

          const validated = await validator.validateOpportunities(
            opportunities,
            policy,
            carrier,
            customer
          )

          expect(validated).toHaveLength(1)
          expect(validated[0]?.validationDetails.eligibilityChecks.discountFound).toBe(true)
          expect(validated[0]?.confidenceScore).toBeGreaterThan(0)
        })
      }
    }
  })

  describe('Decision Trace Logging', () => {
    it('should include all rules evaluated with citations', async () => {
      const discounts = [
        {
          _id: 'disc_safe_driver',
          name: { _id: 'fld1', value: 'Safe Driver Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
              description: 'Safe driver discount',
            },
            _sources: [],
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      const customer = buildUserProfile({ cleanRecord3Yr: true })
      const opportunities = [
        createTestOpportunity('disc_safe_driver', 'Safe Driver Discount', 10, 120, 'GEICO'),
      ]

      const discount = discounts[0]
      if (!discount) {
        throw new Error('Test setup error: discounts array is empty')
      }
      spyOn(knowledgePackRAG, 'getDiscountById').mockReturnValue({
        discount,
        carrier,
      })

      const validated = await validator.validateOpportunities(
        opportunities,
        policy,
        carrier,
        customer
      )

      expect(validated).toHaveLength(1)
      const validationDetails = validated[0]?.validationDetails

      // Should have rules evaluated with citations
      expect(validationDetails?.rulesEvaluated.length).toBeGreaterThan(0)

      // Check that all rules have citations
      for (const rule of validationDetails?.rulesEvaluated || []) {
        expect(rule.citation).toBeDefined()
        expect(rule.citation.id).toBeDefined()
        expect(rule.citation.type).toBe('discount')
        expect(rule.citation.carrier).toBeDefined()
        expect(rule.citation.file).toBeDefined()
        expect(rule.result).toMatch(/^(pass|fail|partial)$/)
      }

      // Should have discount lookup rule
      const discountLookupRule = validationDetails?.rulesEvaluated.find(
        (r) => r.rule === 'Discount lookup by citation ID'
      )
      expect(discountLookupRule).toBeDefined()
      expect(discountLookupRule?.result).toBe('pass')

      // Should have eligibility validation rule
      const eligibilityRule = validationDetails?.rulesEvaluated.find(
        (r) => r.rule === 'Eligibility validation'
      )
      expect(eligibilityRule).toBeDefined()

      // Should have savings calculation rule
      const savingsRule = validationDetails?.rulesEvaluated.find(
        (r) => r.rule === 'Savings calculation validation'
      )
      expect(savingsRule).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty opportunities array', async () => {
      const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)

      const validated = await validator.validateOpportunities([], policy, carrier)

      expect(validated).toHaveLength(0)
    })

    it('should handle multiple opportunities with mixed eligibility', async () => {
      const discounts = [
        {
          _id: 'disc_eligible',
          name: { _id: 'fld1', value: 'Eligible Discount', _sources: [] },
          percentage: { _id: 'fld2', value: 10, _sources: [] },
          products: { _id: 'fld3', value: ['auto'], _sources: [] },
          states: { _id: 'fld4', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld5',
            value: {
              fieldRequirements: {
                cleanRecord3Yr: true,
              },
            },
            _sources: [],
          },
          stackable: { _id: 'fld6', value: true, _sources: [] },
        },
        {
          _id: 'disc_not_eligible',
          name: { _id: 'fld7', value: 'Not Eligible Discount', _sources: [] },
          percentage: { _id: 'fld8', value: 15, _sources: [] },
          products: { _id: 'fld9', value: ['auto'], _sources: [] },
          states: { _id: 'fld10', value: ['CA'], _sources: [] },
          requirements: {
            _id: 'fld11',
            value: {
              fieldRequirements: {
                goodStudent: true, // Customer doesn't have this
              },
            },
            _sources: [],
          },
          stackable: { _id: 'fld12', value: true, _sources: [] },
        },
      ]

      const carrier = createTestCarrier('GEICO', ['CA'], ['auto'], discounts).carrier as Carrier
      const policy = createTestPolicy('GEICO', 'CA', 'auto', 1200)
      const customer = buildUserProfile({ cleanRecord3Yr: true }) // No goodStudent
      const opportunities = [
        createTestOpportunity('disc_eligible', 'Eligible Discount', 10, 120, 'GEICO'),
        createTestOpportunity('disc_not_eligible', 'Not Eligible Discount', 15, 180, 'GEICO'),
      ]

      spyOn(knowledgePackRAG, 'getDiscountById').mockImplementation((id) => {
        const discount = discounts.find((d) => d._id === id)
        return discount ? { discount, carrier } : undefined
      })

      const validated = await validator.validateOpportunities(
        opportunities,
        policy,
        carrier,
        customer
      )

      expect(validated).toHaveLength(2)
      // Both should be validated, but one should have missing requirements
      const eligible = validated.find((v) => v.citation.id === 'disc_eligible')
      const notEligible = validated.find((v) => v.citation.id === 'disc_not_eligible')

      expect(eligible?.validationDetails.missingData.length).toBe(0)
      expect(notEligible?.validationDetails.missingData.length).toBeGreaterThan(0)
    })
  })
})
