/**
 * Action Shortcuts Configuration
 *
 * UI-only keyboard shortcuts for application actions (not related to UserProfile fields).
 * These actions are separate from field shortcuts since they don't correspond to schema fields.
 */

export interface ActionShortcut {
  key: string // Keyboard shortcut key (can be single char or multi-char)
  command: string // Command identifier
  label: string // Display label
}

/**
 * Action Shortcuts Map
 *
 * All available action shortcuts for the application.
 */
export const actionShortcuts: ActionShortcut[] = [
  {
    key: 'export',
    command: 'export',
    label: 'Export to IQuote Pro',
  },
  {
    key: 'copy',
    command: 'copy',
    label: 'Copy to Clipboard',
  },
  {
    key: 'reset',
    command: 'reset',
    label: 'Reset Session',
  },
  {
    key: 'policy',
    command: 'policy',
    label: 'Switch to Policy Mode',
  },
  {
    key: 'intake',
    command: 'intake',
    label: 'Switch to Intake Mode',
  },
  {
    key: 'convo',
    command: 'intake',
    label: 'Switch to Intake Mode',
  },
  {
    key: 'help',
    command: 'help',
    label: 'Show Keyboard Shortcuts',
  },
  {
    key: '?',
    command: 'help',
    label: 'Show Keyboard Shortcuts',
  },
]

/**
 * Extract unique action commands
 */
export const actionCommandsArray = [...new Set(actionShortcuts.map((s) => s.command))] as const

export type ActionCommand = (typeof actionCommandsArray)[number]

/**
 * Map: shortcut key -> command
 */
export const ACTION_SHORTCUTS: Record<string, ActionCommand> = Object.fromEntries(
  actionShortcuts.map((s) => [s.key, s.command as ActionCommand])
) as Record<string, ActionCommand>

/**
 * Map: command -> label
 */
export const ACTION_LABELS: Record<ActionCommand, string> = Object.fromEntries(
  actionCommandsArray.map((cmd) => {
    const shortcut = actionShortcuts.find((s) => s.command === cmd)
    return [cmd, shortcut?.label || cmd]
  })
) as Record<ActionCommand, string>

/**
 * Get action command from shortcut key
 */
export function getActionCommand(key: string): ActionCommand | undefined {
  return ACTION_SHORTCUTS[key]
}

/**
 * Check if a key matches an action shortcut
 */
export function isActionShortcut(key: string): key is ActionCommand {
  return key in ACTION_SHORTCUTS
}

/**
 * Check if a buffer could be the start of an action shortcut
 */
export function couldBeActionShortcut(buffer: string): boolean {
  return Object.keys(ACTION_SHORTCUTS).some((key) => key.startsWith(buffer))
}

/**
 * Get display label for an action command
 */
export function getActionLabel(command: ActionCommand): string {
  return ACTION_LABELS[command] || command
}

/**
 * Action shortcuts display format (for help modal)
 */
export interface ActionShortcutDisplay {
  key: string
  action: string
}

/**
 * Get action shortcuts for display (handles aliases)
 */
export function getActionShortcutsDisplay(): ActionShortcutDisplay[] {
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
}
