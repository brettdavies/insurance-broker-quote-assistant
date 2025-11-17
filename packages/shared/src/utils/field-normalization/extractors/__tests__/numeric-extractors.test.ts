/**
 * Numeric Extractors Tests
 *
 * Tests for age and credit score extraction from natural language.
 */

import { describe, expect, test } from 'bun:test'
import { extractAge, extractCreditScore } from '../numeric-extractors'

describe('extractAge', () => {
  test('extracts age from "Age 36" pattern (capital A)', () => {
    const result = extractAge('Age 36')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('age')
    expect(result?.value).toBe(36)
    expect(result?.originalText).toBe('age 36')
  })

  test('extracts age from "age 36" pattern (lowercase)', () => {
    const result = extractAge('age 36')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('age')
    expect(result?.value).toBe(36)
    expect(result?.originalText).toBe('age 36')
  })

  test('extracts age from "age: 35" pattern (with colon)', () => {
    const result = extractAge('age: 35')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('age')
    expect(result?.value).toBe(35)
    expect(result?.originalText).toBe('age: 35')
  })

  test('extracts age from "35yo" pattern', () => {
    const result = extractAge('35yo')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('age')
    expect(result?.value).toBe(35)
    expect(result?.originalText).toBe('35yo')
  })

  test('extracts age from "35 yo" pattern (with space)', () => {
    const result = extractAge('35 yo')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('age')
    expect(result?.value).toBe(35)
  })

  test('extracts age from "35 years old" pattern', () => {
    const result = extractAge('35 years old')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('age')
    expect(result?.value).toBe(35)
    expect(result?.originalText).toBe('35 years old')
  })

  test('extracts age from "35 yrs old" pattern', () => {
    const result = extractAge('35 yrs old')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('age')
    expect(result?.value).toBe(35)
    expect(result?.originalText).toBe('35 yrs old')
  })

  test('extracts age from mixed text "IL auto. Age 36. Clean record"', () => {
    const result = extractAge('IL auto. Age 36. Clean record')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('age')
    expect(result?.value).toBe(36)
  })

  test('returns null for invalid age (0)', () => {
    const result = extractAge('age 0')
    expect(result).toBeNull()
  })

  test('returns null for invalid age (> 150)', () => {
    const result = extractAge('age 200')
    expect(result).toBeNull()
  })

  test('returns null when no age pattern found', () => {
    const result = extractAge('No age mentioned here')
    expect(result).toBeNull()
  })
})

describe('extractCreditScore', () => {
  test('extracts credit score from "Credit 750" pattern (capital C)', () => {
    const result = extractCreditScore('Credit 750')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('creditScore')
    expect(result?.value).toBe(750)
    expect(result?.originalText).toBe('credit 750')
  })

  test('extracts credit score from "credit 750" pattern (lowercase)', () => {
    const result = extractCreditScore('credit 750')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('creditScore')
    expect(result?.value).toBe(750)
    expect(result?.originalText).toBe('credit 750')
  })

  test('extracts credit score from "credit: 750" pattern (with colon)', () => {
    const result = extractCreditScore('credit: 750')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('creditScore')
    expect(result?.value).toBe(750)
  })

  test('extracts credit score from "score 650" pattern', () => {
    const result = extractCreditScore('score 650')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('creditScore')
    expect(result?.value).toBe(650)
  })

  test('extracts credit score from "credit score 720" pattern', () => {
    const result = extractCreditScore('credit score 720')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('creditScore')
    expect(result?.value).toBe(720)
    expect(result?.originalText).toBe('credit score 720')
  })

  test('extracts credit score from "credit score: 800" pattern (with colon)', () => {
    const result = extractCreditScore('credit score: 800')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('creditScore')
    expect(result?.value).toBe(800)
  })

  test('extracts credit score from mixed text "Clean record. Credit 750. Has pro"', () => {
    const result = extractCreditScore('Clean record. Credit 750. Has pro')
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('creditScore')
    expect(result?.value).toBe(750)
  })

  test('returns null for invalid credit score (< 300)', () => {
    const result = extractCreditScore('credit 250')
    expect(result).toBeNull()
  })

  test('returns null for invalid credit score (> 850)', () => {
    const result = extractCreditScore('credit 900')
    expect(result).toBeNull()
  })

  test('returns null when no credit score pattern found', () => {
    const result = extractCreditScore('No credit mentioned here')
    expect(result).toBeNull()
  })

  test('does not extract 4-digit numbers (not credit scores)', () => {
    const result = extractCreditScore('year 2024')
    expect(result).toBeNull()
  })

  test('does not extract 2-digit numbers (not credit scores)', () => {
    const result = extractCreditScore('age 36')
    expect(result).toBeNull()
  })
})

describe('extractAge and extractCreditScore integration', () => {
  test('both extractors work on the same text without interfering', () => {
    const text = 'Age 36. Credit 750'

    const ageResult = extractAge(text)
    expect(ageResult).not.toBeNull()
    expect(ageResult?.value).toBe(36)

    const creditResult = extractCreditScore(text)
    expect(creditResult).not.toBeNull()
    expect(creditResult?.value).toBe(750)
  })

  test('real test case: conversational-10 format', () => {
    const text =
      'IL auto. 3 vehicles: 2021 F-150, 2019 Camry, 2020 CR-V. 3 drivers. Age 36. 12k miles/yr. Clean record. Credit 750. Has pro'

    const ageResult = extractAge(text)
    expect(ageResult).not.toBeNull()
    expect(ageResult?.value).toBe(36)
    expect(ageResult?.fieldName).toBe('age')

    const creditResult = extractCreditScore(text)
    expect(creditResult).not.toBeNull()
    expect(creditResult?.value).toBe(750)
    expect(creditResult?.fieldName).toBe('creditScore')
  })
})
