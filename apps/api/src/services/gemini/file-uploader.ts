/**
 * Gemini File Uploader
 *
 * Handles file upload operations to Gemini File API.
 * Single Responsibility: File upload and cleanup operations
 */

import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { GoogleGenAI } from '@google/genai'
import { logError, logInfo } from '../../utils/logger'

export interface FileUploadResult {
  fileUri: string
  cleanup: () => Promise<void>
}

export class GeminiFileUploader {
  constructor(private ai: GoogleGenAI) {}

  /**
   * Upload file to Gemini File API
   *
   * @param file - File to upload
   * @returns File URI and cleanup function
   */
  async uploadFile(file: File): Promise<FileUploadResult> {
    // Get MIME type and strip charset if present (Gemini doesn't accept charset in MIME type)
    let mimeType = file.type ?? this.getMimeTypeFromFileName(file.name)
    if (mimeType?.includes(';')) {
      mimeType = mimeType.split(';')[0]?.trim() ?? mimeType
    }

    // Create temporary file to save uploaded file
    const tempDir = await mkdtemp(join(tmpdir(), 'gemini-upload-'))
    const tempFilePath = join(tempDir, file.name)

    try {
      // Write file to temp location
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await writeFile(tempFilePath, buffer)

      // Upload file to Gemini File API using file path (SDK requirement)
      const uploadResponse = await this.ai.files.upload({
        file: tempFilePath, // SDK accepts file path string
        config: {
          mimeType,
          displayName: file.name,
        },
      })

      // Get file URI from upload response (response.uri is the file URI)
      const fileUri = uploadResponse.uri || ''
      if (!fileUri) {
        throw new Error('Failed to get file URI from Gemini upload response')
      }

      await logInfo('File uploaded to Gemini', {
        type: 'gemini_file_upload',
        fileName: file.name,
        fileSize: file.size,
        fileUri,
      })

      // Return file URI and cleanup function
      return {
        fileUri,
        cleanup: async () => {
          try {
            await unlink(tempFilePath)
            // Remove temp directory (should be empty after file deletion)
            try {
              await rmdir(tempDir)
            } catch {
              // Ignore directory removal errors (may not be empty or already removed)
            }
          } catch (cleanupError) {
            // Log but don't throw - cleanup is best effort
            await logError('Failed to cleanup temp file', cleanupError as Error, {
              type: 'temp_file_cleanup_error',
              tempFilePath,
            })
          }
        },
      }
    } catch (error) {
      // Cleanup on error
      try {
        await unlink(tempFilePath).catch(() => {})
        await rmdir(tempDir).catch(() => {})
      } catch {
        // Ignore cleanup errors
      }

      await logError('Gemini file upload failed', error as Error, {
        type: 'gemini_file_upload_error',
        fileName: file.name,
        fileSize: file.size,
      })
      throw error
    }
  }

  /**
   * Get MIME type from file name if file.type is not available
   */
  private getMimeTypeFromFileName(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop()
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      txt: 'text/plain',
    }
    return mimeTypes[ext || ''] || 'application/octet-stream'
  }
}
