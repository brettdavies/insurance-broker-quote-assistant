/**
 * EditorRefPlugin Unit Tests
 *
 * Tests the editor ref exposure functionality.
 */

import '../../../../test-setup'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { render, waitFor } from '@testing-library/react'
import { EditorRefPlugin } from '../EditorRefPlugin'
import { editorConfig } from '../editor-config'
import type { EditorRefObject } from '../types'

describe('EditorRefPlugin', () => {
  it('should expose editor methods via ref', async () => {
    const editorRef: EditorRefObject = { current: null }

    render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <EditorRefPlugin editorRef={editorRef} />
      </LexicalComposer>
    )

    await waitFor(
      () => {
        expect(editorRef.current).toBeTruthy()
        expect(editorRef.current?.focus).toBeInstanceOf(Function)
        expect(editorRef.current?.clear).toBeInstanceOf(Function)
        expect(editorRef.current?.insertText).toBeInstanceOf(Function)
        expect(editorRef.current?.setContent).toBeInstanceOf(Function)
        expect(editorRef.current?.getTextWithoutPills).toBeInstanceOf(Function)
        expect(editorRef.current?.getEditor).toBeInstanceOf(Function)
      },
      { timeout: 1000 }
    )
  })

  it('should allow focusing the editor', async () => {
    const editorRef: EditorRefObject = { current: null }
    const { container } = render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <EditorRefPlugin editorRef={editorRef} />
      </LexicalComposer>
    )

    await waitFor(() => {
      expect(editorRef.current).toBeTruthy()
    })

    const contentEditable = container.querySelector<HTMLElement>('[contenteditable="true"]')
    expect(contentEditable).toBeTruthy()
    if (!contentEditable) return

    // Mock focus to verify it's called
    let focusCalled = false
    const originalFocus = contentEditable.focus
    contentEditable.focus = () => {
      focusCalled = true
      originalFocus.call(contentEditable)
    }

    editorRef.current?.focus()

    // Focus should be called (may be async, so wait a bit)
    await waitFor(
      () => {
        expect(focusCalled).toBe(true)
      },
      { timeout: 500 }
    )

    contentEditable.focus = originalFocus
  })

  it('should allow clearing the editor', async () => {
    const editorRef: EditorRefObject = { current: null }

    render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <EditorRefPlugin editorRef={editorRef} />
      </LexicalComposer>
    )

    await waitFor(() => {
      expect(editorRef.current).toBeTruthy()
    })

    // Add some content first
    editorRef.current?.insertText('test content')

    await waitFor(() => {
      const text = editorRef.current?.getTextWithoutPills()
      expect(text).toContain('test')
    })

    // Clear it
    editorRef.current?.clear()

    await waitFor(() => {
      const text = editorRef.current?.getTextWithoutPills()
      expect(text).toBe('')
    })
  })

  it('should allow inserting text', async () => {
    const editorRef: EditorRefObject = { current: null }

    render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <EditorRefPlugin editorRef={editorRef} />
      </LexicalComposer>
    )

    await waitFor(() => {
      expect(editorRef.current).toBeTruthy()
    })

    editorRef.current?.insertText('Hello World')

    await waitFor(() => {
      const text = editorRef.current?.getTextWithoutPills()
      expect(text).toContain('Hello World')
    })
  })

  it('should allow setting content', async () => {
    const editorRef: EditorRefObject = { current: null }

    render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <EditorRefPlugin editorRef={editorRef} />
      </LexicalComposer>
    )

    await waitFor(() => {
      expect(editorRef.current).toBeTruthy()
    })

    editorRef.current?.setContent('New content')

    await waitFor(() => {
      const text = editorRef.current?.getTextWithoutPills()
      expect(text).toBe('New content')
    })
  })

  it('should return editor instance', async () => {
    const editorRef: EditorRefObject = { current: null }

    render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <EditorRefPlugin editorRef={editorRef} />
      </LexicalComposer>
    )

    await waitFor(() => {
      expect(editorRef.current).toBeTruthy()
    })

    const editor = editorRef.current?.getEditor()
    expect(editor).toBeTruthy()
    expect(editor?.getRootElement).toBeInstanceOf(Function)
  })
})
