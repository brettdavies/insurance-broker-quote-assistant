import type { PolicySummary, UserProfile } from '@repo/shared'
import { policySummarySchema, userProfileSchema } from '@repo/shared'
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
      'productType',
      'age',
      'householdSize',
      'vehicles',
      'ownsHome',
      'cleanRecord3Yr',
      'currentCarrier',
      'premiums',
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

  /**
   * Extract policy data directly from a policy document file
   *
   * @param file - Policy document file (PDF, DOCX, TXT)
   * @returns PolicySummary with extracted fields and confidence scores, plus metadata (tokens, timing)
   */
  async extractPolicyDataFromFile(file: File): Promise<
    PolicySummary & {
      _metadata?: { tokensUsed?: number; extractionTime?: number; reasoning?: string }
    }
  > {
    try {
      // Check if LLM provider supports direct file extraction
      if (this.llmProvider.extractFromFile) {
        const prompt =
          'Extract policy information from this insurance policy document. Extract all relevant fields including carrier, state, product type, coverage limits, deductibles, premiums, and effective dates according to the provided schema.'

        const llmResult = await this.llmProvider.extractFromFile(file, prompt, policySummarySchema)

        // Validate extracted policy summary against schema
        const validatedSummary = this.validatePolicySummary(
          llmResult.profile as unknown as Partial<PolicySummary>
        )

        // Build confidence scores from LLM result
        const confidenceScores = this.buildPolicyConfidenceMap(
          validatedSummary,
          llmResult.confidence
        )

        // Return PolicySummary with metadata attached (will be stripped before returning to client)
        return {
          ...validatedSummary,
          confidence: confidenceScores,
          _metadata: {
            tokensUsed: llmResult.tokensUsed,
            extractionTime: llmResult.extractionTime,
            reasoning: llmResult.reasoning,
          },
        }
      }

      // Fallback: Extract text first, then use LLM
      throw new Error('Direct file extraction not supported by LLM provider')
    } catch (error) {
      // Log error but return partial result (graceful degradation)
      await logError('Policy extraction from file failed', error as Error, {
        type: 'policy_extraction_error',
        fileName: file.name,
      })

      // Return empty policy summary with low confidence
      return {
        carrier: undefined,
        state: undefined,
        productType: undefined,
        coverageLimits: undefined,
        deductibles: undefined,
        premiums: undefined,
        effectiveDates: undefined,
        confidence: {
          carrier: 0.0,
          state: 0.0,
          productType: 0.0,
          coverageLimits: 0.0,
          deductibles: 0.0,
          premiums: 0.0,
          effectiveDates: 0.0,
        },
      }
    }
  }

  /**
   * Extract policy data from policy document text (fallback method)
   *
   * @param policyText - Raw text extracted from PDF/DOCX/TXT policy document
   * @returns PolicySummary with extracted fields and confidence scores
   */
  async extractPolicyData(policyText: string): Promise<PolicySummary> {
    try {
      // Use LLM to extract structured policy data from text
      const llmResult = await this.llmProvider.extractWithStructuredOutput(
        policyText,
        undefined, // No conversation history for policy extraction
        policySummarySchema
      )

      // Validate extracted policy summary against schema
      // LLM returns profile as Partial<UserProfile> type, but content matches PolicySummary schema
      const validatedSummary = this.validatePolicySummary(
        llmResult.profile as unknown as Partial<PolicySummary>
      )

      // Build confidence scores from LLM result
      const confidenceScores = this.buildPolicyConfidenceMap(validatedSummary, llmResult.confidence)

      return {
        ...validatedSummary,
        confidence: confidenceScores,
      }
    } catch (error) {
      // Log error but return partial result (graceful degradation)
      await logError('Policy extraction failed', error as Error, {
        type: 'policy_extraction_error',
        policyTextPreview: policyText.substring(0, 500),
      })

      // Return empty policy summary with low confidence
      return {
        carrier: undefined,
        state: undefined,
        productType: undefined,
        coverageLimits: undefined,
        deductibles: undefined,
        premiums: undefined,
        effectiveDates: undefined,
        confidence: {
          carrier: 0.0,
          state: 0.0,
          productType: 0.0,
          coverageLimits: 0.0,
          deductibles: 0.0,
          premiums: 0.0,
          effectiveDates: 0.0,
        },
      }
    }
  }

  /**
   * Validate policy summary against PolicySummary schema
   * Returns partial policy summary with only valid fields
   */
  private validatePolicySummary(policy: Partial<PolicySummary>): Partial<PolicySummary> {
    try {
      // Use Zod schema to validate and sanitize
      const result = policySummarySchema.safeParse(policy)
      if (result.success) {
        return result.data
      }

      // If validation fails, return only valid fields
      const validPolicy: Partial<PolicySummary> = {}
      for (const [key, value] of Object.entries(policy)) {
        try {
          // Check if field exists in schema
          if (key in policySummarySchema.shape) {
            const fieldSchema = (policySummarySchema.shape as Record<string, unknown>)[key]
            if (fieldSchema && typeof fieldSchema === 'object' && 'safeParse' in fieldSchema) {
              const fieldResult = (
                fieldSchema as { safeParse: (val: unknown) => { success: boolean; data?: unknown } }
              ).safeParse(value)
              if (fieldResult?.success) {
                // @ts-expect-error - Dynamic field assignment
                validPolicy[key] = value
              }
            }
          }
        } catch {
          // Skip invalid fields
        }
      }
      return validPolicy
    } catch {
      // If validation completely fails, return empty policy
      return {}
    }
  }

  /**
   * Build confidence map for policy summary from LLM confidence scores
   */
  private buildPolicyConfidenceMap(
    policy: Partial<PolicySummary>,
    llmConfidence: Record<string, number>
  ): PolicySummary['confidence'] {
    const confidence: PolicySummary['confidence'] = {}

    // Map LLM confidence scores to policy confidence structure
    if (llmConfidence.carrier !== undefined) {
      confidence.carrier = llmConfidence.carrier
    }
    if (llmConfidence.state !== undefined) {
      confidence.state = llmConfidence.state
    }
    if (llmConfidence.productType !== undefined) {
      confidence.productType = llmConfidence.productType
    }
    if (llmConfidence.coverageLimits !== undefined) {
      confidence.coverageLimits = llmConfidence.coverageLimits
    }
    if (llmConfidence.deductibles !== undefined) {
      confidence.deductibles = llmConfidence.deductibles
    }
    if (llmConfidence.premiums !== undefined) {
      confidence.premiums = llmConfidence.premiums
    }
    if (llmConfidence.effectiveDates !== undefined) {
      confidence.effectiveDates = llmConfidence.effectiveDates
    }

    // If no confidence scores from LLM, use default based on whether field exists
    const defaultConfidence = 0.8 // Default confidence for extracted fields
    if (policy.carrier && confidence.carrier === undefined) {
      confidence.carrier = defaultConfidence
    }
    if (policy.state && confidence.state === undefined) {
      confidence.state = defaultConfidence
    }
    if (policy.productType && confidence.productType === undefined) {
      confidence.productType = defaultConfidence
    }
    if (policy.coverageLimits && confidence.coverageLimits === undefined) {
      confidence.coverageLimits = defaultConfidence
    }
    if (policy.deductibles && confidence.deductibles === undefined) {
      confidence.deductibles = defaultConfidence
    }
    if (policy.premiums && confidence.premiums === undefined) {
      confidence.premiums = defaultConfidence
    }
    if (policy.effectiveDates && confidence.effectiveDates === undefined) {
      confidence.effectiveDates = defaultConfidence
    }

    return confidence
  }
}
