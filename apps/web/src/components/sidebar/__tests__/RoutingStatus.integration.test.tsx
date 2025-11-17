/**
 * Integration Tests for RoutingStatus Component
 *
 * Tests RoutingStatus component integration with Sidebar and data flow:
 * - Component receives routeDecision from props
 * - Component updates when routeDecision changes
 * - Component handles undefined/null routeDecision
 * - Component integrates with Sidebar correctly
 *
 * @see docs/stories/1.6.routing-rules-engine.md
 */

import '../../../test-setup'
import { describe, expect, it } from 'bun:test'
import type { RouteDecision } from '@repo/shared'
import { render } from '@testing-library/react'
import { getTextContent, textIncludes } from '../../../__tests__/test-utils'
import { RoutingStatus } from '../RoutingStatus'

describe('RoutingStatus Integration Tests', () => {
  it('should render when routeDecision is provided', () => {
    const routeDecision: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive'],
      confidence: 0.9,
      rationale: 'GEICO recommended',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={routeDecision} mode="intake" />)

    // Should render RoutingStatus component
    expect(textIncludes(container, 'Routing Status')).toBe(true)
    expect(textIncludes(container, 'GEICO')).toBe(true)
  })

  it('should display placeholder when routeDecision is undefined', () => {
    const { container } = render(<RoutingStatus route={null} mode="intake" />)

    expect(
      textIncludes(container, 'Routing information will appear here when enough data is captured')
    ).toBe(true)
  })

  it('should update when routeDecision changes', () => {
    const initialRoute: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO'],
      confidence: 0.8,
      rationale: 'Initial routing',
      citations: [],
    }

    const { container, rerender } = render(<RoutingStatus route={initialRoute} mode="intake" />)

    expect(textIncludes(container, 'GEICO')).toBe(true)

    // Update route decision
    const updatedRoute: RouteDecision = {
      primaryCarrier: 'Progressive',
      eligibleCarriers: ['Progressive', 'State Farm'],
      confidence: 0.95,
      rationale: 'Updated routing',
      citations: [],
    }

    rerender(<RoutingStatus route={updatedRoute} mode="intake" />)

    expect(textIncludes(container, 'Progressive')).toBe(true)
    expect(textIncludes(container, 'State Farm')).toBe(true)
  })

  it('should handle routeDecision with no eligible carriers', () => {
    const routeDecision: RouteDecision = {
      primaryCarrier: '',
      eligibleCarriers: [],
      confidence: 0,
      rationale: 'No carriers available for CA renters',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={routeDecision} mode="intake" />)

    expect(textIncludes(container, 'No carriers available for CA renters')).toBe(true)
  })

  it('should not render RoutingStatus in policy mode', () => {
    const routeDecision: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO'],
      confidence: 0.9,
      rationale: 'GEICO recommended',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={routeDecision} mode="policy" />)

    // Should not show Routing Status in policy mode
    expect(textIncludes(container, 'Routing Status')).toBe(false)
  })

  it('should handle routeDecision with tied carriers correctly', () => {
    const routeDecision: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive', 'State Farm'],
      tiedCarriers: ['Progressive', 'State Farm'],
      confidence: 0.9,
      rationale: 'Multiple carriers tied',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={routeDecision} mode="intake" />)

    expect(textIncludes(container, 'GEICO')).toBe(true)
    expect(textIncludes(container, 'Progressive')).toBe(true)
    expect(textIncludes(container, 'State Farm')).toBe(true)
    // Should show tied indication
    const content = getTextContent(container)
    expect(content.includes('(Tied)') || content.includes('Tied')).toBe(true)
  })

  it('should display routing status section header in intake mode', () => {
    const routeDecision: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO'],
      confidence: 0.9,
      rationale: 'GEICO recommended',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={routeDecision} mode="intake" />)

    expect(textIncludes(container, 'Routing Status')).toBe(true)
  })
})
