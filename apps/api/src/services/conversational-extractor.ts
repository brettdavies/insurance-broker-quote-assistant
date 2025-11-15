import fs from 'node:fs'
import path from 'node:path'
import type { UserProfile } from '@repo/shared'
import {
  CONFIDENCE_THRESHOLD_HIGH,
  DEFAULT_EXTRACTION_TEMPERATURE,
  buildSystemPrompt,
  buildUserPrompt,
  extractStateFromText,
  getAllUserProfileFieldNames,
  separateKnownFromInferred,
  userProfileSchema,
} from '@repo/shared'
import { hasKeyValueSyntax } from '../utils/key-value-parser'
import { logDebug, logError } from '../utils/logger'
import { extractFieldsWithKeyValue } from './extractors/key-value-extraction'
import { extractFieldsWithLLM } from './extractors/llm-extraction'
import type { LLMProvider } from './llm-provider'
import { extractPolicyData, extractPolicyDataFromFile } from './policy-extractor'

/**
 * Conversational Extractor Service
 *
 * Hybrid extraction approach: First try key-value parser (deterministic, free),
 * then optionally use LLM for natural language extraction.
 *
 * @see docs/stories/1.5.conversational-extractor.md#task-1
 */

export interface ExtractionResult {
  profile: Partial<UserProfile> // DEPRECATED: Use known + inferred instead (kept for backward compatibility)
  known?: Partial<UserProfile> // Known fields (high confidence ≥85% or explicitly set by broker)
  inferred?: Partial<UserProfile> // Inferred fields (confidence <85%)
  extractionMethod: 'key-value' | 'llm'
  confidence: Record<string, number> // Field-level confidence scores
  missingFields: string[] // Fields not extracted (for progressive disclosure)
  reasoning?: string // Optional reasoning for extraction
  tokenUsage?: import('./llm-provider').TokenUsage // Token usage from LLM (if extractionMethod === 'llm')
  inferenceReasons?: Record<string, string> // Reasoning for each inferred field
}

export class ConversationalExtractor {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * Get the last prompts used by the LLM provider (for trace logging)
   */
  getLastPrompts(): { systemPrompt?: string; userPrompt?: string } | null {
    // Check if LLM provider has getLastPrompt method (GeminiProvider)
    if (
      'getLastPrompt' in this.llmProvider &&
      typeof this.llmProvider.getLastPrompt === 'function'
    ) {
      return this.llmProvider.getLastPrompt() || null
    }
    return null
  }

  /**
   * Load system prompt template from file
   */
  private loadSystemPromptTemplate(): string {
    const templatePath = path.join(
      process.cwd(),
      'src/prompts/conversational-extraction-system.txt'
    )
    return fs.readFileSync(templatePath, 'utf-8')
  }

  /**
   * Load user prompt template from file
   */
  private loadUserPromptTemplate(): string {
    const templatePath = path.join(process.cwd(), 'src/prompts/conversational-extraction-user.txt')
    return fs.readFileSync(templatePath, 'utf-8')
  }

  /**
   * Build system prompt with known/inferred/suppressed fields injected
   */
  private buildSystemPrompt(
    knownFields: Partial<UserProfile>,
    inferredFields: Partial<UserProfile>,
    suppressedFields: string[]
  ): string {
    const template = this.loadSystemPromptTemplate()
    return buildSystemPrompt(template, knownFields, inferredFields, suppressedFields)
  }

  /**
   * Build user prompt with known/inferred/suppressed fields injected
   */
  private buildUserPrompt(
    message: string,
    knownFields: Partial<UserProfile>,
    inferredFields: Partial<UserProfile>,
    suppressedFields: string[]
  ): string {
    const template = this.loadUserPromptTemplate()
    return buildUserPrompt(template, message, knownFields, inferredFields, suppressedFields)
  }

  /**
   * Extract structured fields from broker message
   *
   * @param message - Current broker message (cleaned text without pills)
   * @param knownFields - Optional known fields explicitly set by broker (read-only for LLM)
   * @param inferredFields - Optional inferred fields from InferenceEngine (modifiable by LLM)
   * @param suppressedFields - Optional array of field names to skip during inference
   * @returns Extraction result with profile, method, confidence, and missing fields
   */
  async extractFields(
    message: string,
    knownFields?: Partial<UserProfile>,
    inferredFields?: Partial<UserProfile>,
    suppressedFields?: string[]
  ): Promise<ExtractionResult> {
    await logDebug('Conversational extractor: extractFields called', {
      knownFields,
      inferredFields,
      suppressedFields,
    })
    try {
      // Step 1: Try key-value parser first (instant, free, deterministic)
      if (hasKeyValueSyntax(message)) {
        return extractFieldsWithKeyValue(message, (profile) => this.calculateMissingFields(profile))
      }

      // Step 2: Use LLM for natural language extraction
      // Build custom prompts with known/inferred/suppressed fields
      const systemPrompt = this.buildSystemPrompt(
        knownFields || {},
        inferredFields || {},
        suppressedFields || []
      )
      const userPrompt = this.buildUserPrompt(
        message,
        knownFields || {},
        inferredFields || {},
        suppressedFields || []
      )

      return extractFieldsWithLLM(
        this.llmProvider,
        message,
        systemPrompt,
        userPrompt,
        knownFields || {},
        suppressedFields || [],
        (profile) => this.calculateMissingFields(profile)
      )
    } catch (error) {
      // Log error but return partial result (graceful degradation)
      await logError('Extraction failed', error as Error, {
        type: 'extraction_error',
        message,
      })

      // Return empty profile with low confidence
      return {
        profile: {},
        extractionMethod: 'llm', // Assume LLM was attempted
        confidence: {},
        missingFields: this.getAllFieldNames(),
        reasoning: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Calculate missing fields for progressive disclosure
   * Returns array of field names that are not extracted
   */
  private calculateMissingFields(profile: Partial<UserProfile>): string[] {
    const allFields = this.getAllFieldNames()
    const extractedFields = Object.keys(profile).filter(
      (key) => profile[key as keyof UserProfile] !== undefined
    )
    return allFields.filter((field) => !extractedFields.includes(field))
  }

  /**
   * Get all UserProfile field names
   */
  private getAllFieldNames(): string[] {
    return getAllUserProfileFieldNames()
  }

  /**
   * Extract policy data directly from a policy document file
   *
   * @param file - Policy document file (PDF, DOCX, TXT)
   * @returns PolicySummary with extracted fields and confidence scores, plus metadata (tokens, timing)
   */
  async extractPolicyDataFromFile(file: File): Promise<
    import('@repo/shared').PolicySummary & {
      _metadata?: { tokensUsed?: number; extractionTime?: number; reasoning?: string }
    }
  > {
    return extractPolicyDataFromFile(this.llmProvider, file)
  }

  /**
   * Extract policy data from policy document text (fallback method)
   *
   * @param policyText - Raw text extracted from PDF/DOCX/TXT policy document
   * @returns PolicySummary with extracted fields and confidence scores
   */
  async extractPolicyData(policyText: string): Promise<import('@repo/shared').PolicySummary> {
    return extractPolicyData(this.llmProvider, policyText)
  }
}
