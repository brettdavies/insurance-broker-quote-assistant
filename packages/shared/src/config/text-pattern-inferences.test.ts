import { describe, expect, it } from 'bun:test'
import { TEXT_PATTERN_INFERENCES, type TextPatternInference } from './text-pattern-inferences'

describe('text-pattern-inferences', () => {
  describe('TEXT_PATTERN_INFERENCES import', () => {
    it('should import TEXT_PATTERN_INFERENCES successfully', () => {
      expect(TEXT_PATTERN_INFERENCES).toBeDefined()
      expect(Array.isArray(TEXT_PATTERN_INFERENCES)).toBe(true)
    })

    it('should have 3-6 patterns (POC scope)', () => {
      expect(TEXT_PATTERN_INFERENCES.length).toBeGreaterThanOrEqual(3)
      expect(TEXT_PATTERN_INFERENCES.length).toBeLessThanOrEqual(6)
    })
  })

  describe('Pattern structure validation', () => {
    it('should have required properties for each pattern', () => {
      TEXT_PATTERN_INFERENCES.forEach((pattern: TextPatternInference, index: number) => {
        // Verify pattern has required top-level properties
        expect(pattern).toHaveProperty('pattern')
        expect(pattern).toHaveProperty('infers')

        // Verify pattern is a RegExp
        expect(pattern.pattern).toBeInstanceOf(RegExp)

        // Verify infers is an array
        expect(Array.isArray(pattern.infers)).toBe(true)
        expect(pattern.infers.length).toBeGreaterThan(0)

        // Verify each inference has required properties
        pattern.infers.forEach((inference, inferenceIndex) => {
          expect(inference).toHaveProperty('field')
          expect(inference).toHaveProperty('value')
          expect(inference).toHaveProperty('confidence')
          expect(inference).toHaveProperty('reasoning')

          // Verify field is a string
          expect(typeof inference.field).toBe('string')
          expect(inference.field.length).toBeGreaterThan(0)

          // Verify confidence is valid
          expect(['high', 'medium', 'low']).toContain(inference.confidence)

          // Verify reasoning is a non-empty string
          expect(typeof inference.reasoning).toBe('string')
          expect(inference.reasoning.length).toBeGreaterThan(0)
        })
      })
    })

    it('should compile all regex patterns without errors', () => {
      for (const pattern of TEXT_PATTERN_INFERENCES) {
        // Test that regex can be executed without throwing
        expect(() => pattern.pattern.test('test string')).not.toThrow()
      }
    })
  })

  describe('Pattern matching validation', () => {
    it('should match "lives alone" pattern correctly', () => {
      const livesAlonePattern = TEXT_PATTERN_INFERENCES.find((p) =>
        p.pattern.toString().includes('lives')
      )

      if (!livesAlonePattern) {
        throw new Error('livesAlonePattern not found')
      }

      expect(livesAlonePattern.pattern.test('I live alone in California')).toBe(true)
      expect(livesAlonePattern.pattern.test('She lives alone')).toBe(true)
      expect(livesAlonePattern.pattern.test('lives with family')).toBe(false)

      // Verify inference
      const inference = livesAlonePattern.infers[0]
      expect(inference).toBeDefined()
      expect(inference?.field).toBe('householdSize')
      expect(inference?.value).toBe(1)
      expect(inference?.confidence).toBe('medium')
    })

    it('should match "family of N" pattern with capture group', () => {
      const familyOfPattern = TEXT_PATTERN_INFERENCES.find((p) =>
        p.pattern.toString().includes('family')
      )

      if (!familyOfPattern) {
        throw new Error('familyOfPattern not found')
      }

      // Test pattern matching
      const match1 = 'We have a family of 4'.match(familyOfPattern.pattern)
      expect(match1).not.toBeNull()
      if (match1) {
        expect(match1[1]).toBe('4') // Capture group 1 should be "4"
      }

      const match2 = 'family of 2'.match(familyOfPattern.pattern)
      expect(match2).not.toBeNull()
      if (match2) {
        expect(match2[1]).toBe('2') // Capture group 1 should be "2"
      }

      // Verify inference
      const inference = familyOfPattern.infers[0]
      expect(inference).toBeDefined()
      expect(inference?.field).toBe('householdSize')
      expect(inference?.value).toBe('$1') // Capture group reference
      expect(inference?.confidence).toBe('high')
    })

    it('should match "clean record" pattern correctly', () => {
      const cleanRecordPattern = TEXT_PATTERN_INFERENCES.find(
        (p) => p.pattern.toString().includes('clean') && p.infers[0]?.field === 'cleanRecord3Yr'
      )

      if (!cleanRecordPattern) {
        throw new Error('cleanRecordPattern not found')
      }

      expect(cleanRecordPattern.pattern.test('I have a clean record')).toBe(true)
      expect(cleanRecordPattern.pattern.test('clean driving record')).toBe(true)
      expect(cleanRecordPattern.pattern.test('no violations')).toBe(false)

      // Verify inference
      const inference = cleanRecordPattern.infers[0]
      expect(inference).toBeDefined()
      expect(inference?.field).toBe('cleanRecord3Yr')
      expect(inference?.value).toBe(true)
      expect(inference?.confidence).toBe('medium')
    })

    it('should match "3-4 years clean" pattern correctly', () => {
      const years34Pattern = TEXT_PATTERN_INFERENCES.find(
        (p) => p.pattern.toString().includes('[3-4]') && p.infers[0]?.field === 'cleanRecord3Yr'
      )

      if (!years34Pattern) {
        throw new Error('years34Pattern not found')
      }

      expect(years34Pattern.pattern.test('3 years clean')).toBe(true)
      expect(years34Pattern.pattern.test('4 year clean record')).toBe(true)
      expect(years34Pattern.pattern.test('5 years clean')).toBe(false) // Should not match 5+

      // Verify inference
      const inference = years34Pattern.infers[0]
      expect(inference).toBeDefined()
      expect(inference?.field).toBe('cleanRecord3Yr')
      expect(inference?.value).toBe(true)
      expect(inference?.confidence).toBe('high')
    })

    it('should match "5+ years clean" pattern correctly', () => {
      const years5PlusPattern = TEXT_PATTERN_INFERENCES.find(
        (p) => p.pattern.toString().includes('5|[6-9]') && p.infers[0]?.field === 'cleanRecord5Yr'
      )

      if (!years5PlusPattern) {
        throw new Error('years5PlusPattern not found')
      }

      expect(years5PlusPattern.pattern.test('5 years clean')).toBe(true)
      expect(years5PlusPattern.pattern.test('7 year clean record')).toBe(true)
      expect(years5PlusPattern.pattern.test('10 years clean')).toBe(true)
      expect(years5PlusPattern.pattern.test('3 years clean')).toBe(false) // Should not match 3-4

      // Verify inference
      const inference = years5PlusPattern.infers[0]
      expect(inference).toBeDefined()
      expect(inference?.field).toBe('cleanRecord5Yr')
      expect(inference?.value).toBe(true)
      expect(inference?.confidence).toBe('high')
    })

    it('should match "own a home" / "homeowner" pattern correctly', () => {
      const ownsHomePattern = TEXT_PATTERN_INFERENCES.find((p) => p.infers[0]?.field === 'ownsHome')

      if (!ownsHomePattern) {
        throw new Error('ownsHomePattern not found')
      }

      expect(ownsHomePattern.pattern.test('I own a home')).toBe(true)
      expect(ownsHomePattern.pattern.test('She owns the home')).toBe(true)
      expect(ownsHomePattern.pattern.test('I am a homeowner')).toBe(true)
      expect(ownsHomePattern.pattern.test('I own my home')).toBe(true)
      expect(ownsHomePattern.pattern.test('I rent an apartment')).toBe(false)

      // Verify inference
      const inference = ownsHomePattern.infers[0]
      expect(inference).toBeDefined()
      expect(inference?.field).toBe('ownsHome')
      expect(inference?.value).toBe(true)
      expect(inference?.confidence).toBe('high')
    })
  })

  describe('Case insensitivity', () => {
    it('should match patterns case-insensitively', () => {
      // Test that all patterns are case-insensitive
      for (const pattern of TEXT_PATTERN_INFERENCES) {
        expect(pattern.pattern.flags).toContain('i')
      }

      // Test specific case variations
      const livesAlonePattern = TEXT_PATTERN_INFERENCES.find((p) =>
        p.pattern.toString().includes('lives')
      )

      if (!livesAlonePattern) {
        throw new Error('livesAlonePattern not found')
      }

      expect(livesAlonePattern.pattern.test('LIVES ALONE')).toBe(true)
      expect(livesAlonePattern.pattern.test('Lives Alone')).toBe(true)
      expect(livesAlonePattern.pattern.test('lives alone')).toBe(true)
    })
  })
})
