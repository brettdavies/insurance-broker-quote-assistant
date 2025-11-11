/**
 * Compliance Filter Unit Tests
 *
 * Tests prohibited phrase detection, state/product-specific disclaimer selection,
 * and edge cases for compliance filter service.
 *
 * @see docs/stories/1.7.adaptive-compliance-filter.md#task-8
 */

import { describe, expect, it } from 'bun:test'
import { validateOutput } from '../compliance-filter'

describe('Compliance Filter', () => {
  describe('Prohibited Phrase Detection', () => {
    it('should detect "guaranteed lowest rate"', () => {
      const result = validateOutput('We have the guaranteed lowest rate for you!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('guaranteed lowest rate')
    })

    it('should detect "we\'ll definitely save you"', () => {
      const result = validateOutput("We'll definitely save you money!")
      expect(result.passed).toBe(false)
      expect(result.violations).toContain("we'll definitely save you")
    })

    it('should detect "best price guaranteed"', () => {
      const result = validateOutput('Best price guaranteed in town!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('best price guaranteed')
    })

    it('should detect "you will save"', () => {
      const result = validateOutput('You will save hundreds of dollars!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('you will save')
    })

    it('should detect "guaranteed approval"', () => {
      const result = validateOutput('Guaranteed approval for all applicants!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('guaranteed approval')
    })

    it('should detect "guaranteed savings"', () => {
      const result = validateOutput('Guaranteed savings of up to 30%!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('guaranteed savings')
    })

    it('should detect "we guarantee"', () => {
      const result = validateOutput('We guarantee the best rates!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('we guarantee')
    })

    it('should detect "definitely save"', () => {
      const result = validateOutput('You will definitely save money!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('definitely save')
    })

    it('should detect "best rate guaranteed"', () => {
      const result = validateOutput('Best rate guaranteed!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('best rate guaranteed')
    })

    it('should detect "lowest price guaranteed"', () => {
      const result = validateOutput('Lowest price guaranteed!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('lowest price guaranteed')
    })

    it('should detect "guaranteed quote"', () => {
      const result = validateOutput('Get your guaranteed quote today!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('guaranteed quote')
    })

    it('should detect "binding quote"', () => {
      const result = validateOutput('This is a binding quote!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('binding quote')
    })

    it('should detect "final price"', () => {
      const result = validateOutput('Your final price is $500!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('final price')
    })

    it('should detect "exact price"', () => {
      const result = validateOutput('The exact price is $500!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('exact price')
    })

    it('should detect "medical advice"', () => {
      const result = validateOutput('This is medical advice for your health!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('medical advice')
    })

    it('should detect "health advice"', () => {
      const result = validateOutput('Here is some health advice!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('health advice')
    })

    it('should detect case-insensitive matches', () => {
      const result = validateOutput('GUARANTEED LOWEST RATE!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('guaranteed lowest rate')
    })

    it('should detect partial matches', () => {
      const result = validateOutput('We have the guaranteed lowest rate for you!')
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('guaranteed lowest rate')
    })

    it('should detect multiple violations in single output', () => {
      const result = validateOutput('We have the guaranteed lowest rate and you will save money!')
      expect(result.passed).toBe(false)
      expect(result.violations?.length).toBeGreaterThan(1)
      expect(result.violations).toContain('guaranteed lowest rate')
      expect(result.violations).toContain('you will save')
    })

    it('should return replacement message when violations detected', () => {
      const result = validateOutput('We guarantee the lowest rate!')
      expect(result.passed).toBe(false)
      expect(result.replacementMessage).toBeDefined()
      expect(result.replacementMessage).toContain('licensed insurance agent')
    })
  })

  describe('State-Specific Disclaimer Selection', () => {
    it('should select CA disclaimers when state="CA"', () => {
      const result = validateOutput('Valid output', 'CA')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('California'))).toBe(true)
    })

    it('should select TX disclaimers when state="TX"', () => {
      const result = validateOutput('Valid output', 'TX')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Texas'))).toBe(true)
    })

    it('should select FL disclaimers when state="FL"', () => {
      const result = validateOutput('Valid output', 'FL')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Florida'))).toBe(true)
    })

    it('should select NY disclaimers when state="NY"', () => {
      const result = validateOutput('Valid output', 'NY')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('New York'))).toBe(true)
    })

    it('should select IL disclaimers when state="IL"', () => {
      const result = validateOutput('Valid output', 'IL')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Illinois'))).toBe(true)
    })

    it('should return base disclaimers when state not provided', () => {
      const result = validateOutput('Valid output')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.length).toBeGreaterThan(0)
      // Should include base disclaimers
      expect(result.disclaimers?.some((d) => d.includes('subject to underwriting'))).toBe(true)
    })
  })

  describe('Product-Specific Disclaimer Selection', () => {
    it('should select auto disclaimers when productLine="auto"', () => {
      const result = validateOutput('Valid output', undefined, 'auto')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Auto Insurance'))).toBe(true)
    })

    it('should select home disclaimers when productLine="home"', () => {
      const result = validateOutput('Valid output', undefined, 'home')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Home Insurance'))).toBe(true)
    })

    it('should select renters disclaimers when productLine="renters"', () => {
      const result = validateOutput('Valid output', undefined, 'renters')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Renters Insurance'))).toBe(true)
    })

    it('should select umbrella disclaimers when productLine="umbrella"', () => {
      const result = validateOutput('Valid output', undefined, 'umbrella')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Umbrella Insurance'))).toBe(true)
    })

    it('should return base disclaimers when productLine not provided', () => {
      const result = validateOutput('Valid output')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.length).toBeGreaterThan(0)
    })
  })

  describe('Combined State/Product Disclaimers', () => {
    it('should combine CA + auto disclaimers', () => {
      const result = validateOutput('Valid output', 'CA', 'auto')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('California'))).toBe(true)
      expect(result.disclaimers?.some((d) => d.includes('Auto Insurance'))).toBe(true)
    })

    it('should combine FL + home disclaimers', () => {
      const result = validateOutput('Valid output', 'FL', 'home')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Florida'))).toBe(true)
      expect(result.disclaimers?.some((d) => d.includes('Home Insurance'))).toBe(true)
    })

    it('should combine TX + renters disclaimers', () => {
      const result = validateOutput('Valid output', 'TX', 'renters')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Texas'))).toBe(true)
      expect(result.disclaimers?.some((d) => d.includes('Renters Insurance'))).toBe(true)
    })

    it('should combine NY + auto disclaimers', () => {
      const result = validateOutput('Valid output', 'NY', 'auto')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('New York'))).toBe(true)
      expect(result.disclaimers?.some((d) => d.includes('Auto Insurance'))).toBe(true)
    })

    it('should combine IL + home disclaimers', () => {
      const result = validateOutput('Valid output', 'IL', 'home')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Illinois'))).toBe(true)
      expect(result.disclaimers?.some((d) => d.includes('Home Insurance'))).toBe(true)
    })

    it('should combine CA + umbrella disclaimers', () => {
      const result = validateOutput('Valid output', 'CA', 'umbrella')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('California'))).toBe(true)
      expect(result.disclaimers?.some((d) => d.includes('Umbrella Insurance'))).toBe(true)
    })

    it('should combine TX + auto disclaimers', () => {
      const result = validateOutput('Valid output', 'TX', 'auto')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Texas'))).toBe(true)
      expect(result.disclaimers?.some((d) => d.includes('Auto Insurance'))).toBe(true)
    })

    it('should combine FL + renters disclaimers', () => {
      const result = validateOutput('Valid output', 'FL', 'renters')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Florida'))).toBe(true)
      expect(result.disclaimers?.some((d) => d.includes('Renters Insurance'))).toBe(true)
    })

    it('should combine NY + home disclaimers', () => {
      const result = validateOutput('Valid output', 'NY', 'home')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('New York'))).toBe(true)
      expect(result.disclaimers?.some((d) => d.includes('Home Insurance'))).toBe(true)
    })

    it('should combine IL + auto disclaimers', () => {
      const result = validateOutput('Valid output', 'IL', 'auto')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.some((d) => d.includes('Illinois'))).toBe(true)
      expect(result.disclaimers?.some((d) => d.includes('Auto Insurance'))).toBe(true)
    })

    it('should not have duplicate disclaimers', () => {
      const result = validateOutput('Valid output', 'CA', 'auto')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers).not.toBeUndefined()
      if (!result.disclaimers) {
        throw new Error('Disclaimers should be defined')
      }
      const uniqueDisclaimers = new Set(result.disclaimers)
      expect(uniqueDisclaimers.size).toBe(result.disclaimers.length)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty output string', () => {
      const result = validateOutput('')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.length).toBeGreaterThan(0)
    })

    it('should handle whitespace-only output', () => {
      const result = validateOutput('   \n\t  ')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.disclaimers?.length).toBeGreaterThan(0)
    })

    it('should handle null state', () => {
      const result = validateOutput('Valid output', null)
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.state).toBeUndefined()
    })

    it('should handle undefined state', () => {
      const result = validateOutput('Valid output', undefined)
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.state).toBeUndefined()
    })

    it('should handle null productLine', () => {
      const result = validateOutput('Valid output', undefined, null)
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.productLine).toBeUndefined()
    })

    it('should handle undefined productLine', () => {
      const result = validateOutput('Valid output', undefined, undefined)
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      expect(result.productLine).toBeUndefined()
    })

    it('should handle invalid state code', () => {
      const result = validateOutput('Valid output', 'INVALID')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      // Should return base disclaimers only (no state-specific)
      expect(result.disclaimers?.some((d) => d.includes('subject to underwriting'))).toBe(true)
    })

    it('should handle invalid productLine value', () => {
      const result = validateOutput('Valid output', undefined, 'INVALID')
      expect(result.passed).toBe(true)
      expect(result.disclaimers).toBeDefined()
      // Should return base disclaimers only (no product-specific)
      expect(result.disclaimers?.some((d) => d.includes('subject to underwriting'))).toBe(true)
    })

    it('should include state and productLine in result', () => {
      const result = validateOutput('Valid output', 'CA', 'auto')
      expect(result.state).toBe('CA')
      expect(result.productLine).toBe('auto')
    })
  })
})
