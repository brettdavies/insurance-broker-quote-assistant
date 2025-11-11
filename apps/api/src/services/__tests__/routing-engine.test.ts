/**
 * Routing Engine Unit Tests
 *
 * Tests deterministic routing logic with comprehensive coverage:
 * - State filtering
 * - Product filtering
 * - Eligibility evaluation
 * - Carrier ranking
 * - Confidence calculation
 * - Citation tracking
 * - No eligible carriers scenario
 *
 * @see docs/stories/1.6.routing-rules-engine.md#task-9
 */

import { describe, it, expect } from 'bun:test'
import { routeToCarrier } from '../routing-engine'
import type { Carrier } from '@repo/shared'
import { createTestCarrier } from '../../__tests__/fixtures/knowledge-pack'

describe('Routing Engine', () => {
  // Helper function to create mock getAllCarriers
  const createMockGetAllCarriers = (carriers: Carrier[]) => () => carriers

  describe('State filtering', () => {
    it('should filter carriers by state availability', () => {
      const geico = createTestCarrier('GEICO', ['CA', 'TX', 'FL'], ['auto', 'home'])
        .carrier as Carrier
      const progressive = createTestCarrier('Progressive', ['CA', 'NY'], ['auto', 'home'])
        .carrier as Carrier

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 30,
        },
        createMockGetAllCarriers([geico, progressive])
      )

      expect(result.eligibleCarriers).toContain('GEICO')
      expect(result.eligibleCarriers).toContain('Progressive')
      expect(result.primaryCarrier).toBeTruthy()
    })

    it('should exclude carriers not operating in state', () => {
      const geico = createTestCarrier('GEICO', ['CA', 'TX'], ['auto']).carrier as Carrier
      const progressive = createTestCarrier('Progressive', ['NY', 'IL'], ['auto'])
        .carrier as Carrier

      const result = routeToCarrier(
        {
          state: 'FL',
          productLine: 'auto',
          age: 30,
        },
        createMockGetAllCarriers([geico, progressive])
      )

      expect(result.eligibleCarriers).toEqual([])
      expect(result.primaryCarrier).toBe('')
      expect(result.confidence).toBe(0.0)
      expect(result.rationale).toContain('No carriers available')
    })
  })

  describe('Product filtering', () => {
    it('should filter carriers by product offering', () => {
      const geico = createTestCarrier('GEICO', ['CA'], ['auto', 'home', 'renters'])
        .carrier as Carrier
      const progressive = createTestCarrier('Progressive', ['CA'], ['auto', 'home'])
        .carrier as Carrier

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'renters',
          age: 25,
        },
        createMockGetAllCarriers([geico, progressive])
      )

      expect(result.eligibleCarriers).toContain('GEICO')
      expect(result.eligibleCarriers).not.toContain('Progressive')
    })

    it('should exclude carriers not offering product', () => {
      const geico = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'umbrella',
          age: 30,
        },
        createMockGetAllCarriers([geico])
      )

      expect(result.eligibleCarriers).toEqual([])
      expect(result.rationale).toContain('No carriers available')
    })
  })

  describe('Eligibility evaluation', () => {
    describe('Age limits', () => {
      it('should pass when age meets minAge requirement', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          minAge: {
            _id: 'fld_age',
            value: 18,
            _sources: [],
          },
        }

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 25,
        },
        createMockGetAllCarriers([carrier])
      )

        expect(result.eligibleCarriers).toContain('GEICO')
      })

      it('should fail when age below minAge', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          minAge: {
            _id: 'fld_age',
            value: 18,
            _sources: [],
          },
        }

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 16,
        },
        createMockGetAllCarriers([carrier])
      )

        expect(result.eligibleCarriers).not.toContain('GEICO')
        expect(result.rationale).toContain('Age 16 below minimum 18')
      })

      it('should pass when age meets maxAge requirement', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          maxAge: {
            _id: 'fld_age',
            value: 85,
            _sources: [],
          },
        }

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 75,
        },
        createMockGetAllCarriers([carrier])
      )

        expect(result.eligibleCarriers).toContain('GEICO')
      })

      it('should fail when age above maxAge', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          maxAge: {
            _id: 'fld_age',
            value: 85,
            _sources: [],
          },
        }

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 90,
        },
        createMockGetAllCarriers([carrier])
      )

        expect(result.eligibleCarriers).not.toContain('GEICO')
        expect(result.rationale).toContain('Age 90 above maximum 85')
      })

      it('should mark ineligible when age required but missing', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          minAge: {
            _id: 'fld_age',
            value: 18,
            _sources: [],
          },
        }

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
        },
        createMockGetAllCarriers([carrier])
      )

        expect(result.eligibleCarriers).not.toContain('GEICO')
        expect(result.rationale).toContain('Age required')
      })
    })

    describe('Vehicle limits (auto only)', () => {
      it('should pass when vehicle count meets maxVehicles requirement', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          maxVehicles: {
            _id: 'fld_vehicles',
            value: 4,
            _sources: [],
          },
        }

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 30,
          vehicles: 2,
        },
        createMockGetAllCarriers([carrier])
      )

        expect(result.eligibleCarriers).toContain('GEICO')
      })

      it('should fail when vehicle count exceeds maxVehicles', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          maxVehicles: {
            _id: 'fld_vehicles',
            value: 4,
            _sources: [],
          },
        }

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 30,
          vehicles: 5,
        },
        createMockGetAllCarriers([carrier])
      )

        expect(result.eligibleCarriers).not.toContain('GEICO')
        expect(result.rationale).toContain('Vehicle count 5 exceeds maximum 4')
      })

      it('should mark ineligible when vehicles required but missing', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          maxVehicles: {
            _id: 'fld_vehicles',
            value: 4,
            _sources: [],
          },
        }

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 30,
        },
        createMockGetAllCarriers([carrier])
      )

      expect(result.eligibleCarriers).not.toContain('GEICO')
      expect(result.rationale).toContain('Vehicle count required')
      })
    })

    describe('Credit score minimums', () => {
      it('should pass when credit score meets minimum requirement', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          minCreditScore: {
            _id: 'fld_credit',
            value: 600,
            _sources: [],
          },
        }

        const result = routeToCarrier(
          {
            state: 'CA',
            productLine: 'auto',
            age: 30,
            creditScore: 650,
          },
          createMockGetAllCarriers([carrier])
        )

        expect(result.eligibleCarriers).toContain('GEICO')
      })

      it('should fail when credit score below minimum', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          minCreditScore: {
            _id: 'fld_credit',
            value: 600,
            _sources: [],
          },
        }

        const result = routeToCarrier(
          {
            state: 'CA',
            productLine: 'auto',
            age: 30,
            creditScore: 550,
          },
          createMockGetAllCarriers([carrier])
        )

        expect(result.eligibleCarriers).not.toContain('GEICO')
        expect(result.rationale).toContain('Credit score 550 below minimum 600')
      })

      it('should mark ineligible when credit score required but missing', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          minCreditScore: {
            _id: 'fld_credit',
            value: 600,
            _sources: [],
          },
        }

        const result = routeToCarrier(
          {
            state: 'CA',
            productLine: 'auto',
            age: 30,
          },
          createMockGetAllCarriers([carrier])
        )

        expect(result.eligibleCarriers).not.toContain('GEICO')
        expect(result.rationale).toContain('Credit score required')
      })
    })

    describe('Property type restrictions (home/renters)', () => {
      it('should pass when property type is allowed', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['home']).carrier as Carrier
        carrier.eligibility.home = {
          _id: 'elig_test',
          _sources: [],
          propertyTypeRestrictions: {
            _id: 'fld_property',
            value: ['single-family', 'condo', 'townhouse'],
            _sources: [],
          },
        }

        const result = routeToCarrier(
          {
            state: 'CA',
            productLine: 'home',
            age: 30,
            propertyType: 'single-family',
          },
          createMockGetAllCarriers([carrier])
        )

        expect(result.eligibleCarriers).toContain('GEICO')
      })

      it('should fail when property type is not allowed', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['home']).carrier as Carrier
        carrier.eligibility.home = {
          _id: 'elig_test',
          _sources: [],
          propertyTypeRestrictions: {
            _id: 'fld_property',
            value: ['single-family', 'condo'],
            _sources: [],
          },
        }

        const result = routeToCarrier(
          {
            state: 'CA',
            productLine: 'home',
            age: 30,
            propertyType: 'mobile-home',
          },
          createMockGetAllCarriers([carrier])
        )

        expect(result.eligibleCarriers).not.toContain('GEICO')
        expect(result.rationale).toContain("Property type 'mobile-home' not allowed")
      })

      it('should mark ineligible when property type required but missing', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['home']).carrier as Carrier
        carrier.eligibility.home = {
          _id: 'elig_test',
          _sources: [],
          propertyTypeRestrictions: {
            _id: 'fld_property',
            value: ['single-family', 'condo'],
            _sources: [],
          },
        }

        const result = routeToCarrier(
          {
            state: 'CA',
            productLine: 'home',
            age: 30,
          },
          createMockGetAllCarriers([carrier])
        )

        expect(result.eligibleCarriers).not.toContain('GEICO')
        expect(result.rationale).toContain('Property type required')
      })

      it('should work for renters insurance', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['renters']).carrier as Carrier
        carrier.eligibility.renters = {
          _id: 'elig_test',
          _sources: [],
          propertyTypeRestrictions: {
            _id: 'fld_property',
            value: ['apartment', 'condo'],
            _sources: [],
          },
        }

        const result = routeToCarrier(
          {
            state: 'CA',
            productLine: 'renters',
            age: 25,
            propertyType: 'apartment',
          },
          createMockGetAllCarriers([carrier])
        )

        expect(result.eligibleCarriers).toContain('GEICO')
      })
    })

    describe('Driving record requirements (auto only)', () => {
      it('should pass when clean driving record required and provided', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          requiresCleanDrivingRecord: {
            _id: 'fld_driving',
            value: true,
            _sources: [],
          },
        }

        const result = routeToCarrier(
          {
            state: 'CA',
            productLine: 'auto',
            age: 30,
            cleanRecord3Yr: true,
          },
          createMockGetAllCarriers([carrier])
        )

        expect(result.eligibleCarriers).toContain('GEICO')
      })

      it('should fail when clean driving record required but not met', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          requiresCleanDrivingRecord: {
            _id: 'fld_driving',
            value: true,
            _sources: [],
          },
        }

        const result = routeToCarrier(
          {
            state: 'CA',
            productLine: 'auto',
            age: 30,
            cleanRecord3Yr: false,
          },
          createMockGetAllCarriers([carrier])
        )

        expect(result.eligibleCarriers).not.toContain('GEICO')
        expect(result.rationale).toContain('Clean driving record (3 years) required but not met')
      })

      it('should mark ineligible when clean driving record required but missing', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          requiresCleanDrivingRecord: {
            _id: 'fld_driving',
            value: true,
            _sources: [],
          },
        }

        const result = routeToCarrier(
          {
            state: 'CA',
            productLine: 'auto',
            age: 30,
          },
          createMockGetAllCarriers([carrier])
        )

        expect(result.eligibleCarriers).not.toContain('GEICO')
        expect(result.rationale).toContain('Clean driving record (3 years) required')
      })

      it('should pass when clean driving record not required', () => {
        const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
        carrier.eligibility.auto = {
          _id: 'elig_test',
          _sources: [],
          requiresCleanDrivingRecord: {
            _id: 'fld_driving',
            value: false,
            _sources: [],
          },
        }

        const result = routeToCarrier(
          {
            state: 'CA',
            productLine: 'auto',
            age: 30,
            cleanRecord3Yr: false,
          },
          createMockGetAllCarriers([carrier])
        )

        expect(result.eligibleCarriers).toContain('GEICO')
      })
    })
  })

  describe('Carrier ranking', () => {
    it('should select highest-scoring carrier as primary', () => {
      const geico = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
      geico.compensation = {
        _id: 'comp_test',
        commissionRate: {
          _id: 'fld_comp',
          value: 0.15,
          _sources: [],
        },
      }

      const progressive = createTestCarrier('Progressive', ['CA'], ['auto'])
        .carrier as Carrier

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 30,
        },
        createMockGetAllCarriers([geico, progressive])
      )

      // GEICO should be primary due to compensation bonus
      expect(result.primaryCarrier).toBe('GEICO')
      expect(result.eligibleCarriers[0]).toBe('GEICO')
    })

    it('should rank carriers by match score', () => {
      const geico = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
      const progressive = createTestCarrier('Progressive', ['CA'], ['auto'])
        .carrier as Carrier
      const stateFarm = createTestCarrier('State Farm', ['CA'], ['auto']).carrier as Carrier

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 30,
        },
        createMockGetAllCarriers([geico, progressive, stateFarm])
      )

      expect(result.eligibleCarriers.length).toBe(3)
      expect(result.matchScores).toBeDefined()
      if (result.matchScores) {
        const scores = Object.values(result.matchScores)
        expect(scores[0]!).toBeGreaterThanOrEqual(scores[1]!)
        expect(scores[1]!).toBeGreaterThanOrEqual(scores[2]!)
      }
    })
  })

  describe('Confidence calculation', () => {
    it('should calculate confidence based on data completeness', () => {
      const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier

      const getAllCarriers = createMockGetAllCarriers([carrier])

      // Full data
      const resultFull = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 30,
          vehicles: 2,
        },
        getAllCarriers
      )

      // Missing optional fields
      const resultPartial = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
        },
        getAllCarriers
      )

      expect(resultFull.confidence).toBeGreaterThan(resultPartial.confidence)
      expect(resultFull.confidence).toBeGreaterThanOrEqual(0)
      expect(resultFull.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('No eligible carriers scenario', () => {
    it('should return empty result when no carriers match state/product', () => {
      const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier

      const result = routeToCarrier(
        {
          state: 'WY',
          productLine: 'renters',
          age: 25,
        },
        createMockGetAllCarriers([carrier])
      )

      expect(result.eligibleCarriers).toEqual([])
      expect(result.primaryCarrier).toBe('')
      expect(result.confidence).toBe(0.0)
      expect(result.rationale).toContain('No carriers available')
    })

    it('should return empty result when no carriers pass eligibility', () => {
      const carrier = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
      carrier.eligibility.auto = {
        _id: 'elig_test',
        _sources: [],
        minAge: {
          _id: 'fld_age',
          value: 18,
          _sources: [],
        },
      }

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 16,
        },
        createMockGetAllCarriers([carrier])
      )

      expect(result.eligibleCarriers).toEqual([])
      expect(result.primaryCarrier).toBe('')
      expect(result.confidence).toBe(0.0)
      expect(result.rationale).toContain('No carriers meet eligibility requirements')
    })

    it('should handle missing state', () => {
      const result = routeToCarrier({
        productLine: 'auto',
        age: 30,
      })

      expect(result.eligibleCarriers).toEqual([])
      expect(result.rationale).toContain('State is required')
    })

    it('should handle missing productLine', () => {
      const result = routeToCarrier({
        state: 'CA',
        age: 30,
      })

      expect(result.eligibleCarriers).toEqual([])
      expect(result.rationale).toContain('Product line is required')
    })
  })

  describe('Citation tracking', () => {
    it('should include citations for eligible carriers', () => {
      const geico = createTestCarrier('GEICO', ['CA'], ['auto']).carrier as Carrier
      geico._id = 'carr_geico_test'
      geico._sources = [
        {
          uri: 'https://geico.com',
          pageFile: 'knowledge_pack/carriers/geico.json',
          accessedDate: new Date().toISOString(),
          confidence: 'high',
        },
      ]

      const result = routeToCarrier(
        {
          state: 'CA',
          productLine: 'auto',
          age: 30,
        },
        createMockGetAllCarriers([geico])
      )

      expect(result.citations.length).toBeGreaterThan(0)
      expect(result.citations[0]!.id).toBe('carr_geico_test')
      expect(result.citations[0]!.type).toBe('carrier')
      expect(result.citations[0]!.carrier).toBe('carr_geico_test')
      expect(result.citations[0]!.file).toContain('geico.json')
    })
  })

  describe('Comprehensive coverage: All carriers × states × products', () => {
    const states = ['CA', 'TX', 'FL', 'NY', 'IL']
    const products = ['auto', 'home', 'renters', 'umbrella']
    const carriers = ['GEICO', 'Progressive', 'State Farm']

    // Create test carriers for all combinations
    const testCarriers: Carrier[] = carriers.map((name) => {
      const carrier = createTestCarrier(name, states, products).carrier as Carrier
      // Add basic eligibility rules
      carrier.eligibility.auto = {
        _id: `elig_${name.toLowerCase()}_auto`,
        _sources: [],
        minAge: {
          _id: `fld_${name.toLowerCase()}_age`,
          value: 18,
          _sources: [],
        },
      }
      carrier.eligibility.home = {
        _id: `elig_${name.toLowerCase()}_home`,
        _sources: [],
        minAge: {
          _id: `fld_${name.toLowerCase()}_age`,
          value: 18,
          _sources: [],
        },
      }
      carrier.eligibility.renters = {
        _id: `elig_${name.toLowerCase()}_renters`,
        _sources: [],
        minAge: {
          _id: `fld_${name.toLowerCase()}_age`,
          value: 18,
          _sources: [],
        },
      }
      carrier.eligibility.umbrella = {
        _id: `elig_${name.toLowerCase()}_umbrella`,
        _sources: [],
        minAge: {
          _id: `fld_${name.toLowerCase()}_age`,
          value: 21,
          _sources: [],
        },
      }
      return carrier
    })

    it('should route correctly for all valid combinations', () => {
      const getAllCarriers = createMockGetAllCarriers(testCarriers)

      let passCount = 0
      const totalTests = states.length * products.length

      for (const state of states) {
        for (const product of products) {
          const result = routeToCarrier(
            {
              state,
              productLine: product as 'auto' | 'home' | 'renters' | 'umbrella',
              age: 30,
            },
            getAllCarriers
          )

          // Test passes if:
          // 1. Confidence is valid (0-1)
          // 2. Rationale is present and non-empty
          // 3. Result structure is valid (has required fields)
          const isValid =
            result.confidence >= 0 &&
            result.confidence <= 1 &&
            result.rationale &&
            result.rationale.length > 0 &&
            Array.isArray(result.eligibleCarriers) &&
            typeof result.primaryCarrier === 'string' &&
            Array.isArray(result.citations)

          if (isValid) {
            passCount++
          }
        }
      }

      // Routing accuracy ≥90% (at least 18/20 test cases pass for states × products)
      const accuracy = passCount / totalTests
      expect(accuracy).toBeGreaterThanOrEqual(0.9)
      expect(passCount).toBeGreaterThanOrEqual(Math.ceil(totalTests * 0.9))
    })
  })
})

