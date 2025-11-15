/**
 * useComplianceDisclaimers Hook
 *
 * Manages fetching and state management for compliance disclaimers.
 * Single Responsibility: Compliance disclaimer fetching and state only
 *
 * Reactively fetches disclaimers whenever the profile changes (pill creation, edit, deletion).
 * Only fetches when at least state or productType is present.
 */

import { getDisclaimers } from '@/lib/compliance-utils'
import { logDebug, logInfo } from '@/lib/logger'
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
    // Extract state and productType from profile
    const state = profile?.state
    const productType = profile?.productType

    void logInfo('useComplianceDisclaimers: Profile changed', {
      type: 'compliance_hook_profile_change',
      state,
      productType,
      hasState: !!state,
      hasProductType: !!productType,
    })

    // Only fetch if we have at least state or product
    if (state || productType) {
      void logInfo('useComplianceDisclaimers: Fetching disclaimers', {
        type: 'compliance_hook_fetch_start',
        state,
        productType,
      })

      getDisclaimers(state ?? undefined, productType ?? undefined)
        .then((fetchedDisclaimers) => {
          void logInfo('useComplianceDisclaimers: Disclaimers received', {
            type: 'compliance_hook_fetch_complete',
            state,
            productType,
            disclaimersCount: fetchedDisclaimers.length,
          })
          setDisclaimers(fetchedDisclaimers)
        })
        .catch((error) => {
          // Error already logged in getDisclaimers
          void logInfo('useComplianceDisclaimers: Error fetching disclaimers', {
            type: 'compliance_hook_fetch_error',
            state,
            productType,
            error: error instanceof Error ? error.message : String(error),
          })
          setDisclaimers([])
        })
    } else {
      // No state/product yet - clear disclaimers
      void logInfo(
        'useComplianceDisclaimers: Clearing disclaimers (missing state or productType)',
        {
          type: 'compliance_hook_clear',
        }
      )
      setDisclaimers([])
    }
    // Trigger on any profile change (pill creation, edit, deletion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  return disclaimers
}
