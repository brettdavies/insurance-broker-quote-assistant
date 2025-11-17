/**
 * Initial Content Plugin
 *
 * Sets initial content in the editor when provided.
 * Single Responsibility: Initial content management only
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $getRoot, $insertNodes, TextNode } from 'lexical'
import { useEffect } from 'react'

interface InitialContentPluginProps {
  content?: string
}

export function InitialContentPlugin({ content }: InitialContentPluginProps): null {
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
