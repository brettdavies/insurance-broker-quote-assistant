import { UnifiedChatInterface } from '@/components/intake/UnifiedChatInterface'
import type { ActionCommand } from '@/hooks/useSlashCommands'
import { useCallback, useRef, useState } from 'react'

export function HomeScreen() {
  const [isActive, setIsActive] = useState(false)
  const editorRef = useRef<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
  } | null>(null)

  // Handle content change - trigger transition on first keystroke or field injection
  const handleContentChange = useCallback(
    (content: string) => {
      if (!isActive && content.trim().length > 0) {
        setIsActive(true)
      }
    },
    [isActive]
  )

  // Handle action commands
  const handleActionCommand = useCallback((command: ActionCommand) => {
    if (command === 'reset') {
      setIsActive(false)
      editorRef.current?.clear()
      setTimeout(() => {
        editorRef.current?.focus()
      }, 100)
    }
  }, [])

  // Handle command errors
  const handleCommandError = useCallback((command: string) => {
    // Handled by UnifiedChatInterface
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 text-gray-900 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 dark:text-white">
      <div className="h-screen">
        <UnifiedChatInterface
          mode="intake"
          isActive={isActive}
          onContentChange={handleContentChange}
          onActionCommand={handleActionCommand}
          onCommandError={handleCommandError}
          editorRef={editorRef}
        />
      </div>
    </div>
  )
}
