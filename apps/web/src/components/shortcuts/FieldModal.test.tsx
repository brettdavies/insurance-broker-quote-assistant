/**
 * FieldModal Component Tests
 *
 * Tests both legacy (slash command) and new (inferred field) modes
 * Story 4.4: Modify Field Modal with 3-Button Behavior
 */

import '../../test-setup'
import { describe, expect, mock, test } from 'bun:test'
import { render, within } from '@testing-library/react'
import { FieldModal } from './FieldModal'

describe('FieldModal - Legacy Mode (Slash Commands)', () => {
  test('renders modal with field label and 2 buttons', () => {
    const onSubmit = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal open={true} onOpenChange={onOpenChange} field="name" onSubmit={onSubmit} />
    )
    const body = within(container.ownerDocument.body)

    expect(body.getByText('Name')).toBeDefined()
    expect(body.getByText('Cancel')).toBeDefined()
    expect(body.getByText('Submit')).toBeDefined()
    expect(body.queryByText('Delete')).toBeNull()
    expect(body.queryByText('Save Inferred')).toBeNull()
  })

  test('does not show reasoning or confidence sections in legacy mode', () => {
    const onSubmit = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal open={true} onOpenChange={onOpenChange} field="name" onSubmit={onSubmit} />
    )
    const body = within(container.ownerDocument.body)

    expect(body.queryByText('Reasoning:')).toBeNull()
    expect(body.queryByText(/Confidence:/)).toBeNull()
  })
})

describe('FieldModal - Inferred Mode (3-Button Layout)', () => {
  test('renders modal title with "(Inferred)" suffix', () => {
    const onDelete = mock(() => {})
    const onSaveInferred = mock(() => {})
    const onSaveKnown = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal
        open={true}
        onOpenChange={onOpenChange}
        isInferred={true}
        fieldLabel="Owns Home"
        currentValue={false}
        onDelete={onDelete}
        onSaveInferred={onSaveInferred}
        onSaveKnown={onSaveKnown}
      />
    )
    const body = within(container.ownerDocument.body)

    expect(body.getByText('Owns Home (Inferred)')).toBeDefined()
  })

  test('displays reasoning section when provided', () => {
    const onDelete = mock(() => {})
    const onSaveInferred = mock(() => {})
    const onSaveKnown = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal
        open={true}
        onOpenChange={onOpenChange}
        isInferred={true}
        fieldLabel="Owns Home"
        currentValue={false}
        reasoning="Renters insurance implies tenant status"
        onDelete={onDelete}
        onSaveInferred={onSaveInferred}
        onSaveKnown={onSaveKnown}
      />
    )
    const body = within(container.ownerDocument.body)

    expect(body.getByText('Reasoning:')).toBeDefined()
    expect(body.getByText('Renters insurance implies tenant status')).toBeDefined()
  })

  test('displays confidence score when < 90%', () => {
    const onDelete = mock(() => {})
    const onSaveInferred = mock(() => {})
    const onSaveKnown = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal
        open={true}
        onOpenChange={onOpenChange}
        isInferred={true}
        fieldLabel="Owns Home"
        currentValue={false}
        confidence={0.75}
        onDelete={onDelete}
        onSaveInferred={onSaveInferred}
        onSaveKnown={onSaveKnown}
      />
    )
    const body = within(container.ownerDocument.body)

    expect(body.getByText('Confidence: 75%')).toBeDefined()
  })

  test('hides confidence score when ≥ 90%', () => {
    const onDelete = mock(() => {})
    const onSaveInferred = mock(() => {})
    const onSaveKnown = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal
        open={true}
        onOpenChange={onOpenChange}
        isInferred={true}
        fieldLabel="Owns Home"
        currentValue={false}
        confidence={0.95}
        onDelete={onDelete}
        onSaveInferred={onSaveInferred}
        onSaveKnown={onSaveKnown}
      />
    )
    const body = within(container.ownerDocument.body)

    expect(body.queryByText(/Confidence:/)).toBeNull()
  })

  test('shows 3 buttons in inferred mode', () => {
    const onDelete = mock(() => {})
    const onSaveInferred = mock(() => {})
    const onSaveKnown = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal
        open={true}
        onOpenChange={onOpenChange}
        isInferred={true}
        fieldLabel="Owns Home"
        currentValue={false}
        onDelete={onDelete}
        onSaveInferred={onSaveInferred}
        onSaveKnown={onSaveKnown}
      />
    )
    const body = within(container.ownerDocument.body)

    expect(body.getByText('Delete')).toBeDefined()
    expect(body.getByText('Save Inferred')).toBeDefined()
    expect(body.getByText('Save Known')).toBeDefined()
    expect(body.queryByText('Cancel')).toBeNull()
    expect(body.queryByText('Submit')).toBeNull()
  })

  test('[Save Inferred] button disabled when value unchanged', () => {
    const onDelete = mock(() => {})
    const onSaveInferred = mock(() => {})
    const onSaveKnown = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal
        open={true}
        onOpenChange={onOpenChange}
        isInferred={true}
        fieldLabel="Owns Home"
        currentValue="false"
        onDelete={onDelete}
        onSaveInferred={onSaveInferred}
        onSaveKnown={onSaveKnown}
      />
    )
    const body = within(container.ownerDocument.body)

    const saveInferredBtn = body.getByText('Save Inferred')
    expect(saveInferredBtn.hasAttribute('disabled')).toBe(true)
  })
})

describe('FieldModal - Styling Tests', () => {
  test('reasoning text has muted color', () => {
    const onDelete = mock(() => {})
    const onSaveInferred = mock(() => {})
    const onSaveKnown = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal
        open={true}
        onOpenChange={onOpenChange}
        isInferred={true}
        fieldLabel="Owns Home"
        currentValue={false}
        reasoning="Test reasoning"
        onDelete={onDelete}
        onSaveInferred={onSaveInferred}
        onSaveKnown={onSaveKnown}
      />
    )
    const body = within(container.ownerDocument.body)

    const reasoningText = body.getByText('Test reasoning')
    expect(reasoningText.className).toContain('text-[#a3a3a3]')
  })

  test('confidence text has tertiary color and italic style', () => {
    const onDelete = mock(() => {})
    const onSaveInferred = mock(() => {})
    const onSaveKnown = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal
        open={true}
        onOpenChange={onOpenChange}
        isInferred={true}
        fieldLabel="Owns Home"
        currentValue={false}
        confidence={0.75}
        onDelete={onDelete}
        onSaveInferred={onSaveInferred}
        onSaveKnown={onSaveKnown}
      />
    )
    const body = within(container.ownerDocument.body)

    const confidenceText = body.getByText('Confidence: 75%')
    expect(confidenceText.className).toContain('text-[#737373]')
    expect(confidenceText.className).toContain('italic')
  })
})
