import type { UserProfile } from '@repo/shared'
import { userProfileSchema } from '@repo/shared'
import { hasKeyValueSyntax, parseKeyValueSyntax } from '../utils/key-value-parser'
import { logError } from '../utils/logger'
import type { LLMProvider } from './llm-provider'

/**
 * Conversational Extractor Service
 *
 * Hybrid extraction approach: First try key-value parser (deterministic, free),
 * then optionally use LLM for natural language extraction.
 *
 * @see docs/stories/1.5.conversational-extractor.md#task-1
 */

export interface ExtractionResult {
  profile: Partial<UserProfile>
  extractionMethod: 'key-value' | 'llm'
  confidence: Record<string, number> // Field-level confidence scores
  missingFields: string[] // Fields not extracted (for progressive disclosure)
  reasoning?: string // Optional reasoning for extraction
}

export class ConversationalExtractor {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * Extract structured fields from broker message
   *
   * @param message - Current broker message
   * @param conversationHistory - Optional array of previous messages
   * @returns Extraction result with profile, method, confidence, and missing fields
   */
  async extractFields(message: string, conversationHistory?: string[]): Promise<ExtractionResult> {
    try {
      // Step 1: Try key-value parser first (instant, free, deterministic)
      if (hasKeyValueSyntax(message)) {
        const kvResult = parseKeyValueSyntax(message)

        // Validate extracted profile against schema
        const validatedProfile = this.validateProfile(kvResult.profile)

        // Calculate missing fields
        const missingFields = this.calculateMissingFields(validatedProfile)

        return {
          profile: validatedProfile,
          extractionMethod: 'key-value',
          confidence: this.buildConfidenceMap(validatedProfile, 1.0), // Key-value is always 100% confident
          missingFields,
        }
      }

      // Step 2: Use LLM for natural language extraction (fallback)
      const llmResult = await this.llmProvider.extractWithStructuredOutput(
        message,
        conversationHistory,
        userProfileSchema
      )

      // Validate extracted profile against schema
      const validatedProfile = this.validateProfile(llmResult.profile)

      // Calculate missing fields
      const missingFields = this.calculateMissingFields(validatedProfile)

      return {
        profile: validatedProfile,
        extractionMethod: 'llm',
        confidence: llmResult.confidence,
        missingFields,
        reasoning: llmResult.reasoning,
      }
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
   * Validate profile against UserProfile schema
   * Returns partial profile with only valid fields
   */
  private validateProfile(profile: Partial<UserProfile>): Partial<UserProfile> {
    try {
      // Use Zod schema to validate and sanitize
      const result = userProfileSchema.safeParse(profile)
      if (result.success) {
        return result.data
      }

      // If validation fails, return only valid fields
      const validProfile: Partial<UserProfile> = {}
      for (const [key, value] of Object.entries(profile)) {
        try {
          const fieldResult =
            userProfileSchema.shape[key as keyof typeof userProfileSchema.shape]?.safeParse(value)
          if (fieldResult?.success) {
            // @ts-expect-error - Dynamic field assignment
            validProfile[key] = value
          }
        } catch {
          // Skip invalid fields
        }
      }
      return validProfile
    } catch {
      // If validation completely fails, return empty profile
      return {}
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
    return [
      'state',
      'productLine',
      'age',
      'householdSize',
      'vehicles',
      'ownsHome',
      'cleanRecord3Yr',
      'currentCarrier',
      'currentPremium',
      'existingPolicies',
      'kids', // Legacy field
    ]
  }

  /**
   * Build confidence map from profile
   */
  private buildConfidenceMap(
    profile: Partial<UserProfile>,
    defaultConfidence: number
  ): Record<string, number> {
    const confidence: Record<string, number> = {}
    for (const key of Object.keys(profile)) {
      if (profile[key as keyof UserProfile] !== undefined) {
        confidence[key] = defaultConfidence
      }
    }
    return confidence
  }
}
