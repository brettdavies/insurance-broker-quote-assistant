import fs from 'node:fs'
import path from 'node:path'
import type { NormalizedField, PolicySummary, UserProfile } from '@repo/shared'
import {
  CONFIDENCE_THRESHOLD_HIGH,
  DEFAULT_EXTRACTION_TEMPERATURE,
  buildSystemPrompt,
  buildUserPrompt,
  extractFieldsBackendPreLLM,
  extractStateFromText,
  getAllUserProfileFieldNames,
  policySummarySchema,
  separateKnownFromInferred,
  userProfileSchema,
  validateAndReExtractPostLLM,
} from '@repo/shared'
import { getAllCarriers } from '../services/knowledge-pack-loader'
import { logDebug, logError } from '../utils/logger'
import { extractFieldsWithLLM } from './extractors/llm-extraction'
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
    suppressedFields: string[],
    carrierNames?: string[]
  ): string {
    const template = this.loadUserPromptTemplate()
    return buildUserPrompt(
      template,
      message,
      knownFields,
      inferredFields,
      suppressedFields,
      carrierNames
    )
  }

  /**
   * Convert NormalizedField[] to Partial<UserProfile>
   */
  private normalizedFieldsToProfile(fields: NormalizedField[]): Partial<UserProfile> {
    const profile: Partial<UserProfile> = {}
    for (const field of fields) {
      // @ts-expect-error - Dynamic field assignment
      profile[field.fieldName] = field.value
    }
    return profile
  }

  /**
   * Convert Partial<UserProfile> to NormalizedField[]
   */
  private profileToNormalizedFields(profile: Partial<UserProfile>): NormalizedField[] {
    const fields: NormalizedField[] = []
    for (const [key, value] of Object.entries(profile)) {
      if (value !== undefined) {
        fields.push({
          fieldName: key,
          value,
          originalText: `${key}:${value}`,
          startIndex: 0,
          endIndex: 0,
        })
      }
    }
    return fields
  }

  /**
   * Extract structured fields from broker message
   *
   * UNIFIED EXTRACTION FLOW (used by both FE and BE):
   * 1. Run deterministic extraction (key-value + regex) + inference
   * 2. Send remaining text to LLM (not full message)
   * 3. Re-run deterministic extraction on LLM results
   * 4. Loop until convergence (max 3 iterations)
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
    await logDebug('Conversational extractor: extractFields called (unified flow)', {
      knownFields,
      inferredFields,
      suppressedFields,
    })
    try {
      // Step 1: Run unified deterministic extraction (key-value + regex + inference)
      // Uses shared extraction engine (same as FE) to ensure identical behavior
      const {
        fields: allExtractedFields,
        remainingText,
        userProfile: extractedUserProfile,
        deterministicFields: extractedDeterministicFields,
        inferredFields: extractedInferredFields,
      } = extractFieldsBackendPreLLM(message)

      // Extract known/inferred/suppressed from extracted userProfile
      // Known fields = all fields except metadata (keys starting with _)
      const extractedKnownFields: Partial<UserProfile> = {}
      const extractedInferredFieldsMap: Partial<UserProfile> = {}
      const extractedSuppressedFields: string[] = []

      for (const [key, value] of Object.entries(extractedUserProfile)) {
        if (!key.startsWith('_') && value !== null && value !== undefined) {
          // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
          extractedKnownFields[key as keyof UserProfile] = value as any
        }
      }

      if (extractedUserProfile._inferred) {
        Object.assign(extractedInferredFieldsMap, extractedUserProfile._inferred)
      }

      if (extractedUserProfile._suppressed) {
        extractedSuppressedFields.push(...extractedUserProfile._suppressed)
      }

      // Merge with passed-in known/inferred/suppressed fields
      const mergedKnownFields = { ...knownFields, ...extractedKnownFields }
      const mergedInferredFields = { ...inferredFields, ...extractedInferredFieldsMap }
      const mergedSuppressedFields = [...(suppressedFields || []), ...extractedSuppressedFields]

      // Build deterministic profile from deterministic fields for backward compatibility
      const deterministicProfile = this.normalizedFieldsToProfile(extractedDeterministicFields)

      await logDebug('Deterministic extraction results', {
        extractedFields: Object.keys(deterministicProfile),
        remainingText,
        extractedKnownFields: Object.keys(extractedKnownFields),
        extractedInferredFields: Object.keys(extractedInferredFieldsMap),
      })

      // Step 2: Check if we need LLM (if no remaining text or we have enough fields)
      if (remainingText.trim().length === 0) {
        // All patterns extracted, no need for LLM
        return {
          profile: deterministicProfile,
          known: deterministicProfile,
          extractionMethod: 'key-value',
          confidence: Object.fromEntries(
            Object.keys(deterministicProfile).map((key) => [key, 1.0])
          ),
          missingFields: this.calculateMissingFields(deterministicProfile),
        }
      }

      // Step 3: Remove duplicate fields from inferred (if they exist in known)
      // A field should only appear in one section, not both
      const cleanedInferredFields = { ...mergedInferredFields }
      for (const key of Object.keys(mergedKnownFields)) {
        if (key in cleanedInferredFields) {
          delete cleanedInferredFields[key as keyof UserProfile]
        }
      }

      // Step 4: Use LLM for remaining natural language text
      const systemPrompt = this.buildSystemPrompt(
        mergedKnownFields, // Known fields (deterministic + pills)
        cleanedInferredFields, // Inferred fields (with duplicates removed)
        mergedSuppressedFields
      )
      // Get carrier names from knowledge pack for enum values
      const carrierNames = getAllCarriers().map((carrier) => carrier.name)

      const userPrompt = this.buildUserPrompt(
        remainingText, // Only send remaining text to LLM
        mergedKnownFields,
        cleanedInferredFields,
        mergedSuppressedFields,
        carrierNames // Pass carrier names for dynamic enum values
      )

      const llmResult = await extractFieldsWithLLM(
        this.llmProvider,
        remainingText,
        systemPrompt,
        userPrompt,
        mergedKnownFields, // Pass merged known fields to LLM
        mergedSuppressedFields,
        (profile) => this.calculateMissingFields(profile)
      )

      // Step 4: Post-LLM validation loop (re-run deterministic extraction until convergence)
      let currentFields = this.profileToNormalizedFields(llmResult.profile)
      let iterations = 0
      const MAX_ITERATIONS = 3

      while (iterations < MAX_ITERATIONS) {
        const { fields: validatedFields, hasChanges } = validateAndReExtractPostLLM(
          message,
          currentFields
        )

        await logDebug(`Post-LLM validation iteration ${iterations + 1}`, {
          hasChanges,
          fieldCount: validatedFields.length,
        })

        if (!hasChanges) {
          // Convergence reached, no more changes
          break
        }

        currentFields = validatedFields
        iterations++
      }

      // Convert final fields to profile
      const finalProfile = this.normalizedFieldsToProfile(currentFields)

      // Return combined result
      return {
        profile: finalProfile,
        known: finalProfile,
        extractionMethod: 'llm',
        confidence: llmResult.confidence,
        missingFields: this.calculateMissingFields(finalProfile),
        reasoning: llmResult.reasoning,
        tokenUsage: llmResult.tokenUsage,
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
        policySummarySchema,
        undefined // No partial fields for policy extraction
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
        name: undefined,
        email: undefined,
        phone: undefined,
        zip: undefined,
        state: undefined,
        address: undefined,
        carrier: undefined,
        productType: undefined,
        coverageLimits: undefined,
        deductibles: undefined,
        premiums: undefined,
        effectiveDates: undefined,
        confidence: {
          name: 0.0,
          email: 0.0,
          phone: 0.0,
          zip: 0.0,
          state: 0.0,
          address: 0.0,
          carrier: 0.0,
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
    // User contact fields
    if (llmConfidence.name !== undefined) {
      confidence.name = llmConfidence.name
    }
    if (llmConfidence.email !== undefined) {
      confidence.email = llmConfidence.email
    }
    if (llmConfidence.phone !== undefined) {
      confidence.phone = llmConfidence.phone
    }
    if (llmConfidence.zip !== undefined) {
      confidence.zip = llmConfidence.zip
    }
    if (llmConfidence.state !== undefined) {
      confidence.state = llmConfidence.state
    }
    if (llmConfidence.address !== undefined) {
      confidence.address = llmConfidence.address
    }
    // Policy-specific fields
    if (llmConfidence.carrier !== undefined) {
      confidence.carrier = llmConfidence.carrier
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
    // User contact fields
    if (policy.name && confidence.name === undefined) {
      confidence.name = defaultConfidence
    }
    if (policy.email && confidence.email === undefined) {
      confidence.email = defaultConfidence
    }
    if (policy.phone && confidence.phone === undefined) {
      confidence.phone = defaultConfidence
    }
    if (policy.zip && confidence.zip === undefined) {
      confidence.zip = defaultConfidence
    }
    if (policy.state && confidence.state === undefined) {
      confidence.state = defaultConfidence
    }
    if (policy.address && confidence.address === undefined) {
      confidence.address = defaultConfidence
    }
    // Policy-specific fields
    if (policy.carrier && confidence.carrier === undefined) {
      confidence.carrier = defaultConfidence
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
