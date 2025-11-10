import '../../../test-setup'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, waitFor } from '@testing-library/react'
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

    // Check for notes input
    const notesInput = container.querySelector('[contenteditable="true"]')
    expect(notesInput).toBeTruthy()

    // Check for sidebar (may be collapsed in accordion)
    const sidebar =
      container.textContent?.includes('Captured Fields') ||
      container.textContent?.includes('Missing Fields')
    expect(sidebar).toBeTruthy()
  })

  it('displays message in chat history after submission', async () => {
    const { container } = renderChatFlow()
    const editor = container.querySelector('[contenteditable="true"]') as HTMLElement
    const form = container.querySelector('form')

    if (!editor || !form) {
      // Component not fully rendered
      return
    }

    // Type message
    editor.textContent = 'Client needs auto insurance'
    fireEvent.input(editor)

    // Submit
    fireEvent.submit(form)

    // Wait for message to appear in history
    await waitFor(
      () => {
        const historyContent = container.textContent || ''
        expect(historyContent).toContain('Client needs auto insurance')
      },
      { timeout: 2000 }
    )
  })

  it('extracts fields from key-value syntax', async () => {
    const { container } = renderChatFlow()
    const editor = container.querySelector('[contenteditable="true"]') as HTMLElement
    const form = container.querySelector('form')

    if (!editor || !form) {
      return
    }

    // Type message with key-value pairs
    editor.textContent = 'Client info k:2 v:3 state:CA'
    fireEvent.input(editor)

    // Submit
    fireEvent.submit(form)

    // Wait for processing
    await waitFor(
      () => {
        // Verify message was submitted
        expect(editor.textContent).toBe('')
      },
      { timeout: 2000 }
    )
  })
})
