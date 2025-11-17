/**
 * Key-Value Extractor Tests
 *
 * Tests for key-value syntax extraction from broker notes.
 */

import { describe, expect, test } from 'bun:test'
import { extractKeyValueSyntax } from '../key-value-extractor'

describe('extractKeyValueSyntax', () => {
  describe('multi-word fields', () => {
    test('extracts name with space "name:John Smith"', () => {
      const result = extractKeyValueSyntax('name:John Smith')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('name')
      expect(result[0]?.value).toBe('John Smith')
      expect(result[0]?.originalText).toBe('name:John Smith')
    })

    test('extracts name with multiple words "name:Mary Jane Smith"', () => {
      const result = extractKeyValueSyntax('name:Mary Jane Smith')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('name')
      expect(result[0]?.value).toBe('Mary Jane Smith')
    })

    test('extracts name followed by comma "name:John Smith,"', () => {
      const result = extractKeyValueSyntax('name:John Smith,')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('name')
      expect(result[0]?.value).toBe('John Smith')
    })

    test('extracts name followed by another key-value "name:John Smith state:CA"', () => {
      const result = extractKeyValueSyntax('name:John Smith state:CA')
      expect(result).toHaveLength(2)
      expect(result[0]?.fieldName).toBe('name')
      expect(result[0]?.value).toBe('John Smith')
      expect(result[1]?.fieldName).toBe('state')
      expect(result[1]?.value).toBe('CA')
    })

    test('extracts phone with spaces "phone:(555) 123-4567"', () => {
      const result = extractKeyValueSyntax('phone:(555) 123-4567')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('phone')
      expect(result[0]?.value).toBe('(555) 123-4567')
    })

    test('extracts address with spaces "address:123 Main St"', () => {
      const result = extractKeyValueSyntax('address:123 Main St')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('address')
      expect(result[0]?.value).toBe('123 Main St')
    })

    test('extracts address with comma "address:123 Main St, Apt 4B"', () => {
      const result = extractKeyValueSyntax('address:123 Main St, Apt 4B')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('address')
      expect(result[0]?.value).toBe('123 Main St, Apt 4B')
    })

    test('extracts address followed by period "address:123 Main St, Apt 4B."', () => {
      const result = extractKeyValueSyntax('address:123 Main St, Apt 4B.')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('address')
      expect(result[0]?.value).toBe('123 Main St, Apt 4B')
    })

    test('extracts address followed by newline "address:123 Main St, Apt 4B\n"', () => {
      const result = extractKeyValueSyntax('address:123 Main St, Apt 4B\n')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('address')
      expect(result[0]?.value).toBe('123 Main St, Apt 4B')
    })

    test('extracts address that continues through next key-value (only stops at period/newline) "address:123 Main St, Apt 4B state:CA"', () => {
      const result = extractKeyValueSyntax('address:123 Main St, Apt 4B state:CA')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('address')
      // Address continues through everything until period or newline (space is NOT a delimiter)
      expect(result[0]?.value).toBe('123 Main St, Apt 4B state:CA')
    })

    test('does NOT stop address at comma "address:123 Main St, Apt 4B, Suite 200"', () => {
      const result = extractKeyValueSyntax('address:123 Main St, Apt 4B, Suite 200')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('address')
      expect(result[0]?.value).toBe('123 Main St, Apt 4B, Suite 200')
    })

    test('does NOT stop address at space "address:123 main"', () => {
      const result = extractKeyValueSyntax('address:123 main')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('address')
      expect(result[0]?.value).toBe('123 main')
    })
  })

  describe('single-word fields', () => {
    test('extracts state "state:CA"', () => {
      const result = extractKeyValueSyntax('state:CA')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('state')
      expect(result[0]?.value).toBe('CA')
    })

    test('extracts age "age:25"', () => {
      const result = extractKeyValueSyntax('age:25')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('age')
      expect(result[0]?.value).toBe(25)
    })

    test('extracts kids with alias "k:2"', () => {
      const result = extractKeyValueSyntax('k:2')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('kids')
      expect(result[0]?.value).toBe(2)
    })

    test('extracts productType "productType:auto"', () => {
      const result = extractKeyValueSyntax('productType:auto')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('productType')
      expect(result[0]?.value).toBe('auto')
    })
  })

  describe('email fields', () => {
    test('extracts valid email "e:user@example.com"', () => {
      const result = extractKeyValueSyntax('e:user@example.com')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('email')
      expect(result[0]?.value).toBe('user@example.com')
    })

    test('extracts valid email with full key "email:user@example.com"', () => {
      const result = extractKeyValueSyntax('email:user@example.com')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('email')
      expect(result[0]?.value).toBe('user@example.com')
    })

    test('rejects invalid email "e:j@j" (missing period in domain)', () => {
      const result = extractKeyValueSyntax('e:j@j')
      expect(result).toHaveLength(0)
    })

    test('rejects invalid email "e:user@" (missing domain)', () => {
      const result = extractKeyValueSyntax('e:user@')
      expect(result).toHaveLength(0)
    })
  })

  describe('mixed scenarios', () => {
    test('extracts multiple fields including multi-word "name:John Smith state:CA age:25"', () => {
      const result = extractKeyValueSyntax('name:John Smith state:CA age:25')
      expect(result).toHaveLength(3)
      expect(result[0]?.fieldName).toBe('name')
      expect(result[0]?.value).toBe('John Smith')
      expect(result[1]?.fieldName).toBe('state')
      expect(result[1]?.value).toBe('CA')
      expect(result[2]?.fieldName).toBe('age')
      expect(result[2]?.value).toBe(25)
    })

    test('extracts name and email "name:John Smith email:john@example.com"', () => {
      const result = extractKeyValueSyntax('name:John Smith email:john@example.com')
      expect(result).toHaveLength(2)
      // Results are in order found (email pattern runs first, then multi-word)
      const nameField = result.find((f) => f.fieldName === 'name')
      const emailField = result.find((f) => f.fieldName === 'email')
      expect(nameField).toBeDefined()
      expect(nameField?.value).toBe('John Smith')
      expect(emailField).toBeDefined()
      expect(emailField?.value).toBe('john@example.com')
    })

    test('handles name with comma delimiter "name:John Smith, state:CA"', () => {
      const result = extractKeyValueSyntax('name:John Smith, state:CA')
      expect(result).toHaveLength(2)
      expect(result[0]?.fieldName).toBe('name')
      expect(result[0]?.value).toBe('John Smith')
      expect(result[1]?.fieldName).toBe('state')
      expect(result[1]?.value).toBe('CA')
    })
  })

  describe('edge cases', () => {
    test('does not extract single-word name field as multi-word "name:John"', () => {
      const result = extractKeyValueSyntax('name:John')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('name')
      expect(result[0]?.value).toBe('John')
    })

    test('handles name with multiple spaces "name:John  Smith"', () => {
      const result = extractKeyValueSyntax('name:John  Smith')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('name')
      expect(result[0]?.value).toBe('John  Smith')
    })

    test('stops at period "name:John Smith. Next sentence"', () => {
      const result = extractKeyValueSyntax('name:John Smith. Next sentence')
      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('name')
      expect(result[0]?.value).toBe('John Smith')
    })
  })
})
