import { beforeAll, describe, expect, it } from 'bun:test'
import { testMessages } from '../../__tests__/fixtures/test-messages'
import { GeminiProvider } from '../gemini-provider'

/**
 * Gemini Provider Tests
 *
 * Tests against actual Gemini API (when enabled via TEST_TARGETS=real-api env var).
 * These tests verify the real API integration works correctly.
 *
 * To run with real API:
 *   TEST_TARGETS=real-api bun test src/services/__tests__/gemini-provider.test.ts
 *
 * Note: These tests may incur API costs and require network access.
 */

const USE_REAL_API = process.env.TEST_TARGETS === 'real-api'

describe('GeminiProvider', () => {
  let provider: GeminiProvider

  beforeAll(() => {
    provider = new GeminiProvider(
      process.env.GEMINI_API_KEY || undefined,
      'gemini-2.5-flash-lite',
      10000
    )
  })

  describe.skipIf(!USE_REAL_API)('Real API Integration', () => {
    it('should extract fields from simple natural language', async () => {
      const result = await provider.extractWithStructuredOutput(testMessages.naturalLanguage.simple)

      expect(result.profile).toBeDefined()
      // LLM should extract state (may be 'CA' or 'California' or 'california')
      expect(result.profile.state).toBeDefined()
      expect(typeof result.profile.state).toBe('string')
      // LLM should extract productType
      expect(result.profile.productType).toBeDefined()
      const validProductLines = ['auto', 'home', 'renters', 'umbrella'] as const
      expect(
        validProductLines.includes(result.profile.productType as (typeof validProductLines)[number])
      ).toBe(true)
      expect(result.confidence).toBeDefined()
      expect(Object.keys(result.confidence).length).toBeGreaterThan(0)
    }, 15000) // Longer timeout for real API calls

    it('should extract multiple fields from detailed message', async () => {
      const result = await provider.extractWithStructuredOutput(
        testMessages.naturalLanguage.complete
      )

      expect(result.profile).toBeDefined()
      // Should extract state (may be 'CA' or 'California')
      expect(result.profile.state).toBeDefined()
      expect(typeof result.profile.state).toBe('string')
      // Should extract productType
      expect(result.profile.productType).toBeDefined()
      const validProductLines = ['auto', 'home', 'renters', 'umbrella'] as const
      expect(
        validProductLines.includes(result.profile.productType as (typeof validProductLines)[number])
      ).toBe(true)
      // Should extract age (may be 30 or close)
      expect(result.profile.age).toBeDefined()
      expect(typeof result.profile.age).toBe('number')
      expect(result.profile.age).toBeGreaterThan(0)
      // Should extract vehicles
      expect(result.profile.vehicles).toBeDefined()
      expect(typeof result.profile.vehicles).toBe('number')
      expect(result.profile.vehicles).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeDefined()
    }, 15000)

    it('should handle partialFields (pills)', async () => {
      const partialFields = { state: 'CA' }
      const result = await provider.extractWithStructuredOutput(
        'I am 35 years old',
        undefined, // schema (use default)
        partialFields
      )

      expect(result.profile).toBeDefined()
      // Should extract age from current message
      expect(result.profile.age).toBeDefined()
      expect(typeof result.profile.age).toBe('number')
      expect(result.profile.age).toBeGreaterThan(0)
      // Should use state from partialFields
      expect(result.profile.state).toBe('CA')
    }, 15000)

    it('should return structured output matching schema', async () => {
      const result = await provider.extractWithStructuredOutput(
        testMessages.naturalLanguage.detailed
      )

      // Validate all extracted fields are valid UserProfile fields
      const validFields = [
        'state',
        'productType',
        'age',
        'householdSize',
        'vehicles',
        'ownsHome',
        'cleanRecord3Yr',
        'currentCarrier',
        'premiums',
        'existingPolicies',
        'kids',
      ]

      for (const key of Object.keys(result.profile)) {
        expect(validFields).toContain(key)
      }
    }, 15000)

    it('should handle ambiguous inputs gracefully', async () => {
      const result = await provider.extractWithStructuredOutput(
        testMessages.naturalLanguage.ambiguous
      )

      expect(result.profile).toBeDefined()
      // Should extract what's clear (state, product)
      expect(result.profile.state).toBeDefined()
      expect(typeof result.profile.state).toBe('string')
      expect(result.profile.productType).toBeDefined()
      const validProductLines = ['auto', 'home', 'renters', 'umbrella'] as const
      expect(
        validProductLines.includes(result.profile.productType as (typeof validProductLines)[number])
      ).toBe(true)
      // May or may not extract vehicles (ambiguous)
      expect(result.confidence).toBeDefined()
    }, 15000)

    it('should return confidence scores for extracted fields', async () => {
      const result = await provider.extractWithStructuredOutput(
        testMessages.naturalLanguage.complete
      )

      expect(result.confidence).toBeDefined()
      for (const [field, confidence] of Object.entries(result.confidence)) {
        expect(confidence).toBeGreaterThanOrEqual(0)
        expect(confidence).toBeLessThanOrEqual(1)
        expect(result.profile[field as keyof typeof result.profile]).toBeDefined()
      }
    }, 15000)

    it('should handle timeout gracefully', async () => {
      // Create provider with very short timeout
      const shortTimeoutProvider = new GeminiProvider(
        process.env.GEMINI_API_KEY || undefined,
        'gemini-2.5-flash-lite',
        100 // 100ms timeout (should fail)
      )

      const result = await shortTimeoutProvider.extractWithStructuredOutput(
        testMessages.naturalLanguage.simple
      )

      // Should return empty result or error, not throw
      expect(result).toBeDefined()
      expect(result.profile).toBeDefined()
    }, 5000)
  })

  describe('Schema Validation', () => {
    it.skipIf(!USE_REAL_API)(
      'should return valid UserProfile structure',
      async () => {
        const result = await provider.extractWithStructuredOutput(
          testMessages.naturalLanguage.complete
        )

        // Check structure matches UserProfile type
        const profile = result.profile

        // All keys should be valid UserProfile fields
        const validKeys = [
          'state',
          'productType',
          'age',
          'householdSize',
          'vehicles',
          'ownsHome',
          'cleanRecord3Yr',
          'currentCarrier',
          'premiums',
          'existingPolicies',
          'kids',
        ]

        for (const key of Object.keys(profile)) {
          expect(validKeys).toContain(key)
        }

        // Type checks
        if (profile.age !== undefined) {
          expect(typeof profile.age).toBe('number')
        }
        if (profile.state !== undefined) {
          expect(typeof profile.state).toBe('string')
        }
        if (profile.productType !== undefined) {
          const validProductLines = ['auto', 'home', 'renters', 'umbrella'] as const
          expect(
            validProductLines.includes(profile.productType as (typeof validProductLines)[number])
          ).toBe(true)
        }
      },
      15000
    )
  })
})
