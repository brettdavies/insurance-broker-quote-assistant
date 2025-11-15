import { describe, expect, it } from 'bun:test'
import {
  type ParsedKeyValue,
  extractFields,
  getFieldName,
  parseKeyValueSyntax,
} from '../pill-parser'

describe('Key-Value Parser', () => {
  describe('parseKeyValueSyntax', () => {
    it('parses valid key-value pairs', () => {
      const text = 'Client needs auto, k:2 v:3'
      const result = parseKeyValueSyntax(text)

      // Expect 3 fields: productType extracted from "auto", plus k:2 and v:3
      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        key: 'productType',
        value: 'auto',
        validation: 'valid',
        fieldName: 'productType',
      })
      expect(result[1]).toMatchObject({
        key: 'k',
        value: '2',
        validation: 'valid',
        fieldName: 'kids',
      })
      expect(result[2]).toMatchObject({
        key: 'v',
        value: '3',
        validation: 'valid',
        fieldName: 'vehicles',
      })
    })

    it('handles case-insensitive keys', () => {
      const text = 'K:2 V:3'
      const result = parseKeyValueSyntax(text)

      expect(result).toHaveLength(2)
      expect(result[0]?.key).toBe('k')
      expect(result[1]?.key).toBe('v')
      expect(result[0]?.validation).toBe('valid')
      expect(result[1]?.validation).toBe('valid')
    })

    it('identifies invalid keys', () => {
      const text = 'xyz:5'
      const result = parseKeyValueSyntax(text)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        key: 'xyz',
        value: '5',
        validation: 'invalid_key',
      })
    })

    it('identifies invalid value types for numeric fields', () => {
      const text = 'kids:abc'
      const result = parseKeyValueSyntax(text)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        key: 'kids',
        value: 'abc',
        validation: 'invalid_value',
        fieldName: 'kids',
      })
    })

    describe('email validation', () => {
      it('validates valid email addresses', () => {
        const text = 'e:test@example.com'
        const result = parseKeyValueSyntax(text)

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
          key: 'e',
          value: 'test@example.com',
          validation: 'valid',
          fieldName: 'email',
        })
      })

      it('validates email with shortcut e:', () => {
        const text = 'e:user@domain.com'
        const result = parseKeyValueSyntax(text)

        expect(result).toHaveLength(1)
        expect(result[0]?.validation).toBe('valid')
        expect(result[0]?.fieldName).toBe('email')
      })

      it('validates email with full key email:', () => {
        const text = 'email:user@domain.com'
        const result = parseKeyValueSyntax(text)

        expect(result).toHaveLength(1)
        expect(result[0]?.validation).toBe('valid')
        expect(result[0]?.fieldName).toBe('email')
      })

      it('identifies invalid email format - missing @', () => {
        const text = 'e:notanemail.com'
        const result = parseKeyValueSyntax(text)

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
          key: 'e',
          value: 'notanemail.com',
          validation: 'invalid_value',
          fieldName: 'email',
        })
      })

      it('identifies invalid email format - missing domain', () => {
        const text = 'e:user@'
        const result = parseKeyValueSyntax(text)

        expect(result).toHaveLength(1)
        expect(result[0]?.validation).toBe('invalid_value')
        expect(result[0]?.fieldName).toBe('email')
      })

      it('identifies invalid email format - missing TLD', () => {
        const text = 'e:user@domain'
        const result = parseKeyValueSyntax(text)

        expect(result).toHaveLength(1)
        expect(result[0]?.validation).toBe('invalid_value')
        expect(result[0]?.fieldName).toBe('email')
      })

      it('identifies invalid email format - numeric value', () => {
        const text = 'e:2'
        const result = parseKeyValueSyntax(text)

        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
          key: 'e',
          value: '2',
          validation: 'invalid_value',
          fieldName: 'email',
        })
      })

      it('handles email with subdomain', () => {
        const text = 'e:user@mail.example.com'
        const result = parseKeyValueSyntax(text)

        expect(result).toHaveLength(1)
        expect(result[0]?.validation).toBe('valid')
        expect(result[0]?.value).toBe('user@mail.example.com')
      })

      it('handles email with plus sign', () => {
        const text = 'e:user+tag@example.com'
        const result = parseKeyValueSyntax(text)

        expect(result).toHaveLength(1)
        expect(result[0]?.validation).toBe('valid')
      })

      it('handles email with dots in local part', () => {
        const text = 'e:first.last@example.com'
        const result = parseKeyValueSyntax(text)

        expect(result).toHaveLength(1)
        expect(result[0]?.validation).toBe('valid')
      })

      it('handles email with hyphens', () => {
        const text = 'e:user-name@example-domain.com'
        const result = parseKeyValueSyntax(text)

        expect(result).toHaveLength(1)
        expect(result[0]?.validation).toBe('valid')
      })
    })

    it('handles multiple key-value pairs in text', () => {
      const text = 'Client has k:2 v:3 state:CA'
      const result = parseKeyValueSyntax(text)

      expect(result).toHaveLength(3)
      expect(result.every((r) => r.validation === 'valid')).toBe(true)
    })

    it('handles key-value pairs at end of string', () => {
      const text = 'Client info k:2'
      const result = parseKeyValueSyntax(text)

      expect(result).toHaveLength(1)
      expect(result[0]?.validation).toBe('valid')
    })

    it('handles field aliases', () => {
      const text = 'kids:2 deps:4'
      const result = parseKeyValueSyntax(text)

      expect(result).toHaveLength(2)
      expect(result[0]?.fieldName).toBe('kids')
      expect(result[1]?.fieldName).toBe('householdSize') // 'deps' alias maps to householdSize (dependents was removed)
    })

    it('handles credit score field with j shortcut', () => {
      const text = 'j:650'
      const result = parseKeyValueSyntax(text)

      expect(result).toHaveLength(1)
      expect(result[0]?.fieldName).toBe('creditScore')
      expect(result[0]?.value).toBe('650')
      expect(result[0]?.validation).toBe('valid')
    })
  })

  describe('extractFields', () => {
    it('extracts valid fields from parsed results', () => {
      const parsed: ParsedKeyValue[] = [
        { key: 'k', value: '2', original: 'k:2', validation: 'valid', fieldName: 'kids' },
        { key: 'v', value: '3', original: 'v:3', validation: 'valid', fieldName: 'vehicles' },
        { key: 'xyz', value: '5', original: 'xyz:5', validation: 'invalid_key' },
      ]

      const fields = extractFields(parsed)

      expect(fields).toEqual({
        kids: 2,
        vehicles: 3,
      })
      expect(fields).not.toHaveProperty('xyz')
    })

    it('converts numeric fields to numbers', () => {
      const parsed: ParsedKeyValue[] = [
        { key: 'k', value: '2', original: 'k:2', validation: 'valid', fieldName: 'kids' },
        { key: 'age', value: '30', original: 'age:30', validation: 'valid', fieldName: 'age' },
      ]

      const fields = extractFields(parsed)

      expect(typeof fields.kids).toBe('number')
      expect(typeof fields.age).toBe('number')
      expect(fields.kids).toBe(2)
      expect(fields.age).toBe(30)
    })

    it('keeps string fields as strings', () => {
      const parsed: ParsedKeyValue[] = [
        {
          key: 'state',
          value: 'CA',
          original: 'state:CA',
          validation: 'valid',
          fieldName: 'state',
        },
        {
          key: 'name',
          value: 'John',
          original: 'name:John',
          validation: 'valid',
          fieldName: 'name',
        },
      ]

      const fields = extractFields(parsed)

      expect(typeof fields.state).toBe('string')
      expect(typeof fields.name).toBe('string')
      expect(fields.state).toBe('CA')
      expect(fields.name).toBe('John')
    })
  })

  describe('getFieldName', () => {
    it('returns field name for valid alias', () => {
      expect(getFieldName('k')).toBe('kids')
      expect(getFieldName('kids')).toBe('kids')
      expect(getFieldName('v')).toBe('vehicles')
      expect(getFieldName('state')).toBe('state')
    })

    it('returns undefined for invalid alias', () => {
      expect(getFieldName('xyz')).toBeUndefined()
      expect(getFieldName('invalid')).toBeUndefined()
    })

    it('handles case-insensitive lookups', () => {
      expect(getFieldName('K')).toBe('kids')
      expect(getFieldName('STATE')).toBe('state')
    })

    it('returns creditScore for j alias', () => {
      expect(getFieldName('j')).toBe('creditScore')
      expect(getFieldName('credit')).toBe('creditScore')
      expect(getFieldName('score')).toBe('creditScore')
    })
  })

  describe('Deduplication for single-instance fields', () => {
    it('deduplicates kids field - "kids:2" then "kids:3" → single kids:3', () => {
      const text = 'kids:2 kids:3'
      const result = parseKeyValueSyntax(text)

      // Should have only one kids field (deduplicated)
      const kidsFields = result.filter((r) => r.fieldName === 'kids')
      expect(kidsFields).toHaveLength(1)
      expect(kidsFields[0]?.value).toBe('3') // Latest value wins
      expect(kidsFields[0]?.validation).toBe('valid')
    })

    it('deduplicates householdSize field - "h:2" then "householdSize:3" → single householdSize:3', () => {
      const text = 'h:2 householdSize:3'
      const result = parseKeyValueSyntax(text)

      // Should have only one householdSize field (deduplicated and normalized)
      const householdSizeFields = result.filter((r) => r.fieldName === 'householdSize')
      expect(householdSizeFields).toHaveLength(1)
      expect(householdSizeFields[0]?.value).toBe('3') // Latest value wins
      expect(householdSizeFields[0]?.validation).toBe('valid')
      // Key should be normalized to householdSize (not 'h')
      expect(householdSizeFields[0]?.key).toBe('householdSize')
    })

    it('deduplicates multiple single-instance fields', () => {
      const text = 'kids:2 kids:3 ownsHome:true ownsHome:false age:25 age:30'
      const result = parseKeyValueSyntax(text)

      // Should have one of each field
      const kidsFields = result.filter((r) => r.fieldName === 'kids')
      const ownsHomeFields = result.filter((r) => r.fieldName === 'ownsHome')
      const ageFields = result.filter((r) => r.fieldName === 'age')

      expect(kidsFields).toHaveLength(1)
      expect(kidsFields[0]?.value).toBe('3')
      expect(ownsHomeFields).toHaveLength(1)
      expect(ownsHomeFields[0]?.value).toBe('false')
      expect(ageFields).toHaveLength(1)
      expect(ageFields[0]?.value).toBe('30')
    })
  })

  describe('householdSize inference removed from parsing', () => {
    it('does not include householdSize in parsed results from "I have 2 kids. She has three kids."', () => {
      const text = 'I have 2 kids. She has three kids.'
      const result = parseKeyValueSyntax(text)

      // Should have single kids:3 (deduplicated from "2 kids" and "three kids")
      const kidsFields = result.filter((r) => r.fieldName === 'kids')
      expect(kidsFields).toHaveLength(1)
      expect(kidsFields[0]?.value).toBe('3') // "three kids" → 3

      // Should NOT have householdSize in parsed results (moved to InferenceEngine)
      const householdSizeFields = result.filter((r) => r.fieldName === 'householdSize')
      expect(householdSizeFields).toHaveLength(0)
    })

    it('never creates householdSize as a known pill from parsing', () => {
      const text = '2 kids'
      const result = parseKeyValueSyntax(text)

      // Should have kids field
      const kidsFields = result.filter((r) => r.fieldName === 'kids')
      expect(kidsFields.length).toBeGreaterThan(0)

      // Should NOT have householdSize in parsed results
      const householdSizeFields = result.filter((r) => r.fieldName === 'householdSize')
      expect(householdSizeFields).toHaveLength(0)
    })

    it('allows explicit householdSize key-value pairs', () => {
      const text = 'householdSize:4'
      const result = parseKeyValueSyntax(text)

      // Explicit key-value pairs should still work
      const householdSizeFields = result.filter((r) => r.fieldName === 'householdSize')
      expect(householdSizeFields).toHaveLength(1)
      expect(householdSizeFields[0]?.value).toBe('4')
      expect(householdSizeFields[0]?.validation).toBe('valid')
    })
  })
})
