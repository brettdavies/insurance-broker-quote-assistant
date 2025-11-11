import { describe, expect, it } from 'bun:test'
import {
  type ParsedKeyValue,
  extractFields,
  getFieldName,
  parseKeyValueSyntax,
} from '../key-value-parser'

describe('Key-Value Parser', () => {
  describe('parseKeyValueSyntax', () => {
    it('parses valid key-value pairs', () => {
      const text = 'Client needs auto, k:2 v:3'
      const result = parseKeyValueSyntax(text)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        key: 'k',
        value: '2',
        validation: 'valid',
        fieldName: 'kids',
      })
      expect(result[1]).toMatchObject({
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
      expect(result[1]?.fieldName).toBe('dependents')
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
})
