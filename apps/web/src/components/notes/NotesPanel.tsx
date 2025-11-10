/**
 * Notes Panel Component
 *
 * Unified notes component with inline pill system for key-value pairs.
 * Uses Lexical editor for production-ready pill handling.
 *
 * For MVP, we'll use a simplified contentEditable approach with manual
 * pill transformation. Full Lexical implementation can be added as enhancement.
 */

import { FieldModal } from '@/components/shortcuts/FieldModal'
import { HelpModal } from '@/components/shortcuts/HelpModal'
import { type ActionCommand, type FieldCommand, useSlashCommands } from '@/hooks/useSlashCommands'
import { parseKeyValueSyntax } from '@/lib/key-value-parser'
import { useCallback, useEffect, useRef, useState } from 'react'

interface NotesPanelProps {
  mode?: 'intake' | 'policy'
  onMessageSubmit?: (message: string) => void
}

export function NotesPanel({ mode = 'intake', onMessageSubmit }: NotesPanelProps) {
  const [content, setContent] = useState('')
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [currentField, setCurrentField] = useState<FieldCommand | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

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

  // Transform key-value pairs to pills on input
  // Handle pill interactions: backspace/delete removes pill, double-click reverts to text
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    let pillNode: HTMLElement | null = null

    // Check if cursor is right before or inside a pill
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      // Cursor is in text node - check next sibling
      pillNode = range.startContainer.nextSibling as HTMLElement
    } else {
      // Cursor might be directly in pill element
      pillNode = range.startContainer as HTMLElement
    }

    // Also check parent if it's a pill
    if (pillNode && !pillNode.hasAttribute('data-pill')) {
      const parent = pillNode.parentElement
      if (parent?.hasAttribute('data-pill')) {
        pillNode = parent
      }
    }

    if ((e.key === 'Backspace' || e.key === 'Delete') && pillNode?.hasAttribute('data-pill')) {
      e.preventDefault()
      // Remove the pill
      pillNode.remove()
      setContent(target.textContent || '')

      // Restore focus
      target.focus()
    }
  }, [])

  // Handle double-click on pill to revert to plain text
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.hasAttribute('data-pill')) {
      const pillText = target.textContent || ''
      const textNode = document.createTextNode(pillText)
      target.parentNode?.replaceChild(textNode, target)
      setContent(e.currentTarget.textContent || '')
    }
  }, [])

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const text = target.textContent || ''

    // Parse key-value pairs
    const parsed = parseKeyValueSyntax(text)

    if (parsed.length > 0) {
      // Create HTML with pills
      let html = text
      for (const match of parsed) {
        const pillHtml = createPillHtml(match)
        html = html.replace(match.original, pillHtml)
      }

      // Update content (but preserve cursor position)
      const selection = window.getSelection()
      const range = selection?.getRangeAt(0)
      const cursorOffset = range?.startOffset || 0

      target.innerHTML = html

      // Restore cursor position
      if (range && target.firstChild) {
        const newRange = document.createRange()
        newRange.setStart(
          target.firstChild,
          Math.min(cursorOffset, target.textContent?.length || 0)
        )
        newRange.collapse(true)
        selection?.removeAllRanges()
        selection?.addRange(newRange)
      }
    }

    setContent(text)
  }, [])

  const createPillHtml = (match: ReturnType<typeof parseKeyValueSyntax>[0]) => {
    let pillClasses =
      'inline-flex items-center rounded px-2 py-0.5 font-mono text-xs font-medium pill-animate transition-all hover:scale-105'
    switch (match.validation) {
      case 'valid':
        pillClasses += ' bg-green-500 text-white shadow-sm'
        break
      case 'invalid_key':
        pillClasses += ' bg-red-500 text-white shadow-sm'
        break
      case 'invalid_value':
        pillClasses += ' bg-yellow-500 text-black shadow-sm'
        break
    }

    return `<span contenteditable="false" data-key="${match.key}" data-value="${match.value}" data-pill="true" class="${pillClasses}">${match.original}</span>`
  }

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const text = editorRef.current?.textContent || ''
      if (text.trim() && onMessageSubmit) {
        onMessageSubmit(text)
        setContent('')
        if (editorRef.current) {
          editorRef.current.textContent = ''
        }
      }
    },
    [onMessageSubmit]
  )

  const handleFieldSubmit = useCallback(
    (value: string) => {
      if (currentField && editorRef.current) {
        // Map field command back to shortcut key
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
        const key = fieldToKey[currentField]
        const pill = `${key}:${value}`

        // Insert pill at cursor position
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          range.deleteContents()

          const textNode = document.createTextNode(`${pill} `)
          range.insertNode(textNode)

          // Move cursor after inserted text
          range.setStartAfter(textNode)
          range.collapse(true)
          selection.removeAllRanges()
          selection.addRange(range)

          // Trigger input event to transform pill
          editorRef.current.dispatchEvent(new Event('input', { bubbles: true }))
        } else {
          // Fallback: append to end
          const currentText = editorRef.current.textContent || ''
          editorRef.current.textContent = currentText ? `${currentText} ${pill}` : pill
          handleInput({ currentTarget: editorRef.current } as React.FormEvent<HTMLDivElement>)
        }
      }
    },
    [currentField, handleInput]
  )

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
            <div
              ref={editorRef}
              contentEditable
              data-notes-input="true"
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onDoubleClick={handleDoubleClick}
              className="focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-400 min-h-[200px] w-full rounded-md border border-gray-300 bg-white p-4 font-mono text-sm text-gray-900 transition-all duration-200 ease-out placeholder:text-gray-500 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              suppressContentEditableWarning
            />
            {!content && (
              <div className="pointer-events-none absolute left-4 top-4 font-mono text-sm text-gray-500 dark:text-gray-400">
                {placeholder}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="border-t border-gray-300 p-4 dark:border-gray-700">
          <form onSubmit={handleSubmit}>
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
