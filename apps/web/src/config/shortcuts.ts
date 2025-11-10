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
// Types
// ============================================================================

export type FieldCommand =
  | 'name'
  | 'email'
  | 'phone'
  | 'state'
  | 'zip'
  | 'productLine'
  | 'age'
  | 'household'
  | 'kids'
  | 'dependents'
  | 'vehicles'
  | 'garage'
  | 'vins'
  | 'drivers'
  | 'drivingRecords'
  | 'cleanRecord'
  | 'ownsHome'
  | 'propertyType'
  | 'constructionYear'
  | 'roofType'
  | 'squareFeet'
  | 'currentPremium'
  | 'deductibles'
  | 'limits'
  | 'existingPolicies'

export type ActionCommand = 'export' | 'copy' | 'reset' | 'policy' | 'intake' | 'help'

// ============================================================================
// JSON Data Structure
// ============================================================================

interface ShortcutDefinition {
  type: 'field' | 'action'
  key: string
  command: FieldCommand | ActionCommand
  label: string
  question?: string // Only for field shortcuts
  category?: string // Only for field shortcuts
}

interface ShortcutsData {
  shortcuts: ShortcutDefinition[]
}

// ============================================================================
// Extract and Build Data Structures
// ============================================================================

const data = shortcutsData as ShortcutsData

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
