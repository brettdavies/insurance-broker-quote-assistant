import {
  type ActionCommand,
  type FieldCommand,
  getActionCommand,
  getFieldCommand,
} from '@/config/shortcuts'
import { hasModifiers, isNotesInput, isOtherInput, shouldIgnoreSlash } from '@/lib/keyboard-utils'
import { useCallback, useEffect, useState } from 'react'

export type { ActionCommand, FieldCommand }

export interface SlashCommandCallbacks {
  onFieldCommand?: (command: FieldCommand) => void
  onActionCommand?: (command: ActionCommand) => void
  onCommandError?: (command: string) => void // Callback for invalid commands
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

  const submitCommand = useCallback(
    (buffer: string) => {
      // Check if buffer matches a field command
      const fieldCommand = getFieldCommand(buffer)
      if (fieldCommand) {
        callbacks.onFieldCommand?.(fieldCommand)
        exitCommandMode()
        return true
      }

      // Check if buffer matches an action command
      const actionCommand = getActionCommand(buffer)
      if (actionCommand) {
        callbacks.onActionCommand?.(actionCommand)
        exitCommandMode()
        return true
      }

      // No match found
      callbacks.onCommandError?.(buffer)
      exitCommandMode()
      return false
    },
    [callbacks, exitCommandMode]
  )

  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null

    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter command mode on / (no modifiers)
      if (e.key === '/' && !hasModifiers(e)) {
        const target = e.target as HTMLElement

        // Don't trigger in modal inputs (except notes input)
        if (!isNotesInput(target) && isOtherInput(target)) return

        // Smart detection: ignore / in dates and URLs
        const precedingText = target.textContent || ''
        if (shouldIgnoreSlash(precedingText)) {
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

        // Handle backspace
        if (e.key === 'Backspace') {
          e.preventDefault()
          if (commandBuffer.length > 0) {
            const newBuffer = commandBuffer.slice(0, -1)
            setCommandBuffer(newBuffer)
            setCommandIndicator(newBuffer ? `/${newBuffer}` : '/...')

            // Reset timeout
            if (timeout) clearTimeout(timeout)
            timeout = setTimeout(() => {
              exitCommandMode()
            }, 2000)
          } else {
            // Empty buffer - exit command mode
            exitCommandMode()
          }
          return
        }

        // Submit command on Space or Enter
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          if (commandBuffer) {
            submitCommand(commandBuffer)
          } else {
            exitCommandMode()
          }
          return
        }

        // Add to buffer if letter or special character (? for help)
        // Allow letters for both single-char field shortcuts and multi-char action shortcuts
        if (/^[a-z?]$/i.test(e.key)) {
          e.preventDefault()
          const newBuffer = commandBuffer + e.key.toLowerCase()

          // Update buffer and wait for space/enter to submit
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
  }, [commandMode, commandBuffer, exitCommandMode, submitCommand])

  return {
    commandMode,
    commandIndicator,
  }
}
