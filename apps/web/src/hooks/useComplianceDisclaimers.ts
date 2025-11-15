/**
 * useComplianceDisclaimers Hook
 *
 * Manages fetching and state management for compliance disclaimers.
 * Single Responsibility: Compliance disclaimer fetching and state only
 */

import { getDisclaimers } from '@/lib/compliance-utils'
import type { UserProfile } from '@repo/shared'
import { useEffect, useState } from 'react'

/**
 * Hook to fetch and manage compliance disclaimers
 *
 * @param profile - User profile containing state and productType
 * @returns Array of disclaimer strings
 */
export function useComplianceDisclaimers(profile?: UserProfile): string[] {
  const [disclaimers, setDisclaimers] = useState<string[]>([])

  useEffect(() => {
    // Extract state and productType from profile (use string values to ensure dependency tracking works)
    const state = profile?.state
    const productType = profile?.productType

    // Only fetch if we have at least state or product
    if (state || productType) {
      getDisclaimers(state ?? undefined, productType ?? undefined)
        .then((fetchedDisclaimers) => {
          setDisclaimers(fetchedDisclaimers)
        })
        .catch((error) => {
          // Error already logged in getDisclaimers
          setDisclaimers([])
        })
    } else {
      // No state/product yet - clear disclaimers
      setDisclaimers([])
    }
  }, [profile?.state, profile?.productType])

  return disclaimers
}
