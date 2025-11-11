/**
 * Global Keyboard Shortcuts Hook
 *
 * Handles global keyboard shortcuts that work from anywhere in the app.
 * Currently supports:
 * - Ctrl+X P (or Cmd+X P on Mac): Focus policy upload panel
 *
 * Note: Slash commands (/) are handled separately by useSlashCommands hook.
 */

import { useEffect, useRef } from 'react'

export interface KeyboardShortcutCallbacks {
  onFocusPolicyUpload?: () => void
}

/**
 * Hook for global keyboard shortcuts
 *
 * @param callbacks - Callbacks for keyboard shortcut actions
 */
export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks = {}) {
  const waitingForPRef = useRef(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+X P: Focus policy upload panel
      // Check for Ctrl+X (or Cmd+X on Mac) followed by P
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && !waitingForPRef.current) {
        e.preventDefault()
        waitingForPRef.current = true

        // Set timeout to reset if P is not pressed within 1 second
        const timeoutId = setTimeout(() => {
          waitingForPRef.current = false
        }, 1000)

        // Listen for P key
        const handlePKey = (nextEvent: KeyboardEvent) => {
          if (nextEvent.key === 'p' || nextEvent.key === 'P') {
            nextEvent.preventDefault()
            callbacks.onFocusPolicyUpload?.()
            waitingForPRef.current = false
            clearTimeout(timeoutId)
            document.removeEventListener('keydown', handlePKey)
          } else if ((nextEvent.ctrlKey || nextEvent.metaKey) && nextEvent.key === 'x') {
            // Another Ctrl+X, restart the sequence
            clearTimeout(timeoutId)
            document.removeEventListener('keydown', handlePKey)
            // Let the current event handler restart
            waitingForPRef.current = false
            handleKeyDown(nextEvent)
          } else {
            // Not P, cancel
            waitingForPRef.current = false
            clearTimeout(timeoutId)
            document.removeEventListener('keydown', handlePKey)
          }
        }

        document.addEventListener('keydown', handlePKey, { once: false })
      } else if (waitingForPRef.current && (e.key === 'p' || e.key === 'P')) {
        // P was pressed after Ctrl+X
        e.preventDefault()
        callbacks.onFocusPolicyUpload?.()
        waitingForPRef.current = false
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      waitingForPRef.current = false
    }
  }, [callbacks])
}
