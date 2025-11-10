import '../../../test-setup'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { UnifiedChatInterface } from '../../intake/UnifiedChatInterface'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('ChatFlow Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const renderChatFlow = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <UnifiedChatInterface mode="intake" />
      </QueryClientProvider>
    )
  }

  it('renders chat interface with all components', () => {
    const { container } = renderChatFlow()

    // Check for chat history area
    const chatHistory = container.querySelector('[class*="overflow-y-auto"]')
    expect(chatHistory).toBeTruthy()

    // Check for notes input with Lexical editor
    const notesInput = container.querySelector('[contenteditable="true"]')
    expect(notesInput).toBeTruthy()
    expect(notesInput?.getAttribute('data-lexical-editor')).toBe('true')

    // Check for sidebar (may be collapsed in accordion)
    const sidebar =
      container.textContent?.includes('Captured Fields') ||
      container.textContent?.includes('Missing Fields')
    expect(sidebar).toBeTruthy()
  })

  it('renders all main sections of UnifiedChatInterface', () => {
    const { container } = renderChatFlow()

    // Verify NotesPanel renders
    const editor = container.querySelector('[contenteditable="true"]')
    expect(editor).toBeTruthy()

    // Verify form exists
    const form = container.querySelector('form')
    expect(form).toBeTruthy()

    // Verify submit button
    const submitButton = container.querySelector('button[type="submit"]')
    expect(submitButton).toBeTruthy()
  })

  it('renders with intake mode by default', () => {
    const { container } = renderChatFlow()
    const placeholder = container.querySelector('.pointer-events-none')
    expect(placeholder?.textContent).toContain('Type notes...')
  })

  it('component structure includes all required elements', () => {
    const { container } = renderChatFlow()

    // Verify Lexical editor attributes
    const editor = container.querySelector('[contenteditable="true"]')
    expect(editor?.getAttribute('role')).toBe('textbox')
    expect(editor?.getAttribute('data-notes-input')).toBe('true')

    // Verify form structure
    const form = container.querySelector('form')
    const buttonInForm = form?.querySelector('button[type="submit"]')
    expect(buttonInForm).toBeTruthy()
  })
})

/**
 * Note: Complex interaction testing (typing, submission, field extraction)
 * with Lexical editor requires accessing the internal editor instance.
 *
 * These integration tests verify component composition and structure.
 * Full interaction testing should be done via:
 *
 * 1. Manual browser testing (recommended for MVP)
 * 2. E2E tests with real browser automation
 * 3. Specialized Lexical testing utilities
 *
 * Current tests ensure UnifiedChatInterface properly composes its
 * child components (NotesPanel, ChatHistory, Sidebar).
 */
