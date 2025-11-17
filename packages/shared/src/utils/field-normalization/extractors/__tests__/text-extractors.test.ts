/**
 * Text Extractors Tests
 *
 * Tests for name, email, and phone extraction from natural language.
 */

import { describe, expect, test } from 'bun:test'
import { extractEmail, extractName, extractPhone } from '../text-extractors'

describe('extractName', () => {
  test('extracts name from "John Doe," pattern (comma delimiter)', () => {
    const result = extractName('John Doe,')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('name')
    expect(result?.value).toBe('John Doe')
    expect(result?.originalText).toBe('John Doe')
  })

  test('extracts name from "Mary Jane Smith\n" pattern (newline delimiter)', () => {
    const result = extractName('Mary Jane Smith\n')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('name')
    expect(result?.value).toBe('Mary Jane Smith')
    expect(result?.originalText).toBe('Mary Jane Smith')
  })

  test('extracts name with multiple spaces "John  Doe,"', () => {
    const result = extractName('John  Doe,')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('name')
    expect(result?.value).toBe('John  Doe')
    expect(result?.originalText).toBe('John  Doe')
  })

  test('extracts name from mixed text "John Doe, needs auto insurance"', () => {
    const result = extractName('John Doe, needs auto insurance')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('name')
    expect(result?.value).toBe('John Doe')
  })

  test('does NOT extract name at end of string (to avoid triggering while typing)', () => {
    const result = extractName('John Doe')
    expect(result).toBeNull()
  })

  test('does NOT extract name without delimiter', () => {
    const result = extractName('John Doe needs insurance')
    expect(result).toBeNull()
  })

  test('returns null when no name pattern found', () => {
    const result = extractName('No name mentioned here')
    expect(result).toBeNull()
  })

  test('extracts first name match when multiple names present', () => {
    const result = extractName('John Doe, Mary Smith,')
    expect(result).not.toBeNull()
    expect(result?.value).toBe('John Doe')
  })
})

describe('extractEmail', () => {
  test('extracts email from "user@example.com" pattern', () => {
    const result = extractEmail('user@example.com')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('email')
    expect(result?.value).toBe('user@example.com')
    expect(result?.originalText).toBe('user@example.com')
  })

  test('extracts email from "john.doe@company.co.uk" pattern (subdomain)', () => {
    const result = extractEmail('john.doe@company.co.uk')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('email')
    expect(result?.value).toBe('john.doe@company.co.uk')
  })

  test('extracts email from mixed text "Contact me at user@example.com for details"', () => {
    const result = extractEmail('Contact me at user@example.com for details')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('email')
    expect(result?.value).toBe('user@example.com')
  })

  test('does NOT extract invalid email "j@j" (missing period in domain)', () => {
    const result = extractEmail('j@j')
    expect(result).toBeNull()
  })

  test('does NOT extract invalid email "user@" (missing domain)', () => {
    const result = extractEmail('user@')
    expect(result).toBeNull()
  })

  test('does NOT extract email from key-value syntax "e:user@example.com" (handled by key-value extractor)', () => {
    const result = extractEmail('e:user@example.com')
    expect(result).toBeNull()
  })

  test('does NOT extract email from key-value syntax "email:user@example.com"', () => {
    const result = extractEmail('email:user@example.com')
    expect(result).toBeNull()
  })

  test('extracts email when key-value syntax has space "e: user@example.com"', () => {
    // This should still extract because there's a space, so it's not key-value syntax
    const result = extractEmail('e: user@example.com')
    expect(result).not.toBeNull()
    expect(result?.value).toBe('user@example.com')
  })

  test('returns null when no email pattern found', () => {
    const result = extractEmail('No email mentioned here')
    expect(result).toBeNull()
  })

  test('extracts first email match when multiple emails present', () => {
    const result = extractEmail('Contact user@example.com or admin@test.com')
    expect(result).not.toBeNull()
    expect(result?.value).toBe('user@example.com')
  })
})

describe('extractName and extractEmail integration', () => {
  test('both extractors work on the same text without interfering', () => {
    const text = 'John Doe, user@example.com'

    const nameResult = extractName(text)
    expect(nameResult).not.toBeNull()
    expect(nameResult?.value).toBe('John Doe')

    const emailResult = extractEmail(text)
    expect(emailResult).not.toBeNull()
    expect(emailResult?.value).toBe('user@example.com')
  })

  test('real test case: contact information format', () => {
    const text = 'Sarah Johnson, sarah.j@email.com\n'

    const nameResult = extractName(text)
    expect(nameResult).not.toBeNull()
    expect(nameResult?.value).toBe('Sarah Johnson')

    const emailResult = extractEmail(text)
    expect(emailResult).not.toBeNull()
    expect(emailResult?.value).toBe('sarah.j@email.com')
  })
})

describe('extractPhone', () => {
  test('extracts phone from "(nnn) nnn-nnnn" pattern', () => {
    const result = extractPhone('(555) 123-4567')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('phone')
    expect(result?.value).toBe('555-123-4567')
    expect(result?.originalText).toBe('(555) 123-4567')
  })

  test('extracts phone from "(nnn)nnn-nnnn" pattern', () => {
    const result = extractPhone('(555)123-4567')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('phone')
    expect(result?.value).toBe('555-123-4567')
    expect(result?.originalText).toBe('(555)123-4567')
  })

  test('extracts phone from "nnn-nnn-nnnn" pattern', () => {
    const result = extractPhone('555-123-4567')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('phone')
    expect(result?.value).toBe('555-123-4567')
    expect(result?.originalText).toBe('555-123-4567')
  })

  test('extracts phone from mixed text "Contact me at 555-123-4567 for details"', () => {
    const result = extractPhone('Contact me at 555-123-4567 for details')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('phone')
    expect(result?.value).toBe('555-123-4567')
  })

  test('extracts phone with context "phone is 305-555-1234"', () => {
    const result = extractPhone('phone is 305-555-1234')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('phone')
    expect(result?.value).toBe('305-555-1234')
  })

  test('does NOT extract phone from key-value syntax "phone:555-123-4567" (handled by key-value extractor)', () => {
    const result = extractPhone('phone:555-123-4567')
    expect(result).toBeNull()
  })

  test('does NOT extract phone from key-value syntax "p:555-123-4567"', () => {
    const result = extractPhone('p:555-123-4567')
    expect(result).toBeNull()
  })

  test('extracts phone when key-value syntax has space "phone: 555-123-4567"', () => {
    // This should still extract because there's a space, so it's not key-value syntax
    const result = extractPhone('phone: 555-123-4567')
    expect(result).not.toBeNull()
    expect(result?.value).toBe('555-123-4567')
  })

  test('does NOT extract partial phone numbers', () => {
    const result = extractPhone('555-123')
    expect(result).toBeNull()
  })

  test('does NOT extract phone numbers that are part of longer numbers', () => {
    // Should not match 10 digits that are part of a longer number
    const result = extractPhone('123456789012345')
    expect(result).toBeNull()
  })

  test('returns null when no phone pattern found', () => {
    const result = extractPhone('No phone mentioned here')
    expect(result).toBeNull()
  })

  test('extracts first phone match when multiple phones present', () => {
    const result = extractPhone('Contact 555-123-4567 or 555-987-6543')
    expect(result).not.toBeNull()
    expect(result?.value).toBe('555-123-4567')
  })
})
