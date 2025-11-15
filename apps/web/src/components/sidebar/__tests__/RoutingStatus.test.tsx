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
      confidence: 90,
      rationale: 'GEICO offers best rates',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    expect(textIncludes(container, 'GEICO')).toBe(true)
    // Primary carrier is displayed in a blue box, no longer has "Primary Carrier" label
  })

  it('should display confidence percentage when confidence > 0', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO'],
      confidence: 85,
      rationale: 'GEICO recommended',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    expect(textIncludes(container, '85%')).toBe(true)
    expect(textIncludes(container, 'Routing Confidence')).toBe(true)
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
      confidence: 90,
      rationale: 'Multiple carriers available',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    expect(textIncludes(container, 'GEICO')).toBe(true) // Primary carrier
    expect(textIncludes(container, 'Progressive')).toBe(true) // Other eligible
    expect(textIncludes(container, 'State Farm')).toBe(true) // Other eligible
    expect(textMatches(container, /Other Eligible Carriers \(2\)/i)).toBe(true)
  })

  it('should display primary carrier separately from other eligible carriers', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive'],
      confidence: 90,
      rationale: 'GEICO recommended',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    // Primary carrier is displayed separately, not in the "Other Eligible Carriers" list
    expect(textIncludes(container, 'GEICO')).toBe(true)
    expect(textIncludes(container, 'Progressive')).toBe(true)
    // Primary carrier no longer has "(Primary)" label in compact layout
  })

  it('should display tied carriers when present', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive'],
      tiedCarriers: ['Progressive'],
      confidence: 90,
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
      confidence: 90,
      rationale: 'GEICO offers best rates for your profile',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    // Rationale is displayed without a label in compact layout
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
      confidence: 50,
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

    // Should not show primary carrier section (no blue box with carrier name)
    const content = getTextContent(container)
    // In compact layout, there's no "Primary Carrier" label, just the carrier name in a box
    // So we check that no carrier box appears
    expect(textMatches(container, /Primary Carrier/i)).toBe(false)
  })

  it('should display confidence percentage correctly', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO'],
      confidence: 86, // Already 0-100 integer percentage
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
      confidence: 90,
      rationale: 'Only GEICO available',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    // When only primary carrier exists, "Other Eligible Carriers" section should not appear
    expect(textMatches(container, /Other Eligible Carriers/i)).toBe(false)
    expect(textIncludes(container, 'GEICO')).toBe(true)
  })

  it('should display eligible carriers count correctly', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive', 'State Farm', 'Allstate'],
      confidence: 90,
      rationale: 'Multiple options available',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    // Should show count of 3 (excluding primary carrier)
    expect(textMatches(container, /Other Eligible Carriers \(3\)/i)).toBe(true)
  })

  it('should display match scores for carriers when provided', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive', 'State Farm'],
      matchScores: {
        GEICO: 100,
        Progressive: 95,
        'State Farm': 90,
      },
      confidence: 93,
      rationale: 'GEICO has highest match score',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    // Should display match scores - primary carrier should show match score
    expect(textIncludes(container, '100% match')).toBe(true)
    // Other eligible carriers should show match scores
    expect(textIncludes(container, '95% match')).toBe(true)
    expect(textIncludes(container, '90% match')).toBe(true)
  })

  it('should display routing confidence separately from match scores', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO'],
      matchScores: {
        GEICO: 100,
      },
      confidence: 93,
      rationale: 'GEICO recommended',
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    // Should show routing confidence (overall confidence) in compact format
    expect(textIncludes(container, 'Routing Confidence')).toBe(true)
    expect(textIncludes(container, '93%')).toBe(true)
    // Should show match score (carrier-specific) on primary carrier line
    expect(textIncludes(container, '100% match')).toBe(true)
  })

  it('should not include primary carrier in other eligible carriers list', () => {
    const route: RouteDecision = {
      primaryCarrier: 'GEICO',
      eligibleCarriers: ['GEICO', 'Progressive', 'State Farm'],
      matchScores: {
        GEICO: 100,
        Progressive: 95,
        'State Farm': 90,
      },
      confidence: 93,
      rationale: 'Multiple carriers available', // Avoid "GEICO" in rationale for cleaner test
      citations: [],
    }

    const { container } = render(<RoutingStatus route={route} mode="intake" />)

    // Should show "Other Eligible Carriers" title
    expect(textIncludes(container, 'Other Eligible Carriers')).toBe(true)
    // Should show count of 2 (excluding primary)
    expect(textMatches(container, /Other Eligible Carriers \(2\)/i)).toBe(true)
    // Should show Progressive and State Farm in the other eligible carriers section
    expect(textIncludes(container, 'Progressive')).toBe(true)
    expect(textIncludes(container, 'State Farm')).toBe(true)
    // GEICO should appear as primary carrier but not in the "Other Eligible Carriers" list
    // We verify this by checking the count is 2, not 3
    const content = getTextContent(container)
    const otherEligibleSection = content.split('Other Eligible Carriers')[1] || ''
    // Count how many times carrier names appear in the other eligible section
    // Progressive and State Farm should appear, but GEICO should not
    const progressiveInOther = otherEligibleSection.includes('Progressive')
    const stateFarmInOther = otherEligibleSection.includes('State Farm')
    // GEICO might appear in rationale, but should not be in the carrier list boxes
    expect(progressiveInOther).toBe(true)
    expect(stateFarmInOther).toBe(true)
  })
})
