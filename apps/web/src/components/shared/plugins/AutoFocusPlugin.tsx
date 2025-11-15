/**
 * Auto Focus Plugin
 *
 * Automatically focuses the editor when autoFocus prop is true.
 * Single Responsibility: Auto-focus management only
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

interface AutoFocusPluginProps {
  autoFocus?: boolean
}

export function AutoFocusPlugin({ autoFocus }: AutoFocusPluginProps): null {
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
