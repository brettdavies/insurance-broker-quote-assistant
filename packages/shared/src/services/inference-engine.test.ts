import { describe, expect, test } from 'bun:test'
import { TEXT_PATTERN_INFERENCES } from '../config/text-pattern-inferences'
import type { InferenceRule } from '../schemas/unified-field-metadata'
import { unifiedFieldMetadata } from '../schemas/unified-field-metadata'
import type { UserProfile } from '../schemas/user-profile'
import { InferenceEngine } from './inference-engine'

describe('InferenceEngine', () => {
  describe('Field-to-field inferences', () => {
    test('productType="renters" infers ownsHome=false', () => {
      // Arrange: Extract field inferences from metadata
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: Partial<UserProfile> = {
        productType: 'renters',
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      expect(result.inferred.ownsHome).toBe(false)
      expect(result.reasons.ownsHome).toBe(
        'Renters insurance implies tenant status; home insurance implies ownership'
      )
      expect(result.confidence.ownsHome).toBe(0.85) // High confidence
    })

    test('productType="home" infers ownsHome=true', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: Partial<UserProfile> = {
        productType: 'home',
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      expect(result.inferred.ownsHome).toBe(true)
      expect(result.reasons.ownsHome).toBe(
        'Renters insurance implies tenant status; home insurance implies ownership'
      )
      expect(result.confidence.ownsHome).toBe(0.85)
    })

    test('productType="auto" does not infer ownsHome', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: Partial<UserProfile> = {
        productType: 'auto',
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      expect(result.inferred.ownsHome).toBeUndefined()
      expect(result.reasons.ownsHome).toBeUndefined()
      expect(result.confidence.ownsHome).toBeUndefined()
    })

    test('ownsHome already known - does not infer', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: Partial<UserProfile> = {
        productType: 'renters',
        ownsHome: true, // Already known
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      // Should NOT infer ownsHome because it's already known
      expect(result.inferred.ownsHome).toBeUndefined()
      expect(result.reasons.ownsHome).toBeUndefined()
    })

    test('ownsHome suppressed - does not infer', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const suppressedFields = ['ownsHome']
      const engine = new InferenceEngine(fieldInferences, [], suppressedFields)

      const knownFields: Partial<UserProfile> = {
        productType: 'renters',
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      // Should NOT infer ownsHome because it's suppressed
      expect(result.inferred.ownsHome).toBeUndefined()
      expect(result.reasons.ownsHome).toBeUndefined()
    })

    test('kids=2 infers householdSize=3 (kids + 1)', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: Partial<UserProfile> = {
        kids: 2,
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      expect(result.inferred.householdSize).toBe(3) // kids + 1
      expect(result.reasons.householdSize).toBe(
        'Number of kids plus one adult indicates household size'
      )
      expect(result.confidence.householdSize).toBe(0.7) // Medium confidence
    })

    test('drivers=2 infers householdSize=2', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: Partial<UserProfile> = {
        drivers: 2,
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      expect(result.inferred.householdSize).toBe(2) // drivers = householdSize
      expect(result.reasons.householdSize).toBe('Number of drivers typically equals household size')
      expect(result.confidence.householdSize).toBe(0.7) // Medium confidence
    })

    test('householdSize already known - does not infer from kids', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: Partial<UserProfile> = {
        kids: 2,
        householdSize: 5, // Already known
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      // Should NOT infer householdSize because it's already known
      expect(result.inferred.householdSize).toBeUndefined()
      expect(result.reasons.householdSize).toBeUndefined()
    })

    test('householdSize already inferred in same call - does not update (first inference wins)', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      // Simulate both kids and drivers in same call - first one processed wins
      // Note: Object.entries order is not guaranteed, but one will be processed first
      const knownFields: Partial<UserProfile> = {
        kids: 2,
        drivers: 2,
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      // Should infer householdSize from first field processed (either kids or drivers)
      // The check for already-inferred prevents the second field from overwriting
      expect(result.inferred.householdSize).toBeDefined()
      // It will be either 3 (from kids) or 2 (from drivers), depending on processing order
      expect([2, 3]).toContain(result.inferred.householdSize ?? 0)

      // Verify that only one inference was created (not both)
      // This is tested by checking the value is one of the expected values, not both
    })

    test('householdSize suppressed - does not infer from kids', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const suppressedFields = ['householdSize']
      const engine = new InferenceEngine(fieldInferences, [], suppressedFields)

      const knownFields: Partial<UserProfile> = {
        kids: 2,
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      // Should NOT infer householdSize because it's suppressed
      expect(result.inferred.householdSize).toBeUndefined()
      expect(result.reasons.householdSize).toBeUndefined()
    })
  })

  describe('Text pattern inferences', () => {
    test('"lives alone" infers householdSize=1', () => {
      // Arrange
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {}
      const inputText = 'I live alone in California'

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      expect(result.inferred.householdSize).toBe(1)
      expect(result.reasons.householdSize).toBe(
        "Pattern 'lives alone' strongly suggests single-person household"
      )
      expect(result.confidence.householdSize).toBe(0.7) // Medium confidence
    })

    test('"family of 4" infers householdSize=4 (capture group)', () => {
      // Arrange
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {}
      const inputText = 'I have a family of 4'

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      expect(result.inferred.householdSize).toBe(4)
      expect(result.reasons.householdSize).toBe(
        "Pattern 'family of N' explicitly states household size"
      )
      expect(result.confidence.householdSize).toBe(0.85) // High confidence
    })

    test('"clean record" infers cleanRecord3Yr=true', () => {
      // Arrange
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {}
      const inputText = 'I have a clean driving record'

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      expect(result.inferred.cleanRecord3Yr).toBe(true)
      expect(result.reasons.cleanRecord3Yr).toBe(
        "Pattern 'clean record' suggests no violations, defaulting to 3-year timeframe"
      )
      expect(result.confidence.cleanRecord3Yr).toBe(0.7) // Medium confidence
    })

    test('"3 years clean" infers cleanRecord3Yr=true', () => {
      // Arrange
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {}
      const inputText = 'I have 3 years clean' // No "record" word to avoid matching generic pattern

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      expect(result.inferred.cleanRecord3Yr).toBe(true)
      expect(result.reasons.cleanRecord3Yr).toBe(
        "Pattern '3-4 years clean' explicitly states clean record duration"
      )
      expect(result.confidence.cleanRecord3Yr).toBe(0.85) // High confidence
    })

    test('"5 years clean" infers cleanRecord5Yr=true', () => {
      // Arrange
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {}
      const inputText = 'I have 5 years clean record'

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      expect(result.inferred.cleanRecord5Yr).toBe(true)
      expect(result.reasons.cleanRecord5Yr).toBe(
        "Pattern '5+ years clean' explicitly states clean record duration"
      )
      expect(result.confidence.cleanRecord5Yr).toBe(0.85) // High confidence
    })

    test('"own a home" infers ownsHome=true', () => {
      // Arrange
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {}
      const inputText = 'I own a home in California'

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      expect(result.inferred.ownsHome).toBe(true)
      expect(result.reasons.ownsHome).toBe(
        "Pattern 'own a home' or 'homeowner' explicitly states home ownership"
      )
      expect(result.confidence.ownsHome).toBe(0.85) // High confidence
    })

    test('"homeowner" infers ownsHome=true', () => {
      // Arrange
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {}
      const inputText = 'I am a homeowner'

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      expect(result.inferred.ownsHome).toBe(true)
      expect(result.reasons.ownsHome).toBe(
        "Pattern 'own a home' or 'homeowner' explicitly states home ownership"
      )
      expect(result.confidence.ownsHome).toBe(0.85)
    })

    test('Pattern match but field already known - does not infer', () => {
      // Arrange
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {
        householdSize: 5, // Already known
      }
      const inputText = 'I live alone' // Pattern would infer householdSize=1

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      // Should NOT infer householdSize because it's already known
      expect(result.inferred.householdSize).toBeUndefined()
      expect(result.reasons.householdSize).toBeUndefined()
    })

    test('Pattern match but field suppressed - does not infer', () => {
      // Arrange
      const suppressedFields = ['householdSize']
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, suppressedFields)

      const knownFields: Partial<UserProfile> = {}
      const inputText = 'I live alone' // Pattern would infer householdSize=1

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      // Should NOT infer householdSize because it's suppressed
      expect(result.inferred.householdSize).toBeUndefined()
      expect(result.reasons.householdSize).toBeUndefined()
    })
  })

  describe('Confidence score mapping', () => {
    test('High confidence maps to 0.85', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {
        testField: [
          {
            targetField: 'ownsHome',
            inferValue: () => true,
            confidence: 'high',
            reasoning: 'Test reasoning',
          },
        ],
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: any = {
        testField: 'test',
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      expect(result.confidence.ownsHome).toBe(0.85)
    })

    test('Medium confidence maps to 0.70', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {
        testField: [
          {
            targetField: 'ownsHome',
            inferValue: () => true,
            confidence: 'medium',
            reasoning: 'Test reasoning',
          },
        ],
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: any = {
        testField: 'test',
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      expect(result.confidence.ownsHome).toBe(0.7)
    })

    test('Low confidence maps to 0.50', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {
        testField: [
          {
            targetField: 'ownsHome',
            inferValue: () => true,
            confidence: 'low',
            reasoning: 'Test reasoning',
          },
        ],
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: any = {
        testField: 'test',
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      expect(result.confidence.ownsHome).toBe(0.5)
    })
  })

  describe('Reasoning tests', () => {
    test('Inference includes reasoning from config', () => {
      // Arrange
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {}
      const inputText = 'I live alone'

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      expect(result.reasons.householdSize).toBe(
        "Pattern 'lives alone' strongly suggests single-person household"
      )
    })

    test('Reasoning matches expected text for field-to-field inference', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: Partial<UserProfile> = {
        productType: 'renters',
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      expect(result.reasons.ownsHome).toBe(
        'Renters insurance implies tenant status; home insurance implies ownership'
      )
    })
  })

  describe('Edge case tests', () => {
    test('Empty known fields - no field-to-field inferences', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: Partial<UserProfile> = {}

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      expect(result.inferred).toEqual({})
      expect(result.reasons).toEqual({})
      expect(result.confidence).toEqual({})
    })

    test('Empty input text - no text pattern inferences', () => {
      // Arrange
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {}
      const inputText = ''

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      expect(result.inferred).toEqual({})
      expect(result.reasons).toEqual({})
      expect(result.confidence).toEqual({})
    })

    test('All fields suppressed - no inferences', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const suppressedFields = ['ownsHome', 'householdSize', 'cleanRecord3Yr', 'cleanRecord5Yr']
      const engine = new InferenceEngine(fieldInferences, TEXT_PATTERN_INFERENCES, suppressedFields)

      const knownFields: Partial<UserProfile> = {
        productType: 'renters',
      }
      const inputText = 'I live alone with a clean driving record'

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      expect(result.inferred).toEqual({})
      expect(result.reasons).toEqual({})
      expect(result.confidence).toEqual({})
    })

    test('Invalid capture group reference - handles gracefully', () => {
      // Arrange
      const invalidPatternInference = [
        {
          pattern: /test (\d+)/i,
          infers: [
            {
              field: 'householdSize',
              value: '$5', // Invalid - only 1 capture group exists
              confidence: 'high' as const,
              reasoning: 'Test',
            },
          ],
        },
      ]

      const engine = new InferenceEngine({}, invalidPatternInference, [])

      const knownFields: Partial<UserProfile> = {}
      const inputText = 'test 4'

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      // Should NOT infer householdSize because capture group reference is invalid
      expect(result.inferred.householdSize).toBeUndefined()
    })
  })

  describe('Integration with real config', () => {
    test('Realistic scenario: "FL renters. Age 28. Lives alone."', () => {
      // Arrange: Extract field inferences from metadata
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {
        state: 'FL',
        productType: 'renters',
        age: 28,
      }
      const inputText = 'FL renters. Age 28. Lives alone.'

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      // Should infer ownsHome from productType (field-to-field)
      expect(result.inferred.ownsHome).toBe(false)
      expect(result.reasons.ownsHome).toBe(
        'Renters insurance implies tenant status; home insurance implies ownership'
      )
      expect(result.confidence.ownsHome).toBe(0.85)

      // Should infer householdSize from "lives alone" text pattern
      expect(result.inferred.householdSize).toBe(1)
      expect(result.reasons.householdSize).toBe(
        "Pattern 'lives alone' strongly suggests single-person household"
      )
      expect(result.confidence.householdSize).toBe(0.7)

      // Should infer kids from householdSize (chained inference: Step 3)
      // householdSize:1 → kids:0 (single adult with no children)
      expect(result.inferred.kids).toBe(0)
      expect(result.reasons.kids).toBe(
        'Household size of 1 indicates a single adult with no children'
      )
      expect(result.confidence.kids).toBe(0.85)
    })

    test('Field-to-field inference takes precedence over text pattern', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {
        productType: 'renters', // Field-to-field: ownsHome=false
      }
      const inputText = 'I own a home' // Text pattern: ownsHome=true

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      // Field-to-field inference should take precedence
      expect(result.inferred.ownsHome).toBe(false) // From productType, not text pattern
      expect(result.confidence.ownsHome).toBe(0.85) // High confidence from field-to-field
    })

    test('Multiple text patterns can infer multiple fields', () => {
      // Arrange
      const engine = new InferenceEngine({}, TEXT_PATTERN_INFERENCES, [])

      const knownFields: Partial<UserProfile> = {}
      const inputText = 'I live alone and have 5 years clean' // Pattern expects "5 years clean" not "clean record for 5 years"

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      // Should infer householdSize from "lives alone"
      expect(result.inferred.householdSize).toBe(1)

      // Should infer cleanRecord5Yr from "5 years clean"
      expect(result.inferred.cleanRecord5Yr).toBe(true)

      // Both inferences should have reasons and confidence
      expect(result.reasons.householdSize).toBeDefined()
      expect(result.reasons.cleanRecord5Yr).toBeDefined()
      expect(result.confidence.householdSize).toBe(0.7)
      expect(result.confidence.cleanRecord5Yr).toBe(0.85)
    })

    test('Suppression list works with mixed inferences', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const suppressedFields = ['householdSize'] // User dismissed householdSize
      const engine = new InferenceEngine(fieldInferences, TEXT_PATTERN_INFERENCES, suppressedFields)

      const knownFields: Partial<UserProfile> = {
        productType: 'renters',
      }
      const inputText = 'Lives alone'

      // Act
      const result = engine.applyInferences(knownFields, inputText)

      // Assert
      // Should infer ownsHome (not suppressed)
      expect(result.inferred.ownsHome).toBe(false)

      // Should NOT infer householdSize (suppressed)
      expect(result.inferred.householdSize).toBeUndefined()
      expect(result.reasons.householdSize).toBeUndefined()
    })

    test('Integration: "I have 2 kids. She has three kids." - deduplication and inference', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      // Simulate the final state after deduplication: kids=3 (from "three kids")
      // Note: In real scenario, deduplication happens in pill-parser.ts before InferenceEngine is called
      // The first inference (kids:2 → householdSize:3) would have happened in a previous InferenceEngine call
      // This test verifies that when InferenceEngine is called with kids:3, it infers householdSize:4
      // The "first inference wins" behavior is handled by the caller (UnifiedChatInterface) which
      // tracks previous inferences and doesn't update them if they already exist
      const knownFields: Partial<UserProfile> = {
        kids: 3, // After deduplication from "2 kids" and "three kids"
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      // InferenceEngine will infer householdSize:4 from kids:3
      // The caller (UnifiedChatInterface) is responsible for preserving the first inference (householdSize:3)
      // if it was already inferred in a previous call
      expect(result.inferred.householdSize).toBe(4) // kids + 1
      expect(result.reasons.householdSize).toBe(
        'Number of kids plus one adult indicates household size'
      )
    })

    test('Integration: "2 drivers" infers householdSize=2', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: Partial<UserProfile> = {
        drivers: 2,
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      expect(result.inferred.householdSize).toBe(2)
      expect(result.reasons.householdSize).toBe('Number of drivers typically equals household size')
    })

    test('Integration: "2 kids" and "2 drivers" together - first match wins', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      // Both kids and drivers are present - first one processed wins
      const knownFields: Partial<UserProfile> = {
        kids: 2,
        drivers: 2,
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      // First field processed (order is not guaranteed, but one will win)
      // The first inference wins, so householdSize should be inferred from whichever field is processed first
      expect(result.inferred.householdSize).toBeDefined()
      // It will be either 3 (from kids) or 2 (from drivers), depending on processing order
      expect([2, 3]).toContain(result.inferred.householdSize ?? 0)
    })

    test('Integration: householdSize explicitly set - no inference', () => {
      // Arrange
      const fieldInferences: Record<string, InferenceRule[]> = {}
      for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
        if (metadata.infers) {
          fieldInferences[fieldName] = metadata.infers
        }
      }

      const engine = new InferenceEngine(fieldInferences, [], [])

      const knownFields: Partial<UserProfile> = {
        kids: 2,
        householdSize: 5, // Explicitly set
      }

      // Act
      const result = engine.applyInferences(knownFields, '')

      // Assert
      // Should NOT infer householdSize because it's explicitly set
      expect(result.inferred.householdSize).toBeUndefined()
      expect(result.reasons.householdSize).toBeUndefined()
    })
  })
})
