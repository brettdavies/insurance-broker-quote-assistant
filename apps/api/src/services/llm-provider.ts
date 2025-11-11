import type { UserProfile } from '@repo/shared'

/**
 * LLM Provider Interface
 *
 * Abstract interface for LLM providers to enable easy provider swapping.
 * Implementations: GeminiProvider (development), OpenAIProvider (future production).
 *
 * @see docs/stories/1.5.conversational-extractor.md#task-3
 */

export interface ExtractionResult {
  profile: Partial<UserProfile>
  confidence: Record<string, number> // Field-level confidence scores (0.0-1.0)
  reasoning?: string // Optional reasoning for extraction
}

export interface LLMProvider {
  /**
   * Extract structured fields from natural language using structured outputs
   *
   * @param message - Current broker message
   * @param conversationHistory - Optional array of previous messages
   * @param schema - Zod schema to convert to JSON Schema for structured output
   * @returns Extraction result with profile, confidence scores, and optional reasoning
   */
  extractWithStructuredOutput(
    message: string,
    conversationHistory?: string[],
    schema?: unknown // Zod schema type
  ): Promise<ExtractionResult>
}
