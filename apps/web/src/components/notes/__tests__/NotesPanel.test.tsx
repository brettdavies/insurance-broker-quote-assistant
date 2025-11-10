import '../../../test-setup'
import { beforeEach, describe, expect, it } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render } from '@testing-library/react'
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

  const renderNotesPanel = (props?: {
    mode?: 'intake' | 'policy'
    onMessageSubmit?: (msg: string) => void
  }) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <NotesPanel mode={props?.mode || 'intake'} onMessageSubmit={props?.onMessageSubmit} />
      </QueryClientProvider>
    )
  }

  it('renders notes input area', () => {
    const { container } = renderNotesPanel()
    const editor = container.querySelector('[contenteditable="true"]')
    expect(editor).toBeTruthy()
  })

  it('calls onMessageSubmit when form is submitted', () => {
    let submittedMessage = ''
    const handleSubmit = (msg: string) => {
      submittedMessage = msg
    }

    const { container } = renderNotesPanel({ onMessageSubmit: handleSubmit })
    const editor = container.querySelector('[contenteditable="true"]') as HTMLElement
    const form = container.querySelector('form')

    editor.textContent = 'test message'
    fireEvent.input(editor)

    if (form) {
      fireEvent.submit(form)
    }

    expect(submittedMessage).toBe('test message')
  })

  it('renders submit button', () => {
    const { container } = renderNotesPanel()
    const submitButton = container.querySelector('button[type="submit"]')
    expect(submitButton).toBeTruthy()
  })

  it('has correct data attribute for notes input', () => {
    const { container } = renderNotesPanel()
    const editor = container.querySelector('[data-notes-input="true"]')
    expect(editor).toBeTruthy()
  })

  it('transforms key-value pairs into pills on input', () => {
    const { container } = renderNotesPanel()
    const editor = container.querySelector('[contenteditable="true"]') as HTMLElement

    editor.textContent = 'Client has k:2 v:3'
    fireEvent.input(editor)

    const pills = container.querySelectorAll('[data-pill="true"]')
    expect(pills.length).toBeGreaterThan(0)
  })

  it('handles double-click on pill to revert to text', () => {
    const { container } = renderNotesPanel()
    const editor = container.querySelector('[contenteditable="true"]') as HTMLElement

    // Create a pill
    editor.textContent = 'k:2'
    fireEvent.input(editor)

    const pill = container.querySelector('[data-pill="true"]') as HTMLElement
    expect(pill).toBeTruthy()

    // Double-click pill
    fireEvent.doubleClick(pill)

    // Pill should be removed
    const pillsAfter = container.querySelectorAll('[data-pill="true"]')
    expect(pillsAfter.length).toBe(0)
  })
})
