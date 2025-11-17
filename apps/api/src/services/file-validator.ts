import { MAX_FILE_SIZE, isAcceptedFileType, isFileSizeValid } from '@repo/shared'

/**
 * File Validator Service
 *
 * Validates uploaded files using shared constants (single source of truth).
 */

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate uploaded file using shared constants
 *
 * @param file - File to validate
 * @returns Validation result with error message if invalid
 */
export function validateFile(file: File): FileValidationResult {
  // Validate file size using shared constant
  if (!isFileSizeValid(file.size)) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    }
  }

  // Validate file type using shared constant
  if (!isAcceptedFileType(file.name, file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Supported: PDF, DOCX, TXT. Got: ${file.type || file.name}`,
    }
  }

  return { valid: true }
}

/**
 * Check if a file object is a valid File instance
 *
 * @param file - File-like object to check
 * @returns True if file is a valid File object
 */
export function isValidFileObject(file: unknown): file is File {
  return (
    file instanceof File ||
    (typeof file === 'object' &&
      file !== null &&
      'name' in file &&
      'size' in file &&
      'type' in file &&
      'arrayBuffer' in file)
  )
}
