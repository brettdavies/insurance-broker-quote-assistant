/**
 * useInferenceEngine Hook
 *
 * Manages client-side inference engine for field-to-field and text pattern inferences.
 * Implements "first inference wins" behavior and debouncing to prevent infinite loops.
 *
 * Single Responsibility: Inference logic only
 */

import {
  InferenceEngine,
  type InferenceRule,
  TEXT_PATTERN_INFERENCES,
  type UserProfile,
} from '@repo/shared'
import { unifiedFieldMetadata } from '@repo/shared'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
interface SuppressionManagerHook {
  getSuppressed: () => string[]
  addSuppression: (fieldName: string) => void
  removeSuppression: (fieldName: string) => void
  isSuppressed: (fieldName: string) => boolean
  clearSuppressed: () => void
}

interface UseInferenceEngineParams {
  suppression: SuppressionManagerHook
  editorRef: React.MutableRefObject<{
    getTextWithoutPills: () => string
  } | null>
  profileRef: React.MutableRefObject<UserProfile>
}

interface InferenceState {
  inferredFields: Partial<UserProfile>
  inferenceReasons: Record<string, string>
  inferenceConfidence: Record<string, number>
}

const INFERENCE_DEBOUNCE_MS = 50

export function useInferenceEngine({
  suppression,
  editorRef,
  profileRef,
}: UseInferenceEngineParams) {
  // Initialize field inferences (static, doesn't change)
  const fieldInferences = useMemo(() => {
    const inferences: Record<string, InferenceRule[]> = {}
    for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
      if (metadata.infers) {
        inferences[fieldName] = metadata.infers
      }
    }
    return inferences
  }, [])

  // State for inferred fields
  const [inferredFields, setInferredFields] = useState<Partial<UserProfile>>({})
  const [inferenceReasons, setInferenceReasons] = useState<Record<string, string>>({})
  const [inferenceConfidence, setInferenceConfidence] = useState<Record<string, number>>({})

  // Track which fields came from extraction engine (should not be removed when in profile)
  // These fields are inferred from extraction (e.g., k:2 → householdSize) and should
  // remain marked as inferred even if they're also in the profile
  const extractionInferredFieldsRef = useRef<Set<string>>(new Set())

  // Refs for debouncing and preventing infinite loops
  const inferenceRunningRef = useRef(false)
  const inferenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const existingInferredRef = useRef<Partial<UserProfile>>({})

  const runInference = useCallback(() => {
    // Clear any pending inference runs
    if (inferenceTimeoutRef.current) {
      clearTimeout(inferenceTimeoutRef.current)
      inferenceTimeoutRef.current = null
    }

    // Debounce inference runs - batch multiple rapid calls
    inferenceTimeoutRef.current = setTimeout(() => {
      // Prevent infinite loops - if inference is already running, skip
      if (inferenceRunningRef.current) {
        return
      }

      inferenceRunningRef.current = true

      try {
        // Get fresh suppression list
        const suppressedFields = suppression.getSuppressed()

        // Create new InferenceEngine with fresh suppression list
        const engine = new InferenceEngine(
          fieldInferences,
          TEXT_PATTERN_INFERENCES,
          suppressedFields
        )

        // Get current known fields and text
        const cleanedText = editorRef.current?.getTextWithoutPills() || ''
        const knownFields = profileRef.current

        // Use existing inferred fields from ref (for "first inference wins" check)
        // This prevents re-inferring fields that were already inferred
        const currentInferred = existingInferredRef.current

        // Run inference with existing inferred fields to prevent re-inferring
        const inferenceResult = engine.applyInferences(knownFields, cleanedText, currentInferred)

        // CRITICAL: First inference wins - merge new results with existing inferred fields
        const fieldsToRemove = new Set<string>()

        setInferredFields((prevInferred) => {
          const merged: Partial<UserProfile> = { ...prevInferred }

          // Add new inferences only if field doesn't already exist
          for (const [fieldName, value] of Object.entries(inferenceResult.inferred)) {
            if (!(fieldName in merged)) {
              // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
              ;(merged as any)[fieldName] = value
            }
          }

          // Remove fields that are no longer inferred
          for (const fieldName of Object.keys(prevInferred)) {
            // If field is now in knownFields, remove it from inferred
            // UNLESS it came from extraction engine (extraction-inferred fields should
            // remain marked as inferred even if they're in profile, since they're still
            // technically inferred from the extraction, not explicitly provided)
            if (
              knownFields[fieldName as keyof UserProfile] !== undefined &&
              !extractionInferredFieldsRef.current.has(fieldName)
            ) {
              // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
              delete (merged as any)[fieldName]
              fieldsToRemove.add(fieldName)
              continue
            }
            // If field is now suppressed, remove it from inferred
            if (suppressedFields.includes(fieldName)) {
              // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
              delete (merged as any)[fieldName]
              fieldsToRemove.add(fieldName)
              continue
            }
            // If field is no longer in the new inference result, check if it should be removed
            // Only remove if it's not in the new result AND:
            // 1. No text pattern would still infer it, AND
            // 2. No field-to-field inference would still infer it (from knownFields)
            // This prevents flickering when user is typing or when pills are created
            if (!(fieldName in inferenceResult.inferred)) {
              // Check if any text pattern would still infer this field
              // This prevents removing fields while user is still typing the pattern
              let patternStillMatches = false
              for (const pattern of TEXT_PATTERN_INFERENCES) {
                // Reset regex lastIndex to avoid state issues
                pattern.pattern.lastIndex = 0
                if (pattern.pattern.test(cleanedText)) {
                  // Check if this pattern infers the field we're checking
                  for (const inference of pattern.infers) {
                    if (inference.field === fieldName) {
                      patternStillMatches = true
                      break
                    }
                  }
                  if (patternStillMatches) break
                }
              }

              // Check if any field-to-field inference would still infer this field
              // This prevents removing fields inferred from pills when text changes
              let fieldInferenceStillApplies = false
              if (!patternStillMatches) {
                // Check if any known field would infer this field
                for (const [sourceFieldName, sourceFieldValue] of Object.entries(knownFields)) {
                  const sourceMetadata = fieldInferences[sourceFieldName]
                  if (!sourceMetadata) continue

                  for (const rule of sourceMetadata) {
                    if (rule.targetField === fieldName) {
                      // Check if this rule would still infer the field
                      const inferredValue = rule.inferValue(sourceFieldValue)
                      if (inferredValue !== undefined) {
                        fieldInferenceStillApplies = true
                        break
                      }
                    }
                  }
                  if (fieldInferenceStillApplies) break
                }
              }

              // Only remove if no pattern matches AND no field inference still applies
              if (!patternStillMatches && !fieldInferenceStillApplies) {
                // Field was in prevInferred but not in new result and neither pattern
                // nor field inference still applies - user actually removed the source
                // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
                delete (merged as any)[fieldName]
                fieldsToRemove.add(fieldName)
              }
            }
          }

          return merged
        })

        // Update reasons and confidence, and clean up removed fields
        setInferenceReasons((prevReasons) => {
          const merged = { ...prevReasons }
          // Add new reasons
          for (const [fieldName, reason] of Object.entries(inferenceResult.reasons)) {
            merged[fieldName] = reason
          }
          // Remove reasons for fields that were removed
          for (const fieldName of fieldsToRemove) {
            delete merged[fieldName]
          }
          return merged
        })

        setInferenceConfidence((prevConfidence) => {
          const merged = { ...prevConfidence }
          // Add new confidence scores
          for (const [fieldName, conf] of Object.entries(inferenceResult.confidence)) {
            merged[fieldName] = conf
          }
          // Remove confidence scores for fields that were removed
          for (const fieldName of fieldsToRemove) {
            delete merged[fieldName]
          }
          return merged
        })
      } finally {
        inferenceRunningRef.current = false
      }
    }, INFERENCE_DEBOUNCE_MS)
  }, [fieldInferences, suppression, editorRef, profileRef])

  const clearInference = useCallback(() => {
    // Clear timeout if pending
    if (inferenceTimeoutRef.current) {
      clearTimeout(inferenceTimeoutRef.current)
      inferenceTimeoutRef.current = null
    }

    // Reset state
    setInferredFields({})
    setInferenceReasons({})
    setInferenceConfidence({})

    // Reset refs
    existingInferredRef.current = {}
    extractionInferredFieldsRef.current.clear()
    inferenceRunningRef.current = false
  }, [])

  // Update ref when inferredFields changes (for "first inference wins" check)
  useEffect(() => {
    existingInferredRef.current = inferredFields
  }, [inferredFields])

  const updateInferredField = useCallback((fieldName: string, value: unknown) => {
    setInferredFields((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }, [])

  /**
   * Merge inferred fields from centralized extraction engine
   * Used when extraction engine returns inferred fields (e.g., from k:2 → householdSize)
   */
  const mergeInferredFields = useCallback((newInferred: Partial<UserProfile>) => {
    // Track which fields came from extraction engine (so they're not removed when in profile)
    for (const fieldName of Object.keys(newInferred)) {
      extractionInferredFieldsRef.current.add(fieldName)
    }

    setInferredFields((prev) => ({
      ...prev,
      ...newInferred,
    }))
    // Add reasons for each new inferred field
    const newReasons: Record<string, string> = {}
    for (const fieldName of Object.keys(newInferred)) {
      newReasons[fieldName] = 'Inferred from extracted fields'
    }
    setInferenceReasons((prev) => ({
      ...prev,
      ...newReasons,
    }))
    // Set confidence to high (85%) for extraction-based inferences
    const newConfidence: Record<string, number> = {}
    for (const fieldName of Object.keys(newInferred)) {
      newConfidence[fieldName] = 0.85
    }
    setInferenceConfidence((prev) => ({
      ...prev,
      ...newConfidence,
    }))
  }, [])

  return {
    inferredFields,
    inferenceReasons,
    inferenceConfidence,
    runInference,
    clearInference,
    updateInferredField,
    mergeInferredFields,
    inferenceTimeoutRef,
    existingInferredRef,
  }
}
