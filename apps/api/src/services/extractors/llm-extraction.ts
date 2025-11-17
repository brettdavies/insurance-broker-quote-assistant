/**
 * LLM Extraction
 *
 * Handles LLM-based field extraction with known/inferred/suppressed field context.
 * Single Responsibility: LLM extraction orchestration only
 */

import type { UserProfile } from '@repo/shared'
import {
  CONFIDENCE_THRESHOLD_HIGH,
  DEFAULT_EXTRACTION_TEMPERATURE,
  separateKnownFromInferred,
  userProfileSchema,
} from '@repo/shared'
import { logDebug } from '../../utils/logger'
import type { ExtractionResult } from '../conversational-extractor'
import type { LLMProvider } from '../llm-provider'
import {
  buildExtractionResult,
  inferPoliciesFromCarrier,
  normalizeCarrierNames,
} from './field-extraction-helpers'
import { validateProfile } from './profile-validator'

/**
 * Extract fields using LLM
 *
 * @param llmProvider - LLM provider instance
 * @param message - Broker message text
 * @param systemPrompt - System prompt with known/inferred/suppressed fields
 * @param userPrompt - User prompt with message and field context
 * @param knownFields - Known fields from broker
 * @param suppressedFields - Suppressed field names
 * @param calculateMissingFields - Function to calculate missing fields
 * @returns Extraction result with LLM extracted fields
 */
export async function extractFieldsWithLLM(
  llmProvider: LLMProvider,
  message: string,
  systemPrompt: string,
  userPrompt: string,
  knownFields: Partial<UserProfile>,
  suppressedFields: string[],
  calculateMissingFields: (profile: Partial<UserProfile>) => string[]
): Promise<ExtractionResult> {
  await logDebug('Conversational extractor: LLM prompts generated', {
    systemPrompt,
    userPrompt,
  })

  // Use LLM with custom system prompt
  const llmResult = await llmProvider.extractWithStructuredOutput(
    userPrompt,
    userProfileSchema,
    undefined, // No partialFields needed (using prompts instead)
    DEFAULT_EXTRACTION_TEMPERATURE, // Temperature for extraction (deterministic behavior)
    systemPrompt // Pass custom system prompt
  )

  // Validate extracted profile against schema
  const validatedProfile = validateProfile(llmResult.profile)
  await logDebug('Conversational extractor: LLM profile validated', {
    householdSize: validatedProfile.householdSize,
  })

  // Separate LLM extracted fields into known vs inferred based on confidence
  const {
    known: llmKnownFields,
    inferred: llmInferredFields,
    reasons: inferenceReasons,
  } = separateKnownFromInferred(
    validatedProfile,
    llmResult.confidence,
    CONFIDENCE_THRESHOLD_HIGH,
    llmResult.reasoning
  )

  // Merge with input knownFields (broker-set fields always take precedence)
  const finalKnownFields: Partial<UserProfile> = {
    ...llmKnownFields,
    ...knownFields, // Broker-set known fields override LLM extractions
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

  // Normalize carrier names
  const {
    profile: normalizedProfile,
    knownFields: normalizedKnown,
    inferredFields: normalizedInferred,
  } = normalizeCarrierNames(finalProfile, finalKnownFields, finalInferredFields)

  // Infer existing policies from carrier and product type
  const {
    profile: finalProfileWithPolicies,
    inferredFields: finalInferredWithPolicies,
    inferenceReasons: finalReasons,
  } = inferPoliciesFromCarrier(
    normalizedProfile,
    normalizedKnown,
    normalizedInferred,
    inferenceReasons
  )

  await logDebug('Conversational extractor: Inferred existingPolicies', {
    existingPolicies: finalProfileWithPolicies.existingPolicies,
  })

  // Calculate missing fields
  const missingFields = calculateMissingFields(finalProfileWithPolicies)

  // Build and return extraction result
  return buildExtractionResult(
    finalProfileWithPolicies,
    normalizedKnown,
    finalInferredWithPolicies,
    llmResult.confidence,
    missingFields,
    llmResult.reasoning,
    llmResult.tokenUsage,
    finalReasons
  )
}
