/**
 * InitialContentPlugin Unit Tests
 *
 * Tests the initial content setting functionality.
 */

import '../../../../test-setup'
import { beforeEach, describe, expect, it } from 'bun:test'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { render, waitFor } from '@testing-library/react'
import { InitialContentPlugin } from '../InitialContentPlugin'
import { editorConfig } from '../editor-config'

describe('InitialContentPlugin', () => {
  it('should set initial content when provided', async () => {
    const { container } = render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <InitialContentPlugin content="Initial text content" />
      </LexicalComposer>
    )

    const contentEditable = container.querySelector<HTMLElement>('[contenteditable="true"]')
    expect(contentEditable).toBeTruthy()

    await waitFor(
      () => {
        expect(contentEditable?.textContent).toContain('Initial text content')
      },
      { timeout: 1000 }
    )
  })

  it('should not set content when editor already has content', async () => {
    const { container, rerender } = render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <InitialContentPlugin content="First content" />
      </LexicalComposer>
    )

    const contentEditable = container.querySelector<HTMLElement>('[contenteditable="true"]')
    expect(contentEditable).toBeTruthy()

    await waitFor(() => {
      expect(contentEditable?.textContent).toContain('First content')
    })

    // Try to set different content - should not override
    rerender(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <InitialContentPlugin content="Second content" />
      </LexicalComposer>
    )

    // Should still have first content
    await waitFor(() => {
      expect(contentEditable?.textContent).toContain('First content')
    })
  })

  it('should handle undefined content', async () => {
    const { container } = render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <InitialContentPlugin content={undefined} />
      </LexicalComposer>
    )

    const contentEditable = container.querySelector<HTMLElement>('[contenteditable="true"]')
    expect(contentEditable).toBeTruthy()

    // Should not crash and editor should be empty
    await waitFor(() => {
      expect(contentEditable?.textContent?.trim() || '').toBe('')
    })
  })

  it('should handle empty string content', async () => {
    const { container } = render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <InitialContentPlugin content="" />
      </LexicalComposer>
    )

    const contentEditable = container.querySelector<HTMLElement>('[contenteditable="true"]')
    expect(contentEditable).toBeTruthy()

    // Empty string should not set content (only truthy values)
    await waitFor(() => {
      const text = contentEditable?.textContent?.trim() || ''
      expect(text).toBe('')
    })
  })
})
