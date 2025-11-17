/**
 * Centralized Extraction Engine
 *
 * Single source of truth for field extraction logic shared between frontend and backend.
 *
 * This engine:
 * 1. Runs deterministic extraction (key-value syntax + natural language patterns)
 * 2. Runs inference engine to derive additional fields
 * 3. Builds UserProfile object from extracted fields
 * 4. Replaces extracted text with pill markers [[key:value]]
 * 5. Returns processed text + userProfile + extracted fields
 *
 * CRITICAL: Frontend and backend MUST use this engine to ensure identical extraction behavior.
 *
 * Frontend usage:
 *   - Call on every delimiter (space, comma, period, enter) or paste
 *   - Parse processedText to create Lexical pills
 *   - Update component state with userProfile
 *
 * Backend usage:
 *   - Call before LLM extraction
 *   - Remove pill markers before sending to LLM
 *   - Use userProfile as base, merge with LLM results
 */

import { PILL_MARKER_END, PILL_MARKER_START } from '../constants/delimiters'
import type { UserProfile } from '../schemas/user-profile'
import {
  runDeterministicExtraction,
  runInferenceEngine,
} from '../utils/field-extraction-orchestrator'
import type { NormalizedField } from '../utils/field-normalization/types'

export interface ExtractionResult {
  /** Text with extracted portions replaced by [[key:value]] pill markers */
  processedText: string
  /** UserProfile object built from extracted fields */
  userProfile: UserProfile
  /** All extracted fields (deterministic + inferred) */
  extractedFields: NormalizedField[]
  /** Deterministic fields only (key-value + natural language patterns) */
  deterministicFields: NormalizedField[]
  /** Inferred fields only (derived from known facts) */
  inferredFields: NormalizedField[]
}

/**
 * Extract fields from text and replace with pill markers
 *
 * This is the centralized extraction function used by both FE and BE.
 *
 * @param text - Raw input text from user
 * @returns Extraction result with processedText, userProfile, and extractedFields
 *
 * @example
 * Input: "CA auto. Age 25. k:2"
 * Output: {
 *   processedText: "[[state:CA]] [[product:auto]]. [[age:25]]. [[vehicles:2]]",
 *   userProfile: { state: "CA", productType: "auto", age: 25, vehicles: 2 },
 *   extractedFields: [...]
 * }
 */
export function extractFieldsAndReplace(
  text: string,
  suppressedFields?: string[],
  pillFields?: Array<{ fieldName: string; value: unknown }>
): ExtractionResult {
  console.log('[extraction-engine] Input text:', text)
  console.log(
    '[extraction-engine] Pill fields:',
    pillFields?.map((f) => `${f.fieldName}:${f.value}`).join(', ') || 'none'
  )

  // Step 1: Run deterministic extraction (key-value + natural language)
  const { fields: deterministicFields } = runDeterministicExtraction(text)
  console.log(
    '[extraction-engine] Deterministic fields:',
    deterministicFields.map((f) => `${f.fieldName}:${f.value}`).join(', ')
  )

  // Step 1.5: Merge pill fields with deterministic fields
  // Pill fields represent known fields from previous extractions (already converted to pills)
  // They should be included in known fields for inference, but not re-extracted
  const allKnownFields = [...deterministicFields]
  if (pillFields && pillFields.length > 0) {
    for (const pillField of pillFields) {
      // Only add if not already in deterministic fields (avoid duplicates)
      if (!deterministicFields.some((f) => f.fieldName === pillField.fieldName)) {
        allKnownFields.push({
          fieldName: pillField.fieldName,
          value: pillField.value as string | number | boolean,
          originalText: `[from pill:${pillField.fieldName}:${pillField.value}]`,
          startIndex: 0,
          endIndex: 0,
        })
      }
    }
  }
  console.log(
    '[extraction-engine] All known fields (deterministic + pills):',
    allKnownFields.map((f) => `${f.fieldName}:${f.value}`).join(', ')
  )

  // Step 2: Run inference engine (pass all known fields including pills, text and suppressedFields for full inference)
  const inferredFields = runInferenceEngine(allKnownFields, text, suppressedFields || [])
  console.log(
    '[extraction-engine] Inferred fields:',
    inferredFields.map((f) => `${f.fieldName}:${f.value}`).join(', ')
  )

  // Step 3: Build UserProfile with proper structure
  // Known fields go in main object, inferred fields go in _inferred object
  // Use allKnownFields (deterministic + pills) for building the profile
  const knownProfile = buildUserProfile(allKnownFields)
  const inferredProfile: Record<string, unknown> = {}
  for (const field of inferredFields) {
    // biome-ignore lint/suspicious/noExplicitAny: Inferred values can be various types
    inferredProfile[field.fieldName] = field.value as any
  }
  console.log('[extraction-engine] Known profile:', Object.keys(knownProfile).join(', '))
  console.log('[extraction-engine] Inferred profile:', Object.keys(inferredProfile).join(', '))

  // Step 4: Build complete userProfile with metadata
  const userProfile: UserProfile = {
    ...knownProfile,
    _inferred: Object.keys(inferredProfile).length > 0 ? inferredProfile : undefined,
    _suppressed: suppressedFields && suppressedFields.length > 0 ? suppressedFields : undefined,
  }
  console.log('[extraction-engine] Final userProfile._inferred:', userProfile._inferred)

  // Step 5: CRITICAL - Remove suppressed fields from known and inferred
  if (suppressedFields && suppressedFields.length > 0) {
    // Remove from main userProfile (known fields)
    for (const fieldName of suppressedFields) {
      // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
      delete (userProfile as any)[fieldName]
    }

    // Remove from _inferred object
    if (userProfile._inferred) {
      for (const fieldName of suppressedFields) {
        delete userProfile._inferred[fieldName]
      }
      // Clean up empty _inferred object
      if (Object.keys(userProfile._inferred).length === 0) {
        userProfile._inferred = undefined
      }
    }
  }

  // Step 6: Merge pill fields with deterministic fields for deduplication
  // Pill fields represent existing pills in the editor. If a new field in the text
  // has the same normalized field name, we should deduplicate (keep the new one from text).
  const allFieldsForDeduplication = [...deterministicFields]
  if (pillFields && pillFields.length > 0) {
    for (const pillField of pillFields) {
      // Add pill fields as NormalizedField objects for deduplication
      // Use a special originalText marker so we can identify them later
      allFieldsForDeduplication.push({
        fieldName: pillField.fieldName,
        value: pillField.value as string | number | boolean,
        originalText: `[from pill:${pillField.fieldName}:${pillField.value}]`,
        startIndex: -1, // Negative index indicates it's from a pill (not in current text)
        endIndex: -1,
      })
    }
  }

  // Step 7: Deduplicate all fields (deterministic + pills), keeping the last occurrence
  // This ensures that "kids:2" (from pill) and "k:3" (from text) result in a single "kids:3" pill
  // Fields from text (startIndex >= 0) take precedence over fields from pills (startIndex < 0)
  const deduplicatedFields = deduplicateFields(allFieldsForDeduplication)
  console.log(
    '[extraction-engine] Deduplicated fields:',
    deduplicatedFields.map((f) => `${f.fieldName}:${f.value}`).join(', ')
  )

  // Step 8: Build processedText that includes ALL deduplicated fields (from text AND pills)
  // This ensures processedText is the single source of truth for what pills should exist
  // Fields from text will be replaced with pill markers in the text
  // Fields from pills will be represented as pill markers appended to the text
  const fieldsFromText = deduplicatedFields.filter((f) => (f.startIndex ?? 0) >= 0)
  const fieldsFromPills = deduplicatedFields.filter((f) => (f.startIndex ?? 0) < 0)

  console.log(
    '[extraction-engine] Fields from text (to replace in text):',
    fieldsFromText.map((f) => `${f.fieldName}:${f.value}`).join(', ')
  )
  console.log(
    '[extraction-engine] Fields from pills (to keep):',
    fieldsFromPills.map((f) => `${f.fieldName}:${f.value}`).join(', ')
  )

  // Step 9: Replace extracted text with pill markers (only fields from current text)
  const allFields = [...fieldsFromText, ...inferredFields]
  let processedText = replaceExtractedText(text, allFields, deterministicFields)

  // Step 10: Append pill markers for fields from existing pills that are being kept
  // This ensures processedText contains ALL pills that should exist (after deduplication)
  if (fieldsFromPills.length > 0) {
    const pillMarkers = fieldsFromPills.map(
      (f) => `${PILL_MARKER_START}${f.fieldName}:${f.value}${PILL_MARKER_END}`
    )
    // Add a space before pill markers if processedText is not empty
    if (processedText.trim()) {
      processedText += ` ${pillMarkers.join(' ')}`
    } else {
      processedText = pillMarkers.join(' ')
    }
  }

  console.log('[extraction-engine] Final processedText:', processedText)

  return {
    processedText,
    userProfile,
    extractedFields: allFields,
    deterministicFields: fieldsFromText, // Return only fields from current text (after deduplication)
    inferredFields,
  }
}

/**
 * Build UserProfile object from extracted NormalizedFields
 *
 * Converts NormalizedField[] to UserProfile by mapping fieldName → value
 * Handles type coercion (string → number, string → boolean, etc.)
 *
 * @param fields - Extracted normalized fields
 * @returns UserProfile object
 */
function buildUserProfile(fields: NormalizedField[]): UserProfile {
  const profile: Partial<UserProfile> = {}

  for (const field of fields) {
    const { fieldName, value } = field

    // Special handling for nested objects (existingPolicies)
    if (fieldName === 'existingPolicies' && Array.isArray(value)) {
      profile.existingPolicies = value
      continue
    }

    // Assign value to profile (type coercion handled by NormalizedField)
    // biome-ignore lint/suspicious/noExplicitAny: UserProfile values can be various types
    profile[fieldName as keyof UserProfile] = value as any
  }

  return profile as UserProfile
}

/**
 * Deduplicate fields by normalized field name, keeping the last occurrence
 *
 * When multiple fields have the same normalized field name (e.g., "kids:2" and "k:3" both normalize to "kids"),
 * we keep only the last occurrence (by position in text). This ensures that typing "kids:2 k:3" results in
 * a single "kids:3" pill.
 *
 * @param fields - Array of extracted fields
 * @returns Deduplicated array with only the last occurrence of each field name
 */
function deduplicateFields(fields: NormalizedField[]): NormalizedField[] {
  // Map of normalized field name to the field with the latest position
  // Fields from text (startIndex >= 0) take precedence over fields from pills (startIndex < 0)
  const fieldMap = new Map<string, NormalizedField>()

  for (const field of fields) {
    const existing = fieldMap.get(field.fieldName)
    const fieldStartIndex = field.startIndex ?? 0
    const existingStartIndex = existing?.startIndex ?? 0

    // Priority rules:
    // 1. Fields from text (startIndex >= 0) always beat fields from pills (startIndex < 0)
    // 2. Among fields from text, keep the one with the latest position
    // 3. Among fields from pills, keep the one with the latest position (though this shouldn't matter)
    if (!existing) {
      fieldMap.set(field.fieldName, field)
    } else if (fieldStartIndex >= 0 && existingStartIndex < 0) {
      // New field is from text, existing is from pill - prefer text
      fieldMap.set(field.fieldName, field)
    } else if (fieldStartIndex < 0 && existingStartIndex >= 0) {
      // New field is from pill, existing is from text - keep text
      // Do nothing, keep existing
    } else if (fieldStartIndex > existingStartIndex) {
      // Both from same source (text or pills), prefer later position
      fieldMap.set(field.fieldName, field)
    }
  }

  // Return fields in original order, but only the last occurrence of each
  const result: NormalizedField[] = []
  const seen = new Set<string>()

  // Process fields in reverse order to keep the last occurrence
  for (let i = fields.length - 1; i >= 0; i--) {
    const field = fields[i]
    if (field && !seen.has(field.fieldName)) {
      // Only add if it matches what we decided to keep in the map
      const keptField = fieldMap.get(field.fieldName)
      if (keptField === field) {
        result.unshift(field)
        seen.add(field.fieldName)
      }
    }
  }

  return result
}

/**
 * Replace extracted text spans with pill markers
 *
 * Example: "CA auto" → "[[state:CA]] [[product:auto]]"
 *
 * Algorithm:
 * 1. Sort fields by position (descending) to avoid offset issues
 * 2. For each field, replace originalText with [[fieldName:value]]
 * 3. Track position offsets as we replace
 *
 * @param text - Original text
 * @param fields - Extracted fields (only those with originalText/position)
 * @returns Text with pill markers
 */
function replaceExtractedText(
  text: string,
  fields: NormalizedField[],
  allDeterministicFields?: NormalizedField[]
): string {
  let result = text

  // Filter fields that have position info (deterministic extractions only)
  // Inferred fields have originalText starting with "(inferred" or "[inferred", so skip them
  const extractedFields = fields.filter(
    (f) =>
      f.originalText &&
      !f.originalText.startsWith('(inferred') &&
      !f.originalText.startsWith('[inferred')
  )

  // If we have all deterministic fields, we need to remove earlier occurrences
  // that were deduplicated. For each field in the deduplicated list, find all
  // occurrences in the original text and remove the earlier ones.
  if (allDeterministicFields) {
    // Create a set of fields to keep (the deduplicated ones)
    const fieldsToKeep = new Set<string>()
    for (const field of extractedFields) {
      if (field.startIndex !== undefined && field.endIndex !== undefined) {
        fieldsToKeep.add(`${field.startIndex}:${field.endIndex}`)
      }
    }

    // Find all fields to remove (earlier occurrences of deduplicated fields)
    const fieldsToRemove: NormalizedField[] = []
    const fieldsByNormalizedName = new Map<string, NormalizedField[]>()

    for (const field of allDeterministicFields) {
      if (!fieldsByNormalizedName.has(field.fieldName)) {
        fieldsByNormalizedName.set(field.fieldName, [])
      }
      fieldsByNormalizedName.get(field.fieldName)?.push(field)
    }

    // For each deduplicated field, find and mark earlier occurrences for removal
    for (const deduplicatedField of extractedFields) {
      const allOccurrences = fieldsByNormalizedName.get(deduplicatedField.fieldName) || []
      // Sort by position to find earlier occurrences
      const sorted = allOccurrences.sort((a, b) => (a.startIndex ?? 0) - (b.startIndex ?? 0))

      // Find the index of the deduplicated field
      const deduplicatedIndex = sorted.findIndex(
        (f) =>
          f.startIndex === deduplicatedField.startIndex && f.endIndex === deduplicatedField.endIndex
      )

      // Add all earlier occurrences to removal list (if they're not already being kept)
      if (deduplicatedIndex > 0) {
        for (let i = 0; i < deduplicatedIndex; i++) {
          const field = sorted[i]
          if (field && field.startIndex !== undefined && field.endIndex !== undefined) {
            const key = `${field.startIndex}:${field.endIndex}`
            if (!fieldsToKeep.has(key)) {
              fieldsToRemove.push(field)
            }
          }
        }
      }
    }

    // Remove earlier occurrences from text (process in reverse order to maintain indices)
    const sortedToRemove = fieldsToRemove.sort((a, b) => (b.startIndex ?? 0) - (a.startIndex ?? 0))
    for (const field of sortedToRemove) {
      if (field.startIndex !== undefined && field.endIndex !== undefined) {
        result = result.substring(0, field.startIndex) + result.substring(field.endIndex)

        // Adjust indices of remaining fields that come after this removal
        const removedLength = field.endIndex - field.startIndex
        for (const remainingField of extractedFields) {
          if (
            remainingField.startIndex !== undefined &&
            remainingField.endIndex !== undefined &&
            remainingField.startIndex > field.startIndex
          ) {
            remainingField.startIndex -= removedLength
            remainingField.endIndex -= removedLength
          }
        }
      }
    }
  }

  // Sort by startIndex descending to avoid offset issues
  // (replace from end to beginning so earlier positions don't shift)
  const sorted = extractedFields.sort((a, b) => {
    const aStart = a.startIndex ?? 0
    const bStart = b.startIndex ?? 0
    return bStart - aStart
  })

  // Replace each extracted span with pill marker
  for (const field of sorted) {
    const { fieldName, value, startIndex, endIndex } = field

    // Skip if missing position info
    if (startIndex === undefined || endIndex === undefined) {
      continue
    }

    // Build pill marker with resolved field name: [[fieldName:value]]
    // This ensures aliases are resolved (e.g., "k:2" becomes "[[kids:2]]")
    const pillMarker = `${PILL_MARKER_START}${fieldName}:${value}${PILL_MARKER_END}`

    // Replace text at position
    result = result.substring(0, startIndex) + pillMarker + result.substring(endIndex)
  }

  return result
}

/**
 * Remove pill markers from text
 *
 * Used by backend to clean text before sending to LLM.
 *
 * @param text - Text with pill markers
 * @returns Clean text without markers
 *
 * @example
 * Input: "[[state:CA]] [[product:auto]] Age 25"
 * Output: " Age 25"
 */
export function removePillMarkers(text: string): string {
  return text.replace(/\[\[[^\]]+\]\]/g, '').trim()
}
