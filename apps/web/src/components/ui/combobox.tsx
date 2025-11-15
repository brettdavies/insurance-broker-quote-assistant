/**
 * Combobox Component
 *
 * A filterable dropdown component that allows typing to filter options.
 * Supports filtering by both the option value and a display label.
 */

import { useEffect, useRef, useState } from 'react'
import { Input } from './input'

export interface ComboboxOption {
  value: string
  label: string // Display label (e.g., "CA - California")
  searchText?: string // Optional additional text to search (e.g., full state name)
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Type to search...',
  className = '',
  autoFocus = false,
  onKeyDown,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Find the selected option's label
  const selectedOption = options.find((opt) => opt.value === value)
  const displayValue = selectedOption?.label || value

  // Filter options based on search term
  const filteredOptions = options.filter((option) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      option.value.toLowerCase().includes(search) ||
      option.label.toLowerCase().includes(search) ||
      option.searchText?.toLowerCase().includes(search)
    )
  })

  // Update search term when value changes externally
  useEffect(() => {
    if (!isOpen && value) {
      setSearchTerm(selectedOption?.label || value)
    } else if (!isOpen) {
      setSearchTerm('')
    }
  }, [value, isOpen, selectedOption])

  // Reset highlighted index when filtered options change
  // biome-ignore lint/correctness/useExhaustiveDependencies: We only want to reset when the length changes, not when the array reference changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions.length])

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value
    setSearchTerm(newSearchTerm)
    setIsOpen(true)
    setHighlightedIndex(0)
  }

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
    inputRef.current?.blur()
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    if (!value) {
      setSearchTerm('')
    }
  }

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay closing to allow click events on options
    setTimeout(() => {
      if (!listRef.current?.contains(document.activeElement)) {
        setIsOpen(false)
        // Reset search term to selected value
        if (value && selectedOption) {
          setSearchTerm(selectedOption.label)
        } else {
          setSearchTerm('')
        }
      }
    }, 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value)
      }
      onKeyDown?.(e)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm(selectedOption?.label || value || '')
      onKeyDown?.(e)
    } else {
      onKeyDown?.(e)
    }
  }

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        value={isOpen ? searchTerm : displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {filteredOptions.map((option, index) => (
            <li
              key={option.value}
              className={`cursor-pointer px-3 py-2 text-sm ${
                index === highlightedIndex
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${option.value === value ? 'font-semibold' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent input blur
                handleSelect(option.value)
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
      {isOpen && filteredOptions.length === 0 && searchTerm && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No results found</li>
        </ul>
      )}
    </div>
  )
}
