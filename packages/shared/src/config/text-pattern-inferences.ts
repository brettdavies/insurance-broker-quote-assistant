/**
 * Text Pattern Inferences Configuration
 *
 * Defines pattern-based inferences that derive field values from user input text.
 * These patterns operate independently of field values and are used by the
 * InferenceEngine to identify implicit information in conversational input.
 *
 * **Architecture Context:**
 * Part of the "known vs inferred pills" architecture (Epic 4: Field Extraction Bulletproofing).
 * Improves field extraction accuracy from ~60% to ~85%+ by separating:
 * - **Known fields**: Extracted directly from explicit user input (high confidence)
 * - **Inferred fields**: Derived from text patterns (shown separately, dismissible by broker)
 *
 * **Usage Example:**
 * ```typescript
 * // User input: "I live alone in California"
 * // Pattern match: /\blives?\s+alone\b/i
 * // Inference: { field: 'householdSize', value: 1, confidence: 'medium' }
 * ```
 *
 * **Capture Group References:**
 * Use "$N" syntax to reference regex capture groups in the value field.
 * The InferenceEngine will replace "$1", "$2", etc. with matched text.
 *
 * ```typescript
 * // Pattern: /\bfamily\s+of\s+(\d+)\b/i
 * // User input: "family of 4"
 * // Capture group 1: "4"
 * // Value: "$1" → Resolved to: 4
 * ```
 *
 * **Confidence Levels:**
 * - `high`: Direct, unambiguous pattern (e.g., "family of 4" → householdSize: 4)
 * - `medium`: Reasonable inference with context (e.g., "lives alone" → householdSize: 1)
 * - `low`: Weak signal, requires validation (e.g., "multiple cars" → vehicles: 2+)
 *
 * @see packages/shared/src/schemas/unified-field-metadata.ts - Field metadata with infers property
 * @see docs/architecture/field-extraction-bulletproofing.md - Architecture documentation
 */

export interface TextPatternInference {
  /**
   * Regular expression pattern to match in user input text.
   * Use case-insensitive flag (/i) for text patterns.
   * Use capture groups to extract dynamic values (e.g., numbers, names).
   *
   * @example /\blives?\s+alone\b/i - Matches "lives alone" or "live alone"
   * @example /\bfamily\s+of\s+(\d+)\b/i - Matches "family of 4" (capture group 1 = "4")
   */
  pattern: RegExp

  /**
   * Array of field inferences to apply when pattern matches.
   * Multiple fields can be inferred from a single pattern.
   */
  infers: Array<{
    /**
     * Target field name to infer (must match field name in UserProfile or PolicySummary).
     * @example 'householdSize', 'cleanRecord3Yr', 'ownsHome'
     */
    field: string

    /**
     * Value to infer when pattern matches.
     * - Use literal values for static inferences: true, false, 1, "auto"
     * - Use "$N" syntax to reference capture groups: "$1", "$2", etc.
     *
     * @example 1 - Literal value
     * @example "$1" - Capture group 1 value
     */
    // biome-ignore lint/suspicious/noExplicitAny: Value can be any type (string, number, boolean) or capture group reference
    value: any

    /**
     * Confidence level for this inference.
     * Affects UI display (high = bold, medium = normal, low = italic).
     */
    confidence: 'high' | 'medium' | 'low'

    /**
     * Human-readable explanation of why this inference is made.
     * Shown in UI tooltip to help broker understand inference logic.
     *
     * @example "Pattern 'lives alone' strongly suggests single-person household"
     */
    reasoning: string
  }>
}

/**
 * POC Text Pattern Inferences (3-5 patterns)
 *
 * Keep this list small for POC phase. Focus on proving the architecture works,
 * not comprehensive coverage. Add more patterns in production based on real usage patterns.
 *
 * **Pattern Selection Criteria:**
 * 1. High-value: Improves extraction accuracy for common missing fields
 * 2. Unambiguous: Clear semantic meaning with minimal false positives
 * 3. Testable: Easy to verify with unit tests
 */
export const TEXT_PATTERN_INFERENCES: TextPatternInference[] = [
  {
    // Pattern: "lives alone" or "live alone"
    pattern: /\blives?\s+alone\b/i,
    infers: [
      {
        field: 'householdSize',
        value: 1,
        confidence: 'medium',
        reasoning: "Pattern 'lives alone' strongly suggests single-person household",
      },
    ],
  },
  {
    // Pattern: "family of N" (capture group extracts number)
    // Matches: "family of 4", "family of 2", etc.
    pattern: /\bfamily\s+of\s+(\d+)\b/i,
    infers: [
      {
        field: 'householdSize',
        value: '$1', // Capture group 1 will be replaced with matched number
        confidence: 'high',
        reasoning: "Pattern 'family of N' explicitly states household size",
      },
    ],
  },
  {
    // Pattern: "clean record" or "clean driving record" (no number specified)
    pattern: /\bclean\s+(?:driving\s+)?record\b/i,
    infers: [
      {
        field: 'cleanRecord3Yr',
        value: true,
        confidence: 'medium',
        reasoning: "Pattern 'clean record' suggests no violations, defaulting to 3-year timeframe",
      },
    ],
  },
  {
    // Pattern: "3-4 years clean" - Infers 3-year clean record
    // Note: Story 4.2 may combine this with 5+ year pattern using conditional logic
    pattern: /\b[3-4]\s+years?\s+clean(?:\s+record)?\b/i,
    infers: [
      {
        field: 'cleanRecord3Yr',
        value: true,
        confidence: 'high',
        reasoning: "Pattern '3-4 years clean' explicitly states clean record duration",
      },
    ],
  },
  {
    // Pattern: "5+ years clean" - Infers 5-year clean record
    // Note: Story 4.2 may combine this with 3-4 year pattern using conditional logic
    pattern: /\b(?:5|[6-9]|\d{2,})\s+years?\s+clean(?:\s+record)?\b/i,
    infers: [
      {
        field: 'cleanRecord5Yr',
        value: true,
        confidence: 'high',
        reasoning: "Pattern '5+ years clean' explicitly states clean record duration",
      },
    ],
  },
  {
    // Pattern: "own a home" or "homeowner"
    pattern: /\b(?:own(?:s|ed)?\s+(?:a|my|the)\s+home|homeowner)\b/i,
    infers: [
      {
        field: 'ownsHome',
        value: true,
        confidence: 'high',
        reasoning: "Pattern 'own a home' or 'homeowner' explicitly states home ownership",
      },
    ],
  },
]
