import { GoogleGenAI } from '@google/genai'
import { type UserProfile, userProfileSchema } from '@repo/shared'
import type { ZodSchema } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { logError, logInfo } from '../utils/logger'
import type { ExtractionResult, LLMProvider } from './llm-provider'

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

  async extractWithStructuredOutput(
    message: string,
    conversationHistory?: string[],
    schema: ZodSchema = userProfileSchema
  ): Promise<ExtractionResult> {
    // Build conversation prompt
    const prompt = this.buildPrompt(message, conversationHistory)

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
      // Note: Token usage structure may vary by SDK version
      try {
        const usage = (response as { usage?: unknown }).usage
        if (usage && typeof usage === 'object') {
          const usageObj = usage as Record<string, unknown>
          await logInfo('LLM token usage', {
            type: 'llm_usage',
            provider: 'gemini',
            model: this.model,
            promptTokens: usageObj.promptTokenCount,
            completionTokens: usageObj.candidatesTokenCount,
            totalTokens: usageObj.totalTokenCount,
          })
        }
      } catch {
        // Token usage logging is optional, don't fail if unavailable
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
      }
    } catch (error) {
      // Log error but don't throw (graceful degradation)
      await logError('Gemini API error', error as Error, {
        type: 'llm_error',
        provider: 'gemini',
        model: this.model,
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
   * Build conversation prompt from message and history
   */
  private buildPrompt(message: string, conversationHistory?: string[]): string {
    let prompt = 'Extract insurance shopper information from the following conversation.\n\n'

    if (conversationHistory && conversationHistory.length > 0) {
      prompt += 'Previous conversation:\n'
      for (const historyMessage of conversationHistory) {
        prompt += `- ${historyMessage}\n`
      }
      prompt += '\n'
    }

    prompt += `Current message: ${message}\n\n`
    prompt +=
      'Extract all mentioned fields. Return only the fields that are clearly mentioned. Leave fields undefined if not mentioned or uncertain.'

    return prompt
  }
}
