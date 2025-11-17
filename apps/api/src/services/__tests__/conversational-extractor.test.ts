import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { createMockLLMProvider } from '@repo/shared/src/test-utils'
import { ConversationalExtractor } from '../conversational-extractor'
import type { ExtractionResult as LLMExtractionResult, LLMProvider } from '../llm-provider'

describe('ConversationalExtractor', () => {
  let mockLLMProvider: LLMProvider
  let extractor: ConversationalExtractor
  let mockExtract: ReturnType<typeof mock>

  beforeEach(() => {
    // Create mock LLM provider with spyable mock function
    mockExtract = mock(async () => ({
      profile: {},
      confidence: {},
      reasoning: 'Mock LLM extraction',
    }))

    mockLLMProvider = {
      ...createMockLLMProvider(),
      extractWithStructuredOutput: mockExtract,
    } as LLMProvider

    extractor = new ConversationalExtractor(mockLLMProvider)
  })

  describe('extractFields', () => {
    it('should use key-value parser when key-value syntax detected', async () => {
      const result = await extractor.extractFields('s:CA a:30')

      expect(result.extractionMethod).toBe('key-value')
      expect(result.profile.state).toBe('CA')
      expect(result.profile.age).toBe(30)
      expect(result.confidence.state).toBe(1.0)
      expect(result.confidence.age).toBe(1.0)
    })

    it('should use LLM when no key-value syntax detected', async () => {
      const mockLLMResult: LLMExtractionResult = {
        profile: {
          state: 'CA',
          productType: 'auto',
          age: 30,
        },
        confidence: {
          state: 0.9,
          productType: 0.8,
          age: 0.85,
        },
        reasoning: 'Extracted from natural language',
      }
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockResolvedValue(
        mockLLMResult
      )

      const result = await extractor.extractFields(
        'I need auto insurance in California, I am 30 years old'
      )

      expect(result.extractionMethod).toBe('llm')
      expect(result.profile.state).toBe('CA')
      expect(result.profile.productType).toBe('auto')
      expect(result.profile.age).toBe(30)
      expect(result.confidence.state).toBe(0.9)
      expect(result.reasoning).toBe('Extracted from natural language')
    })

    it('should calculate missing fields correctly', async () => {
      const result = await extractor.extractFields('s:CA')

      expect(result.missingFields).toContain('productType')
      expect(result.missingFields).toContain('age')
      expect(result.missingFields.length).toBeGreaterThan(0)
    })

    it('should handle extraction errors gracefully', async () => {
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockRejectedValue(
        new Error('LLM API error')
      )

      const result = await extractor.extractFields('Natural language only, no key-value')

      expect(result.profile).toEqual({})
      expect(result.confidence).toEqual({})
      expect(result.missingFields.length).toBeGreaterThan(0)
      expect(result.reasoning).toContain('Extraction failed')
    })

    it('should pass knownFields correctly with new signature (Epic 4)', async () => {
      const knownFields = { state: 'CA', age: 30 }

      await extractor.extractFields('Current message', knownFields, {}, [])

      // Verify LLM provider was called with custom system prompt
      expect(mockExtract).toHaveBeenCalled()
      const callArgs = mockExtract.mock.calls[0]
      expect(callArgs).toBeDefined()
      if (callArgs) {
        expect(callArgs[0]).toContain('Current message') // User prompt contains message
        expect(callArgs[1]).toBeDefined() // Zod schema
        expect(callArgs[2]).toBeUndefined() // partialFields not used (using custom prompts instead)
        expect(callArgs[3]).toBe(0.1) // temperature
        expect(callArgs[4]).toBeDefined() // systemPrompt
      }
    })
  })

  describe('Known Field Protection (Epic 4: Story 4.8)', () => {
    it('should not modify known fields even when conflicting text provided', async () => {
      const knownFields = { state: 'FL', productType: 'auto' as const }
      const inferredFields = {}
      const suppressedFields: string[] = []

      // Mock LLM extraction that tries to return different state
      const mockLLMResult: LLMExtractionResult = {
        profile: {
          state: 'CA', // LLM tries to change state
          productType: 'home', // LLM tries to change productType
        },
        confidence: {
          state: 0.95,
          productType: 0.9,
        },
        reasoning: 'Attempted to extract from conflicting text',
      }
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockResolvedValue(
        mockLLMResult
      )

      const result = await extractor.extractFields(
        'I need home insurance in California',
        knownFields,
        inferredFields,
        suppressedFields
      )

      // Known fields should remain unchanged (FL, auto), not changed to (CA, home)
      expect(result.known?.state).toBe('FL')
      expect(result.known?.productType).toBe('auto')
      expect(result.profile.state).toBe('FL') // Backward compatibility
      expect(result.profile.productType).toBe('auto') // Backward compatibility
    })

    it('should keep multiple known fields unchanged', async () => {
      const knownFields = { state: 'TX', age: 35, ownsHome: true }
      const inferredFields = {}
      const suppressedFields: string[] = []

      const mockLLMResult: LLMExtractionResult = {
        profile: {
          state: 'CA',
          age: 40,
          ownsHome: false,
        },
        confidence: {
          state: 0.9,
          age: 0.85,
          ownsHome: 0.88,
        },
        reasoning: 'Mock extraction',
      }
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockResolvedValue(
        mockLLMResult
      )

      const result = await extractor.extractFields(
        'Different values',
        knownFields,
        inferredFields,
        suppressedFields
      )

      expect(result.known?.state).toBe('TX')
      expect(result.known?.age).toBe(35)
      expect(result.known?.ownsHome).toBe(true)
    })
  })

  describe('Inferred Field Modification (Epic 4: Story 4.8)', () => {
    it('should allow LLM to edit inferred field with new evidence', async () => {
      const knownFields = {}
      const inferredFields = { ownsHome: false }
      const suppressedFields: string[] = []

      const mockLLMResult: LLMExtractionResult = {
        profile: {
          ownsHome: true, // LLM changes inferred value based on text
        },
        confidence: {
          ownsHome: 0.75, // Medium confidence (inferred)
        },
        reasoning: 'Changed ownsHome to true based on explicit mention',
      }
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockResolvedValue(
        mockLLMResult
      )

      const result = await extractor.extractFields(
        'I own my home',
        knownFields,
        inferredFields,
        suppressedFields
      )

      expect(result.inferred?.ownsHome).toBe(true)
    })

    it('should allow LLM to upgrade inferred field to known if confidence ≥85%', async () => {
      const knownFields = {}
      const inferredFields = { age: 30 }
      const suppressedFields: string[] = []

      const mockLLMResult: LLMExtractionResult = {
        profile: {
          age: 30,
        },
        confidence: {
          age: 0.9, // High confidence → should become known
        },
        reasoning: 'Age explicitly mentioned',
      }
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockResolvedValue(
        mockLLMResult
      )

      const result = await extractor.extractFields(
        'I am 30 years old',
        knownFields,
        inferredFields,
        suppressedFields
      )

      // Age should be in known fields due to high confidence
      expect(result.known?.age).toBe(30)
      expect(result.inferred?.age).toBeUndefined()
    })

    it('should allow LLM to delete inferred field if contradicted', async () => {
      const knownFields = {}
      const inferredFields = { cleanRecord3Yr: true }
      const suppressedFields: string[] = []

      const mockLLMResult: LLMExtractionResult = {
        profile: {
          // LLM does not include cleanRecord3Yr (deleted)
        },
        confidence: {},
        reasoning: 'Removed cleanRecord3Yr as it was contradicted',
      }
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockResolvedValue(
        mockLLMResult
      )

      const result = await extractor.extractFields(
        'I had an accident 2 years ago',
        knownFields,
        inferredFields,
        suppressedFields
      )

      // cleanRecord3Yr should not be in either known or inferred
      expect(result.known?.cleanRecord3Yr).toBeUndefined()
      expect(result.inferred?.cleanRecord3Yr).toBeUndefined()
    })
  })

  describe('Suppression Respect (Epic 4: Story 4.8)', () => {
    it('should remove suppressed fields from inferred results', async () => {
      const knownFields = {}
      const inferredFields = {}
      const suppressedFields = ['ownsHome', 'householdSize']

      const mockLLMResult: LLMExtractionResult = {
        profile: {
          state: 'CA',
          ownsHome: true, // This is suppressed, should be removed
          householdSize: 4, // This is suppressed, should be removed
        },
        confidence: {
          state: 0.9,
          ownsHome: 0.7,
          householdSize: 0.65,
        },
        reasoning: 'Mock extraction',
      }
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockResolvedValue(
        mockLLMResult
      )

      const result = await extractor.extractFields(
        'I have renters insurance with 4 people',
        knownFields,
        inferredFields,
        suppressedFields
      )

      // Suppressed fields should not appear in inferred
      expect(result.inferred?.ownsHome).toBeUndefined()
      expect(result.inferred?.householdSize).toBeUndefined()
      // Non-suppressed field should still be present
      expect(result.known?.state).toBe('CA')
    })

    it('should not infer multiple suppressed fields', async () => {
      const knownFields = {}
      const inferredFields = {}
      const suppressedFields = ['age', 'vehicles', 'drivers']

      const mockLLMResult: LLMExtractionResult = {
        profile: {
          state: 'TX',
          productType: 'auto',
          age: 25,
          vehicles: 2,
          drivers: 1,
        },
        confidence: {
          state: 0.9,
          productType: 0.85,
          age: 0.7,
          vehicles: 0.6,
          drivers: 0.65,
        },
        reasoning: 'Mock extraction',
      }
      ;(mockLLMProvider.extractWithStructuredOutput as ReturnType<typeof mock>).mockResolvedValue(
        mockLLMResult
      )

      const result = await extractor.extractFields(
        'TX auto, 25yo, 2 cars, 1 driver',
        knownFields,
        inferredFields,
        suppressedFields
      )

      expect(result.inferred?.age).toBeUndefined()
      expect(result.inferred?.vehicles).toBeUndefined()
      expect(result.inferred?.drivers).toBeUndefined()
    })
  })
})
