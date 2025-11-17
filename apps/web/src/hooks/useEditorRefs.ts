/**
 * useEditorRefs Hook
 *
 * Manages all editor refs and exposes them to window for debugging.
 *
 * Single Responsibility: Editor ref management only
 */

import type { UserProfile } from '@repo/shared'
import { useEffect, useRef } from 'react'

interface EditorRef {
  focus: () => void
  clear: () => void
  insertText: (text: string) => void
  setContent: (text: string) => void
  getTextWithoutPills: () => string
  getEditor: () => import('lexical').LexicalEditor
}

interface UseEditorRefsParams {
  externalEditorRef?: React.MutableRefObject<EditorRef | null>
  profile: UserProfile
}

export function useEditorRefs({ externalEditorRef, profile }: UseEditorRefsParams) {
  const internalEditorRef = useRef<EditorRef | null>(null)
  const editorRef = externalEditorRef || internalEditorRef
  const editorContentRef = useRef<string>('')

  const uploadPanelFileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadPanelEditorRef = useRef<EditorRef | null>(null)

  // Expose editor and profile to window for evaluation harness
  useEffect(() => {
    if (typeof window !== 'undefined') {
      interface WindowWithDebug extends Window {
        editorRef?: typeof editorRef
        profile?: typeof profile
        __profileState?: UserProfile
      }
      const win = window as unknown as WindowWithDebug
      win.editorRef = editorRef
      win.profile = profile
      win.__profileState = profile
    }
  }, [editorRef, profile])

  return {
    editorRef,
    editorContentRef,
    uploadPanelFileInputRef,
    uploadPanelEditorRef,
  }
}
