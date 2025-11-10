import { useCallback, useEffect, useState } from 'react'

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

const FIELD_SHORTCUTS: Record<string, FieldCommand> = {
  n: 'name',
  e: 'email',
  p: 'phone',
  s: 'state',
  z: 'zip',
  l: 'productLine',
  a: 'age',
  h: 'household',
  k: 'kids',
  d: 'dependents',
  v: 'vehicles',
  g: 'garage',
  i: 'vins',
  r: 'drivers',
  c: 'drivingRecords',
  u: 'cleanRecord',
  o: 'ownsHome',
  t: 'propertyType',
  y: 'constructionYear',
  f: 'roofType',
  q: 'squareFeet',
  w: 'existingPolicies',
  m: 'currentPremium',
  b: 'deductibles',
  x: 'limits',
}

const ACTION_SHORTCUTS: Record<string, ActionCommand> = {
  export: 'export',
  copy: 'copy',
  reset: 'reset',
  policy: 'policy',
  intake: 'intake',
  convo: 'intake',
  help: 'help',
  '?': 'help', // Support /? as alias for /help
}

export interface SlashCommandCallbacks {
  onFieldCommand?: (command: FieldCommand) => void
  onActionCommand?: (command: ActionCommand) => void
}

const hasModifiers = (e: KeyboardEvent) => {
  return e.metaKey || e.ctrlKey || e.altKey || e.shiftKey
}

export function useSlashCommands(callbacks: SlashCommandCallbacks = {}) {
  const [commandMode, setCommandMode] = useState(false)
  const [commandBuffer, setCommandBuffer] = useState('')
  const [commandIndicator, setCommandIndicator] = useState<string | null>(null)

  const exitCommandMode = useCallback(() => {
    setCommandMode(false)
    setCommandBuffer('')
    setCommandIndicator(null)
  }, [])

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null

    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter command mode on / (no modifiers)
      if (e.key === '/' && !hasModifiers(e)) {
        const target = e.target as HTMLElement
        const isNotesInput = target.dataset.notesInput === 'true'
        const isOtherInput = ['INPUT', 'TEXTAREA'].includes(target.tagName)

        // Don't trigger in modal inputs (except notes input)
        if (!isNotesInput && isOtherInput) return

        // Smart detection: ignore / in dates and URLs
        const precedingText = target.textContent || ''
        if (/\d$/.test(precedingText) || /:$/.test(precedingText)) {
          return
        }

        e.preventDefault()
        setCommandMode(true)
        setCommandBuffer('')
        setCommandIndicator('/...')

        // Timeout after 2 seconds
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => {
          exitCommandMode()
        }, 2000)
        return
      }

      // In command mode, handle keystrokes
      if (commandMode) {
        // Cancel on Escape
        if (e.key === 'Escape') {
          e.preventDefault()
          exitCommandMode()
          return
        }

        // Add to buffer if letter or special character (? for help)
        if (/^[a-z?]$/i.test(e.key)) {
          e.preventDefault()
          const newBuffer = commandBuffer + e.key.toLowerCase()

          // Check single-letter field shortcuts (execute immediately)
          if (newBuffer.length === 1 && FIELD_SHORTCUTS[newBuffer]) {
            callbacks.onFieldCommand?.(FIELD_SHORTCUTS[newBuffer])
            exitCommandMode()
            return
          }

          // Check full-word action shortcuts or single-character shortcuts (?)
          if (ACTION_SHORTCUTS[newBuffer]) {
            callbacks.onActionCommand?.(ACTION_SHORTCUTS[newBuffer])
            exitCommandMode()
            return
          }

          setCommandBuffer(newBuffer)
          setCommandIndicator(`/${newBuffer}`)

          // Reset timeout
          if (timeout) clearTimeout(timeout)
          timeout = setTimeout(() => {
            exitCommandMode()
          }, 2000)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timeout) clearTimeout(timeout)
    }
  }, [commandMode, commandBuffer, exitCommandMode, callbacks])

  return {
    commandMode,
    commandIndicator,
  }
}
