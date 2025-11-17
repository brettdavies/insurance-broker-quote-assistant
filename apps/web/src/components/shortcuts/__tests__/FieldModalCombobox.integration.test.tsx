/**
 * FieldModal with Combobox Integration Tests
 *
 * Tests the integration between FieldModal and Combobox components,
 * specifically focusing on the issue where highlighted items should be
 * returned when the textbox is empty.
 */

import '../../../test-setup'
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
import type React from 'react'
import { createTestQueryClient } from '../../../__tests__/test-utils'
import { FieldModal } from '../FieldModal'

describe('FieldModal with Combobox Integration', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>
  const mockOnSubmit = mock(() => {})
  const mockOnOpenChange = mock(() => {})
  const mockOnSaveInferred = mock(() => {})
  const mockOnSaveKnown = mock(() => {})

  beforeEach(() => {
    // Ensure document.body exists before each test
    if (globalThis.document && !globalThis.document.body) {
      const body = globalThis.document.createElement('body')
      globalThis.document.appendChild(body)
    }
    queryClient = createTestQueryClient()
    mockOnSubmit.mockClear()
    mockOnOpenChange.mockClear()
    mockOnSaveInferred.mockClear()
    mockOnSaveKnown.mockClear()
  })

  afterEach(() => {
    // Cleanup React Testing Library components and DOM
    cleanup()
    // Ensure document.body exists after cleanup for next test
    if (globalThis.document && !globalThis.document.body) {
      const body = globalThis.document.createElement('body')
      globalThis.document.appendChild(body)
    }
  })

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>)
  }

  describe('Legacy Mode with Enum Field (productType)', () => {
    test('submits highlighted value when Enter is pressed with empty textbox', async () => {
      const { container } = renderWithQueryClient(
        <FieldModal
          open={true}
          onOpenChange={mockOnOpenChange}
          field="productType"
          onSubmit={mockOnSubmit}
        />
      )

      const body = within(container.ownerDocument.body)
      
      // Wait for modal (Dialog) to appear first
      await waitFor(
        () => {
          expect(body.getByRole('dialog')).toBeDefined()
        },
        { timeout: 3000 }
      )
      
      // Get the textbox from within the modal Dialog
      const modal = body.getByRole('dialog')
      const input = within(modal).getByRole('textbox')

      // Focus and open dropdown
      fireEvent.focus(input)

      await waitFor(() => {
        expect(body.getByRole('list')).toBeDefined()
      })

      // Navigate to second option (home)
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Clear the input
      fireEvent.change(input, { target: { value: '' } })

      // Press Enter - should submit highlighted value
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('home')
      })
    })

    test('submits highlighted value when modal closes via blur with empty textbox', async () => {
      const { container } = renderWithQueryClient(
        <FieldModal
          open={true}
          onOpenChange={mockOnOpenChange}
          field="productType"
          onSubmit={mockOnSubmit}
        />
      )

      const body = within(container.ownerDocument.body)
      
      // Wait for modal (Dialog) to appear first
      await waitFor(
        () => {
          expect(body.getByRole('dialog')).toBeDefined()
        },
        { timeout: 3000 }
      )
      
      // Get the textbox from within the modal Dialog
      const modal = body.getByRole('dialog')
      const input = within(modal).getByRole('textbox')

      // Focus and open dropdown
      fireEvent.focus(input)

      await waitFor(() => {
        expect(body.getByRole('list')).toBeDefined()
      })

      // Navigate to third option (renters)
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Clear the input
      fireEvent.change(input, { target: { value: '' } })

      // Blur the input
      fireEvent.blur(input)

      // Wait for the setTimeout delay (200ms)
      await new Promise((resolve) => setTimeout(resolve, 250))

      await waitFor(() => {
        // The combobox should call onChange with the highlighted value
        // This will update the FieldModal's value state
        // Then when the modal closes, it should submit that value
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    test('submits typed value when textbox has content', async () => {
      const { container } = renderWithQueryClient(
        <FieldModal
          open={true}
          onOpenChange={mockOnOpenChange}
          field="productType"
          onSubmit={mockOnSubmit}
        />
      )

      const body = within(container.ownerDocument.body)
      
      // Wait for modal (Dialog) to appear first
      await waitFor(
        () => {
          expect(body.getByRole('dialog')).toBeDefined()
        },
        { timeout: 3000 }
      )
      
      // Get the textbox from within the modal Dialog
      const modal = body.getByRole('dialog')
      const input = within(modal).getByRole('textbox')

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'auto' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('auto')
      })
    })

    test('filters options as user types', async () => {
      const { container } = renderWithQueryClient(
        <FieldModal
          open={true}
          onOpenChange={mockOnOpenChange}
          field="productType"
          onSubmit={mockOnSubmit}
        />
      )

      const body = within(container.ownerDocument.body)
      
      // Wait for modal (Dialog) to appear first
      await waitFor(
        () => {
          expect(body.getByRole('dialog')).toBeDefined()
        },
        { timeout: 3000 }
      )
      
      // Get the textbox from within the modal Dialog
      const modal = body.getByRole('dialog')
      const input = within(modal).getByRole('textbox')

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'ren' } })

      await waitFor(() => {
        expect(body.getByText('Renters Insurance')).toBeDefined()
        expect(body.queryByText('Auto Insurance')).toBeNull()
      })
    })

    test('clicking option submits that value', async () => {
      const { container } = renderWithQueryClient(
        <FieldModal
          open={true}
          onOpenChange={mockOnOpenChange}
          field="productType"
          onSubmit={mockOnSubmit}
        />
      )

      const body = within(container.ownerDocument.body)
      
      // Wait for modal (Dialog) to appear first
      await waitFor(
        () => {
          expect(body.getByRole('dialog')).toBeDefined()
        },
        { timeout: 3000 }
      )
      
      // Get the textbox from within the modal Dialog
      const modal = body.getByRole('dialog')
      const input = within(modal).getByRole('textbox')

      fireEvent.focus(input)

      await waitFor(() => {
        const option = body.getByText('Home Insurance')
        fireEvent.mouseDown(option)
      })

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('home')
      })
    })
  })

  describe('Inferred Mode with Enum Field', () => {
    test('Save Inferred submits highlighted value when textbox is empty', async () => {
      const { container } = renderWithQueryClient(
        <FieldModal
          open={true}
          onOpenChange={mockOnOpenChange}
          isInferred={true}
          fieldName="productType"
          fieldLabel="Product Type"
          currentValue="auto"
          onSaveInferred={mockOnSaveInferred}
          onSaveKnown={mockOnSaveKnown}
        />
      )

      const body = within(container.ownerDocument.body)
      
      // Wait for modal (Dialog) to appear first
      await waitFor(
        () => {
          expect(body.getByRole('dialog')).toBeDefined()
        },
        { timeout: 3000 }
      )
      
      // Get the textbox from within the modal Dialog
      const modal = body.getByRole('dialog')
      const input = within(modal).getByRole('textbox')

      // Focus and open dropdown
      fireEvent.focus(input)

      await waitFor(() => {
        expect(body.getByRole('list')).toBeDefined()
      })

      // Navigate to second option
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Clear the input
      fireEvent.change(input, { target: { value: '' } })

      // Click Save Inferred button
      const saveInferredButton = body.getByText('Save Inferred')
      fireEvent.click(saveInferredButton)

      await waitFor(() => {
        // Should submit the highlighted value
        expect(mockOnSaveInferred).toHaveBeenCalledWith('home')
      })
    })

    test('Save Known submits highlighted value when textbox is empty', async () => {
      const { container } = renderWithQueryClient(
        <FieldModal
          open={true}
          onOpenChange={mockOnOpenChange}
          isInferred={true}
          fieldName="productType"
          fieldLabel="Product Type"
          currentValue="auto"
          onSaveInferred={mockOnSaveInferred}
          onSaveKnown={mockOnSaveKnown}
        />
      )

      const body = within(container.ownerDocument.body)
      
      // Wait for modal (Dialog) to appear first
      await waitFor(
        () => {
          expect(body.getByRole('dialog')).toBeDefined()
        },
        { timeout: 3000 }
      )
      
      // Get the textbox from within the modal Dialog
      const modal = body.getByRole('dialog')
      const input = within(modal).getByRole('textbox')

      // Focus and open dropdown
      fireEvent.focus(input)

      await waitFor(() => {
        expect(body.getByRole('list')).toBeDefined()
      })

      // Navigate to third option
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Clear the input
      fireEvent.change(input, { target: { value: '' } })

      // Click Save Known button
      const saveKnownButton = body.getByText('Save Known')
      fireEvent.click(saveKnownButton)

      await waitFor(() => {
        // Should submit the highlighted value
        expect(mockOnSaveKnown).toHaveBeenCalledWith('renters')
      })
    })

    test('blurring with highlighted item updates value before Save buttons are clicked', async () => {
      const { container } = renderWithQueryClient(
        <FieldModal
          open={true}
          onOpenChange={mockOnOpenChange}
          isInferred={true}
          fieldName="productType"
          fieldLabel="Product Type"
          currentValue="auto"
          onSaveInferred={mockOnSaveInferred}
          onSaveKnown={mockOnSaveKnown}
        />
      )

      const body = within(container.ownerDocument.body)
      
      // Wait for modal (Dialog) to appear first
      await waitFor(
        () => {
          expect(body.getByRole('dialog')).toBeDefined()
        },
        { timeout: 3000 }
      )
      
      // Get the textbox from within the modal Dialog
      const modal = body.getByRole('dialog')
      const input = within(modal).getByRole('textbox')

      // Focus and open dropdown
      fireEvent.focus(input)

      await waitFor(() => {
        expect(body.getByRole('list')).toBeDefined()
      })

      // Navigate to second option
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Clear the input
      fireEvent.change(input, { target: { value: '' } })

      // Blur the input
      fireEvent.blur(input)

      // Wait for the setTimeout delay (200ms)
      await new Promise((resolve) => setTimeout(resolve, 250))

      await waitFor(() => {
        // Input should now show the highlighted value
        expect((input as HTMLInputElement).value).toBe('Home Insurance')
      })

      // Now click Save Inferred
      const saveInferredButton = body.getByText('Save Inferred')
      fireEvent.click(saveInferredButton)

      await waitFor(() => {
        expect(mockOnSaveInferred).toHaveBeenCalledWith('home')
      })
    })
  })

  describe('Edge Cases', () => {
    test('handles rapid navigation and selection', async () => {
      const { container } = renderWithQueryClient(
        <FieldModal
          open={true}
          onOpenChange={mockOnOpenChange}
          field="productType"
          onSubmit={mockOnSubmit}
        />
      )

      const body = within(container.ownerDocument.body)
      const input = body.getByRole('textbox')

      fireEvent.focus(input)

      // Rapidly navigate
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled()
      })
    })

    test('handles typing after highlighting', async () => {
      const { container } = renderWithQueryClient(
        <FieldModal
          open={true}
          onOpenChange={mockOnOpenChange}
          field="productType"
          onSubmit={mockOnSubmit}
        />
      )

      const body = within(container.ownerDocument.body)
      const input = body.getByRole('textbox')

      fireEvent.focus(input)
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.change(input, { target: { value: 'umbrella' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('umbrella')
      })
    })

    test('handles Escape key to cancel', async () => {
      const { container } = renderWithQueryClient(
        <FieldModal
          open={true}
          onOpenChange={mockOnOpenChange}
          field="productType"
          onSubmit={mockOnSubmit}
        />
      )

      const body = within(container.ownerDocument.body)
      const input = body.getByRole('textbox')

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'test' } })
      fireEvent.keyDown(input, { key: 'Escape' })

      await waitFor(() => {
        // Should not submit
        expect(mockOnSubmit).not.toHaveBeenCalled()
      })
    })
  })
})
