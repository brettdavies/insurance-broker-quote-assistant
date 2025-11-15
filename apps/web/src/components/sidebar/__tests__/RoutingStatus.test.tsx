/**
 * Unit Tests for RoutingStatus Component
 *
 * Tests RoutingStatus component displays routing decision information correctly:
 * - Primary carrier display
 * - Eligible carriers list
 * - Confidence percentage
 * - Rationale display
 * - Tied carriers indication
 * - Empty state handling
 *
 * @see docs/stories/1.6.routing-rules-engine.md
 */

import '../../../test-setup'
import { describe, expect, it } from 'bun:test'
import type { RouteDecision } from '@repo/shared'
import { render } from '@testing-library/react'
import { getTextContent, textIncludes, textMatches } from '../../../__tests__/test-utils'
import { RoutingStatus } from '../RoutingStatus'

describe('RoutingStatus Component', () => {
  it('should display primary carrier when provided', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive'],
      confidence: 0.9,
      rationale: 'GEICO offers best rates',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    expect(textIncludes(container, 'GEICO')).toBe(true)
    expect(textIncludes(container, 'Primary Carrier')).toBe(true)
  })

  it('should display confidence percentage when confidence > 0', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO'],
      confidence: 0.85,
      rationale: 'GEICO recommended',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    expect(textIncludes(container, '85%')).toBe(true)
    expect(textIncludes(container, 'confidence')).toBe(true)
  })

  it('should not display confidence when confidence is 0', () => {
    const route: RouteDecision = {
      primaryCarrier: '',
      eligibleCarriers: [],
      confidence: 0,
      rationale: 'No carriers available',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    const content = getTextContent(container)
    // Should not show confidence percentage when 0
    expect(textMatches(container, /0% confidence/i)).toBe(false)
  })

  it('should display all eligible carriers', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive', 'State Farm'],
      confidence: 0.9,
      rationale: 'Multiple carriers available',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    expect(textIncludes(container, 'GEICO')).toBe(true)
    expect(textIncludes(container, 'Progressive')).toBe(true)
    expect(textIncludes(container, 'State Farm')).toBe(true)
    expect(textMatches(container, /Eligible Carriers \(3\)/i)).toBe(true)
  })

  it('should highlight primary carrier in eligible carriers list', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive'],
      confidence: 0.9,
      rationale: 'GEICO recommended',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    // Primary carrier should be marked
    expect(textIncludes(container, '(Primary)')).toBe(true)
  })

  it('should display tied carriers when present', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive'],
      tiedCarriers: ['Progressive'],
      confidence: 0.9,
      rationale: 'GEICO and Progressive tied',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    expect(textIncludes(container, '(Tied)')).toBe(true)
    expect(textIncludes(container, 'Progressive')).toBe(true)
  })

  it('should display rationale when provided', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO'],
      confidence: 0.9,
      rationale: 'GEICO offers best rates for your profile',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    expect(textIncludes(container, 'Rationale')).toBe(true)
    expect(textIncludes(container, 'GEICO offers best rates for your profile')).toBe(true)
  })

  it('should display no eligible carriers message when empty', () => {
    const route: RouteDecision = {
      primaryCarrier: '',
      eligibleCarriers: [],
      confidence: 0,
      rationale: 'No carriers available for this state/product combination',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    // Component shows rationale when no eligible carriers
    const content = getTextContent(container)
    expect(
      textIncludes(container, 'No carriers available') ||
        textIncludes(container, 'No eligible carriers found') ||
        content.includes('No carriers available for this state/product combination')
    ).toBe(true)
  })

  it('should handle empty eligible carriers array with primary carrier', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: [],
      confidence: 0.5,
      rationale: 'Limited availability',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    // Component shows rationale when no eligible carriers, even if primaryCarrier is set
    const content = getTextContent(container)
    expect(
      textIncludes(container, 'Limited availability') ||
        textIncludes(container, 'No eligible carriers found') ||
        content.includes('Limited availability')
    ).toBe(true)
  })

  it('should not display primary carrier section when primaryCarrier is empty', () => {
    const route: RouteDecision = {
      primaryCarrier: '',
      eligibleCarriers: [],
      confidence: 0,
      rationale: 'No carriers available',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    // Should not show primary carrier section
    const content = getTextContent(container)
    expect(textMatches(container, /Primary Carrier/i)).toBe(false)
  })

  it('should round confidence percentage correctly', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO'],
      confidence: 0.857, // Should round to 86%
      rationale: 'GEICO recommended',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    expect(textIncludes(container, '86%')).toBe(true)
  })

  it('should handle single eligible carrier', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO'],
      confidence: 0.9,
      rationale: 'Only GEICO available',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    expect(textMatches(container, /Eligible Carriers \(1\)/i)).toBe(true)
    expect(textIncludes(container, 'GEICO')).toBe(true)
  })

  it('should display eligible carriers count correctly', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive', 'State Farm', 'Allstate'],
      confidence: 0.9,
      rationale: 'Multiple options available',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    expect(textMatches(container, /Eligible Carriers \(4\)/i)).toBe(true)
  })
})
