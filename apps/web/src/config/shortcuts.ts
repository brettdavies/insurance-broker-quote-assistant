/**
 * Keyboard Shortcuts Configuration
 *
 * This file provides type-safe accessors and helper functions for keyboard shortcuts.
 * Field shortcuts are derived from UserProfile schema metadata (shared package).
 * Action shortcuts are UI-only and defined separately.
 *
 * @see packages/shared/src/schemas/user-profile-metadata.ts
 * @see apps/web/src/config/action-shortcuts.ts
 */

import type { UserProfile } from '@repo/shared'
import {
  type FieldMetadata as SharedFieldMetadata,
  getFieldFromAlias,
  getFieldFromShortcut,
  userProfileFieldMetadata,
} from '@repo/shared'
import {
  ACTION_SHORTCUTS as ACTION_SHORTCUTS_IMPORT,
  type ActionCommand as ActionCommandImport,
  couldBeActionShortcut as couldBeActionShortcutImport,
  getActionCommand as getActionCommandImport,
  getActionShortcutsDisplay,
  isActionShortcut as isActionShortcutImport,
} from './action-shortcuts'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Field command type - matches UserProfile field names
 */
export type FieldCommand = keyof UserProfile

/**
 * Action command type - re-exported from action-shortcuts
 */
export type ActionCommand = ActionCommandImport

// ============================================================================
// Field Shortcuts Data Structures
// ============================================================================

/**
 * Extract field commands from metadata (only fields with shortcuts)
 */
const fieldCommandsWithShortcuts = Object.entries(userProfileFieldMetadata)
  .filter(([, metadata]) => metadata.shortcut !== '')
  .map(([field]) => field as FieldCommand)

/**
 * Maps commands to their actual field names
 * Commands match UserProfile field names directly, so this is just an identity mapping
 */
export const COMMAND_TO_FIELD_NAME: Record<FieldCommand, string> = Object.fromEntries(
  fieldCommandsWithShortcuts.map((field) => [field, field])
) as Record<FieldCommand, string>

/**
 * Extract numeric fields as a Set for fast lookup
 */
export const NUMERIC_FIELDS = new Set<string>(
  Object.entries(userProfileFieldMetadata)
    .filter(([, metadata]) => metadata.fieldType === 'numeric')
    .map(([field]) => field)
)

/**
 * Extract field shortcuts: key -> command mapping
 */
export const FIELD_SHORTCUTS: Record<string, FieldCommand> = Object.fromEntries(
  Object.entries(userProfileFieldMetadata)
    .filter(([, metadata]) => metadata.shortcut !== '')
    .map(([field, metadata]) => [metadata.shortcut, field as FieldCommand])
) as Record<string, FieldCommand>

/**
 * Extract action shortcuts: key -> command mapping
 * Re-exported from action-shortcuts for backward compatibility
 */
export const ACTION_SHORTCUTS = ACTION_SHORTCUTS_IMPORT

/**
 * Field metadata interface (matches old structure for backward compatibility)
 */
export interface FieldMetadata {
  label: string
  question: string
  shortcut: string
}

/**
 * Extract field metadata: command -> metadata mapping
 */
export const FIELD_METADATA: Record<FieldCommand, FieldMetadata> = Object.fromEntries(
  Object.entries(userProfileFieldMetadata).map(([field, metadata]) => [
    field as FieldCommand,
    {
      label: metadata.label,
      question: metadata.question,
      shortcut: metadata.shortcut,
    },
  ])
) as Record<FieldCommand, FieldMetadata>

/**
 * Extract field type (numeric vs string) for each command
 */
export const FIELD_TYPE: Record<FieldCommand, 'numeric' | 'string'> = Object.fromEntries(
  Object.entries(userProfileFieldMetadata).map(([field, metadata]) => [
    field as FieldCommand,
    metadata.fieldType,
  ])
) as Record<FieldCommand, 'numeric' | 'string'>

/**
 * Reverse mapping: command → key (for field injection)
 */
export const COMMAND_TO_KEY: Record<FieldCommand, string> = Object.fromEntries(
  Object.entries(userProfileFieldMetadata)
    .filter(([, metadata]) => metadata.shortcut !== '')
    .map(([field, metadata]) => [field as FieldCommand, metadata.shortcut])
) as Record<FieldCommand, string>

/**
 * Extract aliases mapping (alias → command)
 */
export const FIELD_ALIASES_MAP: Record<string, FieldCommand> = (() => {
  const aliasMap: Record<string, FieldCommand> = {}

  for (const [field, metadata] of Object.entries(userProfileFieldMetadata)) {
    const fieldMetadata = metadata as SharedFieldMetadata
    if (fieldMetadata.aliases) {
      for (const alias of fieldMetadata.aliases) {
        aliasMap[alias] = field as FieldCommand
      }
    }
  }

  return aliasMap
})()

// ============================================================================
// Display Data Structures
// ============================================================================

/**
 * Field shortcut display format
 */
export interface FieldShortcutDisplay {
  key: string
  field: string
}

/**
 * Field shortcut category
 */
export interface FieldShortcutCategory {
  category: string
  shortcuts: FieldShortcutDisplay[]
}

/**
 * Extract field shortcuts display: grouped by category
 */
export const FIELD_SHORTCUTS_DISPLAY: FieldShortcutCategory[] = (() => {
  const categoryMap = new Map<string, FieldShortcutDisplay[]>()

  for (const [field, metadata] of Object.entries(userProfileFieldMetadata)) {
    if (metadata.shortcut === '') continue

    const display: FieldShortcutDisplay = {
      key: `/${metadata.shortcut}`,
      field: metadata.label,
    }

    const existing = categoryMap.get(metadata.category) || []
    existing.push(display)
    categoryMap.set(metadata.category, existing)
  }

  return Array.from(categoryMap.entries()).map(([category, shortcuts]) => ({
    category,
    shortcuts,
  }))
})()

/**
 * Action shortcut display format
 */
export interface ActionShortcutDisplay {
  key: string
  action: string
}

/**
 * Extract action shortcuts display
 * Re-exported from action-shortcuts
 */
export const ACTION_SHORTCUTS_DISPLAY = getActionShortcutsDisplay()

// ============================================================================
// Field Delimiter Configuration
// ============================================================================

/**
 * Fields that allow spaces (multi-word values)
 * These fields stop at comma, period, or next key:value pattern (not space)
 */
export const MULTI_WORD_FIELDS = new Set<FieldCommand>([
  'name',
  'phone',
  'productType',
  'propertyType',
  'garage',
  'roofType',
  'drivingRecords',
  'deductibles',
  'limits',
  'existingPolicies',
  'vins', // VINs can be multiple, space-separated
])

/**
 * Fields that allow special characters that are normally delimiters
 * - Phone: spaces, dashes, parentheses (e.g., "(555) 123-4567")
 * - Zip: dashes (e.g., "12345-6789")
 * - Email: periods (already handled separately via @ detection)
 */
export const SPECIAL_CHAR_FIELDS: Record<FieldCommand, string[]> = {
  phone: ['-', '(', ')', ' '], // Phone numbers can have dashes, parentheses, spaces
  zip: ['-'], // Zip codes can have dashes (extended format)
  email: ['.'], // Email has periods (handled via @ detection)
} as Record<FieldCommand, string[]>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the shortcut letter for a field command
 */
export function getFieldShortcut(field: FieldCommand): string | undefined {
  const metadata = userProfileFieldMetadata[field]
  return metadata?.shortcut || undefined
}

/**
 * Check if a buffer matches a field shortcut
 */
export function isFieldShortcut(buffer: string): buffer is FieldCommand {
  return buffer in FIELD_SHORTCUTS
}

/**
 * Check if a buffer matches an action shortcut
 */
export function isActionShortcut(buffer: string): buffer is ActionCommand {
  return isActionShortcutImport(buffer)
}

/**
 * Get field command from buffer
 * Checks both direct shortcuts and aliases
 */
export function getFieldCommand(buffer: string): FieldCommand | undefined {
  // Check direct shortcuts first
  if (buffer in FIELD_SHORTCUTS) {
    return FIELD_SHORTCUTS[buffer]
  }
  // Check aliases
  const fieldFromAlias = getFieldFromAlias(buffer)
  return (fieldFromAlias as FieldCommand | undefined) || undefined
}

/**
 * Get action command from buffer
 */
export function getActionCommand(buffer: string): ActionCommand | undefined {
  return getActionCommandImport(buffer)
}

/**
 * Check if a buffer could be the start of an action shortcut
 */
export function couldBeActionShortcut(buffer: string): boolean {
  return couldBeActionShortcutImport(buffer)
}
