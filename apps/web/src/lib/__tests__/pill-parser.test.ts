import { describe, expect, it } from 'bun:test'
import { type ParsedKeyValue, extractFields, parseKeyValueSyntax } from '../pill-parser'

describe('Key-Value Parser', () => {
  describe('parseKeyValueSyntax', () => {
    it('parses valid key-value pairs', () => {
      const text = 'Client needs auto, k:2 v:3'
      const { pills } = parseKeyValueSyntax(text)

      // Expect 3 fields: productType extracted from "auto", plus k:2 and v:3
      // Note: keys are resolved to canonical field names (kids/vehicles, not k/v)
      expect(pills).toHaveLength(3)
      expect(pills[0]).toMatchObject({
        key: 'productType',
        value: 'auto',
        validation: 'valid',
        fieldName: 'productType',
      })
      expect(pills[1]).toMatchObject({
        key: 'kids', // Resolved from 'k' alias
        value: '2',
        validation: 'valid',
        fieldName: 'kids',
      })
      expect(pills[2]).toMatchObject({
        key: 'vehicles', // Resolved from 'v' alias
        value: '3',
        validation: 'valid',
        fieldName: 'vehicles',
      })
    })

    it('handles case-insensitive keys', () => {
      const text = 'K:2 V:3'
      const { pills } = parseKeyValueSyntax(text)

      expect(pills).toHaveLength(2)
      // Keys are resolved to canonical names regardless of case
      expect(pills[0]?.key).toBe('kids')
      expect(pills[1]?.key).toBe('vehicles')
      expect(pills[0]?.validation).toBe('valid')
      expect(pills[1]?.validation).toBe('valid')
    })

    it('extracts unrecognized keys as pills marked invalid_key', () => {
      const text = 'xyz:5'
      const { pills } = parseKeyValueSyntax(text)

      // Unknown fields are now extracted as pills and marked as invalid_key
      expect(pills).toHaveLength(1)
      expect(pills[0]).toMatchObject({
        key: 'xyz',
        value: '5',
        validation: 'invalid_key',
        fieldName: 'xyz',
      })
    })

    it('validates invalid value types and marks as invalid_value', () => {
      const text = 'kids:abc'
      const { pills } = parseKeyValueSyntax(text)

      // Validation is now performed during pill parsing
      expect(pills).toHaveLength(1)
      expect(pills[0]).toMatchObject({
        key: 'kids',
        value: 'abc',
        validation: 'invalid_value', // 'abc' is not a valid number for numeric field
        fieldName: 'kids',
      })
    })

    describe('email validation', () => {
      it('extracts email addresses with full value', () => {
        const text = 'e:test@example.com'
        const { pills } = parseKeyValueSyntax(text)

        expect(pills).toHaveLength(1)
        expect(pills[0]).toMatchObject({
          key: 'email', // Resolved from 'e' alias
          value: 'test@example.com',
          validation: 'valid',
          fieldName: 'email',
        })
      })

      it('extracts email with shortcut e:', () => {
        const text = 'e:user@domain.com'
        const { pills } = parseKeyValueSyntax(text)

        expect(pills).toHaveLength(1)
        expect(pills[0]?.validation).toBe('valid')
        expect(pills[0]?.fieldName).toBe('email')
        expect(pills[0]?.key).toBe('email')
      })

      it('extracts email with full key email:', () => {
        const text = 'email:user@domain.com'
        const { pills } = parseKeyValueSyntax(text)

        expect(pills).toHaveLength(1)
        expect(pills[0]?.validation).toBe('valid')
        expect(pills[0]?.fieldName).toBe('email')
        expect(pills[0]?.key).toBe('email')
      })

      it('extracts malformed emails - missing @', () => {
        const text = 'e:notanemail.com'
        const { pills } = parseKeyValueSyntax(text)

        // Email is a string field, so non-empty values are valid
        expect(pills).toHaveLength(1)
        expect(pills[0]).toMatchObject({
          key: 'email',
          value: 'notanemail.com',
          validation: 'valid', // String fields only check non-empty
          fieldName: 'email',
        })
      })

      it('extracts malformed emails - missing domain', () => {
        const text = 'e:user@'
        const { pills } = parseKeyValueSyntax(text)

        expect(pills).toHaveLength(1)
        expect(pills[0]?.validation).toBe('valid') // String fields only check non-empty
        expect(pills[0]?.fieldName).toBe('email')
        expect(pills[0]?.key).toBe('email')
      })

      it('extracts malformed emails - missing TLD', () => {
        const text = 'e:user@domain'
        const { pills } = parseKeyValueSyntax(text)

        expect(pills).toHaveLength(1)
        expect(pills[0]?.validation).toBe('valid') // String fields only check non-empty
        expect(pills[0]?.fieldName).toBe('email')
        expect(pills[0]?.key).toBe('email')
      })

      it('extracts malformed emails - numeric value', () => {
        const text = 'e:2'
        const { pills } = parseKeyValueSyntax(text)

        expect(pills).toHaveLength(1)
        expect(pills[0]).toMatchObject({
          key: 'email',
          value: '2',
          validation: 'valid', // String fields only check non-empty
          fieldName: 'email',
        })
      })

      it('handles email with subdomain', () => {
        const text = 'e:user@mail.example.com'
        const { pills } = parseKeyValueSyntax(text)

        expect(pills).toHaveLength(1)
        expect(pills[0]?.validation).toBe('valid')
        expect(pills[0]?.value).toBe('user@mail.example.com')
      })

      it('handles email with plus sign', () => {
        const text = 'e:user+tag@example.com'
        const { pills } = parseKeyValueSyntax(text)

        expect(pills).toHaveLength(1)
        expect(pills[0]?.validation).toBe('valid')
      })

      it('handles email with dots in local part', () => {
        const text = 'e:first.last@example.com'
        const { pills } = parseKeyValueSyntax(text)

        expect(pills).toHaveLength(1)
        expect(pills[0]?.validation).toBe('valid')
      })

      it('handles email with hyphens', () => {
        const text = 'e:user-name@example-domain.com'
        const { pills } = parseKeyValueSyntax(text)

        expect(pills).toHaveLength(1)
        expect(pills[0]?.validation).toBe('valid')
      })
    })

    it('handles multiple key-value pairs in text', () => {
      const text = 'Client has k:2 v:3 state:CA'
      const { pills } = parseKeyValueSyntax(text)

      expect(pills).toHaveLength(3)
      expect(pills.every((r) => r.validation === 'valid')).toBe(true)
    })

    it('handles key-value pairs at end of string', () => {
      const text = 'Client info k:2'
      const { pills } = parseKeyValueSyntax(text)

      expect(pills).toHaveLength(1)
      expect(pills[0]?.validation).toBe('valid')
    })

    it('handles field aliases', () => {
      const text = 'kids:2 deps:4'
      const { pills } = parseKeyValueSyntax(text)

      expect(pills).toHaveLength(2)
      expect(pills[0]?.fieldName).toBe('kids')
      expect(pills[1]?.fieldName).toBe('householdSize') // 'deps' alias maps to householdSize (dependents was removed)
    })

    it('handles credit score field with j shortcut', () => {
      const text = 'j:650'
      const { pills } = parseKeyValueSyntax(text)

      expect(pills).toHaveLength(1)
      expect(pills[0]?.fieldName).toBe('creditScore')
      expect(pills[0]?.value).toBe('650')
      expect(pills[0]?.validation).toBe('valid')
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

  describe('Multiple occurrences of same field', () => {
    it('deduplicates fields keeping last occurrence - "kids:2" then "kids:3"', () => {
      const text = 'kids:2 kids:3'
      const { pills } = parseKeyValueSyntax(text)

      // Deduplication happens after field name normalization, keeping last occurrence
      const kidsFields = pills.filter((r) => r.fieldName === 'kids')
      expect(kidsFields).toHaveLength(1)
      expect(kidsFields[0]?.value).toBe('3') // Last occurrence wins
      expect(kidsFields[0]?.validation).toBe('valid')
    })

    it('deduplicates aliases keeping last occurrence - "h:2" then "householdSize:3"', () => {
      const text = 'h:2 householdSize:3'
      const { pills } = parseKeyValueSyntax(text)

      // Both resolve to householdSize, but only last occurrence is kept
      const householdSizeFields = pills.filter((r) => r.fieldName === 'householdSize')
      expect(householdSizeFields).toHaveLength(1)
      expect(householdSizeFields[0]?.value).toBe('3') // Last occurrence wins
      // Key is resolved to canonical name
      expect(householdSizeFields[0]?.key).toBe('householdSize')
    })

    it('deduplicates multiple fields keeping last occurrence of each', () => {
      const text = 'kids:2 kids:3 ownsHome:true ownsHome:false age:25 age:30'
      const { pills } = parseKeyValueSyntax(text)

      const kidsFields = pills.filter((r) => r.fieldName === 'kids')
      const ownsHomeFields = pills.filter((r) => r.fieldName === 'ownsHome')
      const ageFields = pills.filter((r) => r.fieldName === 'age')

      // Each field is deduplicated, keeping last occurrence
      expect(kidsFields).toHaveLength(1)
      expect(kidsFields[0]?.value).toBe('3')
      expect(ownsHomeFields).toHaveLength(1)
      expect(ownsHomeFields[0]?.value).toBe('false')
      expect(ageFields).toHaveLength(1)
      expect(ageFields[0]?.value).toBe('30')
    })

    it('deduplicates alias and full name - "k:2" then "kids:3"', () => {
      const text = 'k:2 kids:3'
      const { pills } = parseKeyValueSyntax(text)

      // Both "k" and "kids" normalize to "kids", only last occurrence kept
      const kidsFields = pills.filter((r) => r.fieldName === 'kids')
      expect(kidsFields).toHaveLength(1)
      expect(kidsFields[0]?.value).toBe('3') // Last occurrence wins
      expect(kidsFields[0]?.key).toBe('kids') // Canonical name
    })
  })

  describe('Natural language extraction and inference', () => {
    it('extracts natural language patterns as pills', () => {
      const text = 'I have 2 kids. She has three kids.'
      const { pills } = parseKeyValueSyntax(text)

      // Natural language "2 kids" is extracted (word numbers like "three" are not supported)
      const kidsFields = pills.filter((r) => r.fieldName === 'kids')
      expect(kidsFields).toHaveLength(1) // Only "2 kids" extracted, not "three kids"
      expect(kidsFields[0]?.value).toBe('2')

      // householdSize NOT in pills (inferred by engine, included in userProfile)
      const householdSizeFields = pills.filter((r) => r.fieldName === 'householdSize')
      expect(householdSizeFields).toHaveLength(0)
    })

    it('extracts natural language "2 kids" pattern', () => {
      const text = '2 kids'
      const { pills } = parseKeyValueSyntax(text)

      // Natural language extraction creates pill
      const kidsFields = pills.filter((r) => r.fieldName === 'kids')
      expect(kidsFields).toHaveLength(1)
      expect(kidsFields[0]?.value).toBe('2')

      // householdSize is inferred but not a pill
      const householdSizeFields = pills.filter((r) => r.fieldName === 'householdSize')
      expect(householdSizeFields).toHaveLength(0)
    })

    it('allows explicit householdSize key-value pairs', () => {
      const text = 'householdSize:4'
      const { pills } = parseKeyValueSyntax(text)

      // Explicit key-value pairs create pills
      const householdSizeFields = pills.filter((r) => r.fieldName === 'householdSize')
      expect(householdSizeFields).toHaveLength(1)
      expect(householdSizeFields[0]?.value).toBe('4')
      expect(householdSizeFields[0]?.validation).toBe('valid')
    })
  })

  describe('Pill Validation', () => {
    describe('Invalid keys', () => {
      it('extracts unknown fields as pills and marks them as invalid_key', () => {
        const text = 'boats:2'
        const { pills } = parseKeyValueSyntax(text)

        // Unknown fields should now be extracted as pills
        expect(pills).toHaveLength(1)
        expect(pills[0]).toMatchObject({
          key: 'boats',
          value: '2',
          validation: 'invalid_key', // Unknown field should be marked as invalid_key
          fieldName: 'boats',
        })
      })

      it('handles multiple unknown fields', () => {
        const text = 'boats:2 yachts:1 unknownField:value'
        const { pills } = parseKeyValueSyntax(text)

        expect(pills).toHaveLength(3)
        expect(pills.every((p) => p.validation === 'invalid_key')).toBe(true)
        expect(pills.map((p) => p.key)).toEqual(['boats', 'yachts', 'unknownField'])
      })

      it('mixes known and unknown fields correctly', () => {
        const text = 'boats:2 kids:3 unknownField:value'
        const { pills } = parseKeyValueSyntax(text)

        const boatsPill = pills.find((p) => p.key === 'boats')
        const kidsPill = pills.find((p) => p.key === 'kids')
        const unknownPill = pills.find((p) => p.key === 'unknownField')

        expect(boatsPill?.validation).toBe('invalid_key')
        expect(kidsPill?.validation).toBe('valid')
        expect(unknownPill?.validation).toBe('invalid_key')
      })
    })

    describe('Numeric field validation', () => {
      it('marks valid numeric values as valid', () => {
        const text = 'age:25 kids:2 vehicles:3'
        const { pills } = parseKeyValueSyntax(text)

        const agePill = pills.find((p) => p.fieldName === 'age')
        const kidsPill = pills.find((p) => p.fieldName === 'kids')
        const vehiclesPill = pills.find((p) => p.fieldName === 'vehicles')

        expect(agePill?.validation).toBe('valid')
        expect(kidsPill?.validation).toBe('valid')
        expect(vehiclesPill?.validation).toBe('valid')
      })

      it('marks non-numeric values for numeric fields as invalid_value', () => {
        const text = 'age:abc kids:xyz vehicles:notanumber'
        const { pills } = parseKeyValueSyntax(text)

        const agePill = pills.find((p) => p.fieldName === 'age')
        const kidsPill = pills.find((p) => p.fieldName === 'kids')
        const vehiclesPill = pills.find((p) => p.fieldName === 'vehicles')

        expect(agePill?.validation).toBe('invalid_value')
        expect(kidsPill?.validation).toBe('invalid_value')
        expect(vehiclesPill?.validation).toBe('invalid_value')
      })

      it('marks out-of-range numeric values as invalid_value', () => {
        const text = 'age:200 age:-5'
        const { pills } = parseKeyValueSyntax(text)

        // After deduplication, only last occurrence is kept
        const agePill = pills.find((p) => p.fieldName === 'age')
        expect(agePill?.value).toBe('-5') // Last occurrence
        expect(agePill?.validation).toBe('invalid_value') // -5 < 0 (min is 0)
      })

      it('marks values at min/max boundaries as valid', () => {
        const text = 'age:0 age:150'
        const { pills } = parseKeyValueSyntax(text)

        // After deduplication, only last occurrence is kept
        const agePill = pills.find((p) => p.fieldName === 'age')
        expect(agePill?.value).toBe('150') // Last occurrence
        expect(agePill?.validation).toBe('valid') // 150 is max
      })
    })

    describe('Boolean field validation', () => {
      it('marks valid boolean values as valid', () => {
        const text = 'ownsHome:true ownsHome:false ownsHome:yes ownsHome:no ownsHome:1 ownsHome:0'
        const { pills } = parseKeyValueSyntax(text)

        // After deduplication, only last occurrence is kept
        // Note: '0' is parsed to boolean false, then converted to string "false" in pill marker
        const ownsHomePill = pills.find((p) => p.fieldName === 'ownsHome')
        expect(ownsHomePill?.value).toBe('false') // Last occurrence ('0' parsed to false, then stringified)
        expect(ownsHomePill?.validation).toBe('valid')
      })

      it('marks invalid boolean values as invalid_value', () => {
        const text = 'ownsHome:maybe ownsHome:2 ownsHome:abc'
        const { pills } = parseKeyValueSyntax(text)

        // After deduplication, only last occurrence is kept
        const ownsHomePill = pills.find((p) => p.fieldName === 'ownsHome')
        expect(ownsHomePill?.value).toBe('abc') // Last occurrence
        expect(ownsHomePill?.validation).toBe('invalid_value')
      })

      it('handles case-insensitive boolean values', () => {
        const text = 'ownsHome:TRUE ownsHome:FALSE ownsHome:YES ownsHome:NO'
        const { pills } = parseKeyValueSyntax(text)

        // After deduplication, only last occurrence is kept
        // Note: 'NO' is parsed to boolean false, then converted to string "false" in pill marker
        const ownsHomePill = pills.find((p) => p.fieldName === 'ownsHome')
        expect(ownsHomePill?.value).toBe('false') // Last occurrence ('NO' parsed to false, then stringified)
        expect(ownsHomePill?.validation).toBe('valid')
      })
    })

    describe('Enum field validation', () => {
      it('marks valid enum values as valid', () => {
        const text = 'productType:auto productType:renters productType:home'
        const { pills } = parseKeyValueSyntax(text)

        // After deduplication, only last occurrence is kept
        const productTypePill = pills.find((p) => p.fieldName === 'productType')
        expect(productTypePill?.value).toBe('home') // Last occurrence
        expect(productTypePill?.validation).toBe('valid')
      })

      it('marks invalid enum values as invalid_value', () => {
        const text = 'productType:invalid productType:unknown productType:xyz'
        const { pills } = parseKeyValueSyntax(text)

        // After deduplication, only last occurrence is kept
        const productTypePill = pills.find((p) => p.fieldName === 'productType')
        expect(productTypePill?.value).toBe('xyz') // Last occurrence
        expect(productTypePill?.validation).toBe('invalid_value')
      })

      it('handles enum value normalization (renter -> renters)', () => {
        const text = 'productType:renter'
        const { pills } = parseKeyValueSyntax(text)

        const productTypePill = pills.find((p) => p.fieldName === 'productType')
        // normalizeFieldValue handles "renter" -> "renters" normalization
        expect(productTypePill?.validation).toBe('valid')
      })
    })

    describe('String field validation', () => {
      it('marks non-empty string values as valid', () => {
        const text = 'name:John state:CA email:test@example.com'
        const { pills } = parseKeyValueSyntax(text)

        const namePill = pills.find((p) => p.fieldName === 'name')
        const statePill = pills.find((p) => p.fieldName === 'state')
        const emailPill = pills.find((p) => p.fieldName === 'email')

        expect(namePill?.validation).toBe('valid')
        expect(statePill?.validation).toBe('valid')
        expect(emailPill?.validation).toBe('valid')
      })

      it('marks empty string values as invalid_value', () => {
        // Note: Empty values might not make it through extraction, but if they do, they should be invalid
        // This tests the validation logic handles empty strings
        const text = 'name: state:'
        const { pills } = parseKeyValueSyntax(text)

        // Empty values might be filtered out, but if present, should be invalid
        if (pills.length > 0) {
          for (const pill of pills) {
            if (pill.value === '' || pill.value.trim() === '') {
              expect(pill.validation).toBe('invalid_value')
            }
          }
        }
      })
    })

    describe('State field validation', () => {
      it('marks valid state codes as valid', () => {
        const text = 'state:CA state:NY state:TX'
        const { pills } = parseKeyValueSyntax(text)

        // After deduplication, only last occurrence is kept
        const statePill = pills.find((p) => p.fieldName === 'state')
        expect(statePill?.value).toBe('TX') // Last occurrence
        expect(statePill?.validation).toBe('valid')
      })

      it('marks invalid state codes as invalid_value', () => {
        const text = 'state:XX state:ZZ state:INVALID'
        const { pills } = parseKeyValueSyntax(text)

        // After deduplication, only last occurrence is kept
        const statePill = pills.find((p) => p.fieldName === 'state')
        expect(statePill?.value).toBe('INVALID') // Last occurrence
        expect(statePill?.validation).toBe('invalid_value')
      })
    })

    describe('Mixed validation scenarios', () => {
      it('handles mix of valid and invalid pills with deduplication', () => {
        const text = 'age:25 age:abc kids:2 kids:xyz productType:auto productType:invalid'
        const { pills } = parseKeyValueSyntax(text)

        // After deduplication, only the last occurrence of each field is kept
        const agePill = pills.find((p) => p.fieldName === 'age')
        const kidsPill = pills.find((p) => p.fieldName === 'kids')
        const productPill = pills.find((p) => p.fieldName === 'productType')

        // Only last occurrence of each field should exist
        expect(agePill?.value).toBe('abc') // Last occurrence
        expect(agePill?.validation).toBe('invalid_value') // 'abc' is invalid for numeric field
        expect(kidsPill?.value).toBe('xyz') // Last occurrence
        expect(kidsPill?.validation).toBe('invalid_value') // 'xyz' is invalid for numeric field
        expect(productPill?.value).toBe('invalid') // Last occurrence
        expect(productPill?.validation).toBe('invalid_value') // 'invalid' is not a valid enum value
      })
    })
  })
})
