import '../../../test-setup'
import { beforeEach, describe, expect, it } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { NotesPanel } from '../NotesPanel'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('NotesPanel', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
  })

  const renderNotesPanel = (props?: { mode?: 'intake' | 'policy' }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NotesPanel mode={props?.mode || 'intake'} />
      </QueryClientProvider>
    )
  }

  it('renders notes input area with Lexical editor', () => {
    const { container } = renderNotesPanel()
    const editor = container.querySelector('[contenteditable="true"]')
    expect(editor).toBeTruthy()
    expect(editor?.getAttribute('data-lexical-editor')).toBe('true')
  })

  it('renders submit button', () => {
    const { container } = renderNotesPanel()
    const submitButton = container.querySelector('button[type="submit"]')
    expect(submitButton).toBeTruthy()
    expect(submitButton?.textContent).toBe('Send')
  })

  it('has correct data attribute for notes input', () => {
    const { container } = renderNotesPanel()
    const editor = container.querySelector('[data-notes-input="true"]')
    expect(editor).toBeTruthy()
  })

  it('displays correct placeholder for intake mode', () => {
    const { container } = renderNotesPanel({ mode: 'intake' })
    const placeholder = container.querySelector('.pointer-events-none')
    expect(placeholder?.textContent).toContain('Type notes...')
    expect(placeholder?.textContent).toContain('k:2 for kids')
    expect(placeholder?.textContent).toContain('/help for shortcuts')
  })

  it('displays correct placeholder for policy mode', () => {
    const { container } = renderNotesPanel({ mode: 'policy' })
    const placeholder = container.querySelector('.pointer-events-none')
    expect(placeholder?.textContent).toContain('Type policy details...')
    expect(placeholder?.textContent).toContain('carrier:GEICO')
    expect(placeholder?.textContent).toContain('premium:1200')
  })

  it('renders form with correct structure', () => {
    const { container } = renderNotesPanel()

    // Verify form exists
    const form = container.querySelector('form')
    expect(form).toBeTruthy()

    // Verify button is inside form
    const button = form?.querySelector('button[type="submit"]')
    expect(button).toBeTruthy()
  })

  it('renders Lexical editor with correct role', () => {
    const { container } = renderNotesPanel()
    const editor = container.querySelector('[contenteditable="true"]')
    expect(editor?.getAttribute('role')).toBe('textbox')
  })

  it('applies correct CSS classes for dark mode support', () => {
    const { container } = renderNotesPanel()
    const editor = container.querySelector('[contenteditable="true"]')
    expect(editor?.className).toContain('dark:bg-gray-800')
    expect(editor?.className).toContain('dark:text-white')
  })

  it('renders with intake mode by default', () => {
    const { container } = renderNotesPanel()
    const placeholder = container.querySelector('.pointer-events-none')
    expect(placeholder?.textContent).toContain('Type notes...')
  })

  it('component mounts without errors', () => {
    const { container } = renderNotesPanel()

    // Verify all essential elements exist
    const editor = container.querySelector('[contenteditable="true"]')
    const form = container.querySelector('form')
    const button = container.querySelector('button[type="submit"]')

    expect(editor).toBeTruthy()
    expect(form).toBeTruthy()
    expect(button).toBeTruthy()
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
