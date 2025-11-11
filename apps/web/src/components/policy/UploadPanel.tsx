import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useState } from 'react'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_FILE_TYPES = ['application/pdf', '.pdf', '.docx', '.txt']

export function UploadPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [manualData, setManualData] = useState('')
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    const isValidType = ACCEPTED_FILE_TYPES.some(
      (type) => selectedFile.type === type || selectedFile.name.endsWith(type)
    )

    if (!isValidType) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload a PDF, DOCX, or TXT file.',
      })
      return
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'File size must be less than 5MB.',
      })
      return
    }

    setFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const input = document.createElement('input')
      input.type = 'file'
      input.files = e.dataTransfer.files as FileList
      const event = new Event('change', { bubbles: true })
      input.dispatchEvent(event)
      handleFileChange({ target: input } as React.ChangeEvent<HTMLInputElement>)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleClear = () => {
    setFile(null)
    setManualData('')
  }

  return (
    <div className="h-full p-6">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Policy Upload</CardTitle>
          <CardDescription>Upload a policy document or enter data manually</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="hover:border-primary-500 cursor-pointer rounded-lg border-2 border-dashed border-gray-400 p-8 text-center transition-colors dark:border-gray-600"
          >
            <input
              type="file"
              accept="application/pdf,.pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="mb-2 text-gray-600 dark:text-gray-400">
                Drag and drop a file here, or click to browse
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                PDF, DOCX, or TXT (max 5MB)
              </div>
            </label>
          </div>

          {/* File Info */}
          {file && (
            <div className="rounded-md bg-gray-200 p-3 dark:bg-gray-700">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {(file.size / 1024).toFixed(2)} KB
              </div>
            </div>
          )}

          {/* Manual Data Entry */}
          <div>
            <label htmlFor="manual-data-entry" className="mb-2 block text-sm font-medium">
              Or enter data manually:
            </label>
            <Textarea
              id="manual-data-entry"
              value={manualData}
              onChange={(e) => setManualData(e.target.value)}
              placeholder="Paste policy data here..."
              className="min-h-[150px]"
            />
          </div>

          {/* Clear Button */}
          {(file || manualData) && (
            <Button variant="outline" onClick={handleClear} className="w-full">
              Clear
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
