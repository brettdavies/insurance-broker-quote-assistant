/**
 * Field Extraction Orchestrator
 *
 * Single source of truth for field extraction logic.
 * Used by BOTH frontend and backend to ensure identical extraction behavior.
 *
 * Flow:
 * 1. Parse key-value syntax (e.g., "state:IL", "vehicles:3")
 * 2. Run deterministic regex extractors (e.g., "Age 36", "Credit 750")
 * 3. Run inference engine (e.g., "lives alone" → householdSize: 1)
 * 4. (Backend only) Optionally run LLM for remaining unextracted fields
 * 5. (Backend only) Re-run deterministic + inference until convergence
 */

import type { NormalizedField } from './field-normalization/types'
import { extractNormalizedFields } from './field-normalization/extractors'
import { inferExistingPolicies, inferHouseholdSize } from './field-normalization/inference'

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
 */
export function runInferenceEngine(fields: NormalizedField[]): NormalizedField[] {
  const inferredFields: NormalizedField[] = []

  // Convert to Map for inference engine
  const fieldsMap = new Map<string, NormalizedField>()
  for (const field of fields) {
    fieldsMap.set(field.fieldName, field)
  }

  // Infer existing policies (e.g., if currentCarrier exists)
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

  // Infer household size from drivers/kids
  const householdSizeField = inferHouseholdSize(fieldsMap)
  if (householdSizeField) {
    inferredFields.push(householdSizeField)
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

  // Step 2: Inference engine
  const inferredFields = runInferenceEngine(fields)

  // Combine and return
  return [...fields, ...inferredFields]
}

/**
 * Full extraction orchestration for backend (without LLM)
 * Runs: deterministic extraction → inference
 * Returns remaining text for LLM processing
 */
export function extractFieldsBackendPreLLM(text: string): {
  fields: NormalizedField[]
  remainingText: string
} {
  // Step 1: Deterministic extraction
  const { fields, remainingText } = runDeterministicExtraction(text)

  // Step 2: Inference engine
  const inferredFields = runInferenceEngine(fields)

  // Combine extracted + inferred fields
  const allFields = [...fields, ...inferredFields]

  return {
    fields: allFields,
    remainingText,
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

  // Run inference on combined fields
  const allFields = [...llmFields, ...deterministicFields]
  const inferredFields = runInferenceEngine(allFields)

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
