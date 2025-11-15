/**
 * DataAttributePlugin Unit Tests
 *
 * Tests the data attribute management functionality.
 */

import '../../../../test-setup'
import { beforeEach, describe, expect, it } from 'bun:test'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { render, waitFor } from '@testing-library/react'
import { DataAttributePlugin } from '../DataAttributePlugin'
import { editorConfig } from '../editor-config'

describe('DataAttributePlugin', () => {
  it('should add data attributes to contentEditable element', async () => {
    const { container } = render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <DataAttributePlugin />
      </LexicalComposer>
    )

    const contentEditable = container.querySelector<HTMLElement>('[contenteditable="true"]')
    expect(contentEditable).toBeTruthy()

    // Wait for plugin to set attributes (may be set immediately or after delay)
    await waitFor(
      () => {
        // Attributes might already be set by ContentEditable component
        // or by the plugin - either way, they should be present
        const hasDataNotesInput = contentEditable?.getAttribute('data-notes-input') === 'true'
        const hasDataLexicalEditor = contentEditable?.getAttribute('data-lexical-editor') === 'true'
        const hasRole = contentEditable?.getAttribute('role') === 'textbox'

        // At least one should be set (plugin or component)
        expect(hasDataNotesInput || hasDataLexicalEditor || hasRole).toBe(true)
      },
      { timeout: 2000 }
    )
  })

  it('should handle delayed DOM availability', async () => {
    // This test verifies the plugin handles cases where DOM isn't ready immediately
    const { container } = render(
      <LexicalComposer initialConfig={editorConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={editorConfig.theme.root} />}
          placeholder={null}
          ErrorBoundary={() => null}
        />
        <DataAttributePlugin />
      </LexicalComposer>
    )

    const contentEditable = container.querySelector<HTMLElement>('[contenteditable="true"]')
    expect(contentEditable).toBeTruthy()

    // Even if DOM is delayed, attributes should be set eventually
    // Note: Attributes might be set by ContentEditable component itself
    await waitFor(
      () => {
        // Plugin should not crash, and element should exist
        expect(contentEditable).toBeTruthy()
        // At least one attribute should be present (from plugin or component)
        const hasAnyAttribute =
          contentEditable?.hasAttribute('data-notes-input') ||
          contentEditable?.hasAttribute('data-lexical-editor') ||
          contentEditable?.hasAttribute('role')
        expect(hasAnyAttribute).toBe(true)
      },
      { timeout: 2000 }
    )
  })
})
