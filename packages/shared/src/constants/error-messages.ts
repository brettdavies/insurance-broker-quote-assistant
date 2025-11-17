/**
 * Error Message Constants
 *
 * Centralized error messages for consistent error handling across the application.
 * Single source of truth for user-facing error messages.
 */

/**
 * Error codes used throughout the application
 */
export const ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_FILE: 'INVALID_FILE',
  EXTRACTION_ERROR: 'EXTRACTION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  KNOWLEDGE_PACK_ERROR: 'KNOWLEDGE_PACK_ERROR',
  ANALYSIS_ERROR: 'ANALYSIS_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  NO_FILE_PROVIDED: 'No file provided',
  INVALID_FILE_FORMAT: 'Invalid file format',
  FILE_VALIDATION_FAILED: 'File validation failed',
  EXTRACTION_FAILED: 'Failed to extract policy data from file',
  NO_DATA_EXTRACTED: 'No data could be extracted from the file',
  INVALID_REQUEST_BODY: 'Invalid request body',
  MISSING_REQUIRED_FIELDS: 'Policy summary missing required fields',
  CARRIER_NOT_FOUND: 'Carrier not found in knowledge pack',
  LLM_ANALYSIS_FAILED: 'LLM analysis failed',
  POLICY_ANALYSIS_FAILED: 'Failed to analyze policy',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  UNKNOWN_ERROR: 'Unknown error',
} as const

/**
 * Error details (contextual messages)
 */
export const ERROR_DETAILS = {
  FILE_MULTIPART_REQUIRED: 'Request must include a file in multipart/form-data',
  FILE_MUST_BE_VALID_OBJECT: 'File must be a valid File object',
  POLICY_SUMMARY_REQUIRED_FIELDS: 'PolicySummary must include carrier, state, and productType',
} as const
