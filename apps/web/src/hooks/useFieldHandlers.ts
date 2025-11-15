/**
 * useFieldHandlers Hook
 *
 * Manages field extraction, normalization, and deduplication logic.
 *
 * Single Responsibility: Field handling logic only
 */

import { COMMAND_TO_KEY, type FieldCommand } from '@/config/shortcuts'
import { type UserProfile, normalizeFieldName, unifiedFieldMetadata } from '@repo/shared'
import { useCallback } from 'react'

interface UseFieldHandlersParams {
  profileRef: React.MutableRefObject<UserProfile>
  updateProfile: (updates: Partial<UserProfile>) => void
  removeField: (fieldName: string) => void
  editorRef: React.MutableRefObject<{
    insertText: (text: string) => void
  } | null>
  onFieldExtracted?: (fields: Record<string, string | number | boolean>) => void
  onFieldRemoved?: (fieldName: string) => void
}

export function useFieldHandlers({
  profileRef,
  updateProfile,
  removeField,
  editorRef,
  onFieldExtracted,
  onFieldRemoved,
}: UseFieldHandlersParams) {
  const handleFieldExtracted = useCallback(
    (extractedFields: Record<string, string | number | boolean>) => {
      if (Object.keys(extractedFields).length === 0) return

      // Normalize field names and handle deduplication for single-instance fields
      const normalizedFields: Record<string, string | number | boolean> = {}
      const currentProfile = profileRef.current
      const changedFields: Array<[string, string | number | boolean]> = []

      for (const [key, value] of Object.entries(extractedFields)) {
        const normalizedKey = normalizeFieldName(key)
        const metadata = unifiedFieldMetadata[normalizedKey]

        // For single-instance fields, check if value already exists
        if (
          metadata?.singleInstance &&
          currentProfile[normalizedKey as keyof UserProfile] !== undefined
        ) {
          // Field already exists - update it (deduplication)
          if (currentProfile[normalizedKey as keyof UserProfile] !== value) {
            normalizedFields[normalizedKey] = value
            changedFields.push([normalizedKey, value])
          }
        } else {
          // New field or not single-instance - add it
          normalizedFields[normalizedKey] = value
          if (currentProfile[normalizedKey as keyof UserProfile] !== value) {
            changedFields.push([normalizedKey, value])
          }
        }
      }

      // Update profile with normalized fields
      if (Object.keys(normalizedFields).length > 0) {
        updateProfile(normalizedFields)
      }

      // Notify parent of changed fields
      if (changedFields.length > 0 && onFieldExtracted) {
        const changedFieldsObj = Object.fromEntries(changedFields)
        onFieldExtracted(changedFieldsObj)
      }
    },
    [profileRef, updateProfile, onFieldExtracted]
  )

  const handleFieldRemoved = useCallback(
    (fieldName: string) => {
      removeField(fieldName)
      onFieldRemoved?.(fieldName)
    },
    [removeField, onFieldRemoved]
  )

  const handleFieldModalSubmit = useCallback(
    (fieldKey: string, value: string) => {
      const fieldCommand = fieldKey as FieldCommand
      const shortcutKey = COMMAND_TO_KEY[fieldCommand] || fieldCommand

      // Insert field as key-value pair into editor
      const pillText = `${shortcutKey}:${value} `
      editorRef.current?.insertText(pillText)
    },
    [editorRef]
  )

  return {
    handleFieldExtracted,
    handleFieldRemoved,
    handleFieldModalSubmit,
  }
}
