/**
 * useFieldHandlers Hook
 *
 * Manages field extraction, normalization, and deduplication logic.
 *
 * Single Responsibility: Field handling logic only
 */

import { COMMAND_TO_KEY, type FieldCommand } from '@/config/shortcuts'
import {
  type UserProfile,
  normalizeFieldName,
  normalizeFieldValue,
  unifiedFieldMetadata,
} from '@repo/shared'
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

        // Normalize field values (state, productType, etc.)
        let normalizedValue: string | number | boolean = value
        if (typeof value === 'string') {
          const normalized = normalizeFieldValue(normalizedKey, value)
          if (normalized === null) {
            // Invalid enum value - skip this field
            continue
          }
          normalizedValue = normalized
        }

        // For single-instance fields, check if value already exists
        if (
          metadata?.singleInstance &&
          currentProfile[normalizedKey as keyof UserProfile] !== undefined
        ) {
          // Field already exists - update it (deduplication)
          if (currentProfile[normalizedKey as keyof UserProfile] !== normalizedValue) {
            normalizedFields[normalizedKey] = normalizedValue
            changedFields.push([normalizedKey, normalizedValue])
          }
        } else {
          // New field or not single-instance - add it
          normalizedFields[normalizedKey] = normalizedValue
          if (currentProfile[normalizedKey as keyof UserProfile] !== normalizedValue) {
            changedFields.push([normalizedKey, normalizedValue])
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
      // Normalize field name before removing (handles shortcuts, aliases, etc.)
      const normalizedFieldName = normalizeFieldName(fieldName)
      removeField(normalizedFieldName)
      onFieldRemoved?.(normalizedFieldName)
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
