/**
 * Drag and Drop Hook
 *
 * Handles drag-and-drop file operations.
 */

import { useToast } from '@/components/ui/use-toast'
import {
  ACCEPTED_EXTENSIONS,
  isAcceptedFileType,
  isFileSizeValid,
  MAX_FILE_SIZE,
} from '@repo/shared'
import { useState } from 'react'

interface UseDragAndDropOptions {
  onFileDropped: (file: File) => void
}

/**
 * Hook for drag-and-drop handling
 */
export function useDragAndDrop({ onFileDropped }: UseDragAndDropOptions) {
  const [isDragging, setIsDragging] = useState(false)
  const { toast } = useToast()

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
      onFileDropped(droppedFile)
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

  return {
    isDragging,
    handleDrop,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
  }
}
