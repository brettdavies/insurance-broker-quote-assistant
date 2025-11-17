/**
 * LLM Configuration Constants
 *
 * Centralized constants for LLM provider configuration.
 * Single source of truth for model names, temperatures, and other LLM settings.
 */

/**
 * Default Gemini model name
 */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite'

/**
 * Default temperature for extraction tasks (deterministic behavior)
 */
export const DEFAULT_EXTRACTION_TEMPERATURE = 0.1

/**
 * Default temperature for pitch generation (more creative)
 */
export const DEFAULT_PITCH_TEMPERATURE = 0.3

/**
 * Confidence threshold for high-confidence fields (known fields)
 * Fields with confidence >= 0.85 are treated as "known" (broker-curated quality)
 */
export const CONFIDENCE_THRESHOLD_HIGH = 0.85

/**
 * Confidence threshold for medium-confidence fields
 * Fields with confidence >= 0.70 are treated as medium confidence
 */
export const CONFIDENCE_THRESHOLD_MEDIUM = 0.7
