/**
 * Key Value Editor Component
 *
 * Shared Lexical editor component with key-value pill support.
 * Composes plugins and provides editor functionality.
 *
 * Single Responsibility: Component composition and orchestration
 */

import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { KeyValuePlugin } from '../notes/plugins/KeyValuePlugin'
import { PillInteractionPlugin } from '../notes/plugins/PillInteractionPlugin'
import {
  AutoFocusPlugin,
  DataAttributePlugin,
  DynamicHeightPlugin,
  type EditorRefObject,
  EditorRefPlugin,
  InitialContentPlugin,
  useContentChangeHandler,
} from './plugins'
import { editorConfig } from './plugins/editor-config'

export interface KeyValueEditorProps {
  placeholder?: string
  onContentChange?: (content: string) => void
  onFieldRemoved?: (fieldName: string) => void
  editorRef?: EditorRefObject
  autoFocus?: boolean
  className?: string
  additionalPlugins?: React.ReactNode
  contentEditableClassName?: string
  initialContent?: string
}

// Re-export types for convenience
export type { EditorRef, EditorRefObject } from './plugins'

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
  const { content, handleEditorChange } = useContentChangeHandler(onContentChange, initialContent)

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
          <DynamicHeightPlugin />
          <KeyValuePlugin />
          <PillInteractionPlugin onFieldRemoved={onFieldRemoved} />
          {additionalPlugins}
        </LexicalComposer>
      </div>
    </div>
  )
}
