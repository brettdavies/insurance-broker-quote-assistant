/**
 * Editor Ref Plugin
 *
 * Exposes editor instance methods via ref for programmatic control.
 * Single Responsibility: Editor ref management only
 */

import { transformTextToPills } from '@/hooks/usePillTransformation'
import { parseKeyValueSyntax } from '@/lib/pill-parser'
import { extractTextWithoutPills } from '@/lib/text-extraction'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $insertNodes, $isTextNode, TextNode } from 'lexical'
import { useEffect } from 'react'
import type { EditorRefObject } from './types'

interface EditorRefPluginProps {
  editorRef?: EditorRefObject
}

/**
 * Helper to insert text and handle pill transformation
 */
function insertTextWithTransformation(editor: import('lexical').LexicalEditor, text: string): void {
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

  // Trigger transformation after a brief delay to ensure mutation listener fires
  // This ensures pills are created when text is inserted programmatically
  requestAnimationFrame(() => {
    setTimeout(() => {
      editor.update(() => {
        // Check the last text node and transform if needed
        const root = $getRoot()
        const lastChild = root.getLastChild()
        if (lastChild && $isTextNode(lastChild)) {
          const nodeText = lastChild.getTextContent()
          const parsed = parseKeyValueSyntax(nodeText)
          if (parsed.length > 0) {
            // Only transform if the text ends with a space (delimiter)
            // This prevents transforming while user is still typing
            if (nodeText.trim().length > 0 && (nodeText.endsWith(' ') || nodeText.endsWith('\n'))) {
              transformTextToPills(lastChild, parsed)
            }
          }
        }
      })
    }, 0)
  })
}

/**
 * Helper to set content in editor
 */
function setEditorContent(editor: import('lexical').LexicalEditor, text: string): void {
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
}

export function EditorRefPlugin({ editorRef }: EditorRefPluginProps): null {
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
          insertTextWithTransformation(editor, text)
        },
        setContent: (text: string) => {
          setEditorContent(editor, text)
        },
        getTextWithoutPills: () => {
          return extractTextWithoutPills(editor)
        },
        getEditor: () => editor,
      }
    }
  }, [editor, editorRef])

  return null
}
