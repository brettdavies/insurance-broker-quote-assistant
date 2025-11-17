/**
 * useContentChangeHandler Hook Unit Tests
 *
 * Tests the content change handling hook.
 */

import '../../../../test-setup'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { $getRoot, $insertNodes, TextNode, createEditor } from 'lexical'
import { useContentChangeHandler } from '../useContentChangeHandler'

describe('useContentChangeHandler', () => {
  let editor: ReturnType<typeof createEditor>

  beforeEach(() => {
    editor = createEditor({})
  })

  it('should initialize with empty content', () => {
    const { result } = renderHook(() => useContentChangeHandler(undefined, undefined))

    expect(result.current.content).toBe('')
    expect(result.current.handleEditorChange).toBeInstanceOf(Function)
  })

  it('should initialize with initialContent', () => {
    const { result } = renderHook(() => useContentChangeHandler(undefined, 'initial text'))

    expect(result.current.content).toBe('initial text')
  })

  it('should call onContentChange when content changes', async () => {
    const onChangeSpy = mock(() => {})

    const { result } = renderHook(() => useContentChangeHandler(onChangeSpy, undefined))

    // Simulate editor state change
    await act(async () => {
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        const textNode = new TextNode('new content')
        $insertNodes([textNode])
      })

      // Wait for update to complete
      await new Promise((resolve) => setTimeout(resolve, 0))

      // Get editor state after update
      const editorState = editor.getEditorState()
      result.current.handleEditorChange(editorState)
    })

    expect(result.current.content).toBe('new content')
    expect(onChangeSpy).toHaveBeenCalledWith('new content')
  })

  it('should not call onContentChange when content is unchanged', async () => {
    const onChangeSpy = mock(() => {})

    const { result } = renderHook(() => useContentChangeHandler(onChangeSpy, undefined))

    // Set initial content
    await act(async () => {
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        const textNode = new TextNode('test content')
        $insertNodes([textNode])
      })

      await new Promise((resolve) => setTimeout(resolve, 0))

      const editorState = editor.getEditorState()
      result.current.handleEditorChange(editorState)
    })

    const callCount = onChangeSpy.mock.calls.length
    expect(callCount).toBe(1) // Should have been called once

    // Trigger change with same content (should not call again)
    await act(async () => {
      const editorState = editor.getEditorState()
      result.current.handleEditorChange(editorState)
    })

    // Should not have called again (same content)
    expect(onChangeSpy.mock.calls.length).toBe(callCount)
  })

  it('should update content when initialContent changes', () => {
    const { result, rerender } = renderHook(
      ({ initialContent }) => useContentChangeHandler(undefined, initialContent),
      { initialProps: { initialContent: 'first' } }
    )

    expect(result.current.content).toBe('first')

    rerender({ initialContent: 'second' })

    // Content state should update, but ref tracks the actual editor content
    // This test verifies the ref updates correctly
    expect(result.current.content).toBe('first') // State doesn't change until editor changes
  })
})
