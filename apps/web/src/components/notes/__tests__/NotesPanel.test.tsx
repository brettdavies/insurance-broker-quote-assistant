import '../../../test-setup'
import { describe, expect, it } from 'bun:test'
import { findElement, renderWithQueryClient } from '../../../__tests__/test-utils'
import { NotesPanel } from '../NotesPanel'

describe('NotesPanel', () => {
  const renderNotesPanel = (props?: { mode?: 'intake' | 'policy' }) => {
    return renderWithQueryClient(<NotesPanel mode={props?.mode || 'intake'} />)
  }

  it('renders notes input area with Lexical editor', () => {
    const { container } = renderNotesPanel()
    const editor = findElement(container, '[contenteditable="true"]')
    expect(editor).toBeTruthy()
    expect(editor?.getAttribute('data-lexical-editor')).toBe('true')
  })

  it('renders notes input without form submission', () => {
    const { container } = renderNotesPanel()
    // NotesPanel uses Lexical editor without form submission
    // Content is extracted via pills and debounced LLM calls
    const editor = findElement(container, '[contenteditable="true"]')
    expect(editor).toBeTruthy()
  })

  it('has correct data attribute for notes input', () => {
    const { container } = renderNotesPanel()
    const editor = findElement(container, '[data-notes-input="true"]')
    expect(editor).toBeTruthy()
  })

  it('displays correct placeholder for intake mode', () => {
    const { container } = renderNotesPanel({ mode: 'intake' })
    const placeholder = findElement(container, '.pointer-events-none')
    expect(placeholder?.textContent).toContain('Type notes...')
    expect(placeholder?.textContent).toContain('k:2 for kids')
    expect(placeholder?.textContent).toContain('/help for shortcuts')
  })

  it('displays correct placeholder for policy mode', () => {
    const { container } = renderNotesPanel({ mode: 'policy' })
    const placeholder = findElement(container, '.pointer-events-none')
    expect(placeholder?.textContent).toContain('Type policy details...')
    expect(placeholder?.textContent).toContain('carrier:GEICO')
    expect(placeholder?.textContent).toContain('premium:1200')
  })

  it('renders editor with correct structure', () => {
    const { container } = renderNotesPanel()

    // Verify editor exists (no form needed - uses Lexical with pill extraction)
    const editor = findElement(container, '[contenteditable="true"]')
    expect(editor).toBeTruthy()
    expect(editor?.getAttribute('data-notes-input')).toBe('true')
  })

  it('renders Lexical editor with correct role', () => {
    const { container } = renderNotesPanel()
    const editor = findElement(container, '[contenteditable="true"]')
    expect(editor?.getAttribute('role')).toBe('textbox')
  })

  it('applies correct CSS classes for dark mode support', () => {
    const { container } = renderNotesPanel()
    const editor = findElement(container, '[contenteditable="true"]')
    expect(editor?.className).toContain('dark:bg-gray-800')
    expect(editor?.className).toContain('dark:text-white')
  })

  it('renders with intake mode by default', () => {
    const { container } = renderNotesPanel()
    const placeholder = findElement(container, '.pointer-events-none')
    expect(placeholder?.textContent).toContain('Type notes...')
  })

  it('component mounts without errors', () => {
    const { container } = renderNotesPanel()

    // Verify all essential elements exist
    const editor = findElement(container, '[contenteditable="true"]')
    const notesInput = container.querySelector('[data-notes-input="true"]')

    expect(editor).toBeTruthy()
    expect(notesInput).toBeTruthy()
    // NotesPanel doesn't use form submission - uses Lexical with pill extraction
  })
})

/**
 * Note: Testing Lexical editor interactions (typing, pill transformation, submit)
 * requires complex setup to access the internal Lexical editor instance.
 *
 * These unit tests verify component structure and rendering. Lexical-specific
 * functionality (pills, keyboard shortcuts, submit) should be tested via:
 *
 * 1. Manual browser testing (recommended for MVP)
 * 2. E2E tests with real browser (Playwright/Cypress)
 * 3. Integration tests with Lexical test utilities
 *
 * The current tests ensure the component renders correctly and maintains
 * proper structure for dark mode, placeholder text, and form submission.
 */
