import fs from 'node:fs'
import path from 'node:path'
import type { PolicySummary, UserProfile } from '@repo/shared'
import {
  CONFIDENCE_THRESHOLD_HIGH,
  DEFAULT_EXTRACTION_TEMPERATURE,
  type NormalizedField,
  extractStateFromText,
  inferExistingPolicies,
  normalizeCarrierName,
  policySummarySchema,
  userProfileSchema,
} from '@repo/shared'
import { buildPolicyConfidenceMap, buildProfileConfidenceMap } from '../utils/confidence-builder'
import { hasKeyValueSyntax, parseKeyValueSyntax } from '../utils/key-value-parser'
import { logDebug, logError } from '../utils/logger'
import { validatePolicySummary } from './extractors/policy-validator'
import { validateProfile } from './extractors/profile-validator'
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
   * Build system prompt with known/inferred/suppressed fields injected
   */
  private buildSystemPrompt(
    knownFields: Partial<UserProfile>,
    inferredFields: Partial<UserProfile>,
    suppressedFields: string[]
  ): string {
    // Load template from conversational-extraction-system.txt
    const templatePath = path.join(
      process.cwd(),
      'src/prompts/conversational-extraction-system.txt'
    )
    const template = fs.readFileSync(templatePath, 'utf-8')

    // Inject known/inferred/suppressed fields
    return template
      .replace('{{knownFields}}', JSON.stringify(knownFields))
      .replace('{{inferredFields}}', JSON.stringify(inferredFields))
      .replace('{{suppressedFields}}', suppressedFields.join(', '))
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
    // Load template from conversational-extraction-user.txt
    const templatePath = path.join(process.cwd(), 'src/prompts/conversational-extraction-user.txt')
    const template = fs.readFileSync(templatePath, 'utf-8')

    // Inject all fields
    return template
      .replace('{{knownFields}}', JSON.stringify(knownFields, null, 2))
      .replace('{{inferredFields}}', JSON.stringify(inferredFields, null, 2))
      .replace('{{suppressedFields}}', suppressedFields.join(', '))
      .replace('{{message}}', message)
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
        const kvResult = parseKeyValueSyntax(message)

        // Validate extracted profile against schema
        let validatedProfile = validateProfile(kvResult.profile)

        // Apply deterministic state normalization if state is missing
        if (!validatedProfile.state) {
          const extractedState = extractStateFromText(message)
          if (extractedState) {
            validatedProfile = { ...validatedProfile, state: extractedState }
          }
        }

        // Calculate missing fields
        const missingFields = this.calculateMissingFields(validatedProfile)

        return {
          profile: validatedProfile,
          extractionMethod: 'key-value',
          confidence: buildProfileConfidenceMap(validatedProfile, {}, 1.0), // Key-value is always 100% confident
          missingFields,
        }
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

      await logDebug('Conversational extractor: LLM prompts generated', {
        systemPrompt,
        userPrompt,
      })

      // Use LLM with custom system prompt
      const llmResult = await this.llmProvider.extractWithStructuredOutput(
        userPrompt,
        userProfileSchema,
        undefined, // No partialFields needed (using prompts instead)
        DEFAULT_EXTRACTION_TEMPERATURE, // Temperature for extraction (deterministic behavior)
        systemPrompt // NEW: Pass custom system prompt
      )

      // Validate extracted profile against schema
      const validatedProfile = validateProfile(llmResult.profile)
      await logDebug('Conversational extractor: LLM profile validated', {
        householdSize: validatedProfile.householdSize,
      })

      // Separate LLM extracted fields into known vs inferred based on confidence
      const llmKnownFields: Partial<UserProfile> = {}
      const llmInferredFields: Partial<UserProfile> = {}
      const inferenceReasons: Record<string, string> = {}

      for (const [fieldName, fieldValue] of Object.entries(validatedProfile)) {
        const confidence = llmResult.confidence[fieldName] ?? 0

        if (confidence >= CONFIDENCE_THRESHOLD_HIGH) {
          // High confidence (≥85%): treat as known
          // Type assertion needed because Object.entries loses type information
          ;(llmKnownFields as Record<string, unknown>)[fieldName] = fieldValue
        } else if (confidence > 0) {
          // Medium/low confidence (<85%): treat as inferred
          // Type assertion needed because Object.entries loses type information
          ;(llmInferredFields as Record<string, unknown>)[fieldName] = fieldValue
          inferenceReasons[fieldName] =
            llmResult.reasoning ?? `Extracted with ${(confidence * 100).toFixed(0)}% confidence`
        }
      }

      // Merge with input knownFields (broker-set fields always take precedence)
      const finalKnownFields: Partial<UserProfile> = {
        ...llmKnownFields,
        ...(knownFields || {}), // Broker-set known fields override LLM extractions
      }

      // Use ONLY LLM's extracted inferred fields (don't merge input inferredFields)
      // The input inferredFields are just for LLM context, not to be carried forward automatically
      // The LLM decides which inferred fields to keep/modify/delete/upgrade
      const finalInferredFields: Partial<UserProfile> = {
        ...llmInferredFields,
      }

      // Remove suppressed fields from inferred (should never appear due to prompt, but defensive)
      if (suppressedFields && suppressedFields.length > 0) {
        for (const suppressedField of suppressedFields) {
          delete finalInferredFields[suppressedField as keyof UserProfile]
        }
      }

      // Merge all fields for backward compatibility (profile field)
      const finalProfile: Partial<UserProfile> = {
        ...finalInferredFields,
        ...finalKnownFields, // Known fields take precedence
      }

      await logDebug('Conversational extractor: Final extraction results', {
        knownFields: finalKnownFields,
        inferredFields: finalInferredFields,
        profile: finalProfile,
      })

      // Normalize carrier name using alias map (handles abbreviations like "pro" → "PROGRESSIVE")
      if (finalProfile.currentCarrier) {
        finalProfile.currentCarrier = normalizeCarrierName(finalProfile.currentCarrier)
        // Also normalize in known/inferred fields
        if (finalKnownFields.currentCarrier) {
          finalKnownFields.currentCarrier = normalizeCarrierName(finalKnownFields.currentCarrier)
        }
        if (finalInferredFields.currentCarrier) {
          finalInferredFields.currentCarrier = normalizeCarrierName(
            finalInferredFields.currentCarrier
          )
        }
      }

      // Infer existingPolicies from currentCarrier + productType
      if (finalProfile.currentCarrier && finalProfile.productType) {
        // Build a map for inference function
        const fieldsMap = new Map<string, NormalizedField>()
        fieldsMap.set('currentCarrier', {
          fieldName: 'currentCarrier',
          value: finalProfile.currentCarrier,
          originalText: finalProfile.currentCarrier,
          startIndex: 0,
          endIndex: 0,
        })
        fieldsMap.set('productType', {
          fieldName: 'productType',
          value: finalProfile.productType,
          originalText: finalProfile.productType,
          startIndex: 0,
          endIndex: 0,
        })

        const inferredPolicies = inferExistingPolicies(fieldsMap)
        if (inferredPolicies.length > 0) {
          finalProfile.existingPolicies = inferredPolicies
          // Add to inferred fields if not in known
          if (!finalKnownFields.existingPolicies) {
            finalInferredFields.existingPolicies = inferredPolicies
            inferenceReasons.existingPolicies = 'Inferred from currentCarrier + productType'
          }
          await logDebug('Conversational extractor: Inferred existingPolicies', {
            inferredPolicies,
          })
        }
      }

      // Calculate missing fields
      const missingFields = this.calculateMissingFields(finalProfile)

      return {
        profile: finalProfile, // Backward compatibility
        known: finalKnownFields, // NEW: Known fields
        inferred: finalInferredFields, // NEW: Inferred fields
        extractionMethod: 'llm',
        confidence: llmResult.confidence,
        missingFields,
        reasoning: llmResult.reasoning,
        tokenUsage: llmResult.tokenUsage, // Include token usage from LLM
        inferenceReasons, // NEW: Reasoning for each inferred field
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
        const validatedSummary = validatePolicySummary(
          llmResult.profile as unknown as Partial<PolicySummary>
        )

        // Build confidence scores from LLM result
        const confidenceScores = buildPolicyConfidenceMap(validatedSummary, llmResult.confidence)

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
        policySummarySchema
      )

      // Validate extracted policy summary against schema
      // LLM returns profile as Partial<UserProfile> type, but content matches PolicySummary schema
      const validatedSummary = validatePolicySummary(
        llmResult.profile as unknown as Partial<PolicySummary>
      )

      // Build confidence scores from LLM result
      const confidenceScores = buildPolicyConfidenceMap(validatedSummary, llmResult.confidence)

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
}
