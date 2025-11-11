import { FieldModal } from '@/components/shortcuts/FieldModal'
import { HelpModal } from '@/components/shortcuts/HelpModal'
import { Textarea } from '@/components/ui/textarea'
import { COMMAND_TO_KEY } from '@/config/shortcuts'
import { type ActionCommand, type FieldCommand, useSlashCommands } from '@/hooks/useSlashCommands'
import { useState } from 'react'

export function ChatPanel() {
  const [message, setMessage] = useState('')
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [currentField, setCurrentField] = useState<FieldCommand | null>(null)

  const handleFieldCommand = (command: FieldCommand) => {
    setCurrentField(command)
    setFieldModalOpen(true)
  }

  const handleActionCommand = (command: ActionCommand) => {
    if (command === 'help') {
      setHelpModalOpen(true)
    } else {
      // Other actions stubbed for future stories
      console.log('Action command:', command)
    }
  }

  const { commandIndicator } = useSlashCommands({
    onFieldCommand: handleFieldCommand,
    onActionCommand: handleActionCommand,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Stubbed for this story - will integrate with API in Story 1.4
    console.log('Message submitted:', message)
    setMessage('')
  }

  const handleFieldSubmit = (value: string) => {
    if (currentField) {
      // Get shortcut key from shortcuts config (ensures no drift)
      const key = COMMAND_TO_KEY[currentField]
      const pill = `${key}:${value}`
      setMessage((prev) => (prev ? `${prev} ${pill}` : pill))
    }
  }

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Command Indicator */}
        {commandIndicator && (
          <div className="bg-primary-600 px-6 py-2 font-mono text-sm text-white">
            {commandIndicator}
          </div>
        )}

        {/* Conversation History Placeholder */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Conversation history will appear here...
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-300 p-4 dark:border-gray-700">
          <form onSubmit={handleSubmit}>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type to start conversation, or use /help for shortcuts..."
              className="focus:ring-primary-500 min-h-[100px] w-full border-gray-300 bg-white font-mono text-gray-900 placeholder:text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              autoFocus
              data-notes-input="true"
            />
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 mt-2 rounded-md px-4 py-2 text-sm font-medium"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      <FieldModal
        open={fieldModalOpen}
        onOpenChange={setFieldModalOpen}
        field={currentField}
        onSubmit={handleFieldSubmit}
      />

      <HelpModal open={helpModalOpen} onOpenChange={setHelpModalOpen} />
    </>
  )
}
