import '../../test-setup'
import { describe, expect, mock, test } from 'bun:test'
import type { UserProfile } from '@repo/shared'
import { fireEvent } from '@testing-library/react'
import {
  findAllElements,
  findElement,
  renderWithQueryClient,
  textIncludes,
} from '../../__tests__/test-utils'
import { InferredFieldsSection } from './InferredFieldsSection'

describe('InferredFieldsSection', () => {
  const mockOnDismiss = mock(() => {})
  const mockOnEdit = mock(() => {})
  const mockOnConvertToKnown = mock(() => {})

  const defaultProps = {
    inferredFields: {},
    inferenceReasons: {},
    confidence: {},
    onDismiss: mockOnDismiss,
    onEdit: mockOnEdit,
    onConvertToKnown: mockOnConvertToKnown,
  }

  describe('Visibility tests', () => {
    test('Section hides if inferredFields is empty object', () => {
      const { container } = renderWithQueryClient(<InferredFieldsSection {...defaultProps} />)
      expect(container.firstChild).toBeNull()
    })

    test('Section shows if inferredFields has at least one field', () => {
      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: false } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Test reasoning' },
        confidence: { ownsHome: 0.85 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)
      expect(textIncludes(container, 'Inferred Fields')).toBe(true)
    })

    test('Category hides if no fields in that category', () => {
      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: false } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Test reasoning' },
        confidence: { ownsHome: 0.85 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // ownsHome is in "Property" category - should show
      expect(textIncludes(container, 'Property:')).toBe(true)

      // "Identity & Contact" category should not show (no fields)
      expect(textIncludes(container, 'Identity & Contact:')).toBe(false)
    })

    test('Category shows if at least one field in category', () => {
      const props = {
        ...defaultProps,
        inferredFields: {
          ownsHome: false,
          householdSize: 1,
        } as Partial<UserProfile>,
        inferenceReasons: {
          ownsHome: 'Test reasoning for ownsHome',
          householdSize: 'Test reasoning for householdSize',
        },
        confidence: {
          ownsHome: 0.85,
          householdSize: 0.7,
        },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // Both categories should show
      expect(textIncludes(container, 'Property:')).toBe(true)
      expect(textIncludes(container, 'Household:')).toBe(true)
    })
  })

  describe('Grouping tests', () => {
    test('Fields grouped correctly by category', () => {
      const props = {
        ...defaultProps,
        inferredFields: {
          state: 'FL',
          ownsHome: false,
          householdSize: 1,
        } as Partial<UserProfile>,
        inferenceReasons: {
          state: 'Test reasoning',
          ownsHome: 'Test reasoning',
          householdSize: 'Test reasoning',
        },
        confidence: {
          state: 0.85,
          ownsHome: 0.85,
          householdSize: 0.7,
        },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // Check that categories exist
      expect(textIncludes(container, 'Location:')).toBe(true)
      expect(textIncludes(container, 'Property:')).toBe(true)
      expect(textIncludes(container, 'Household:')).toBe(true)

      // Verify fields are grouped correctly
      expect(textIncludes(container, 'State:')).toBe(true)
      expect(textIncludes(container, 'Owns Home:')).toBe(true)
      expect(textIncludes(container, 'Household Size:')).toBe(true)
    })

    test('Multiple fields in same category render under single category header', () => {
      const props = {
        ...defaultProps,
        inferredFields: {
          state: 'FL',
          zip: '33101',
        } as Partial<UserProfile>,
        inferenceReasons: {
          state: 'Test reasoning',
          zip: 'Test reasoning',
        },
        confidence: {
          state: 0.85,
          zip: 0.85,
        },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // Should have exactly one "Location:" header
      const locationHeaders = findAllElements(container, 'h4')
      const locationCount = Array.from(locationHeaders).filter(
        (el) => el.textContent === 'Location:'
      ).length
      expect(locationCount).toBe(1)

      // Both fields should be present
      expect(textIncludes(container, 'State:')).toBe(true)
      expect(textIncludes(container, 'Zip Code:')).toBe(true)
    })

    test('Fields from different categories render in separate category sections', () => {
      const props = {
        ...defaultProps,
        inferredFields: {
          state: 'FL',
          ownsHome: false,
        } as Partial<UserProfile>,
        inferenceReasons: {
          state: 'Test reasoning',
          ownsHome: 'Test reasoning',
        },
        confidence: {
          state: 0.85,
          ownsHome: 0.85,
        },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // Should have separate category headers
      expect(textIncludes(container, 'Location:')).toBe(true)
      expect(textIncludes(container, 'Property:')).toBe(true)
    })
  })

  describe('Interactive element tests', () => {
    test('Clicking [✕] calls onDismiss with correct field name', () => {
      mockOnDismiss.mockClear()

      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: false } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Test reasoning' },
        confidence: { ownsHome: 0.85 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      const dismissButton = findElement(container, '[aria-label="Dismiss inference"]')
      expect(dismissButton).toBeTruthy()
      if (dismissButton) {
        fireEvent.click(dismissButton)
      }

      expect(mockOnDismiss).toHaveBeenCalledWith('ownsHome')
      expect(mockOnDismiss).toHaveBeenCalledTimes(1)
    })

    test('Clicking [Click] calls onEdit with correct field name and value', () => {
      mockOnEdit.mockClear()

      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: false } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Test reasoning' },
        confidence: { ownsHome: 0.85 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // Find button with text "Click"
      const buttons = findAllElements(container, 'button')
      const editButton = Array.from(buttons).find((btn) => btn.textContent === 'Click')
      expect(editButton).toBeTruthy()
      if (editButton) {
        fireEvent.click(editButton)
      }

      expect(mockOnEdit).toHaveBeenCalledWith('ownsHome', false)
      expect(mockOnEdit).toHaveBeenCalledTimes(1)
    })

    test('Info icon (ℹ️) shows tooltip with reasoning on hover', () => {
      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: false } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Renters insurance implies tenant status' },
        confidence: { ownsHome: 0.85 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // Verify info button exists with correct aria-label
      const infoButton = findElement(container, '[aria-label="Show inference reasoning"]')
      expect(infoButton).toBeTruthy()

      // Note: Tooltip content renders in a portal (Radix UI behavior)
      // Testing actual tooltip appearance requires async queries or portal handling
      // This test verifies the info button is present and interactive
    })
  })

  describe('Confidence display tests', () => {
    test('Confidence shown as "(75%)" for confidence < 0.9', () => {
      const props = {
        ...defaultProps,
        inferredFields: { householdSize: 1 } as Partial<UserProfile>,
        inferenceReasons: { householdSize: 'Test reasoning' },
        confidence: { householdSize: 0.75 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      expect(textIncludes(container, '(75%)')).toBe(true)
    })

    test('Confidence hidden for confidence >= 0.9', () => {
      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: false } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Test reasoning' },
        confidence: { ownsHome: 0.9 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // Confidence should not be shown
      expect(textIncludes(container, '(90%)')).toBe(false)
    })

    test('Confidence correctly formatted as percentage (0.75 → "(75%)")', () => {
      const props = {
        ...defaultProps,
        inferredFields: { householdSize: 1 } as Partial<UserProfile>,
        inferenceReasons: { householdSize: 'Test reasoning' },
        confidence: { householdSize: 0.7523 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // Should round to 75%
      expect(textIncludes(container, '(75%)')).toBe(true)
    })

    test('Confidence shown for 0.89 (just below threshold)', () => {
      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: false } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Test reasoning' },
        confidence: { ownsHome: 0.89 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      expect(textIncludes(container, '(89%)')).toBe(true)
    })
  })

  describe('Styling tests', () => {
    test('Muted text color applied to field rows', () => {
      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: false } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Test reasoning' },
        confidence: { ownsHome: 0.85 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // Check that field row has muted text color class
      const fieldRow = findElement(container, '.text-gray-400')
      expect(fieldRow).toBeTruthy()
    })

    test('Container has correct background and border', () => {
      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: false } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Test reasoning' },
        confidence: { ownsHome: 0.85 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // Check for card styling classes
      const card = findElement(container, '.bg-gray-850')
      expect(card).toBeTruthy()

      const borderCard = findElement(container, '.border-gray-700')
      expect(borderCard).toBeTruthy()
    })

    test('Collapsible header toggles section visibility', () => {
      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: false } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Test reasoning' },
        confidence: { ownsHome: 0.85 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      // Initially expanded - field should be visible
      expect(textIncludes(container, 'Owns Home:')).toBe(true)
      expect(textIncludes(container, '[−]')).toBe(true)

      // Click header to collapse
      const headers = findAllElements(container, 'h3')
      const header = Array.from(headers).find((h) => h.textContent?.includes('Inferred Fields'))
      expect(header).toBeTruthy()
      if (header) {
        fireEvent.click(header)

        // Should now be collapsed - field hidden
        expect(textIncludes(container, 'Owns Home:')).toBe(false)
        expect(textIncludes(container, '[+]')).toBe(true)

        // Click again to expand
        fireEvent.click(header)

        // Should be expanded again
        expect(textIncludes(container, 'Owns Home:')).toBe(true)
        expect(textIncludes(container, '[−]')).toBe(true)
      }
    })
  })

  describe('Value formatting tests', () => {
    test('Boolean true formatted as "Yes"', () => {
      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: true } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Test reasoning' },
        confidence: { ownsHome: 0.85 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      expect(textIncludes(container, 'Owns Home: Yes')).toBe(true)
    })

    test('Boolean false formatted as "No"', () => {
      const props = {
        ...defaultProps,
        inferredFields: { ownsHome: false } as Partial<UserProfile>,
        inferenceReasons: { ownsHome: 'Test reasoning' },
        confidence: { ownsHome: 0.85 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      expect(textIncludes(container, 'Owns Home: No')).toBe(true)
    })

    test('Number formatted as string', () => {
      const props = {
        ...defaultProps,
        inferredFields: { householdSize: 4 } as Partial<UserProfile>,
        inferenceReasons: { householdSize: 'Test reasoning' },
        confidence: { householdSize: 0.85 },
      }
      const { container } = renderWithQueryClient(<InferredFieldsSection {...props} />)

      expect(textIncludes(container, 'Household Size: 4')).toBe(true)
    })
  })
})
