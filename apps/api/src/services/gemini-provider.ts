import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { GoogleGenAI } from '@google/genai'
import { type UserProfile, userProfileSchema } from '@repo/shared'
import type { ZodSchema } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { logError, logInfo } from '../utils/logger'
import type { ExtractionResult, LLMProvider, TokenUsage } from './llm-provider'

/**
 * Gemini Provider Implementation
 *
 * Uses Gemini 2.5 Flash-Lite (free tier) for development.
 * Implements LLMProvider interface for structured output extraction.
 *
 * @see docs/stories/1.5.conversational-extractor.md#task-3
 */

const DEFAULT_MODEL = 'gemini-2.5-flash-lite'
const DEFAULT_TIMEOUT_MS = 10000 // 10 seconds

/**
 * Extract token usage from Gemini API response
 *
 * The @google/genai SDK provides usageMetadata with granular token counts.
 * This function handles different SDK versions and field name variations.
 *
 * @param response - Gemini API response object
 * @returns TokenUsage object with granular token counts, or undefined if not available
 */
function extractTokenUsage(response: unknown): TokenUsage | undefined {
  try {
    // Try both usageMetadata and usage (for different SDK versions)
    const usageMetadata =
      (response as { usageMetadata?: unknown; usage?: unknown }).usageMetadata ||
      (response as { usage?: unknown }).usage

    if (!usageMetadata || typeof usageMetadata !== 'object') {
      return undefined
    }

    const usageObj = usageMetadata as Record<string, unknown>

    // Extract all available token counts (field names may vary by SDK version)
    const promptTokens = usageObj.promptTokenCount ?? usageObj.prompt_token_count ?? 0
    const candidatesTokens = usageObj.candidatesTokenCount ?? usageObj.candidates_token_count ?? 0
    const totalTokens = usageObj.totalTokenCount ?? usageObj.total_token_count ?? 0
    const cachedTokens = usageObj.cachedContentTokenCount ?? usageObj.cached_content_token_count
    const thinkingTokens =
      usageObj.thinkingTokenCount ??
      usageObj.thinking_token_count ??
      usageObj.reasoningTokenCount ??
      usageObj.reasoning_token_count

    // Only return if we have valid token counts
    if (typeof totalTokens === 'number' && totalTokens > 0) {
      return {
        promptTokens: typeof promptTokens === 'number' ? promptTokens : 0,
        completionTokens: typeof candidatesTokens === 'number' ? candidatesTokens : 0,
        totalTokens,
        cachedTokens: typeof cachedTokens === 'number' ? cachedTokens : undefined,
        thinkingTokens: typeof thinkingTokens === 'number' ? thinkingTokens : undefined,
      }
    }
  } catch {
    // Silently fail - token usage is optional
  }

  return undefined
}

/**
 * Fix exclusiveMinimum -> minimum conversion for Gemini compatibility
 * Gemini API doesn't accept exclusiveMinimum, so we convert to minimum
 */
function fixExclusiveMinimumForGemini(schema: Record<string, unknown>): Record<string, unknown> {
  if (typeof schema !== 'object' || schema === null) {
    return schema
  }

  const fixed = { ...schema }

  // Fix properties
  if (fixed.properties && typeof fixed.properties === 'object') {
    const properties = fixed.properties as Record<string, unknown>
    const fixedProperties: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'object' && value !== null) {
        const prop = value as Record<string, unknown>
        const fixedProp = { ...prop }

        // Convert exclusiveMinimum to minimum
        // Zod's .positive() creates exclusiveMinimum: true (boolean) or exclusiveMinimum: 0 (number)
        // Gemini doesn't accept exclusiveMinimum, so convert to minimum
        if ('exclusiveMinimum' in fixedProp) {
          if (typeof fixedProp.exclusiveMinimum === 'number') {
            fixedProp.minimum = fixedProp.exclusiveMinimum + 0.0001 // Add small epsilon
          } else if (fixedProp.exclusiveMinimum === true) {
            // exclusiveMinimum: true means > 0, so use minimum: 0.0001
            fixedProp.minimum = 0.0001
          }
          fixedProp.exclusiveMinimum = undefined
        }

        fixedProperties[key] = fixExclusiveMinimumForGemini(fixedProp)
      } else {
        fixedProperties[key] = value
      }
    }

    fixed.properties = fixedProperties
  }

  // Recursively fix nested schemas
  if (fixed.items && typeof fixed.items === 'object') {
    fixed.items = fixExclusiveMinimumForGemini(fixed.items as Record<string, unknown>)
  }

  return fixed
}

export class GeminiProvider implements LLMProvider {
  private ai: GoogleGenAI
  private model: string
  private timeoutMs: number

  constructor(
    apiKey?: string,
    model: string = DEFAULT_MODEL,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ) {
    // Free tier works without API key
    this.ai = new GoogleGenAI(apiKey ? { apiKey } : {})
    this.model = model
    this.timeoutMs = timeoutMs
  }

  /**
   * Extract structured data from a file (PDF, DOCX, etc.) using structured outputs
   *
   * Uses Gemini File API: Upload file first, then reference file URI in extraction call.
   * This is the recommended best practice for file processing.
   *
   * @param file - File to extract data from
   * @param prompt - Optional prompt to guide extraction
   * @param schema - Zod schema to convert to JSON Schema for structured output
   * @returns Extraction result with profile, confidence scores, and optional reasoning
   */
  async extractFromFile(
    file: File,
    prompt?: string,
    schema: ZodSchema = userProfileSchema
  ): Promise<ExtractionResult> {
    // Initialize tracking variables
    const tokensUsed = 0
    let extractionTime = 0

    // Get MIME type and strip charset if present (Gemini doesn't accept charset in MIME type)
    let mimeType = file.type ?? this.getMimeTypeFromFileName(file.name)
    if (mimeType?.includes(';')) {
      mimeType = mimeType.split(';')[0]?.trim() ?? mimeType
    }

    // Step 1: Upload file to Gemini File API first (best practice)
    // SDK requires file path string, so we save to temp file first
    let fileUri: string
    let tempFilePath: string | null = null
    try {
      // Create temporary file to save uploaded file
      const tempDir = await mkdtemp(join(tmpdir(), 'gemini-upload-'))
      tempFilePath = join(tempDir, file.name)

      // Write file to temp location
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await writeFile(tempFilePath, buffer)

      // Upload file to Gemini File API using file path (SDK requirement)
      const uploadResponse = await this.ai.files.upload({
        file: tempFilePath, // SDK accepts file path string
        config: {
          mimeType,
          displayName: file.name,
        },
      })

      // Get file URI from upload response (response.uri is the file URI)
      fileUri = uploadResponse.uri || ''
      if (!fileUri) {
        throw new Error('Failed to get file URI from Gemini upload response')
      }

      await logInfo('File uploaded to Gemini', {
        type: 'gemini_file_upload',
        fileName: file.name,
        fileSize: file.size,
        fileUri,
      })
    } catch (error) {
      await logError('Gemini file upload failed', error as Error, {
        type: 'gemini_file_upload_error',
        fileName: file.name,
        fileSize: file.size,
      })
      throw error
    } finally {
      // Clean up temporary file and directory
      if (tempFilePath) {
        try {
          await unlink(tempFilePath)
          // Remove temp directory (should be empty after file deletion)
          const tempDir = dirname(tempFilePath)
          try {
            await rmdir(tempDir)
          } catch {
            // Ignore directory removal errors (may not be empty or already removed)
          }
        } catch (cleanupError) {
          // Log but don't throw - cleanup is best effort
          await logError('Failed to cleanup temp file', cleanupError as Error, {
            type: 'temp_file_cleanup_error',
            tempFilePath,
          })
        }
      }
    }

    // Step 2: Build enhanced prompt with insurance agent context
    const extractionPrompt =
      prompt ||
      `You are an insurance agent extracting policy information from a client's insurance policy document. Your task is to carefully read through the document and extract all relevant policy details including carrier name, state, product type (auto, home, renters, or umbrella), coverage limits, deductibles, premiums, and effective dates. 

Extract the information accurately and completely according to the provided schema. If any information is not found in the document, leave that field undefined. Be precise with numbers and dates, and ensure all extracted values match the format specified in the schema.`

    // Convert Zod schema to JSON Schema
    let jsonSchema = zodToJsonSchema(schema, {
      target: 'openApi3',
      $refStrategy: 'none',
    })

    // Fix exclusiveMinimum -> minimum conversion for Gemini compatibility
    jsonSchema = fixExclusiveMinimumForGemini(jsonSchema as Record<string, unknown>)

    try {
      // Record start time for extraction timing
      const startTime = Date.now()

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`LLM request timed out after ${this.timeoutMs}ms`))
        }, this.timeoutMs)
      })

      // Step 3: Make LLM call with file URI reference and structured output
      const llmPromise = this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [
              { text: extractionPrompt },
              {
                fileData: {
                  mimeType,
                  fileUri,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: jsonSchema as Record<string, unknown>,
        },
      })

      // Race between LLM call and timeout
      const response = await Promise.race([llmPromise, timeoutPromise])

      // Calculate extraction time
      extractionTime = Date.now() - startTime

      // Extract token usage from response metadata (if available)
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

      // Parse JSON response
      const responseText = (response as { text?: string }).text
      if (!responseText) {
        throw new Error('Empty response from Gemini API')
      }

      let extractedData: Partial<UserProfile>
      try {
        extractedData = JSON.parse(responseText) as Partial<UserProfile>
      } catch (parseError) {
        throw new Error(`Failed to parse JSON response: ${parseError}`)
      }

      // Validate against Zod schema
      const validatedData = schema.parse(extractedData) as Partial<UserProfile>

      // Calculate confidence scores (simplified: assume 0.8 for extracted fields, 0.0 for missing)
      const confidence: Record<string, number> = {}
      for (const [key, value] of Object.entries(validatedData)) {
        if (value !== undefined && value !== null) {
          confidence[key] = 0.8 // Default confidence for LLM extraction
        } else {
          confidence[key] = 0.0
        }
      }

      return {
        profile: validatedData,
        confidence,
        reasoning: `Extracted from ${file.name} using Gemini structured outputs`,
        tokensUsed, // Always include token tracking (0 if extraction failed before LLM call)
        tokenUsage, // Detailed token usage breakdown
        extractionTime,
      }
    } catch (error) {
      // Log error but don't throw (graceful degradation)
      await logError('Gemini API error', error as Error, {
        type: 'llm_error',
        provider: 'gemini',
        model: this.model,
        fileName: file.name,
      })

      // Return empty result with low confidence
      return {
        profile: {},
        confidence: {},
        reasoning: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Get MIME type from file name if file.type is not available
   */
  private getMimeTypeFromFileName(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop()
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      txt: 'text/plain',
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }

  async extractWithStructuredOutput(
    message: string,
    conversationHistory?: string[],
    schema: ZodSchema = userProfileSchema,
    partialFields?: Partial<UserProfile>
  ): Promise<ExtractionResult> {
    // Build conversation prompt
    const prompt = this.buildPrompt(message, conversationHistory, partialFields)

    // Convert Zod schema to JSON Schema
    // Note: Gemini requires minimum instead of exclusiveMinimum for positive numbers
    let jsonSchema = zodToJsonSchema(schema, {
      target: 'openApi3',
      $refStrategy: 'none',
    })

    // Fix exclusiveMinimum -> minimum conversion for Gemini compatibility
    // Gemini API doesn't accept exclusiveMinimum, so we convert to minimum
    jsonSchema = fixExclusiveMinimumForGemini(jsonSchema as Record<string, unknown>)

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`LLM request timed out after ${this.timeoutMs}ms`))
        }, this.timeoutMs)
      })

      // Make LLM call with structured output
      const llmPromise = this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: jsonSchema as Record<string, unknown>,
        },
      })

      // Race between LLM call and timeout
      const response = await Promise.race([llmPromise, timeoutPromise])

      // Extract token usage from response metadata (if available)
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

      // Parse JSON response
      const responseText = (response as { text?: string }).text
      if (!responseText) {
        throw new Error('Empty response from Gemini API')
      }

      let extractedData: Partial<UserProfile>
      try {
        extractedData = JSON.parse(responseText) as Partial<UserProfile>
      } catch (parseError) {
        throw new Error(`Failed to parse JSON response: ${parseError}`)
      }

      // Validate against Zod schema
      const validatedData = schema.parse(extractedData) as Partial<UserProfile>

      // Calculate confidence scores (simplified: assume 0.8 for extracted fields, 0.0 for missing)
      const confidence: Record<string, number> = {}
      for (const [key, value] of Object.entries(validatedData)) {
        if (value !== undefined && value !== null) {
          confidence[key] = 0.8 // Default confidence for LLM extraction
        } else {
          confidence[key] = 0.0
        }
      }

      return {
        profile: validatedData,
        confidence,
        reasoning: 'Extracted from natural language using Gemini structured outputs',
        tokensUsed, // Always include token tracking
        tokenUsage, // Detailed token usage breakdown
      }
    } catch (error) {
      // Log error but don't throw (graceful degradation)
      await logError('Gemini API error', error as Error, {
        type: 'llm_error',
        provider: 'gemini',
        model: this.model,
      })

      // Return empty result with low confidence
      // Always include tokensUsed (0 if extraction failed before LLM call)
      return {
        profile: {},
        confidence: {},
        reasoning: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        tokensUsed: 0, // Always include token tracking
      }
    }
  }

  /**
   * Build conversation prompt from message and history
   */
  private buildPrompt(
    message: string,
    conversationHistory?: string[],
    partialFields?: Partial<UserProfile>
  ): string {
    let prompt =
      'Extract insurance shopper information from broker notes taken during a conversation with a prospect.\n'
    prompt +=
      'These notes are informal, may contain incomplete thoughts, fragments, abbreviations, and random facts.\n'
    prompt +=
      'They were written by the broker, not the prospect, so they may not be full sentences or paragraphs.\n\n'

    // Include partial fields from pills/key-value extraction as context
    if (partialFields && Object.keys(partialFields).length > 0) {
      prompt += 'Already extracted fields (from structured pills/key-value pairs):\n'
      for (const [key, value] of Object.entries(partialFields)) {
        if (value !== undefined && value !== null) {
          prompt += `- ${key}: ${JSON.stringify(value)}\n`
        }
      }
      prompt +=
        '\nUse these as context, but still extract any additional fields mentioned in the notes below.\n\n'
    }

    if (conversationHistory && conversationHistory.length > 0) {
      prompt += 'Previous notes:\n'
      for (const historyMessage of conversationHistory) {
        prompt += `- ${historyMessage}\n`
      }
      prompt += '\n'
    }

    prompt += `Current notes: ${message}\n\n`
    prompt += 'Extract all mentioned fields from these notes. Look for:\n'
    prompt +=
      '- householdSize: number of people in household (may be mentioned as "2 drivers", "lives alone", "family of 4", etc.)\n'
    prompt +=
      '- ownsHome: boolean indicating home ownership (may be mentioned as "owns home", "homeowner", "rents", "renting", etc.)\n'
    prompt +=
      '- zip: zip code (may be mentioned as "zip 90210", "90210", "zip code is 90210", etc.)\n'
    prompt += '- age: age in years\n'
    prompt +=
      '- state: US state code (may be full name like "California" or abbreviation like "CA")\n'
    prompt += '- productType: insurance product type (auto, home, renters, umbrella)\n'
    prompt += '- vehicles: number of vehicles (for auto insurance)\n'
    prompt += '- drivers: number of drivers (for auto insurance)\n'
    prompt +=
      '- cleanRecord3Yr: clean driving record (may be mentioned as "clean record", "no accidents", "good driving", etc.)\n'
    prompt +=
      'Return only the fields that are clearly mentioned or can be inferred. Leave fields undefined if not mentioned or uncertain.'

    return prompt
  }
}
