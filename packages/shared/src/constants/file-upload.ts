/**
 * File Upload Constants
 *
 * Single source of truth for file upload restrictions shared between
 * frontend and backend to ensure consistency.
 */

/**
 * Maximum file size in bytes (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

/**
 * Accepted MIME types for policy document uploads
 */
export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/plain', // TXT
] as const

/**
 * Accepted file extensions (lowercase)
 */
export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt'] as const

/**
 * Human-readable file type descriptions
 */
export const FILE_TYPE_DESCRIPTIONS = {
  pdf: 'PDF',
  docx: 'DOCX',
  txt: 'TXT',
} as const

/**
 * Validate if a file type is accepted
 *
 * @param fileName - File name to check extension
 * @param mimeType - MIME type to check (optional)
 * @returns true if file type is accepted
 */
export function isAcceptedFileType(fileName: string, mimeType?: string): boolean {
  const fileNameLower = fileName.toLowerCase()
  const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext))
  const hasValidMimeType =
    !mimeType || ACCEPTED_MIME_TYPES.includes(mimeType as (typeof ACCEPTED_MIME_TYPES)[number])

  return hasValidExtension || hasValidMimeType
}

/**
 * Validate if a file size is within limits
 *
 * @param fileSize - File size in bytes
 * @returns true if file size is within limits
 */
export function isFileSizeValid(fileSize: number): boolean {
  return fileSize > 0 && fileSize <= MAX_FILE_SIZE
}

/**
 * Get human-readable file size string
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "5.0 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
