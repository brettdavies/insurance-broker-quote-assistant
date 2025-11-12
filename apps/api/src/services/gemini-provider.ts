/**
 * Gemini Provider Implementation
 *
 * Uses Gemini 2.5 Flash-Lite (free tier) for development.
 * Implements LLMProvider interface for structured output extraction.
 *
 * Refactored following DRY, SOLID, and STAR principles:
 * - Single Responsibility: Orchestrates LLM calls, delegates to specialized classes
 * - Testability: Dependencies are injectable
 * - Abstraction: Uses composition over inheritance
 * - Reusability: Components can be reused independently
 *
 * @see docs/stories/1.5.conversational-extractor.md#task-3
 */

import { GoogleGenAI } from '@google/genai'
import { type UserProfile, userProfileSchema } from '@repo/shared'
import type { ZodSchema } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { logError, logInfo } from '../utils/logger'
import { GeminiFileUploader } from './gemini/file-uploader'
import { PromptBuilder, type PromptContext } from './gemini/prompt-builder'
import { PromptLoader } from './gemini/prompt-loader'
import { calculateConfidence, parseJsonResponse, validateResponse } from './gemini/response-parser'
import { transformSchemaForGemini } from './gemini/schema-transformer'
import { resolveTemperature } from './gemini/temperature-resolver'
import { extractTokenUsage } from './gemini/token-usage-extractor'
import type { ExtractionResult, LLMProvider, TokenUsage } from './llm-provider'

const DEFAULT_MODEL = 'gemini-2.5-flash-lite'
const DEFAULT_TIMEOUT_MS = 10000 // 10 seconds

export class GeminiProvider implements LLMProvider {
  private ai: GoogleGenAI
  private model: string
  private timeoutMs: number

  // Dependencies (injectable for testing)
  private promptLoader: PromptLoader
  private promptBuilder: PromptBuilder | null = null
  private fileUploader: GeminiFileUploader

  // State for prompt tracking
  private lastSystemPrompt: string | null = null
  private lastUserPrompt: string | null = null

  constructor(
    apiKey?: string,
    model: string = DEFAULT_MODEL,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ) {
    // Free tier works without API key
    this.ai = new GoogleGenAI(apiKey ? { apiKey } : {})
    this.model = model
    this.timeoutMs = timeoutMs

    // Initialize dependencies
    this.promptLoader = new PromptLoader()
    this.fileUploader = new GeminiFileUploader(this.ai)
  }

  /**
   * Extract structured data from a file (PDF, DOCX, etc.) using structured outputs
   *
   * Uses Gemini File API: Upload file first, then reference file URI in extraction call.
   * This is the recommended best practice for file processing.
   */
  async extractFromFile(
    file: File,
    prompt?: string,
    schema: ZodSchema = userProfileSchema
  ): Promise<ExtractionResult> {
    const tokensUsed = 0
    let extractionTime = 0

    // Upload file to Gemini
    let uploadResult: { fileUri: string; cleanup: () => Promise<void> } | null = null
    try {
      uploadResult = await this.fileUploader.uploadFile(file)
      const fileUri = uploadResult.fileUri

      // Build extraction prompt
      const extractionPrompt =
        prompt ||
        `You are an insurance agent extracting policy information from a client's insurance policy document. Your task is to carefully read through the document and extract all relevant policy details including carrier name, state, product type (auto, home, renters, or umbrella), coverage limits, deductibles, premiums, and effective dates. 

Extract the information accurately and completely according to the provided schema. If any information is not found in the document, leave that field undefined. Be precise with numbers and dates, and ensure all extracted values match the format specified in the schema.`

      // Transform schema for Gemini compatibility
      const jsonSchema = this.transformSchema(schema)

      // Record start time for extraction timing
      const startTime = Date.now()

      // Make LLM call with file URI reference and structured output
      const response = await this.callLLMWithTimeout({
        contents: [
          {
            role: 'user',
            parts: [
              { text: extractionPrompt },
              {
                fileData: {
                  mimeType: file.type ?? 'application/pdf',
                  fileUri,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: jsonSchema,
        },
      })

      // Calculate extraction time
      extractionTime = Date.now() - startTime

      // Extract token usage
      const tokenUsage = extractTokenUsage(response)
      const tokensUsed = tokenUsage?.totalTokens ?? 0

      if (tokenUsage) {
        await logInfo('LLM token usage', {
          type: 'llm_usage',
          provider: 'gemini',
          model: this.model,
          ...tokenUsage,
          extractionTime,
        })
      }

      // Parse and validate response
      const { data: extractedData } = parseJsonResponse<Partial<UserProfile>>(response)

      // Log raw LLM response BEFORE validation (so we can see what was returned even if validation fails)
      await logInfo('LLM response (raw, before validation)', {
        type: 'llm_response',
        provider: 'gemini',
        model: this.model,
        response: extractedData,
        fileName: file.name,
      })

      const validatedData = validateResponse(extractedData, schema)
      const confidence = calculateConfidence(validatedData)

      return {
        profile: validatedData,
        confidence,
        reasoning: `Extracted from ${file.name} using Gemini structured outputs`,
        tokensUsed,
        tokenUsage,
        extractionTime,
      }
    } catch (error) {
      await logError('Gemini API error', error as Error, {
        type: 'llm_error',
        provider: 'gemini',
        model: this.model,
        fileName: file.name,
      })

      return {
        profile: {},
        confidence: {},
        reasoning: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    } finally {
      // Cleanup uploaded file
      if (uploadResult) {
        await uploadResult.cleanup()
      }
    }
  }

  /**
   * Extract structured data from text message using structured outputs
   */
  async extractWithStructuredOutput(
    message: string,
    schema: ZodSchema = userProfileSchema,
    partialFields?: Partial<UserProfile>,
    temperature?: number
  ): Promise<ExtractionResult> {
    try {
      // Load and build prompts
      const prompts = await this.loadAndBuildPrompts({ message, partialFields })

      // Store prompts for trace logging
      this.lastSystemPrompt = prompts.systemPrompt
      this.lastUserPrompt = prompts.userPrompt

      // Log prompts for product/compliance logging
      await logInfo('LLM prompt', {
        type: 'llm_prompt',
        provider: 'gemini',
        model: this.model,
        prompt: prompts.fullPrompt,
        systemPrompt: prompts.systemPrompt,
        userPrompt: prompts.userPrompt,
      })

      // Transform schema for Gemini compatibility
      const jsonSchema = this.transformSchema(schema)

      // Resolve temperature
      const finalTemperature = resolveTemperature(temperature, 0.1)

      // Make LLM call with structured output
      // Format: system prompt as first message, user prompt as second message
      const contents = [
        {
          role: 'user' as const,
          parts: [{ text: prompts.fullPrompt }],
        },
      ]

      const response = await this.callLLMWithTimeout({
        contents,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: jsonSchema,
          temperature: finalTemperature,
        },
      })

      // Extract token usage
      const tokenUsage = extractTokenUsage(response)
      const tokensUsed = tokenUsage?.totalTokens ?? 0

      if (tokenUsage) {
        await logInfo('LLM token usage', {
          type: 'llm_usage',
          provider: 'gemini',
          model: this.model,
          ...tokenUsage,
        })
      }

      // Parse and validate response
      const { data: extractedData } = parseJsonResponse<Partial<UserProfile>>(response)

      // Log raw LLM response BEFORE validation (so we can see what was returned even if validation fails)
      await logInfo('LLM response (raw, before validation)', {
        type: 'llm_response',
        provider: 'gemini',
        model: this.model,
        response: extractedData,
      })

      const validatedData = validateResponse(extractedData, schema)
      const confidence = calculateConfidence(validatedData)

      return {
        profile: validatedData,
        confidence,
        reasoning: 'Extracted from natural language using Gemini structured outputs',
        tokensUsed,
        tokenUsage,
      }
    } catch (error) {
      await logError('Gemini API error', error as Error, {
        type: 'llm_error',
        provider: 'gemini',
        model: this.model,
      })

      return {
        profile: {},
        confidence: {},
        reasoning: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        tokensUsed: 0,
      }
    }
  }

  /**
   * Get the last prompt used (for trace logging)
   */
  getLastPrompt(): { systemPrompt: string; userPrompt: string } | null {
    if (this.lastSystemPrompt === null || this.lastUserPrompt === null) {
      return null
    }
    return {
      systemPrompt: this.lastSystemPrompt,
      userPrompt: this.lastUserPrompt,
    }
  }

  /**
   * Load and build prompts from templates
   */
  private async loadAndBuildPrompts(context: PromptContext): Promise<{
    systemPrompt: string
    userPrompt: string
    fullPrompt: string
  }> {
    // Always reload prompts from disk to pick up changes (no caching)
    const systemPrompt = await this.promptLoader.loadSystemPrompt()
    const userPromptTemplate = await this.promptLoader.loadUserPromptTemplate()

    // Build prompts
    this.promptBuilder = new PromptBuilder(systemPrompt, userPromptTemplate)
    return this.promptBuilder.build(context)
  }

  /**
   * Transform Zod schema to Gemini-compatible JSON schema
   */
  private transformSchema(schema: ZodSchema): Record<string, unknown> {
    const jsonSchema = zodToJsonSchema(schema, {
      target: 'openApi3',
      $refStrategy: 'none',
    })
    return transformSchemaForGemini(jsonSchema as Record<string, unknown>)
  }

  /**
   * Call LLM API with timeout handling
   */
  private async callLLMWithTimeout(config: {
    contents: Array<{
      role: 'user'
      parts: Array<{ text: string } | { fileData: { mimeType: string; fileUri: string } }>
    }>
    config: {
      responseMimeType: string
      responseJsonSchema: Record<string, unknown>
      temperature?: number
    }
  }): Promise<unknown> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`LLM request timed out after ${this.timeoutMs}ms`))
      }, this.timeoutMs)
    })

    const llmPromise = this.ai.models.generateContent({
      model: this.model,
      contents: config.contents,
      config: config.config,
    })

    return Promise.race([llmPromise, timeoutPromise])
  }
}
