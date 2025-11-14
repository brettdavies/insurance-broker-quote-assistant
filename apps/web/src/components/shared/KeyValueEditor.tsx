/**
 * Key Value Editor Component
 *
 * Shared Lexical editor component with key-value pill support.
 * Extracted from NotesPanel for reuse across different contexts.
 *
 * Provides:
 * - Lexical editor with pill system
 * - Key-value syntax parsing
 * - Content change handling
 * - Editor ref for programmatic control
 */

import { extractTextWithoutPills } from '@/lib/text-extraction'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import {
  $getRoot,
  $getSelection,
  $insertNodes,
  $isTextNode,
  $setSelection,
  type EditorState,
  ParagraphNode,
  TextNode,
} from 'lexical'
import { useCallback, useEffect, useState } from 'react'
import { PillNode } from '../notes/nodes/PillNode'
import { KeyValuePlugin } from '../notes/plugins/KeyValuePlugin'
import { PillInteractionPlugin } from '../notes/plugins/PillInteractionPlugin'

// Lexical editor configuration
const editorConfig = {
  namespace: 'KeyValueEditor',
  nodes: [PillNode],
  onError(error: Error) {
    console.error('Lexical error:', error)
  },
  theme: {
    root: 'focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-400 min-h-[150px] w-full rounded-md border border-gray-300 bg-white p-4 font-mono text-sm text-gray-900 transition-all duration-200 ease-out placeholder:text-gray-500 focus:outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500',
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
    },
  },
}

// Plugin to expose editor instance via ref
function EditorRefPlugin({
  editorRef,
}: {
  editorRef?: React.MutableRefObject<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
    getTextWithoutPills: () => string
    getEditor: () => import('lexical').LexicalEditor
  } | null>
}): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (editorRef) {
      editorRef.current = {
        focus: () => {
          const rootElement = editor.getRootElement()
          if (rootElement) {
            rootElement.focus()
          }
        },
        clear: () => {
          editor.update(() => {
            $getRoot().clear()
          })
        },
        insertText: (text: string) => {
          editor.update(() => {
            const root = $getRoot()
            const lastChild = root.getLastChild()

            // If there's existing text, append to it; otherwise create new node
            if (lastChild && $isTextNode(lastChild)) {
              const currentText = lastChild.getTextContent()
              lastChild.setTextContent(currentText + text)
              // Select at the end of the text
              lastChild.select(lastChild.getTextContentSize(), lastChild.getTextContentSize())
            } else {
              // Use standard Lexical API: select root first, then insert
              root.selectStart()
              const textNode = new TextNode(text)
              $insertNodes([textNode])
              // Select at the end of the text
              textNode.select(textNode.getTextContentSize(), textNode.getTextContentSize())
            }
          })
        },
        setContent: (text: string) => {
          editor.update(() => {
            const root = $getRoot()
            root.clear()
            if (text) {
              // For PlainTextPlugin, we need to ensure selection exists before inserting
              // Select the root first, then insert
              root.selectStart()
              const textNode = new TextNode(text)
              $insertNodes([textNode])
              // Move selection to end of text
              textNode.select(textNode.getTextContentSize(), textNode.getTextContentSize())
            }
          })
        },
        getTextWithoutPills: () => {
          return extractTextWithoutPills(editor)
        },
        getEditor: () => editor,
      } as NonNullable<
        React.MutableRefObject<{
          focus: () => void
          clear: () => void
          insertText: (text: string) => void
          setContent: (text: string) => void
          getTextWithoutPills: () => string
          getEditor: () => import('lexical').LexicalEditor
        } | null>['current']
      >
    }
  }, [editor, editorRef])

  return null
}

// Auto-focus plugin
function AutoFocusPlugin({ autoFocus }: { autoFocus?: boolean }): null {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (autoFocus) {
      // Delay to ensure DOM and content are ready (especially after transition)
      const timeoutId = setTimeout(() => {
        const rootElement = editor.getRootElement()
        if (rootElement) {
          rootElement.focus()
          // Place cursor at end of content
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            range.selectNodeContents(rootElement)
            range.collapse(false)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      }, 200)

      return () => clearTimeout(timeoutId)
    }
  }, [editor, autoFocus])

  return null
}

export interface KeyValueEditorProps {
  placeholder?: string
  onContentChange?: (content: string) => void
  onFieldRemoved?: (fieldName: string) => void
  editorRef?: React.MutableRefObject<{
    focus: () => void
    clear: () => void
    insertText: (text: string) => void
    setContent: (text: string) => void
    getTextWithoutPills: () => string
    getEditor: () => import('lexical').LexicalEditor
  } | null>
  autoFocus?: boolean
  className?: string
  additionalPlugins?: React.ReactNode
  contentEditableClassName?: string
  initialContent?: string
}

export function KeyValueEditor({
  placeholder = 'Type here...',
  onContentChange,
  onFieldRemoved,
  editorRef,
  autoFocus = false,
  className,
  additionalPlugins,
  contentEditableClassName,
  initialContent,
}: KeyValueEditorProps) {
  const [content, setContent] = useState(initialContent || '')

  const handleEditorChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const root = $getRoot()
        const text = root.getTextContent()
        setContent(text)
        onContentChange?.(text)
      })
    },
    [onContentChange]
  )

  // Plugin to set initial content
  function InitialContentPlugin({ content }: { content?: string }): null {
    const [editor] = useLexicalComposerContext()

    useEffect(() => {
      if (content !== undefined) {
        editor.update(() => {
          const root = $getRoot()
          const currentText = root.getTextContent()
          // Only set if editor is empty and content is provided
          if (!currentText && content) {
            root.clear()
            // Use standard Lexical API: select root first, then insert
            root.selectStart()
            const textNode = new TextNode(content)
            $insertNodes([textNode])
          }
        })
      }
    }, [editor, content])

    return null
  }

  // Plugin to add data attribute to contentEditable element
  function DataAttributePlugin(): null {
    const [editor] = useLexicalComposerContext()

    useEffect(() => {
      // Wait for editor to be ready and DOM to be available
      const addAttributes = () => {
        const rootElement = editor.getRootElement()
        if (rootElement) {
          const contentEditable = rootElement.querySelector('[contenteditable="true"]')
          if (contentEditable) {
            contentEditable.setAttribute('data-notes-input', 'true')
            contentEditable.setAttribute('data-lexical-editor', 'true')
            contentEditable.setAttribute('role', 'textbox')
            return true
          }
        }
        return false
      }

      // Try immediately
      if (!addAttributes()) {
        // If not ready, try after a short delay (DOM might not be ready yet)
        const timeoutId = setTimeout(() => {
          addAttributes()
        }, 0)
        return () => clearTimeout(timeoutId)
      }
    }, [editor])

    return null
  }

  return (
    <div className={className}>
      <div className="relative">
        <LexicalComposer initialConfig={editorConfig}>
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                className={contentEditableClassName || editorConfig.theme.root}
                data-notes-input="true"
                data-lexical-editor="true"
                role="textbox"
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
          <EditorRefPlugin editorRef={editorRef} />
          <AutoFocusPlugin autoFocus={autoFocus} />
          <InitialContentPlugin content={initialContent} />
          <DataAttributePlugin />
          <KeyValuePlugin />
          <PillInteractionPlugin onFieldRemoved={onFieldRemoved} />
          {additionalPlugins}
        </LexicalComposer>
      </div>
    </div>
  )
}
