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

import { KeyValueEditor } from '@/components/shared/KeyValueEditor'
import { FieldModal } from '@/components/shortcuts/FieldModal'
import { COMMAND_TO_KEY, NUMERIC_FIELDS } from '@/config/shortcuts'
import { type ActionCommand, type FieldCommand, useSlashCommands } from '@/hooks/useSlashCommands'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getNodeByKey, $insertNodes, TextNode } from 'lexical'
import { useCallback, useEffect, useState } from 'react'
import { $isPillNode, PillNode } from './nodes/PillNode'

interface NotesPanelProps {
  mode?: 'intake' | 'policy'
  onFieldExtracted?: (fields: Record<string, string | number>) => void
  onFieldRemoved?: (fieldName: string) => void
  onContentChange?: (content: string) => void
  onActionCommand?: (command: ActionCommand) => void
  onCommandError?: (command: string) => void
  editorRef?: React.MutableRefObject<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
  } | null>
  autoFocus?: boolean
}

// NotesPanel-specific plugins that extend KeyValueEditor

// Plugin to extract fields when valid pills are created
function PillFieldExtractionPlugin({
  onFieldExtracted,
}: {
  onFieldExtracted?: (fields: Record<string, string | number>) => void
}): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (!onFieldExtracted) return

    // Listen for pill node mutations (creation)
    const removeMutationListener = editor.registerMutationListener(PillNode, (mutatedNodes) => {
      editor.getEditorState().read(() => {
        const extractedFields: Record<string, string | number> = {}

        for (const [nodeKey, mutation] of mutatedNodes) {
          if (mutation === 'created') {
            const node = $getNodeByKey(nodeKey)
            if ($isPillNode(node) && node.getValidation() === 'valid') {
              const fieldName = node.getFieldName()
              const value = node.getValue()

              if (fieldName && value) {
                // Convert to number if it's a numeric field
                if (NUMERIC_FIELDS.has(fieldName)) {
                  const numValue = Number.parseInt(value, 10)
                  if (!Number.isNaN(numValue)) {
                    extractedFields[fieldName] = numValue
                  }
                } else {
                  extractedFields[fieldName] = value
                }
              }
            }
          }
        }

        // Extract fields and notify parent if any valid pills were created
        if (Object.keys(extractedFields).length > 0) {
          // Call outside of read() to avoid nested updates
          setTimeout(() => {
            onFieldExtracted(extractedFields)
          }, 0)
        }
      })
    })

    return () => {
      removeMutationListener()
    }
  }, [editor, onFieldExtracted])

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

    // Get shortcut key from shortcuts config (ensures no drift)
    const key = COMMAND_TO_KEY[fieldCommand]
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

export function NotesPanel({
  mode = 'intake',
  onFieldExtracted,
  onFieldRemoved,
  onContentChange,
  onActionCommand,
  onCommandError,
  editorRef,
  autoFocus = false,
}: NotesPanelProps) {
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [currentField, setCurrentField] = useState<FieldCommand | null>(null)
  const [fieldValue, setFieldValue] = useState<string | null>(null)
  const [content, setContent] = useState('')

  const handleFieldCommand = useCallback((command: FieldCommand) => {
    setCurrentField(command)
    setFieldModalOpen(true)
  }, [])

  const handleActionCommandLocal = useCallback(
    (command: ActionCommand) => {
      // Pass all action commands to parent - no local handling
      onActionCommand?.(command)
    },
    [onActionCommand]
  )

  const { commandIndicator } = useSlashCommands({
    onFieldCommand: handleFieldCommand,
    onActionCommand: handleActionCommandLocal,
    onCommandError: (command) => {
      // Pass error to parent component
      onCommandError?.(command)
    },
  })

  const handleContentChange = useCallback(
    (text: string) => {
      setContent(text)
      onContentChange?.(text)
    },
    [onContentChange]
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
          <KeyValueEditor
            placeholder={placeholder}
            onContentChange={handleContentChange}
            onFieldRemoved={onFieldRemoved}
            editorRef={editorRef}
            autoFocus={autoFocus}
            contentEditableClassName="focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-400 min-h-[200px] w-full rounded-md border border-gray-300 bg-white p-4 font-mono text-sm text-gray-900 transition-all duration-200 ease-out placeholder:text-gray-500 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            additionalPlugins={
              <>
                <PillFieldExtractionPlugin onFieldExtracted={onFieldExtracted} />
                <FieldInjectionPlugin
                  fieldCommand={currentField}
                  value={fieldValue}
                  onComplete={handleFieldInjectionComplete}
                />
              </>
            }
          />
        </div>
      </div>

      <FieldModal
        open={fieldModalOpen}
        onOpenChange={setFieldModalOpen}
        field={currentField}
        onSubmit={handleFieldSubmit}
      />
    </>
  )
}
