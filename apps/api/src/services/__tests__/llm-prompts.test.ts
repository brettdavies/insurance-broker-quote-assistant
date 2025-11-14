import { beforeEach, describe, expect, it, mock } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import type { UserProfile } from '@repo/shared'
import { createMockLLMProvider } from '@repo/shared/src/test-utils'
import { ConversationalExtractor } from '../conversational-extractor'
import type { ExtractionResult as LLMExtractionResult, LLMProvider } from '../llm-provider'

describe('LLM Prompt Generation', () => {
  describe('System Prompt Template', () => {
    it('should include CRITICAL RULES FOR FIELD EXTRACTION section', () => {
      const systemPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-system.txt'
      )
      const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8')

      expect(systemPrompt).toContain('CRITICAL RULES FOR FIELD EXTRACTION')
    })

    it('should include Rule 1: KNOWN FIELDS (read-only)', () => {
      const systemPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-system.txt'
      )
      const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8')

      expect(systemPrompt).toContain('1. KNOWN FIELDS (read-only)')
      expect(systemPrompt).toContain('Never modify, delete, or contradict known fields')
      expect(systemPrompt).toContain('{{knownFields}}')
    })

    it('should include Rule 2: INFERRED FIELDS (can modify)', () => {
      const systemPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-system.txt'
      )
      const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8')

      expect(systemPrompt).toContain('2. INFERRED FIELDS (can modify)')
      expect(systemPrompt).toContain('You may confirm, edit, or delete inferred fields')
      expect(systemPrompt).toContain('{{inferredFields}}')
    })

    it('should include Rule 3: SUPPRESSED FIELDS (never infer)', () => {
      const systemPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-system.txt'
      )
      const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8')

      expect(systemPrompt).toContain('3. SUPPRESSED FIELDS (never infer)')
      expect(systemPrompt).toContain('Do not infer or suggest these fields')
      expect(systemPrompt).toContain('{{suppressedFields}}')
    })

    it('should include Rule 4: CONFIDENCE LEVELS', () => {
      const systemPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-system.txt'
      )
      const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8')

      expect(systemPrompt).toContain('4. CONFIDENCE LEVELS')
      expect(systemPrompt).toContain('High confidence (≥85%)')
      expect(systemPrompt).toContain('Medium confidence (70-84%)')
      expect(systemPrompt).toContain('Low confidence (<70%)')
    })

    it('should include Rule 5: EXTRACTION PRIORITY', () => {
      const systemPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-system.txt'
      )
      const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8')

      expect(systemPrompt).toContain('5. EXTRACTION PRIORITY')
      expect(systemPrompt).toContain('Focus on filling missing required fields')
    })
  })

  describe('User Prompt Template', () => {
    it('should include "Already Known (do not modify):" section', () => {
      const userPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-user.txt'
      )
      const userPrompt = fs.readFileSync(userPromptPath, 'utf-8')

      expect(userPrompt).toContain('Already Known (do not modify):')
      expect(userPrompt).toContain('{{knownFields}}')
    })

    it('should include "Currently Inferred (you may modify):" section', () => {
      const userPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-user.txt'
      )
      const userPrompt = fs.readFileSync(userPromptPath, 'utf-8')

      expect(userPrompt).toContain('Currently Inferred (you may modify):')
      expect(userPrompt).toContain('{{inferredFields}}')
    })

    it('should include "Suppressed (do not infer):" section', () => {
      const userPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-user.txt'
      )
      const userPrompt = fs.readFileSync(userPromptPath, 'utf-8')

      expect(userPrompt).toContain('Suppressed (do not infer):')
      expect(userPrompt).toContain('{{suppressedFields}}')
    })

    it('should include user message placeholder', () => {
      const userPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-user.txt'
      )
      const userPrompt = fs.readFileSync(userPromptPath, 'utf-8')

      expect(userPrompt).toContain('{{message}}')
    })

    it('should include extraction instructions for inferred fields', () => {
      const userPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-user.txt'
      )
      const userPrompt = fs.readFileSync(userPromptPath, 'utf-8')

      expect(userPrompt).toContain('you may:')
      expect(userPrompt).toContain('Confirm with same value if text supports it')
      expect(userPrompt).toContain('Edit if text provides better/different value')
      expect(userPrompt).toContain('Delete')
      expect(userPrompt).toContain('Upgrade to known if confidence ≥85%')
    })

    it('should include expected response format instructions', () => {
      const userPromptPath = path.join(
        process.cwd(),
        'src/prompts/conversational-extraction-user.txt'
      )
      const userPrompt = fs.readFileSync(userPromptPath, 'utf-8')

      expect(userPrompt).toContain('IMPORTANT: Return JSON with the following structure')
      expect(userPrompt).toContain('known: fields with high confidence')
      expect(userPrompt).toContain('inferred: fields with medium/low confidence')
      expect(userPrompt).toContain('confidence: confidence scores')
      expect(userPrompt).toContain('reasoning:')
    })
  })

  describe('Prompt Injection via ConversationalExtractor', () => {
    let mockLLMProvider: LLMProvider
    let extractor: ConversationalExtractor
    let mockExtract: ReturnType<typeof mock>
    let capturedSystemPrompt: string | undefined
    let capturedUserPrompt: string | undefined

    beforeEach(() => {
      // Reset captured prompts
      capturedSystemPrompt = undefined
      capturedUserPrompt = undefined

      // Create mock LLM provider that captures prompts
      mockExtract = mock(async (userPrompt, schema, partialFields, temperature, systemPrompt) => {
        capturedUserPrompt = userPrompt
        capturedSystemPrompt = systemPrompt
        return {
          profile: { state: 'CA', productType: 'auto' },
          confidence: { state: 0.9, productType: 0.85 },
          reasoning: 'Mock extraction',
        } as LLMExtractionResult
      })

      mockLLMProvider = {
        ...createMockLLMProvider(),
        extractWithStructuredOutput: mockExtract,
      } as LLMProvider

      extractor = new ConversationalExtractor(mockLLMProvider)
    })

    it('should inject knownFields as JSON string into system prompt', async () => {
      const knownFields: Partial<UserProfile> = { state: 'FL', productType: 'auto' }
      const inferredFields: Partial<UserProfile> = {}
      const suppressedFields: string[] = []

      await extractor.extractFields(
        'I need insurance',
        knownFields,
        inferredFields,
        suppressedFields
      )

      expect(capturedSystemPrompt).toBeDefined()
      expect(capturedSystemPrompt).toContain('"state":"FL"')
      expect(capturedSystemPrompt).toContain('"productType":"auto"')
    })

    it('should inject inferredFields as JSON string into system prompt', async () => {
      const knownFields: Partial<UserProfile> = {}
      const inferredFields: Partial<UserProfile> = { age: 30, ownsHome: true }
      const suppressedFields: string[] = []

      await extractor.extractFields(
        'I need insurance',
        knownFields,
        inferredFields,
        suppressedFields
      )

      expect(capturedSystemPrompt).toBeDefined()
      expect(capturedSystemPrompt).toContain('"age":30')
      expect(capturedSystemPrompt).toContain('"ownsHome":true')
    })

    it('should inject suppressedFields as comma-separated string into system prompt', async () => {
      const knownFields: Partial<UserProfile> = {}
      const inferredFields: Partial<UserProfile> = {}
      const suppressedFields = ['householdSize', 'cleanRecord3Yr']

      await extractor.extractFields(
        'I need insurance',
        knownFields,
        inferredFields,
        suppressedFields
      )

      expect(capturedSystemPrompt).toBeDefined()
      expect(capturedSystemPrompt).toContain('householdSize, cleanRecord3Yr')
    })

    it('should inject knownFields into user prompt with JSON formatting', async () => {
      const knownFields: Partial<UserProfile> = { state: 'TX', age: 35 }
      const inferredFields: Partial<UserProfile> = {}
      const suppressedFields: string[] = []

      await extractor.extractFields(
        'I need insurance',
        knownFields,
        inferredFields,
        suppressedFields
      )

      expect(capturedUserPrompt).toBeDefined()
      expect(capturedUserPrompt).toContain('Already Known (do not modify):')
      expect(capturedUserPrompt).toContain('"state": "TX"')
      expect(capturedUserPrompt).toContain('"age": 35')
    })

    it('should inject user message into user prompt', async () => {
      const knownFields: Partial<UserProfile> = {}
      const inferredFields: Partial<UserProfile> = {}
      const suppressedFields: string[] = []
      const message = 'I need home insurance in California'

      await extractor.extractFields(message, knownFields, inferredFields, suppressedFields)

      expect(capturedUserPrompt).toBeDefined()
      expect(capturedUserPrompt).toContain(message)
    })
  })
})
