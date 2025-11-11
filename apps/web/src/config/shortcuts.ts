/**
 * Keyboard Shortcuts Configuration
 *
 * This file reads shortcut definitions from shortcuts.json and provides
 * type-safe accessors and helper functions.
 *
 * To modify shortcuts, edit shortcuts.json instead of this file.
 * Each shortcut is defined once in JSON with all its properties.
 */

import shortcutsData from './shortcuts.json'

// ============================================================================
// JSON Data Structure
// ============================================================================

interface ShortcutDefinition {
  type: 'field' | 'action'
  key: string
  command: string
  label: string
  question?: string // Only for field shortcuts
  category?: string // Only for field shortcuts
  fieldType?: 'numeric' | 'string' // Only for field shortcuts
  aliases?: string[] // Optional: array of aliases for this shortcut
}

interface ShortcutsData {
  shortcuts: ShortcutDefinition[]
}

// ============================================================================
// Extract and Build Data Structures
// ============================================================================

const data = shortcutsData as ShortcutsData

// Extract unique commands at runtime for type inference
const fieldCommandsArray = [
  ...new Set(data.shortcuts.filter((s) => s.type === 'field').map((s) => s.command)),
] as const

const actionCommandsArray = [
  ...new Set(data.shortcuts.filter((s) => s.type === 'action').map((s) => s.command)),
] as const

// Derive types from shortcuts.json - no hardcoding needed
export type FieldCommand = (typeof fieldCommandsArray)[number]
export type ActionCommand = (typeof actionCommandsArray)[number]

// Maps commands to their actual field names
// Commands match UserProfile field names directly, so this is just an identity mapping
// Generated dynamically from shortcuts.json - no manual updates needed
export const COMMAND_TO_FIELD_NAME: Record<FieldCommand, string> = Object.fromEntries(
  data.shortcuts
    .filter(
      (
        s
      ): s is ShortcutDefinition & {
        type: 'field'
        command: FieldCommand
      } => s.type === 'field'
    )
    .map((s) => [s.command, s.command]) // Command IS the field name
) as Record<FieldCommand, string>

// Extract numeric fields as a Set for fast lookup
// Derived from field shortcuts with fieldType === 'numeric'
// Uses command directly as field name (since they match)
export const NUMERIC_FIELDS = new Set<string>(
  data.shortcuts
    .filter(
      (
        s
      ): s is ShortcutDefinition & {
        type: 'field'
        command: FieldCommand
        fieldType: 'numeric'
      } => s.type === 'field' && s.fieldType === 'numeric'
    )
    .map((s) => s.command) // Command IS the field name
)

// Extract field shortcuts: key -> command mapping
export const FIELD_SHORTCUTS: Record<string, FieldCommand> = Object.fromEntries(
  data.shortcuts
    .filter(
      (s): s is ShortcutDefinition & { type: 'field'; command: FieldCommand } => s.type === 'field'
    )
    .map((s) => [s.key, s.command])
) as Record<string, FieldCommand>

// Extract action shortcuts: key -> command mapping
export const ACTION_SHORTCUTS: Record<string, ActionCommand> = Object.fromEntries(
  data.shortcuts
    .filter(
      (s): s is ShortcutDefinition & { type: 'action'; command: ActionCommand } =>
        s.type === 'action'
    )
    .map((s) => [s.key, s.command])
) as Record<string, ActionCommand>

// Extract field metadata: command -> metadata mapping
export interface FieldMetadata {
  label: string
  question: string
  shortcut: string
}

export const FIELD_METADATA: Record<FieldCommand, FieldMetadata> = Object.fromEntries(
  data.shortcuts
    .filter(
      (
        s
      ): s is ShortcutDefinition & {
        type: 'field'
        command: FieldCommand
        question: string
        category: string
      } => s.type === 'field' && s.question !== undefined && s.category !== undefined
    )
    .map((s) => [
      s.command,
      {
        label: s.label,
        question: s.question,
        shortcut: s.key,
      },
    ])
) as Record<FieldCommand, FieldMetadata>

// Extract field type (numeric vs string) for each command
export const FIELD_TYPE: Record<FieldCommand, 'numeric' | 'string'> = Object.fromEntries(
  data.shortcuts
    .filter(
      (
        s
      ): s is ShortcutDefinition & {
        type: 'field'
        command: FieldCommand
        fieldType: 'numeric' | 'string'
      } => s.type === 'field' && s.fieldType !== undefined
    )
    .map((s) => [s.command, s.fieldType])
) as Record<FieldCommand, 'numeric' | 'string'>

// Reverse mapping: command → key (for field injection)
export const COMMAND_TO_KEY: Record<FieldCommand, string> = Object.fromEntries(
  data.shortcuts
    .filter(
      (
        s
      ): s is ShortcutDefinition & {
        type: 'field'
        command: FieldCommand
      } => s.type === 'field'
    )
    .map((s) => [s.command, s.key])
) as Record<FieldCommand, string>

// Extract field shortcuts display: grouped by category
export interface FieldShortcutDisplay {
  key: string
  field: string
}

export interface FieldShortcutCategory {
  category: string
  shortcuts: FieldShortcutDisplay[]
}

export const FIELD_SHORTCUTS_DISPLAY: FieldShortcutCategory[] = (() => {
  const fieldShortcuts = data.shortcuts.filter(
    (s): s is ShortcutDefinition & { type: 'field'; category: string } =>
      s.type === 'field' && s.category !== undefined
  )

  const categoryMap = new Map<string, FieldShortcutDisplay[]>()

  for (const shortcut of fieldShortcuts) {
    const display: FieldShortcutDisplay = {
      key: `/${shortcut.key}`,
      field: shortcut.label,
    }

    const existing = categoryMap.get(shortcut.category) || []
    existing.push(display)
    categoryMap.set(shortcut.category, existing)
  }

  return Array.from(categoryMap.entries()).map(([category, shortcuts]) => ({
    category,
    shortcuts,
  }))
})()

// Extract action shortcuts display
export interface ActionShortcutDisplay {
  key: string
  action: string
}

export const ACTION_SHORTCUTS_DISPLAY: ActionShortcutDisplay[] = (() => {
  const actionShortcuts = data.shortcuts.filter(
    (s): s is ShortcutDefinition & { type: 'action' } => s.type === 'action'
  )

  // Group by command to handle aliases
  const commandMap = new Map<ActionCommand, ActionShortcutDisplay>()

  for (const shortcut of actionShortcuts) {
    const command = shortcut.command as ActionCommand

    // Special handling for help command - combine "help" and "?" into one entry
    if (command === 'help') {
      const existing = commandMap.get('help')
      if (existing) {
        if (existing.key === '/help' && shortcut.key === '?') {
          existing.key = '/help or /?'
        }
      } else {
        commandMap.set(command, {
          key: shortcut.key === '?' ? '/help or /?' : `/${shortcut.key}`,
          action: shortcut.label,
        })
      }
    } else {
      // For other commands, use the first key we encounter
      if (!commandMap.has(command)) {
        commandMap.set(command, {
          key: `/${shortcut.key}`,
          action: shortcut.label,
        })
      }
    }
  }

  return Array.from(commandMap.values())
})()

// Extract aliases mapping (alias → command)
// Built from aliases arrays in each shortcut definition
export const FIELD_ALIASES_MAP: Record<string, FieldCommand> = (() => {
  const aliasMap: Record<string, FieldCommand> = {}

  for (const shortcut of data.shortcuts) {
    if (shortcut.type === 'field' && shortcut.aliases) {
      for (const alias of shortcut.aliases) {
        aliasMap[alias] = shortcut.command as FieldCommand
      }
    }
  }

  return aliasMap
})()

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
  'productLine',
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
  return Object.entries(FIELD_SHORTCUTS).find(([, cmd]) => cmd === field)?.[0]
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
  return buffer in ACTION_SHORTCUTS
}

/**
 * Get field command from buffer
 */
export function getFieldCommand(buffer: string): FieldCommand | undefined {
  return FIELD_SHORTCUTS[buffer]
}

/**
 * Get action command from buffer
 */
export function getActionCommand(buffer: string): ActionCommand | undefined {
  return ACTION_SHORTCUTS[buffer]
}

/**
 * Check if a buffer could be the start of an action shortcut
 */
export function couldBeActionShortcut(buffer: string): boolean {
  return Object.keys(ACTION_SHORTCUTS).some((key) => key.startsWith(buffer))
}
