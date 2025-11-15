/**
 * Upload Error Handling Hook
 *
 * Handles error display for file upload operations.
 */

import { useToast } from '@/components/ui/use-toast'
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE } from '@repo/shared'

/**
 * Hook for upload error handling
 */
export function useUploadErrorHandling() {
  const { toast } = useToast()

  const handleUploadError = (error: Error) => {
    // Enhanced error handling with specific error types
    let title = 'Upload failed'
    let description = error.message

    // @ts-expect-error - Check for error code
    const errorCode = error.code

    if (errorCode === 'INVALID_FILE') {
      title = 'Invalid file type'
      description = `Please upload a ${ACCEPTED_EXTENSIONS.map((ext) => ext.toUpperCase().slice(1)).join(', ')} file.`
    } else if (errorCode === 'INVALID_REQUEST') {
      title = 'Invalid request'
      description = 'No file provided. Please select a file to upload.'
    } else if (errorCode === 'EXTRACTION_ERROR') {
      title = 'Extraction failed'
      description =
        'Failed to extract policy data from the file. You can try manual entry instead.'
    } else if (errorCode === 'INTERNAL_ERROR') {
      title = 'Server error'
      description = 'An internal error occurred. Please try again or contact support.'
    } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
      title = 'Network error'
      description = 'Failed to connect to the server. Please check your connection and try again.'
    } else if (error.message.includes('timeout')) {
      title = 'Request timeout'
      description = 'The upload took too long. Please try again with a smaller file.'
    }

    toast({
      variant: 'destructive',
      title,
      description,
      duration: 5000, // Longer duration for error messages
    })
  }

  return {
    handleUploadError,
  }
}
