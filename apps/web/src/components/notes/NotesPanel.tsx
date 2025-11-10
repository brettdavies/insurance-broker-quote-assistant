/**
 * Notes Panel Component
 *
 * Unified notes component with inline pill system for key-value pairs.
 * Uses Lexical editor for production-ready pill handling with support for:
 * - Undo/redo
 * - Cursor management
 * - Copy/paste
 * - IME input
 * - Atomic pill deletion
 */

import { FieldModal } from '@/components/shortcuts/FieldModal'
import { HelpModal } from '@/components/shortcuts/HelpModal'
import {
  type ActionCommand,
  type FieldCommand,
  useSlashCommands,
} from '@/hooks/useSlashCommands'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { $getRoot, $insertNodes, type EditorState, type LexicalEditor, TextNode } from 'lexical'
import { useCallback, useEffect, useState } from 'react'
import { PillNode } from './nodes/PillNode'
import { KeyValuePlugin } from './plugins/KeyValuePlugin'
import { PillInteractionPlugin } from './plugins/PillInteractionPlugin'

interface NotesPanelProps {
  mode?: 'intake' | 'policy'
  onMessageSubmit?: (message: string) => void
}

// Lexical editor configuration
const editorConfig = {
  namespace: 'NotesEditor',
  nodes: [PillNode],
  onError(error: Error) {
    console.error('Lexical error:', error)
  },
  theme: {
    root: 'focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-400 min-h-[200px] w-full rounded-md border border-gray-300 bg-white p-4 font-mono text-sm text-gray-900 transition-all duration-200 ease-out placeholder:text-gray-500 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500',
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
    },
  },
}

// Submit handler plugin
function SubmitPlugin({
  onSubmit,
}: {
  onSubmit: (text: string, editor: LexicalEditor) => void
}): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Ctrl/Cmd+Enter for submit
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        editor.getEditorState().read(() => {
          const text = $getRoot().getTextContent()
          onSubmit(text, editor)
        })
      }
    }

    const rootElement = editor.getRootElement()
    if (rootElement) {
      rootElement.addEventListener('keydown', handleKeyDown)
      return () => {
        rootElement.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [editor, onSubmit])

  return null
}

// Field injection plugin
function FieldInjectionPlugin({
  fieldCommand,
  value,
  onComplete,
}: {
  fieldCommand: FieldCommand | null
  value: string | null
  onComplete: () => void
}): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!fieldCommand || !value) return

    // Map field command to shortcut key
    const fieldToKey: Record<FieldCommand, string> = {
      name: 'n',
      email: 'e',
      phone: 'p',
      state: 's',
      zip: 'z',
      productLine: 'l',
      age: 'a',
      household: 'h',
      kids: 'k',
      dependents: 'd',
      vehicles: 'v',
      garage: 'g',
      vins: 'i',
      drivers: 'r',
      drivingRecords: 'c',
      cleanRecord: 'u',
      ownsHome: 'o',
      propertyType: 't',
      constructionYear: 'y',
      roofType: 'f',
      squareFeet: 'q',
      existingPolicies: 'w',
      currentPremium: 'm',
      deductibles: 'b',
      limits: 'x',
    }

    const key = fieldToKey[fieldCommand]
    const pill = `${key}:${value}`

    editor.update(() => {
      const textNode = new TextNode(`${pill} `)
      $insertNodes([textNode])
      textNode.selectNext()
    })

    onComplete()
  }, [fieldCommand, value, editor, onComplete])

  return null
}

export function NotesPanel({ mode = 'intake', onMessageSubmit }: NotesPanelProps) {
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [currentField, setCurrentField] = useState<FieldCommand | null>(null)
  const [fieldValue, setFieldValue] = useState<string | null>(null)
  const [content, setContent] = useState('')

  const handleFieldCommand = useCallback((command: FieldCommand) => {
    setCurrentField(command)
    setFieldModalOpen(true)
  }, [])

  const handleActionCommand = useCallback((command: ActionCommand) => {
    if (command === 'help') {
      setHelpModalOpen(true)
    } else {
      // Other actions stubbed for future stories
      console.log('Action command:', command)
    }
  }, [])

  const { commandIndicator } = useSlashCommands({
    onFieldCommand: handleFieldCommand,
    onActionCommand: handleActionCommand,
  })

  const handleEditorChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      const text = $getRoot().getTextContent()
      setContent(text)
    })
  }, [])

  const handleSubmit = useCallback(
    (text: string, editor: LexicalEditor) => {
      if (text.trim() && onMessageSubmit) {
        onMessageSubmit(text)
        // Clear editor
        editor.update(() => {
          $getRoot().clear()
        })
        setContent('')
      }
    },
    [onMessageSubmit]
  )

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (content.trim() && onMessageSubmit) {
        onMessageSubmit(content)
        setContent('')
      }
    },
    [content, onMessageSubmit]
  )

  const handleFieldSubmit = useCallback((value: string) => {
    setFieldValue(value)
    setFieldModalOpen(false)
  }, [])

  const handleFieldInjectionComplete = useCallback(() => {
    setFieldValue(null)
    setCurrentField(null)
  }, [])

  const placeholder =
    mode === 'intake'
      ? 'Type notes... (k:2 for kids, v:3 for vehicles, /k for modal, /help for shortcuts)'
      : 'Type policy details... (carrier:GEICO, premium:1200, /help for shortcuts)'

  return (
    <>
      <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
        {/* Command Indicator */}
        {commandIndicator && (
          <div className="bg-primary-600 px-6 py-2 font-mono text-sm text-white">
            {commandIndicator}
          </div>
        )}

        {/* Notes Input Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="relative">
            <LexicalComposer initialConfig={editorConfig}>
              <PlainTextPlugin
                contentEditable={
                  <ContentEditable
                    className="focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-400 min-h-[200px] w-full rounded-md border border-gray-300 bg-white p-4 font-mono text-sm text-gray-900 transition-all duration-200 ease-out placeholder:text-gray-500 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    data-notes-input="true"
                  />
                }
                placeholder={
                  !content ? (
                    <div className="pointer-events-none absolute left-4 top-4 font-mono text-sm text-gray-500 dark:text-gray-400">
                      {placeholder}
                    </div>
                  ) : null
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <OnChangePlugin onChange={handleEditorChange} />
              <KeyValuePlugin />
              <PillInteractionPlugin />
              <SubmitPlugin onSubmit={handleSubmit} />
              <FieldInjectionPlugin
                fieldCommand={currentField}
                value={fieldValue}
                onComplete={handleFieldInjectionComplete}
              />
            </LexicalComposer>
          </div>
        </div>

        {/* Submit Button */}
        <div className="border-t border-gray-300 p-4 dark:border-gray-700">
          <form onSubmit={handleFormSubmit}>
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 ease-out hover:scale-105 hover:shadow-md active:scale-95"
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
