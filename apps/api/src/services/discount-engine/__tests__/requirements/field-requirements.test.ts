/**
 * Field Requirements Unit Tests
 */

import { describe, expect, it } from 'bun:test'
import type { UserProfile } from '@repo/shared'
import { checkFieldRequirements } from '../../requirements/field-requirements'
import type { DiscountRequirements } from '../../types'

describe('checkFieldRequirements', () => {
  const createCustomerData = (overrides?: Partial<UserProfile>): UserProfile => ({
    state: 'CA',
    age: 30,
    cleanRecord3Yr: true,
    ...overrides,
  })

  describe('age requirements', () => {
    it('should pass when age within range', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          age: { min: 18, max: 65 },
        },
        description: 'Test',
      }
      const customerData = createCustomerData({ age: 30 })

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(0)
    })

    it('should fail when age below minimum', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          age: { min: 25 },
        },
        description: 'Test',
      }
      const customerData = createCustomerData({ age: 20 })

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
      expect(missing[0]).toContain('at least 25')
      expect(missing[0]).toContain('currently 20')
    })

    it('should fail when age above maximum', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          age: { max: 25 },
        },
        description: 'Test',
      }
      const customerData = createCustomerData({ age: 30 })

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
      expect(missing[0]).toContain('at most 25')
      expect(missing[0]).toContain('currently 30')
    })

    it('should fail when age is undefined', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          age: { min: 18 },
        },
        description: 'Test',
      }
      const customerData = createCustomerData({ age: undefined })

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
      expect(missing[0]).toContain('Age required')
    })
  })

  describe('clean record requirements', () => {
    it('should pass when cleanRecord3Yr is true', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          cleanRecord3Yr: true,
        },
        description: 'Test',
      }
      const customerData = createCustomerData({ cleanRecord3Yr: true })

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(0)
    })

    it('should fail when cleanRecord3Yr is false', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          cleanRecord3Yr: true,
        },
        description: 'Test',
      }
      const customerData = createCustomerData({ cleanRecord3Yr: false })

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
      expect(missing[0]).toContain('Clean driving record for past 3 years')
    })

    it('should fail when cleanRecord3Yr is undefined', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          cleanRecord3Yr: true,
        },
        description: 'Test',
      }
      const customerData = createCustomerData({ cleanRecord3Yr: undefined })

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
    })

    it('should accept cleanRecord5Yr when cleanRecord3Yr is required (5yr implies 3yr)', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          cleanRecord3Yr: true,
        },
        description: 'Test',
      }
      const customerData = createCustomerData({ cleanRecord3Yr: undefined })
      ;(customerData as any).cleanRecord5Yr = true

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(0) // Should pass (5yr implies 3yr)
    })

    it('should check cleanRecord5Yr when field exists', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          cleanRecord5Yr: true,
        },
        description: 'Test',
      }
      const customerData = createCustomerData()
      ;(customerData as any).cleanRecord5Yr = false

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
      expect(missing[0]).toContain('past 5 years')
    })
  })

  describe('good student requirements', () => {
    it('should check goodStudent when field exists', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          goodStudent: true,
        },
        description: 'Test',
      }
      const customerData = createCustomerData()
      ;(customerData as any).goodStudent = false

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
      expect(missing[0]).toContain('Good student status')
    })

    it('should check GPA requirement', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          gpa: { min: 3.0 },
        },
        description: 'Test',
      }
      const customerData = createCustomerData()
      ;(customerData as any).gpa = 2.3

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
      expect(missing[0]).toContain('GPA must be at least')
      expect(missing[0]).toContain('3')
    })
  })

  describe('military requirements', () => {
    it('should check military status when field exists', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          military: true,
        },
        description: 'Test',
      }
      const customerData = createCustomerData()
      ;(customerData as any).military = false

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
      expect(missing[0]).toContain('Military service required')
    })

    it('should check veteran status when field exists', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          veteran: true,
        },
        description: 'Test',
      }
      const customerData = createCustomerData()
      ;(customerData as any).veteran = false

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
      expect(missing[0]).toContain('Veteran status required')
    })
  })

  describe('home security requirements', () => {
    it('should check homeSecuritySystem when field exists', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          homeSecuritySystem: true,
        },
        description: 'Test',
      }
      const customerData = createCustomerData()
      ;(customerData as any).homeSecuritySystem = false

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
      expect(missing[0]).toContain('Home security system required')
    })

    it('should check deadboltLocks when field exists', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          deadboltLocks: true,
        },
        description: 'Test',
      }
      const customerData = createCustomerData()
      ;(customerData as any).deadboltLocks = false

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(1)
      expect(missing[0]).toContain('Deadbolt locks required')
    })
  })

  describe('multiple requirements', () => {
    it('should check all field requirements', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          age: { min: 25 },
          cleanRecord3Yr: true,
          military: true,
        },
        description: 'Test',
      }
      const customerData = createCustomerData({
        age: 20,
        cleanRecord3Yr: false,
      })
      ;(customerData as any).military = false

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('edge cases', () => {
    it('should return empty array when no field requirements', () => {
      const requirements: DiscountRequirements = {
        description: 'Test',
      }
      const customerData = createCustomerData()

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(0)
    })

    it('should handle requirements with false values (not required)', () => {
      const requirements: DiscountRequirements = {
        fieldRequirements: {
          cleanRecord3Yr: false, // Not required
        },
        description: 'Test',
      }
      const customerData = createCustomerData({ cleanRecord3Yr: false })

      const missing = checkFieldRequirements(requirements, customerData)
      expect(missing).toHaveLength(0)
    })
  })
})
