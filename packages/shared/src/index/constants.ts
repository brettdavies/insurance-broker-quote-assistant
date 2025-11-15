/**
 * Constants Exports
 *
 * All constant exports from the shared package.
 */

// Export file upload constants
export {
  MAX_FILE_SIZE,
  ACCEPTED_MIME_TYPES,
  ACCEPTED_EXTENSIONS,
  FILE_TYPE_DESCRIPTIONS,
  isAcceptedFileType,
  isFileSizeValid,
  formatFileSize,
} from '../constants/file-upload'

// Export LLM configuration constants
export {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_EXTRACTION_TEMPERATURE,
  DEFAULT_PITCH_TEMPERATURE,
  CONFIDENCE_THRESHOLD_HIGH,
  CONFIDENCE_THRESHOLD_MEDIUM,
} from '../constants/llm-config'

// Export validation constants
export { SAVINGS_TOLERANCE_DOLLARS, MISSING_FIELD_PENALTY } from '../constants/validation'

// Export error message constants
export { ERROR_CODES, ERROR_DETAILS, ERROR_MESSAGES } from '../constants/error-messages'

// Export text pattern inferences config
export {
  TEXT_PATTERN_INFERENCES,
  type TextPatternInference,
} from '../config/text-pattern-inferences'
