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

    // Verify notes input exists
    const notesInput = container.querySelector('[data-notes-input="true"]')
    expect(notesInput).toBeTruthy()

    // UnifiedChatInterface uses Lexical editor without form submission
    // Content is extracted via pills and debounced LLM calls
  })

  it('renders with intake mode by default', () => {
    const { container } = renderChatFlow()
    // UnifiedChatInterface renders both UploadPanel (left) and NotesPanel (center)
    // We need to find the NotesPanel's placeholder specifically
    // The NotesPanel is in the center section, UploadPanel is on the left
    const placeholders = container.querySelectorAll('.pointer-events-none')
    // Find the one that contains "Type notes..." (from NotesPanel in intake mode)
    const notesPlaceholder = Array.from(placeholders).find((p) =>
      p.textContent?.includes('Type notes...')
    )
    expect(notesPlaceholder).toBeTruthy()
    expect(notesPlaceholder?.textContent).toContain('Type notes...')
  })

  it('component structure includes all required elements', () => {
    const { container } = renderChatFlow()

    // Verify Lexical editor attributes
    const editor = container.querySelector('[contenteditable="true"]')
    expect(editor?.getAttribute('role')).toBe('textbox')
    expect(editor?.getAttribute('data-notes-input')).toBe('true')

    // UnifiedChatInterface uses Lexical editor without form submission
    // Content is extracted via pills and debounced LLM calls
    // No form or submit button needed
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
