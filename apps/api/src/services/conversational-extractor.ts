import type { PolicySummary, UserProfile } from '@repo/shared'
import { policySummarySchema, userProfileSchema } from '@repo/shared'
import {
  type NormalizedField,
  extractAge,
  extractDrivers,
  extractHouseholdSize,
  extractKids,
  extractNormalizedFields,
  extractOwnsHome,
  extractStateFromText,
  extractZip,
  inferHouseholdSize,
} from '@repo/shared'
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
  tokenUsage?: import('./llm-provider').TokenUsage // Token usage from LLM (if extractionMethod === 'llm')
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
        let validatedProfile = this.validateProfile(kvResult.profile)

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
          confidence: this.buildConfidenceMap(validatedProfile, 1.0), // Key-value is always 100% confident
          missingFields,
        }
      }

      // Step 2: Extract normalized fields from natural language using shared utilities
      // This handles patterns like "2 drivers", "California", "owns home", etc.
      // These can help guide the LLM extraction
      let partialFields: Partial<UserProfile> = {}
      try {
        // Use shared normalization utilities to extract fields from natural language
        const normalizedFields = extractNormalizedFields(message)

        // Build map for inference
        const extractedFieldsMap = new Map<string, NormalizedField>()

        // Convert normalized fields to partial profile
        for (const field of normalizedFields) {
          if (field.fieldName === 'drivers' && typeof field.value === 'number') {
            partialFields.drivers = field.value
            extractedFieldsMap.set('drivers', field)
          } else if (field.fieldName === 'kids' && typeof field.value === 'number') {
            partialFields.kids = field.value
            extractedFieldsMap.set('kids', field)
          } else if (field.fieldName === 'householdSize' && typeof field.value === 'number') {
            partialFields.householdSize = field.value
            extractedFieldsMap.set('householdSize', field)
          } else if (field.fieldName === 'ownsHome' && typeof field.value === 'boolean') {
            partialFields.ownsHome = field.value
          } else if (field.fieldName === 'zip' && typeof field.value === 'string') {
            partialFields.zip = field.value
          } else if (field.fieldName === 'age' && typeof field.value === 'number') {
            partialFields.age = field.value
          }
        }

        // Infer householdSize from indicator fields if not explicitly set
        if (!partialFields.householdSize) {
          const inferredHouseholdSize = inferHouseholdSize(extractedFieldsMap)
          if (inferredHouseholdSize) {
            partialFields.householdSize = inferredHouseholdSize.value as number
          }
        }

        // Also try explicit key-value syntax parsing (e.g., "state:CA age:35")
        // This handles structured input that may not be caught by natural language extraction
        try {
          const kvResult = parseKeyValueSyntax(message)
          const kvProfile = this.validateProfile(kvResult.profile)
          // Merge key-value fields (they take precedence as they're explicit)
          partialFields = { ...partialFields, ...kvProfile }
        } catch {
          // Ignore key-value parsing errors
        }

        // Apply deterministic state normalization if state is still missing
        if (!partialFields.state) {
          const extractedState = extractStateFromText(message)
          if (extractedState) {
            partialFields = { ...partialFields, state: extractedState }
          }
        }
      } catch {
        // Ignore errors - partial extraction is optional
      }

      // Step 3: Use LLM for natural language extraction (fallback)
      // Pass partial fields as context in the prompt if available
      const llmResult = await this.llmProvider.extractWithStructuredOutput(
        message,
        conversationHistory,
        userProfileSchema,
        Object.keys(partialFields).length > 0 ? partialFields : undefined
      )

      // Validate extracted profile against schema
      let validatedProfile = this.validateProfile(llmResult.profile)

      // Merge partial fields from pills with LLM extraction result
      // Partial fields take precedence (they're deterministic from pills)
      if (partialFields && Object.keys(partialFields).length > 0) {
        validatedProfile = { ...validatedProfile, ...partialFields }
      }

      // Step 4: Apply deterministic field extraction for missing fields
      // These are fallbacks when LLM doesn't extract them
      if (!validatedProfile.state) {
        const extractedState = extractStateFromText(message)
        if (extractedState) {
          validatedProfile = { ...validatedProfile, state: extractedState }
        }
      }

      if (!validatedProfile.age) {
        const ageField = extractAge(message)
        if (ageField && typeof ageField.value === 'number') {
          validatedProfile = { ...validatedProfile, age: ageField.value }
        }
      }

      // Extract drivers and kids separately (not householdSize directly)
      // Build map of extracted fields for inference
      const extractedFieldsMap = new Map<string, NormalizedField>()

      // Extract drivers if not already set
      if (!validatedProfile.drivers) {
        const driversField = extractDrivers(message)
        if (driversField) {
          validatedProfile = { ...validatedProfile, drivers: driversField.value as number }
          extractedFieldsMap.set('drivers', driversField)
        }
      } else if (validatedProfile.drivers !== undefined) {
        // Already set (from LLM or pills) - add to map for inference
        extractedFieldsMap.set('drivers', {
          fieldName: 'drivers',
          value: validatedProfile.drivers,
          originalText: '(already extracted)',
          startIndex: 0,
          endIndex: 0,
        })
      }

      // Extract kids if not already set
      if (!validatedProfile.kids) {
        const kidsField = extractKids(message)
        if (kidsField) {
          validatedProfile = { ...validatedProfile, kids: kidsField.value as number }
          extractedFieldsMap.set('kids', kidsField)
        }
      } else if (validatedProfile.kids !== undefined) {
        // Already set (from LLM or pills) - add to map for inference
        extractedFieldsMap.set('kids', {
          fieldName: 'kids',
          value: validatedProfile.kids,
          originalText: '(already extracted)',
          startIndex: 0,
          endIndex: 0,
        })
      }

      // Extract explicit householdSize mentions (never overwrite if already set)
      if (!validatedProfile.householdSize) {
        const householdSizeField = extractHouseholdSize(message)
        if (householdSizeField && typeof householdSizeField.value === 'number') {
          validatedProfile = { ...validatedProfile, householdSize: householdSizeField.value }
          // If we extracted it explicitly, add to map to prevent inference
          extractedFieldsMap.set('householdSize', householdSizeField)
        }
      }

      // Infer householdSize from indicator fields if not explicitly set
      // Never overwrites an explicitly set householdSize
      if (!validatedProfile.householdSize) {
        const inferredHouseholdSize = inferHouseholdSize(extractedFieldsMap)
        if (inferredHouseholdSize) {
          validatedProfile = {
            ...validatedProfile,
            householdSize: inferredHouseholdSize.value as number,
          }
        }
      }

      if (validatedProfile.ownsHome === undefined || validatedProfile.ownsHome === null) {
        const ownsHomeField = extractOwnsHome(message)
        if (ownsHomeField && typeof ownsHomeField.value === 'boolean') {
          validatedProfile = { ...validatedProfile, ownsHome: ownsHomeField.value }
        }
      }

      if (!validatedProfile.zip) {
        const zipField = extractZip(message)
        if (zipField && typeof zipField.value === 'string') {
          validatedProfile = { ...validatedProfile, zip: zipField.value }
        }
      }

      // Calculate missing fields
      const missingFields = this.calculateMissingFields(validatedProfile)

      return {
        profile: validatedProfile,
        extractionMethod: 'llm',
        confidence: llmResult.confidence,
        missingFields,
        reasoning: llmResult.reasoning,
        tokenUsage: llmResult.tokenUsage, // Include token usage from LLM
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
