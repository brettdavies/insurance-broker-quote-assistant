/**
 * Content Change Handler Hook
 *
 * Manages editor content state and only triggers callbacks when text actually changes.
 * Prevents unnecessary inference runs on focus/blur/selection changes.
 */

import { $getRoot, type EditorState } from 'lexical'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseContentChangeHandlerResult {
  content: string
  handleEditorChange: (editorState: EditorState) => void
}

/**
 * Hook to handle editor content changes, only triggering callbacks when text actually changes
 */
export function useContentChangeHandler(
  onContentChange?: (content: string) => void,
  initialContent?: string
): UseContentChangeHandlerResult {
  const [content, setContent] = useState(initialContent || '')
  const previousContentRef = useRef<string>(initialContent || '')

  // Update ref when initialContent changes
  useEffect(() => {
    if (initialContent !== undefined) {
      previousContentRef.current = initialContent
    }
  }, [initialContent])

  const handleEditorChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const root = $getRoot()
        const text = root.getTextContent()

        // Only trigger onContentChange if content has actually changed
        // This prevents unnecessary inference runs on focus/blur/selection changes
        if (text !== previousContentRef.current) {
          previousContentRef.current = text
          setContent(text)
          onContentChange?.(text)
        }
      })
    },
    [onContentChange]
  )

  return { content, handleEditorChange }
}
