import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { createMockLLMProvider } from '@repo/shared'
import { ConversationalExtractor } from '../conversational-extractor'
import type { ExtractionResult as LLMExtractionResult, LLMProvider } from '../llm-provider'

describe('ConversationalExtractor', () => {
  let mockLLMProvider: LLMProvider
  let extractor: ConversationalExtractor

  beforeEach(() => {
    // Create mock LLM provider with spyable mock function
    const mockExtract = mock(async () => ({
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
          productLine: 'auto',
          age: 30,
        },
        confidence: {
          state: 0.9,
          productLine: 0.8,
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
      expect(result.profile.productLine).toBe('auto')
      expect(result.profile.age).toBe(30)
      expect(result.confidence.state).toBe(0.9)
      expect(result.reasoning).toBe('Extracted from natural language')
    })

    it('should calculate missing fields correctly', async () => {
      const result = await extractor.extractFields('s:CA')

      expect(result.missingFields).toContain('productLine')
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

    it('should pass conversation history to LLM provider', async () => {
      const conversationHistory = ['Previous message 1', 'Previous message 2']

      await extractor.extractFields('Current message', conversationHistory)

      expect(mockLLMProvider.extractWithStructuredOutput).toHaveBeenCalledWith(
        'Current message',
        conversationHistory,
        expect.anything() // Zod schema
      )
    })
  })
})
