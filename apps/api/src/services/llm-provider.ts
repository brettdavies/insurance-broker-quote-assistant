import type { UserProfile } from '@repo/shared'

/**
 * LLM Provider Interface
 *
 * Abstract interface for LLM providers to enable easy provider swapping.
 * Implementations: GeminiProvider (development), OpenAIProvider (future production).
 *
 * @see docs/stories/1.5.conversational-extractor.md#task-3
 */

/**
 * Detailed token usage breakdown
 */
export interface TokenUsage {
  promptTokens: number // Input tokens (prompt)
  completionTokens: number // Output tokens (candidates)
  totalTokens: number // Total tokens used
  cachedTokens?: number // Cached content tokens (if context caching used)
  thinkingTokens?: number // Thinking/reasoning tokens (if available)
}

export interface ExtractionResult {
  profile: Partial<UserProfile>
  confidence: Record<string, number> // Field-level confidence scores (0.0-1.0)
  reasoning?: string // Optional reasoning for extraction
  tokensUsed?: number // Total tokens used (prompt + completion) - kept for backward compatibility
  tokenUsage?: TokenUsage // Detailed token usage breakdown
  extractionTime?: number // Extraction time in milliseconds
}

export interface LLMProvider {
  /**
   * Extract structured fields from natural language using structured outputs
   *
   * @param message - Current broker message (cleaned text without pills)
   * @param schema - Zod schema to convert to JSON Schema for structured output
   * @param partialFields - Optional partial fields already extracted from pills (single source of truth)
   * @param temperature - Temperature for LLM generation (default: 0.1 for extraction, 0.3 for pitch)
   * @param systemPrompt - Optional custom system prompt (overrides default prompt building)
   * @returns Extraction result with profile, confidence scores, and optional reasoning
   */
  extractWithStructuredOutput(
    message: string,
    schema?: unknown, // Zod schema type
    partialFields?: Partial<UserProfile>, // Partial fields from pills (single source of truth)
    temperature?: number, // Temperature for LLM generation (default: 0.1 for extraction, 0.3 for pitch)
    systemPrompt?: string // Custom system prompt (overrides default)
  ): Promise<ExtractionResult>

  /**
   * Extract structured data from a file (PDF, DOCX, etc.) using structured outputs
   *
   * @param file - File to extract data from
   * @param prompt - Optional prompt to guide extraction
   * @param schema - Zod schema to convert to JSON Schema for structured output
   * @returns Extraction result with profile, confidence scores, and optional reasoning
   */
  extractFromFile?(
    file: File,
    prompt?: string,
    schema?: unknown // Zod schema type
  ): Promise<ExtractionResult>
}
