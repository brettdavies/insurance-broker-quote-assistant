import type { TextPatternInference } from '../config/text-pattern-inferences'
import type { InferenceRule } from '../schemas/unified-field-metadata'
import type { UserProfile } from '../schemas/user-profile'
import { confidenceToNumber } from './inference-engine/confidence-converter'
import { replaceCaptureGroups } from './inference-engine/capture-group-replacer'

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
  applyInferences(knownFields: Partial<UserProfile>, inputText: string): InferenceResult {
    const inferred: Partial<UserProfile> = {}
    const reasons: Record<string, string> = {}
    const confidence: Record<string, number> = {}

    // Step 1: Field-to-field inferences (from known fields)
    for (const [fieldName, fieldValue] of Object.entries(knownFields)) {
      const metadata = this.fieldInferences[fieldName]
      if (!metadata) continue

      for (const rule of metadata) {
        // Skip if target field already known or suppressed
        if (knownFields[rule.targetField as keyof UserProfile] !== undefined) continue
        if (this.suppressedFields.includes(rule.targetField)) continue

        const inferredValue = rule.inferValue(fieldValue)
        if (inferredValue !== undefined) {
          // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
          ;(inferred as any)[rule.targetField] = inferredValue
          reasons[rule.targetField] = rule.reasoning
          confidence[rule.targetField] = confidenceToNumber(rule.confidence)
        }
      }
    }

    // Step 2: Text pattern inferences (from input text)
    for (const pattern of this.textPatternInferences) {
      const match = inputText.match(pattern.pattern)
      if (!match) continue

      for (const inference of pattern.infers) {
        // Skip if field already known or suppressed
        if (knownFields[inference.field as keyof UserProfile] !== undefined) continue
        // Skip if already inferred from field-to-field (step 1 takes precedence)
        // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
        if ((inferred as any)[inference.field] !== undefined) continue
        if (this.suppressedFields.includes(inference.field)) continue

        // Handle capture group references (e.g., "$1" means capture group 1)
        const value = replaceCaptureGroups(inference.value, match)

        // biome-ignore lint/suspicious/noExplicitAny: UserProfile has dynamic field types
        ;(inferred as any)[inference.field] = value
        reasons[inference.field] = inference.reasoning
        confidence[inference.field] = confidenceToNumber(inference.confidence)
      }
    }

    return { inferred, reasons, confidence }
  }

}
