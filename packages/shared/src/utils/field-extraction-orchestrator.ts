/**
 * Field Extraction Orchestrator
 *
 * Single source of truth for field extraction logic.
 * Used by BOTH frontend and backend to ensure identical extraction behavior.
 *
 * Flow:
 * 1. Parse key-value syntax (e.g., "state:IL", "vehicles:3")
 * 2. Run deterministic regex extractors (e.g., "Age 36", "Credit 750")
 * 3. Run inference engine (e.g., "lives alone" → householdSize: 1 → kids: 0)
 * 4. (Backend only) Optionally run LLM for remaining unextracted fields
 * 5. (Backend only) Re-run deterministic + inference until convergence
 */

import { TEXT_PATTERN_INFERENCES } from '../config/text-pattern-inferences'
import { extractFieldsAndReplace, removePillMarkers } from '../extraction-engine'
import type { InferenceRule } from '../schemas/unified-field-metadata'
import { unifiedFieldMetadata } from '../schemas/unified-field-metadata'
import type { UserProfile } from '../schemas/user-profile'
import { InferenceEngine } from '../services/inference-engine'
import { extractNormalizedFields } from './field-normalization/extractors'
import { inferExistingPolicies } from './field-normalization/inference'
import type { NormalizedField } from './field-normalization/types'

export interface ExtractionResult {
  /** Extracted fields as normalized field objects */
  fields: NormalizedField[]
  /** Text with extracted portions removed (for LLM processing) */
  remainingText: string
  /** Original text */
  originalText: string
}

/**
 * Run deterministic extraction (regex patterns only - includes key-value, natural language, etc.)
 * This is the core extraction logic used by both FE and BE
 */
export function runDeterministicExtraction(text: string): ExtractionResult {
  let remainingText = text

  // Run ALL regex-based extractors (includes key-value syntax, natural language patterns, etc.)
  const fields = extractNormalizedFields(text)

  // Remove extracted patterns from remaining text
  for (const field of fields) {
    remainingText = remainingText.replace(field.originalText, '')
  }

  return {
    fields,
    remainingText: remainingText.trim(),
    originalText: text,
  }
}

/**
 * Run inference engine to deduce additional fields from known facts
 * Should be called AFTER deterministic extraction
 *
 * Uses the full InferenceEngine class to apply:
 * 1. Field-to-field inference rules (e.g., householdSize=1 → kids=0)
 * 2. Text pattern inferences (e.g., "lives alone" → householdSize=1)
 * 3. Chained inferences (e.g., "lives alone" → householdSize=1 → kids=0)
 */
export function runInferenceEngine(
  fields: NormalizedField[],
  text = '',
  suppressedFields: string[] = []
): NormalizedField[] {
  const inferredFields: NormalizedField[] = []

  // Convert to Map for legacy inference functions
  const fieldsMap = new Map<string, NormalizedField>()
  for (const field of fields) {
    fieldsMap.set(field.fieldName, field)
  }

  // Infer existing policies (e.g., if currentCarrier exists)
  // This is a special case that's not handled by InferenceEngine
  const existingPoliciesArray = inferExistingPolicies(fieldsMap)
  if (existingPoliciesArray.length > 0) {
    inferredFields.push({
      fieldName: 'existingPolicies',
      value: existingPoliciesArray,
      originalText: '[inferred from currentCarrier + productType]',
      startIndex: 0,
      endIndex: 0,
    })
  }

  // Build field-to-field inference rules from unifiedFieldMetadata
  const fieldInferences: Record<string, InferenceRule[]> = {}
  for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
    if (metadata.infers) {
      fieldInferences[fieldName] = metadata.infers
    }
  }

  // Convert NormalizedFields to UserProfile for InferenceEngine
  const knownFields: Partial<UserProfile> = {}
  for (const field of fields) {
    // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
    knownFields[field.fieldName as keyof UserProfile] = field.value as any
  }
  console.log(
    '[runInferenceEngine] Known fields passed to inference:',
    Object.keys(knownFields).join(', ')
  )
  console.log('[runInferenceEngine] Known field values:', knownFields)

  // Create InferenceEngine and apply all inference rules
  const engine = new InferenceEngine(fieldInferences, TEXT_PATTERN_INFERENCES, suppressedFields)
  const inferenceResult = engine.applyInferences(knownFields, text)
  console.log('[runInferenceEngine] Inference result:', {
    inferred: Object.keys(inferenceResult.inferred).join(', '),
    inferredValues: inferenceResult.inferred,
    reasons: inferenceResult.reasons,
  })

  // Convert InferenceResult back to NormalizedField[]
  for (const [fieldName, value] of Object.entries(inferenceResult.inferred)) {
    // Skip if already in inferredFields (e.g., existingPolicies)
    if (inferredFields.some((f) => f.fieldName === fieldName)) {
      continue
    }

    inferredFields.push({
      fieldName,
      value,
      originalText: `(inferred: ${inferenceResult.reasons[fieldName] || 'from known fields'})`,
      startIndex: 0,
      endIndex: 0,
    })
  }

  return inferredFields
}

/**
 * Full extraction orchestration for frontend
 * Runs: deterministic extraction → inference
 */
export function extractFieldsFrontend(text: string): NormalizedField[] {
  // Step 1: Deterministic extraction
  const { fields } = runDeterministicExtraction(text)

  // Step 2: Inference engine (pass text for text pattern inferences)
  const inferredFields = runInferenceEngine(fields, text, [])

  // Combine and return
  return [...fields, ...inferredFields]
}

/**
 * Full extraction orchestration for backend (without LLM)
 * Runs: deterministic extraction → inference
 * Returns remaining text for LLM processing
 *
 * Uses the shared extraction engine (extractFieldsAndReplace) to ensure
 * FE and BE share the same extraction logic, then removes pill markers
 * to get remaining text for LLM processing.
 */
export function extractFieldsBackendPreLLM(text: string): {
  fields: NormalizedField[]
  remainingText: string
  userProfile: UserProfile
  deterministicFields: NormalizedField[]
  inferredFields: NormalizedField[]
} {
  // Use shared extraction engine (same as FE)
  // This ensures FE and BE share the same extraction logic and fixes
  // the bug where text removal was case-sensitive
  const { processedText, extractedFields, userProfile, deterministicFields, inferredFields } =
    extractFieldsAndReplace(text, [], [])

  // Remove pill markers to get remaining text for LLM
  const remainingText = removePillMarkers(processedText)

  return {
    fields: extractedFields,
    remainingText,
    userProfile,
    deterministicFields,
    inferredFields,
  }
}

/**
 * Post-LLM validation and re-extraction
 * Runs deterministic extraction on LLM results and checks for conflicts
 * Returns true if fields changed (need to call LLM again)
 */
export function validateAndReExtractPostLLM(
  originalText: string,
  llmFields: NormalizedField[]
): {
  fields: NormalizedField[]
  hasChanges: boolean
} {
  // Run deterministic extraction again
  const { fields: deterministicFields } = runDeterministicExtraction(originalText)

  // Run inference on combined fields (pass originalText for text pattern inferences)
  const allFields = [...llmFields, ...deterministicFields]
  const inferredFields = runInferenceEngine(allFields, originalText, [])

  // Check for conflicts between LLM and deterministic extraction
  let hasChanges = false
  const finalFields = [...llmFields]

  for (const detField of deterministicFields) {
    const existingField = llmFields.find((f) => f.fieldName === detField.fieldName)

    if (!existingField) {
      // Deterministic found a field LLM missed
      finalFields.push(detField)
      hasChanges = true
    } else if (existingField.value !== detField.value) {
      // Conflict: deterministic has different value than LLM
      // Trust deterministic extraction over LLM
      const index = finalFields.findIndex((f) => f.fieldName === detField.fieldName)
      if (index !== -1) {
        finalFields[index] = detField
        hasChanges = true
      }
    }
  }

  // Add inferred fields that don't conflict
  for (const infField of inferredFields) {
    const exists = finalFields.some((f) => f.fieldName === infField.fieldName)
    if (!exists) {
      finalFields.push(infField)
      hasChanges = true
    }
  }

  return {
    fields: finalFields,
    hasChanges,
  }
}
