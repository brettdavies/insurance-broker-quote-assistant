/**
 * KeyValueEditor Plugin Types
 *
 * Shared types for KeyValueEditor plugins and refs.
 */

export interface EditorRef {
  focus: () => void
  clear: () => void
  insertText: (text: string) => void
  setContent: (text: string) => void
  getTextWithoutPills: () => string
  getEditor: () => import('lexical').LexicalEditor
}

export type EditorRefObject = React.MutableRefObject<EditorRef | null>
