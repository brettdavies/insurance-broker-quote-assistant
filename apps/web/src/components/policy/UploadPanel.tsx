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
import type { PolicySummary } from '@repo/shared'
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE } from '@repo/shared'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDragAndDrop } from './hooks/useDragAndDrop'
import { useFileUpload } from './hooks/useFileUpload'

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
    getTextWithoutPills: () => string
    getEditor: () => import('lexical').LexicalEditor
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
  const [extractedText, setExtractedText] = useState<string | null>(null)
  const internalEditorRef = useRef<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
    getTextWithoutPills: () => string
    getEditor: () => import('lexical').LexicalEditor
  } | null>(null)
  const internalFileInputRef = useRef<HTMLInputElement | null>(null)
  const editorRef = externalEditorRef || internalEditorRef
  const fileInputRef = externalFileInputRef || internalFileInputRef

  // File upload hook
  const {
    file,
    uploadMutation,
    handleFileChange: handleFileChangeInternal,
    clearFile,
  } = useFileUpload({
    onFileSelected: (f) => onFileSelected?.(f as File),
    onPolicyExtracted,
  })

  // Drag and drop hook
  const { isDragging, handleDrop, handleDragOver, handleDragEnter, handleDragLeave } =
    useDragAndDrop({
      onFileDropped: (droppedFile) => {
        if (handleFileChangeInternal(droppedFile) && fileInputRef.current) {
          // Create a DataTransfer object to simulate file input change
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(droppedFile)
          fileInputRef.current.files = dataTransfer.files
        }
      },
    })

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

  // Populate editor when extracted text is available
  // biome-ignore lint/correctness/useExhaustiveDependencies: editorRef is a stable ref and doesn't need to be in dependencies
  useEffect(() => {
    if (extractedText && editorRef.current) {
      editorRef.current.setContent(extractedText)
      setExtractedText(null) // Clear after setting to avoid re-setting
    }
  }, [extractedText])

  // Update extracted text from mutation result
  useEffect(() => {
    if (uploadMutation.data?.extractedText) {
      setExtractedText(uploadMutation.data.extractedText)
    }
  }, [uploadMutation.data])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!handleFileChangeInternal(selectedFile)) {
      // Reset file input if validation failed
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleManualDataChange = (content: string) => {
    onManualDataChange?.(content)
  }

  const handleClear = () => {
    clearFile()
    editorRef.current?.clear()
    onManualDataChange?.('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
