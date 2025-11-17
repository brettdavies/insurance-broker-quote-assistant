/**
 * FieldModal Component Tests
 *
 * Tests both legacy (slash command) and new (inferred field) modes
 * Story 4.4: Modify Field Modal with 3-Button Behavior
 */

import '../../test-setup'
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, waitFor, within } from '@testing-library/react'
import { FieldModal } from './FieldModal'

describe('FieldModal - Legacy Mode (Slash Commands)', () => {
  beforeEach(() => {
    // Ensure document.body exists before each test
    if (globalThis.document && !globalThis.document.body) {
      const body = globalThis.document.createElement('body')
      globalThis.document.appendChild(body)
    }
    // Ensure Radix UI portal container exists (Radix UI Dialog uses portals)
    // Portal container is typically created automatically, but ensure it exists for test isolation
    if (globalThis.document?.body) {
      let portalContainer = globalThis.document.body.querySelector('[data-radix-portal]')
      if (!portalContainer) {
        portalContainer = globalThis.document.createElement('div')
        portalContainer.setAttribute('data-radix-portal', '')
        globalThis.document.body.appendChild(portalContainer)
      }
    }
  })

  afterEach(() => {
    // Cleanup React Testing Library components and DOM
    cleanup()
    // Ensure document.body exists after cleanup for next test
    if (globalThis.document && !globalThis.document.body) {
      const body = globalThis.document.createElement('body')
      globalThis.document.appendChild(body)
    }
    // Clean up any Radix UI portal containers that might have been created
    if (globalThis.document?.body) {
      const portalContainers = globalThis.document.body.querySelectorAll('[data-radix-portal]')
      portalContainers.forEach((container) => {
        try {
          container.remove()
        } catch {
          // Ignore errors
        }
      })
    }
  })
  test('renders modal with field label and 2 buttons', async () => {
    const onSubmit = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal open={true} onOpenChange={onOpenChange} field="name" onSubmit={onSubmit} />
    )

    // Wait for modal to appear (Radix UI Dialog renders to portal)
    // Portal renders to document.body, so we need to wait for it
    const body = within(container.ownerDocument.body)
    await waitFor(
      () => {
        expect(body.getByText('Name')).toBeDefined()
      },
      { timeout: 3000 }
    )

    expect(body.getByText('Cancel')).toBeDefined()
    expect(body.getByText('Submit')).toBeDefined()
    expect(body.queryByText('Delete')).toBeNull()
    expect(body.queryByText('Save Inferred')).toBeNull()
  })

  test('does not show reasoning or confidence sections in legacy mode', async () => {
    const onSubmit = mock(() => {})
    const onOpenChange = mock(() => {})

    const { container } = render(
      <FieldModal open={true} onOpenChange={onOpenChange} field="name" onSubmit={onSubmit} />
    )

    // Wait for modal to appear
    const body = within(container.ownerDocument.body)
    await waitFor(
      () => {
        expect(body.getByText('Name')).toBeDefined()
      },
      { timeout: 3000 }
    )

    expect(body.queryByText('Reasoning:')).toBeNull()
    expect(body.queryByText(/Confidence:/)).toBeNull()
  })
})

describe('FieldModal - Inferred Mode (3-Button Layout)', () => {
  beforeEach(() => {
    // Ensure document.body exists before each test (required for screen queries)
    if (globalThis.document && !globalThis.document.body) {
      const body = globalThis.document.createElement('body')
      globalThis.document.appendChild(body)
    }
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
  test('renders modal title with "(Inferred)" suffix', async () => {
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

    // Wait for modal to appear
    const body = within(container.ownerDocument.body)
    await waitFor(
      () => {
        expect(body.getByText('Owns Home (Inferred)')).toBeDefined()
      },
      { timeout: 3000 }
    )
  })

  test('displays reasoning section when provided', async () => {
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

    // Wait for modal to appear
    const body = within(container.ownerDocument.body)
    await waitFor(
      () => {
        expect(body.getByText('Reasoning:')).toBeDefined()
      },
      { timeout: 3000 }
    )
    expect(body.getByText('Renters insurance implies tenant status')).toBeDefined()
  })

  test('displays confidence score when < 90%', async () => {
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

    // Wait for modal to appear
    const body = within(container.ownerDocument.body)
    await waitFor(
      () => {
        expect(body.getByText('Confidence: 75%')).toBeDefined()
      },
      { timeout: 3000 }
    )
  })

  test('hides confidence score when ≥ 90%', async () => {
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

    // Wait for modal to appear
    const body = within(container.ownerDocument.body)
    await waitFor(
      () => {
        expect(body.getByText('Owns Home (Inferred)')).toBeDefined()
      },
      { timeout: 3000 }
    )

    expect(body.queryByText(/Confidence:/)).toBeNull()
  })

  test('shows 3 buttons in inferred mode', async () => {
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

    // Wait for modal to appear
    const body = within(container.ownerDocument.body)
    await waitFor(
      () => {
        expect(body.getByText('Delete')).toBeDefined()
      },
      { timeout: 3000 }
    )

    expect(body.getByText('Save Inferred')).toBeDefined()
    expect(body.getByText('Save Known')).toBeDefined()
    expect(body.queryByText('Cancel')).toBeNull()
    expect(body.queryByText('Submit')).toBeNull()
  })

  test('[Save Inferred] button disabled when value unchanged', async () => {
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

    // Wait for modal to appear
    const body = within(container.ownerDocument.body)
    await waitFor(
      () => {
        expect(body.getByText('Save Inferred')).toBeDefined()
      },
      { timeout: 3000 }
    )

    const saveInferredBtn = body.getByText('Save Inferred')
    expect(saveInferredBtn.hasAttribute('disabled')).toBe(true)
  })
})

describe('FieldModal - Styling Tests', () => {
  beforeEach(() => {
    // Ensure document.body exists before each test (required for screen queries)
    if (globalThis.document && !globalThis.document.body) {
      const body = globalThis.document.createElement('body')
      globalThis.document.appendChild(body)
    }
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

  test('reasoning text has muted color', async () => {
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

    // Wait for modal to appear
    const body = within(container.ownerDocument.body)
    await waitFor(
      () => {
        expect(body.getByText('Test reasoning')).toBeDefined()
      },
      { timeout: 3000 }
    )

    const reasoningText = body.getByText('Test reasoning')
    expect(reasoningText.className).toContain('text-[#a3a3a3]')
  })

  test('confidence text has tertiary color and italic style', async () => {
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

    // Wait for modal to appear
    const body = within(container.ownerDocument.body)
    await waitFor(
      () => {
        expect(body.getByText('Confidence: 75%')).toBeDefined()
      },
      { timeout: 3000 }
    )

    const confidenceText = body.getByText('Confidence: 75%')
    expect(confidenceText.className).toContain('text-[#737373]')
    expect(confidenceText.className).toContain('italic')
  })
})
