import { describe, expect, it, test } from 'bun:test'
import { keyValueTestCases } from '@repo/shared'
import { hasKeyValueSyntax, parseKeyValueSyntax } from '../key-value-parser'

describe('Key-Value Parser', () => {
  describe('parseKeyValueSyntax', () => {
    // Parameterized test using Bun's test.each()
    test.each(
      keyValueTestCases as unknown as Array<{
        input: string
        expected: Record<string, unknown>
        description: string
      }>
    )('should parse $description', ({ input, expected }) => {
      const result = parseKeyValueSyntax(input)
      expect(result.extractionMethod).toBe('key-value')
      expect(result.confidence).toBe(1.0)

      for (const [key, value] of Object.entries(expected)) {
        expect(result.profile[key as keyof typeof result.profile]).toBe(
          value as string | number | boolean | undefined
        )
      }
    })

    it('should parse simple key-value pairs', () => {
      const result = parseKeyValueSyntax('Client needs auto insurance, s:CA, a:35')
      expect(result.extractionMethod).toBe('key-value')
      expect(result.confidence).toBe(1.0)
      expect(result.profile.state).toBe('CA')
      expect(result.profile.age).toBe(35)
    })

    it('should recognize field aliases', () => {
      const result = parseKeyValueSyntax('k:2 v:1 h:4')
      expect(result.profile.kids).toBe(2)
      expect(result.profile.vehicles).toBe(1)
      expect(result.profile.householdSize).toBe(4)
    })

    it('should handle case-insensitive keys', () => {
      const result = parseKeyValueSyntax('S:CA A:30 K:2')
      expect(result.profile.state).toBe('CA')
      expect(result.profile.age).toBe(30)
      expect(result.profile.kids).toBe(2)
    })

    it('should parse productType enum values', () => {
      const result = parseKeyValueSyntax('l:auto')
      expect(result.profile.productType).toBe('auto')

      // Test alias
      const result2 = parseKeyValueSyntax('product:home')
      expect(result2.profile.productType).toBe('home')
    })

    it('should parse boolean fields', () => {
      const result = parseKeyValueSyntax('o:true clean:yes')
      expect(result.profile.ownsHome).toBe(true)
      expect(result.profile.cleanRecord3Yr).toBe(true)
    })

    it('should handle car alias for vehicles', () => {
      const result = parseKeyValueSyntax('c:2 car:1')
      expect(result.profile.vehicles).toBe(1) // Last value wins
    })

    it('should handle deps/dependents alias for householdSize', () => {
      const result = parseKeyValueSyntax('d:3 deps:4')
      expect(result.profile.householdSize).toBe(4) // Last value wins

      const result2 = parseKeyValueSyntax('dependents:5')
      expect(result2.profile.householdSize).toBe(5)
    })

    it('should return empty profile for no matches', () => {
      const result = parseKeyValueSyntax('No key-value pairs here')
      expect(Object.keys(result.profile)).toHaveLength(0)
    })
  })

  describe('hasKeyValueSyntax', () => {
    it('should detect key-value syntax', () => {
      expect(hasKeyValueSyntax('s:CA')).toBe(true)
      expect(hasKeyValueSyntax('Client needs s:CA insurance')).toBe(true)
    })

    it('should return false for natural language only', () => {
      expect(hasKeyValueSyntax('Client needs auto insurance in California')).toBe(false)
      expect(hasKeyValueSyntax('No colons here')).toBe(false)
    })
  })
})
