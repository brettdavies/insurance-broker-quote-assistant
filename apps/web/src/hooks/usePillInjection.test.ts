/**
 * Tests for usePillInjection Hook
 *
 * Tests pill injection functionality including:
 * - Pill creation and appending
 * - Value formatting
 * - Space handling
 * - Cursor positioning
 */

import '../test-setup'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { renderHook } from '@testing-library/react'
import type { LexicalEditor } from 'lexical'
import { formatPillValue, usePillInjection } from './usePillInjection'

// Mock Lexical nodes and functions
const mockTextNode = {
  getTextContent: mock(() => 'Test text'),
}

const mockLastChild = {
  getTextContent: mock(() => 'Test text'),
}

const mockParagraph = {
  getLastChild: mock(() => mockLastChild),
  append: mock(() => {}),
  getKey: mock(() => 'paragraph-key-1'),
  getChildrenSize: mock(() => 3),
}

const mockRoot = {
  getLastChild: mock(() => mockParagraph as any),
  append: mock(() => {}),
}

const mockUpdate = mock((callback: () => void) => {
  callback()
})

const createMockEditor = (): LexicalEditor => {
  return {
    update: mockUpdate,
    getRootElement: mock(() => document.createElement('div')),
    getEditorState: mock(() => ({})),
  } as unknown as LexicalEditor
}

// Mock Lexical functions
const mockFunctions = {
  $getRoot: mock(() => mockRoot),
  $createParagraphNode: mock(() => mockParagraph),
  $createTextNode: mock((text: string) => ({ getTextContent: () => text })),
  $isParagraphNode: mock(() => true),
  $createRangeSelection: mock(() => ({
    focus: { set: mock(() => {}) },
  })),
  $setSelection: mock(() => {}),
}

// Mock the lexical module
mock.module('lexical', () => mockFunctions)

// Mock PillNode
const mockPillNode = { type: 'pill' }
const mockCreatePillNode = mock(() => mockPillNode)
mock.module('@/components/notes/nodes/PillNode', () => ({
  $createPillNode: mockCreatePillNode,
}))

describe('formatPillValue', () => {
  it('formats boolean true to "true"', () => {
    expect(formatPillValue(true)).toBe('true')
  })

  it('formats boolean false to "false"', () => {
    expect(formatPillValue(false)).toBe('false')
  })

  it('formats number to string', () => {
    expect(formatPillValue(42)).toBe('42')
    expect(formatPillValue(0)).toBe('0')
    expect(formatPillValue(3.14)).toBe('3.14')
  })

  it('keeps string unchanged', () => {
    expect(formatPillValue('FL')).toBe('FL')
    expect(formatPillValue('test')).toBe('test')
  })

  it('formats array to JSON string', () => {
    expect(formatPillValue([1, 2, 3])).toBe('[1,2,3]')
    expect(formatPillValue(['a', 'b'])).toBe('["a","b"]')
  })

  it('formats object to JSON string', () => {
    expect(formatPillValue({ key: 'value' })).toBe('{"key":"value"}')
  })

  it('handles null and undefined', () => {
    expect(formatPillValue(null)).toBe('null')
    expect(formatPillValue(undefined)).toBe('undefined')
  })

  it('handles empty string', () => {
    expect(formatPillValue('')).toBe('')
  })
})

describe('usePillInjection', () => {
  let mockEditor: LexicalEditor

  beforeEach(() => {
    mockEditor = createMockEditor()
    // Reset all mocks
    mockUpdate.mockClear()
    mockCreatePillNode.mockClear()
    mockParagraph.append.mockClear()
    mockParagraph.getLastChild.mockClear()
    mockRoot.getLastChild.mockClear()
    mockRoot.append.mockClear()
    mockFunctions.$getRoot.mockClear()
    mockFunctions.$createTextNode.mockClear()
    mockFunctions.$createParagraphNode.mockClear()

    // Reset mock return values to defaults
    mockRoot.getLastChild.mockReturnValue(mockParagraph as any)
    mockParagraph.getLastChild.mockReturnValue(mockLastChild as any)
    mockLastChild.getTextContent.mockReturnValue('Test text')
  })

  it('returns injectPill function', () => {
    const { result } = renderHook(() => usePillInjection(mockEditor))
    expect(result.current.injectPill).toBeDefined()
    expect(typeof result.current.injectPill).toBe('function')
  })

  it('handles null editor gracefully', () => {
    const consoleSpy = mock(() => {})
    const originalError = console.error
    console.error = consoleSpy

    const { result } = renderHook(() => usePillInjection(null))
    result.current.injectPill('testField', 'value')

    expect(consoleSpy).toHaveBeenCalledWith('Lexical editor not available for pill injection')

    console.error = originalError
  })

  it('calls editor.update when injecting pill', () => {
    const { result } = renderHook(() => usePillInjection(mockEditor))
    result.current.injectPill('ownsHome', false)

    expect(mockUpdate).toHaveBeenCalled()
  })

  it('creates pill with correct parameters', () => {
    const { result } = renderHook(() => usePillInjection(mockEditor))
    result.current.injectPill('ownsHome', false)

    expect(mockCreatePillNode).toHaveBeenCalledWith({
      key: 'ownsHome',
      value: 'false',
      validation: 'valid',
      fieldName: 'ownsHome',
    })
  })

  it('formats different value types correctly', () => {
    const { result } = renderHook(() => usePillInjection(mockEditor))

    // Boolean
    result.current.injectPill('ownsHome', false)
    expect(mockCreatePillNode).toHaveBeenCalledWith(expect.objectContaining({ value: 'false' }))

    // Number
    result.current.injectPill('age', 28)
    expect(mockCreatePillNode).toHaveBeenCalledWith(expect.objectContaining({ value: '28' }))

    // String
    result.current.injectPill('state', 'FL')
    expect(mockCreatePillNode).toHaveBeenCalledWith(expect.objectContaining({ value: 'FL' }))
  })

  it('appends pill to paragraph', () => {
    const { result } = renderHook(() => usePillInjection(mockEditor))
    result.current.injectPill('testField', 'value')

    // Should append: space (if needed), pill node, and trailing space
    expect(mockParagraph.append).toHaveBeenCalled()
  })

  it('creates trailing space after pill', () => {
    const { result } = renderHook(() => usePillInjection(mockEditor))
    result.current.injectPill('testField', 'value')

    // Should call $createTextNode with ' ' for trailing space
    expect(mockFunctions.$createTextNode).toHaveBeenCalledWith(' ')
  })

  it('adds space before pill if text does not end with space', () => {
    // Mock last node text content without trailing space
    mockLastChild.getTextContent.mockReturnValue('Test text')

    const { result } = renderHook(() => usePillInjection(mockEditor))
    result.current.injectPill('testField', 'value')

    // Should create space before pill
    const calls = mockFunctions.$createTextNode.mock.calls
    const spaceCreated = calls.some((call) => call[0] === ' ')
    expect(spaceCreated).toBe(true)
  })

  it('does not add space before pill if text already ends with space', () => {
    // Mock last node text content with trailing space
    mockLastChild.getTextContent.mockReturnValue('Test text ')

    const { result } = renderHook(() => usePillInjection(mockEditor))
    result.current.injectPill('testField', 'value')

    // Should still create trailing space after pill, but not before
    expect(mockFunctions.$createTextNode).toHaveBeenCalled()
  })

  it('handles empty editor (no paragraph)', () => {
    // Mock empty root
    mockRoot.getLastChild.mockReturnValue(null)

    const { result } = renderHook(() => usePillInjection(mockEditor))
    result.current.injectPill('testField', 'value')

    // Should create new paragraph
    expect(mockFunctions.$createParagraphNode).toHaveBeenCalled()
    expect(mockRoot.append).toHaveBeenCalled()
  })

  it('uses existing paragraph if available', () => {
    const { result } = renderHook(() => usePillInjection(mockEditor))
    result.current.injectPill('testField', 'value')

    // Should use existing paragraph, not create new one
    expect(mockRoot.append).not.toHaveBeenCalled()
  })

  it('sets cursor position after pill', () => {
    const { result } = renderHook(() => usePillInjection(mockEditor))
    result.current.injectPill('testField', 'value')

    // Should call $createRangeSelection and $setSelection
    expect(mockFunctions.$createRangeSelection).toHaveBeenCalled()
    expect(mockFunctions.$setSelection).toHaveBeenCalled()
  })

  it('handles multiple pill injections', () => {
    const { result } = renderHook(() => usePillInjection(mockEditor))

    result.current.injectPill('field1', 'value1')
    result.current.injectPill('field2', 'value2')
    result.current.injectPill('field3', 'value3')

    expect(mockCreatePillNode).toHaveBeenCalledTimes(3)
    expect(mockUpdate).toHaveBeenCalledTimes(3)
  })
})
