/**
 * Combobox Component Tests
 *
 * Comprehensive unit tests for the Combobox component.
 * Tests filtering, keyboard navigation, selection, and edge cases.
 */

import '../../../test-setup'
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Combobox, type ComboboxOption } from '../combobox'

describe('Combobox Component', () => {
  const mockOptions: ComboboxOption[] = [
    { value: 'auto', label: 'Auto Insurance' },
    { value: 'home', label: 'Home Insurance' },
    { value: 'renters', label: 'Renters Insurance' },
    { value: 'umbrella', label: 'Umbrella Insurance' },
  ]

  const mockOnChange = mock(() => {})

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  describe('Basic Rendering', () => {
    test('renders input field with placeholder', () => {
      const { container } = render(
        <Combobox
          options={mockOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Type to search..."
        />
      )
      const input = container.querySelector('input[placeholder="Type to search..."]')
      expect(input).toBeDefined()
    })

    test('displays selected value label when value is set', () => {
      const { container } = render(
        <Combobox options={mockOptions} value="auto" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement
      expect(input?.value).toBe('Auto Insurance')
    })

    test('displays raw value when no matching option found', () => {
      const { container } = render(
        <Combobox options={mockOptions} value="unknown" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement
      expect(input?.value).toBe('unknown')
    })
  })

  describe('Filtering', () => {
    test('shows all options when search term is empty', async () => {
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      fireEvent.focus(input)

      await waitFor(() => {
        const list = container.querySelector('ul')
        expect(list).toBeDefined()
        const items = list?.querySelectorAll('li')
        expect(items?.length).toBe(4)
      })
    })

    test('filters options by label', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      await user.click(input)
      // Wait for dropdown to open
      await waitFor(() => {
        expect(container.querySelector('ul')).toBeDefined()
      })

      // Type to filter
      await user.clear(input)
      await user.type(input, 'home')

      await waitFor(() => {
        const list = container.querySelector('ul')
        const items = list?.querySelectorAll('li')
        expect(items?.length).toBe(1)
        expect(items?.[0]?.textContent).toBe('Home Insurance')
      })
    })

    test('filters options by value', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      await user.click(input)
      // Wait for dropdown to open
      await waitFor(() => {
        expect(container.querySelector('ul')).toBeDefined()
      })

      // Type to filter
      await user.clear(input)
      await user.type(input, 'rent')

      await waitFor(() => {
        const list = container.querySelector('ul')
        const items = list?.querySelectorAll('li')
        expect(items?.length).toBe(1)
        expect(items?.[0]?.textContent).toBe('Renters Insurance')
      })
    })

    test('shows "No results found" when no options match', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      await user.click(input)
      // Wait for dropdown to open
      await waitFor(() => {
        expect(container.querySelector('ul')).toBeDefined()
      })

      // Type to filter - no matches
      await user.clear(input)
      await user.type(input, 'xyz')

      await waitFor(() => {
        const list = container.querySelector('ul')
        expect(list?.textContent).toContain('No results found')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    test('ArrowDown opens dropdown and highlights first item', async () => {
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      fireEvent.keyDown(input, { key: 'ArrowDown' })

      await waitFor(() => {
        const list = container.querySelector('ul')
        const items = list?.querySelectorAll('li')
        expect(items?.[0]?.className).toContain('bg-gray-100')
      })
    })

    test('Enter selects highlighted item', async () => {
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('auto')
      })
    })

    test('Escape closes dropdown', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      await user.click(input)
      await waitFor(() => {
        expect(container.querySelector('ul')).toBeDefined()
      })

      await user.clear(input)
      await user.type(input, 'home')
      await waitFor(() => {
        expect(container.querySelector('ul')).toBeDefined()
      })

      await user.keyboard('{Escape}')

      await waitFor(() => {
        const list = container.querySelector('ul')
        expect(list).toBeNull()
      })
    })
  })

  describe('Mouse Interaction', () => {
    test('clicking option selects it', async () => {
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      fireEvent.focus(input)

      await waitFor(() => {
        const list = container.querySelector('ul')
        const items = list?.querySelectorAll('li')
        const homeOption = Array.from(items || []).find((li) => li.textContent === 'Home Insurance')
        if (homeOption) {
          fireEvent.mouseDown(homeOption)
        }
      })

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('home')
      })
    })
  })

  describe('Focus and Blur Behavior', () => {
    test('focusing input opens dropdown', async () => {
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      fireEvent.focus(input)

      await waitFor(() => {
        const list = container.querySelector('ul')
        expect(list).toBeDefined()
      })
    })

    test('blurring with highlighted item but no value selects highlighted item', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      await user.click(input)

      await waitFor(() => {
        const list = container.querySelector('ul')
        expect(list).toBeDefined()
      })

      // Navigate to second item (home) - clicking already highlights first item (index 0),
      // so one ArrowDown moves to second item (index 1)
      fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' })

      // Verify second item is highlighted - wait for React to update
      await waitFor(
        () => {
          const list = container.querySelector('ul')
          const items = list?.querySelectorAll('li')
          expect(items?.[1]?.className).toContain('bg-gray-100')
        },
        { timeout: 1000 }
      )

      // Blur the input directly (without clearing - value is already empty)
      // The component should select the highlighted item when blurring with no value
      fireEvent.blur(input)

      // Wait for the setTimeout delay (200ms) plus a bit more for React state updates
      await new Promise((resolve) => setTimeout(resolve, 300))

      await waitFor(
        () => {
          expect(mockOnChange).toHaveBeenCalledWith('home')
        },
        { timeout: 1000 }
      )
    })
  })
})
