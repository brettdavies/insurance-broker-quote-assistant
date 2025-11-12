import { KeyValueEditor } from '@/components/shared/KeyValueEditor'
/**
 * Policy Upload Panel Component
 *
 * Enhanced upload panel with drag-and-drop, file picker, and Lexical-based
 * manual entry with key-value pill support for policy data.
 */
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { api } from '@/lib/api-client'
import type { PolicySummary } from '@repo/shared'
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE,
  isAcceptedFileType,
  isFileSizeValid,
} from '@repo/shared'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface UploadPanelProps {
  onFileSelected?: (file: File) => void
  onManualDataChange?: (data: string) => void
  onPolicyExtracted?: (policySummary: PolicySummary) => void
  isLoading?: boolean
  fileInputRef?: React.MutableRefObject<HTMLInputElement | null>
  editorRef?: React.MutableRefObject<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
  } | null>
}

export function UploadPanel({
  onFileSelected,
  onManualDataChange,
  onPolicyExtracted,
  isLoading = false,
  fileInputRef: externalFileInputRef,
  editorRef: externalEditorRef,
}: UploadPanelProps) {
  const [file, setFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const internalEditorRef = useRef<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
  } | null>(null)
  const internalFileInputRef = useRef<HTMLInputElement | null>(null)
  const editorRef = externalEditorRef || internalEditorRef
  const fileInputRef = externalFileInputRef || internalFileInputRef
  const { toast } = useToast()

  // Expose file input ref to parent
  useEffect(() => {
    if (externalFileInputRef && internalFileInputRef.current) {
      externalFileInputRef.current = internalFileInputRef.current
    }
  }, [externalFileInputRef])

  // Expose editor ref to parent
  useEffect(() => {
    if (externalEditorRef && internalEditorRef.current) {
      externalEditorRef.current = internalEditorRef.current
    }
  }, [externalEditorRef])

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
      setExtractedText(data.extractedText)
      if (data.policySummary) {
        onPolicyExtracted?.(data.policySummary)
      }
      toast({
        title: 'Policy uploaded',
        description: `Extracted ${Object.keys(data.policySummary || {}).length} fields from ${data.fileName}`,
      })
    },
    onError: (error: Error) => {
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
    },
  })

  // Populate editor when extracted text is available
  // biome-ignore lint/correctness/useExhaustiveDependencies: editorRef is a stable ref and doesn't need to be in dependencies
  useEffect(() => {
    if (extractedText && editorRef.current) {
      editorRef.current.setContent(extractedText)
      setExtractedText(null) // Clear after setting to avoid re-setting
    }
  }, [extractedText])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type using shared constants (single source of truth)
    if (!isAcceptedFileType(selectedFile.name, selectedFile.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: `Please upload a ${ACCEPTED_EXTENSIONS.map((ext) => ext.toUpperCase().slice(1)).join(', ')} file.`,
        duration: 5000,
      })
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
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
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setFile(selectedFile)
    onFileSelected?.(selectedFile)
    // Trigger upload
    uploadMutation.mutate(selectedFile)
  }

  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      // Validate file type
      if (!isAcceptedFileType(droppedFile.name, droppedFile.type)) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: `Please upload a ${ACCEPTED_EXTENSIONS.map((ext) => ext.toUpperCase().slice(1)).join(', ')} file.`,
          duration: 5000,
        })
        return
      }

      // Validate file size
      if (!isFileSizeValid(droppedFile.size)) {
        const maxSizeMB = MAX_FILE_SIZE / 1024 / 1024
        const fileSizeMB = (droppedFile.size / 1024 / 1024).toFixed(2)
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `File size (${fileSizeMB}MB) exceeds the ${maxSizeMB}MB limit. Please choose a smaller file.`,
          duration: 5000,
        })
        return
      }

      // Directly set file and trigger upload (don't use synthetic event)
      setFile(droppedFile)
      onFileSelected?.(droppedFile)
      uploadMutation.mutate(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleManualDataChange = (content: string) => {
    onManualDataChange?.(content)
  }

  const handleClear = () => {
    setFile(null)
    editorRef.current?.clear()
    onFileSelected?.(null as unknown as File)
    onManualDataChange?.('')
  }

  return (
    <div className="h-full p-6">
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Policy Upload</CardTitle>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Policy Mode
            </span>
          </div>
          <CardDescription>Upload a policy document or enter data manually</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-950/20'
                : 'border-gray-400 hover:border-purple-500 dark:border-gray-600 dark:hover:border-purple-400'
            }`}
          >
            <input
              type="file"
              accept="application/pdf,.pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              disabled={isLoading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="text-primary-600 h-6 w-6 animate-spin" />
                  <div className="text-sm text-gray-600 dark:text-gray-400">Processing file...</div>
                </div>
              ) : (
                <>
                  <div className="mb-2 text-gray-600 dark:text-gray-400">
                    Drag and drop a file here, or click to browse
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {ACCEPTED_EXTENSIONS.map((ext) => ext.toUpperCase().slice(1)).join(', ')} (max{' '}
                    {MAX_FILE_SIZE / 1024 / 1024}MB)
                  </div>
                </>
              )}
            </label>
          </div>

          {/* Loading Progress */}
          {(isLoading || uploadMutation.isPending) && (
            <div className="space-y-2">
              <Progress value={50} className="h-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Extracting policy data...</p>
            </div>
          )}

          {/* File Info */}
          {file && !isLoading && !uploadMutation.isPending && (
            <div className="rounded-md bg-gray-200 p-3 dark:bg-gray-700">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {(file.size / 1024).toFixed(2)} KB
              </div>
            </div>
          )}

          {/* Manual Data Entry */}
          <div>
            <p className="mb-2 block text-sm font-medium">Or enter data manually:</p>
            <div className="relative min-h-[150px] rounded-md border border-gray-300 dark:border-gray-700">
              <KeyValueEditor
                placeholder="Type policy details... (carrier:StateFarm, premium:$1200/yr, deductible:$500)"
                onContentChange={handleManualDataChange}
                editorRef={editorRef}
                autoFocus={false}
              />
            </div>
          </div>

          {/* Clear Button */}
          {file && !isLoading && !uploadMutation.isPending && (
            <Button variant="outline" onClick={handleClear} className="w-full">
              Clear
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
