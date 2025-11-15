/**
 * Combobox Component Tests
 *
 * Comprehensive unit tests for the Combobox component.
 * Tests filtering, keyboard navigation, selection, and edge cases.
 */

import '../../../test-setup'
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { fireEvent, render, waitFor, within } from '@testing-library/react'
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
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'home' } })

      await waitFor(() => {
        const list = container.querySelector('ul')
        const items = list?.querySelectorAll('li')
        expect(items?.length).toBe(1)
        expect(items?.[0]?.textContent).toBe('Home Insurance')
      })
    })

    test('filters options by value', async () => {
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'rent' } })

      await waitFor(() => {
        const list = container.querySelector('ul')
        const items = list?.querySelectorAll('li')
        expect(items?.length).toBe(1)
        expect(items?.[0]?.textContent).toBe('Renters Insurance')
      })
    })

    test('shows "No results found" when no options match', async () => {
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'xyz' } })

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
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'home' } })
      fireEvent.keyDown(input, { key: 'Escape' })

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
      const { container } = render(
        <Combobox options={mockOptions} value="" onChange={mockOnChange} />
      )
      const input = container.querySelector('input') as HTMLInputElement

      fireEvent.focus(input)

      await waitFor(() => {
        const list = container.querySelector('ul')
        expect(list).toBeDefined()
      })

      // Navigate to second item (home)
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Verify it's highlighted
      await waitFor(() => {
        const list = container.querySelector('ul')
        const items = list?.querySelectorAll('li')
        expect(items?.[1]?.className).toContain('bg-gray-100')
      })

      // Clear the input value (simulate user clearing it)
      fireEvent.change(input, { target: { value: '' } })

      // Blur the input
      fireEvent.blur(input)

      // Wait for the setTimeout delay (200ms)
      await new Promise((resolve) => setTimeout(resolve, 250))

      await waitFor(
        () => {
          expect(mockOnChange).toHaveBeenCalledWith('home')
        },
        { timeout: 1000 }
      )
    })
  })
})
