/**
 * useRouting Hook
 *
 * Manages fetching and state management for carrier routing decisions.
 * Single Responsibility: Routing decision fetching and state only
 *
 * Reactively fetches routing whenever the profile changes (pill creation, edit, deletion).
 * Only fetches when both state and productType are present (required for routing).
 */

import { logDebug, logInfo } from '@/lib/logger'
import { getRouteDecision } from '@/lib/routing-utils'
import type { RouteDecision, UserProfile } from '@repo/shared'
import { useEffect, useState } from 'react'

/**
 * Hook to fetch and manage routing decisions
 *
 * @param profile - User profile containing state and productType
 * @returns RouteDecision or null if not available
 */
export function useRouting(profile?: UserProfile): RouteDecision | null {
  const [routeDecision, setRouteDecision] = useState<RouteDecision | null>(null)

  useEffect(() => {
    // Extract state and productType from profile
    const state = profile?.state
    const productType = profile?.productType

    void logInfo('useRouting: Profile changed', {
      type: 'routing_hook_profile_change',
      state,
      productType,
      hasState: !!state,
      hasProductType: !!productType,
      hasBoth: !!(state && productType),
      profileAge: profile?.age,
      profileKeys: profile ? Object.keys(profile) : [],
    })

    // Only fetch if we have both state and productType (required for routing)
    if (state && productType) {
      void logInfo('useRouting: Fetching routing decision', {
        type: 'routing_hook_fetch_start',
        state,
        productType,
      })

      getRouteDecision(state, productType, profile)
        .then((decision) => {
          void logInfo('useRouting: Routing decision received', {
            type: 'routing_hook_fetch_complete',
            state,
            productType,
            hasDecision: !!decision,
            primaryCarrier: decision?.primaryCarrier,
            eligibleCarriersCount: decision?.eligibleCarriers?.length || 0,
            confidence: decision?.confidence,
          })
          setRouteDecision(decision)
        })
        .catch((error) => {
          // Error already logged in getRouteDecision
          void logInfo('useRouting: Error fetching routing', {
            type: 'routing_hook_fetch_error',
            state,
            productType,
            error: error instanceof Error ? error.message : String(error),
          })
          setRouteDecision(null)
        })
    } else {
      // No state/product yet - clear routing
      void logInfo('useRouting: Clearing routing (missing state or productType)', {
        type: 'routing_hook_clear',
        state,
        productType,
      })
      setRouteDecision(null)
    }
    // Trigger on any profile change (pill creation, edit, deletion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  return routeDecision
}
