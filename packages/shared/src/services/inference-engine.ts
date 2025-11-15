import type { TextPatternInference } from '../config/text-pattern-inferences'
import type { InferenceRule } from '../schemas/unified-field-metadata'
import type { UserProfile } from '../schemas/user-profile'

/**
 * Inference Result
 *
 * Result of applying inference rules to known fields and input text.
 * Contains inferred field values, reasoning, and confidence scores.
 *
 * **Architecture Context:**
 * Part of the "known vs inferred pills" architecture (Epic 4: Field Extraction Bulletproofing).
 * Enables backend to distinguish between explicit extractions (known) and inferred values (inferred).
 *
 * @see packages/shared/src/services/inference-engine.ts - InferenceEngine class
 * @see docs/architecture/field-extraction-bulletproofing.md - Architecture documentation
 */
export interface InferenceResult {
  /**
   * Inferred field values derived from known fields and text patterns.
   * Fields already known or suppressed are not included in this object.
   */
  inferred: Partial<UserProfile>

  /**
   * Human-readable reasoning for each inferred field.
   * Maps field name to reasoning string from inference rule.
   *
   * @example { ownsHome: 'Renters insurance implies tenant status' }
   */
  reasons: Record<string, string>

  /**
   * Confidence scores for each inferred field (0-1 scale).
   * Maps field name to numeric confidence score.
   *
   * **Confidence Mapping:**
   * - 0.85 (high): Direct, unambiguous inference
   * - 0.70 (medium): Reasonable inference with context
   * - 0.50 (low): Weak signal, requires validation
   *
   * @example { ownsHome: 0.85, householdSize: 0.70 }
   */
  confidence: Record<string, number>
}

/**
 * Inference Engine
 *
 * Applies deterministic inference rules to known fields and text patterns.
 * Enables backend to derive additional fields while respecting user's suppression list.
 *
 * **Architecture Context:**
 * Part of the "known vs inferred pills" architecture (Epic 4: Field Extraction Bulletproofing).
 * Improves field extraction accuracy from ~60% to ~85%+ by separating known vs inferred fields.
 *
 * **Inference Priority:**
 * 1. Field-to-field inferences run first (higher confidence, based on structured data)
 * 2. Text pattern inferences run second (lower confidence, based on natural language)
 * 3. Already-inferred fields from step 1 are not overwritten by step 2
 *
 * **Suppression List:**
 * User can dismiss inferred fields, which adds them to the suppression list.
 * InferenceEngine skips generating inferences for suppressed fields.
 *
 * @example
 * ```typescript
 * const engine = new InferenceEngine(fieldInferences, textPatternInferences, suppressedFields)
 * const result = engine.applyInferences(knownFields, inputText)
 * // result.inferred contains derived field values
 * // result.reasons contains human-readable explanations
 * // result.confidence contains numeric confidence scores (0-1)
 * ```
 *
 * @see packages/shared/src/config/text-pattern-inferences.ts - Text pattern config
 * @see packages/shared/src/schemas/unified-field-metadata.ts - Field metadata with infers property
 * @see docs/architecture/field-extraction-bulletproofing.md - Architecture documentation
 */
export class InferenceEngine {
  /**
   * Create InferenceEngine
   *
   * @param fieldInferences - Field-to-field inference rules from unified-field-metadata
   * @param textPatternInferences - Text pattern inferences from config
   * @param suppressedFields - Fields user has explicitly dismissed (won't be inferred)
   */
  constructor(
    private fieldInferences: Record<string, InferenceRule[]>,
    private textPatternInferences: TextPatternInference[],
    private suppressedFields: string[]
  ) {}

  /**
   * Apply all inference rules to known fields and input text
   *
   * **Process:**
   * 1. Apply field-to-field inferences from known fields
   * 2. Apply text pattern inferences from input text
   * 3. Skip fields that are already known, inferred, or suppressed
   *
   * @param knownFields - Fields extracted from user input (high confidence)
   * @param inputText - User's conversational input text
   * @param existingInferred - Optional existing inferred fields (for "first inference wins" behavior)
   * @returns InferenceResult with inferred fields, reasons, and confidence scores
   *
   * @example
   * ```typescript
   * const knownFields = { productType: 'renters', age: 28 }
   * const inputText = 'FL renters. Age 28. Lives alone.'
   * const result = engine.applyInferences(knownFields, inputText)
   * // result.inferred = { ownsHome: false, householdSize: 1 }
   * ```
   */
  applyInferences(
    knownFields: Partial<UserProfile>,
    inputText: string,
    existingInferred?: Partial<UserProfile>
  ): InferenceResult {
    const inferred: Partial<UserProfile> = {}
    const reasons: Record<string, string> = {}
    const confidence: Record<string, number> = {}

    // Step 1: Field-to-field inferences (from known fields)
    for (const [fieldName, fieldValue] of Object.entries(knownFields)) {
      const metadata = this.fieldInferences[fieldName]
      if (!metadata) continue

      for (const rule of metadata) {
        // Skip if target field already known, already inferred, or suppressed
        // CRITICAL: First inference wins - if target field already exists in inferred,
        // do NOT update it when source field changes (e.g., kids:2 → kids:3)
        if (knownFields[rule.targetField as keyof UserProfile] !== undefined) {
          continue
        }
        // Check if already in current inference run
        // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
        if ((inferred as any)[rule.targetField] !== undefined) {
          continue
        }
        // Check if already in existing inferred fields (first inference wins)
        if (existingInferred && rule.targetField in existingInferred) {
          continue
        }
        if (this.suppressedFields.includes(rule.targetField)) {
          continue
        }

        const inferredValue = rule.inferValue(fieldValue)
        if (inferredValue !== undefined) {
          // Debug logging removed - callers should log inference events if needed
          // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
          ;(inferred as any)[rule.targetField] = inferredValue
          reasons[rule.targetField] = rule.reasoning
          confidence[rule.targetField] = this.confidenceToNumber(rule.confidence)
        }
      }
    }

    // Step 2: Text pattern inferences (from input text)
    for (const pattern of this.textPatternInferences) {
      const match = inputText.match(pattern.pattern)
      if (!match) continue

      for (const inference of pattern.infers) {
        // Skip if field already known or suppressed
        if (knownFields[inference.field as keyof UserProfile] !== undefined) {
          continue
        }
        // Skip if already inferred from field-to-field (step 1 takes precedence)
        // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
        if ((inferred as any)[inference.field] !== undefined) {
          continue
        }
        // Check if already in existing inferred fields (first inference wins)
        if (existingInferred && inference.field in existingInferred) {
          continue
        }
        if (this.suppressedFields.includes(inference.field)) {
          continue
        }

        // Handle capture group references (e.g., "$1" means capture group 1)
        const value = this.replaceCaptureGroups(inference.value, match)

        if (value !== undefined) {
          // Debug logging removed - callers should log inference events if needed
          // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
          ;(inferred as any)[inference.field] = value
          reasons[inference.field] = inference.reasoning
          confidence[inference.field] = this.confidenceToNumber(inference.confidence)
        }
      }
    }

    return { inferred, reasons, confidence }
  }

  /**
   * Convert confidence level to numeric score
   *
   * Maps confidence levels to numeric scores for API response.
   * Scores are aligned with LLM upgrade threshold (≥85% allows LLM to upgrade inferred → known).
   *
   * @param level - Confidence level from inference rule
   * @returns Numeric confidence score (0-1 scale)
   *
   * **Mapping:**
   * - 'high' → 0.85 (≥85% threshold allows LLM to upgrade to known field)
   * - 'medium' → 0.70
   * - 'low' → 0.50
   */
  private confidenceToNumber(level: 'high' | 'medium' | 'low'): number {
    switch (level) {
      case 'high':
        return 0.85
      case 'medium':
        return 0.7
      case 'low':
        return 0.5
    }
  }

  /**
   * Replace capture group references in inference value
   *
   * Handles capture group references like "$1", "$2", etc. from regex match.
   * If value is not a string or doesn't start with "$", returns as-is.
   * If capture group index is invalid, returns undefined.
   *
   * @param value - Inference value (may contain capture group reference)
   * @param match - Regex match array with capture groups
   * @returns Processed value with capture groups replaced
   *
   * @example
   * ```typescript
   * const match = 'family of 4'.match(/family of (\d+)/)
   * replaceCaptureGroups('$1', match) // Returns '4'
   * replaceCaptureGroups(true, match) // Returns true (no replacement)
   * ```
   */
  // biome-ignore lint/suspicious/noExplicitAny: Value can be any type (string, number, boolean) or capture group reference
  private replaceCaptureGroups(value: any, match: RegExpMatchArray): any {
    // Only process string values starting with "$"
    if (typeof value !== 'string' || !value.startsWith('$')) {
      return value
    }

    // Extract capture group index (e.g., "$1" → 1)
    const captureGroupIndex = Number.parseInt(value.substring(1), 10)

    // Validate capture group index
    if (Number.isNaN(captureGroupIndex) || captureGroupIndex >= match.length) {
      // Invalid capture group - return undefined (no inference)
      return undefined
    }

    // Return capture group value
    const capturedValue = match[captureGroupIndex]

    // Convert numeric strings to numbers
    if (capturedValue && /^\d+$/.test(capturedValue)) {
      return Number.parseInt(capturedValue, 10)
    }

    return capturedValue
  }
}
