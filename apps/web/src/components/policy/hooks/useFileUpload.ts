/**
 * File Upload Hook
 *
 * Handles file selection, validation, and upload mutation.
 */

import { useToast } from '@/components/ui/use-toast'
import { api } from '@/lib/api-client'
import type { PolicySummary } from '@repo/shared'
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE,
  isAcceptedFileType,
  isFileSizeValid,
} from '@repo/shared'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useUploadErrorHandling } from './useUploadErrorHandling'

interface UseFileUploadOptions {
  onFileSelected?: (file: File | null) => void
  onPolicyExtracted?: (policySummary: PolicySummary) => void
}

/**
 * Hook for file upload handling
 */
export function useFileUpload({ onFileSelected, onPolicyExtracted }: UseFileUploadOptions) {
  const [file, setFile] = useState<File | null>(null)
  const { toast } = useToast()
  const { handleUploadError } = useUploadErrorHandling()

  // Policy upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Hono RPC uses 'form' property for file uploads, not 'body'
      // @ts-expect-error - Hono RPC type inference for nested routes
      const response = await api.api.policy.upload.$post({
        form: {
          file: file,
        },
      })

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: { message: 'Upload failed' } }))

        // Handle structured error responses
        if (errorData.error) {
          const errorCode = errorData.error.code || 'UNKNOWN_ERROR'
          const errorMessage = errorData.error.message || 'Upload failed'
          const errorDetails = errorData.error.details

          // Map error codes to user-friendly messages
          let userMessage = errorMessage
          if (errorCode === 'INVALID_FILE') {
            userMessage = `Invalid file type. Supported: ${ACCEPTED_EXTENSIONS.map((ext) => ext.toUpperCase().slice(1)).join(', ')}`
          } else if (errorCode === 'INVALID_REQUEST') {
            userMessage = 'No file provided. Please select a file to upload.'
          } else if (errorCode === 'EXTRACTION_ERROR') {
            userMessage =
              'Failed to extract policy data. Please try manual entry or check the file format.'
          } else if (errorCode === 'INTERNAL_ERROR') {
            userMessage = 'An internal error occurred. Please try again or contact support.'
          }

          const error = new Error(userMessage)
          // @ts-expect-error - Add error code to error object
          error.code = errorCode
          // @ts-expect-error - Add error details to error object
          error.details = errorDetails
          throw error
        }

        throw new Error(errorData.error?.message || 'Failed to upload policy')
      }

      const data = await response.json()
      return data as {
        extractedText: string
        fileName: string
        policySummary?: PolicySummary
      }
    },
    onSuccess: (data) => {
      if (data.policySummary) {
        onPolicyExtracted?.(data.policySummary)
      }
      toast({
        title: 'Policy uploaded',
        description: `Extracted ${Object.keys(data.policySummary || {}).length} fields from ${data.fileName}`,
      })
    },
    onError: (error: Error) => {
      handleUploadError(error)
    },
  })

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return

    // Validate file type using shared constants (single source of truth)
    if (!isAcceptedFileType(selectedFile.name, selectedFile.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: `Please upload a ${ACCEPTED_EXTENSIONS.map((ext) => ext.toUpperCase().slice(1)).join(', ')} file.`,
        duration: 5000,
      })
      return false
    }

    // Validate file size using shared constants
    if (!isFileSizeValid(selectedFile.size)) {
      const maxSizeMB = MAX_FILE_SIZE / 1024 / 1024
      const fileSizeMB = (selectedFile.size / 1024 / 1024).toFixed(2)
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: `File size (${fileSizeMB}MB) exceeds the ${maxSizeMB}MB limit. Please choose a smaller file.`,
        duration: 5000,
      })
      return false
    }

    setFile(selectedFile)
    onFileSelected?.(selectedFile)
    // Trigger upload
    uploadMutation.mutate(selectedFile)
    return true
  }

  const clearFile = () => {
    setFile(null)
    onFileSelected?.(null)
  }

  return {
    file,
    uploadMutation,
    handleFileChange,
    clearFile,
  }
}
