/**
 * Prefill Packet Utilities
 *
 * Functions for getting prefill packet and handling export/copy operations.
 *
 * @see docs/stories/1.8.prefill-packet-generation.md
 */

import { api } from '@/lib/api-client'
import { logError } from '@/lib/logger'
import type { IntakeResult, PrefillPacket, UserProfile } from '@repo/shared'

/**
 * Get prefill packet from IntakeResult if available, otherwise call API
 *
 * @param intakeResult - IntakeResult from intake endpoint (may contain prefill)
 * @param profile - UserProfile to use if prefill not available
 * @returns PrefillPacket or throws error
 */
export async function getPrefillPacket(
  intakeResult: IntakeResult | null,
  profile: UserProfile
): Promise<PrefillPacket> {
  console.log('[Frontend] getPrefillPacket: Called with', {
    hasIntakeResult: !!intakeResult,
    hasPrefillInResult: !!intakeResult?.prefill,
    profileKeys: Object.keys(profile),
    profileState: profile.state,
    profileProductType: profile.productType,
  })

  // Prefer using prefill from IntakeResult if already available (more efficient, already validated by compliance filter)
  if (intakeResult?.prefill) {
    console.log('[Frontend] getPrefillPacket: Using prefill from intakeResult')
    return intakeResult.prefill
  }

  // Otherwise call POST /api/generate-prefill endpoint using Hono RPC client
  console.log('[Frontend] getPrefillPacket: Calling /api/generate-prefill endpoint')
  try {
    // Use Hono RPC client (flattened route from /api/intake/generate-prefill to /api/generate-prefill)
    // Hono RPC converts kebab-case to camelCase, but TypeScript may need bracket notation
    // @ts-expect-error - Hono RPC type inference for kebab-case routes
    const response = await api.api['generate-prefill'].$post({ json: { profile } })

    console.log('[Frontend] getPrefillPacket: API response status:', response.status, response.ok)

    if (!response.ok) {
      let errorMessage = 'Failed to generate prefill packet'
      try {
        const errorData = await response.json()
        // Handle different error response formats
        if (errorData.error?.message) {
          errorMessage = errorData.error.message
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        }
      } catch (parseError) {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || `Server error (${response.status})`
      }
      const error = new Error(errorMessage)
      void logError('Prefill packet generation failed', error)
      throw error
    }

    const prefillPacket: PrefillPacket = await response.json()

    console.log('[Frontend] getPrefillPacket: Prefill packet received:', {
      hasRouting: !!prefillPacket.routing,
      routingPrimaryCarrier: prefillPacket.routing?.primaryCarrier,
      routingEligibleCarriers: prefillPacket.routing?.eligibleCarriers,
      routingEligibleCarriersCount: prefillPacket.routing?.eligibleCarriers?.length || 0,
      routingConfidence: prefillPacket.routing?.confidence,
      routingRationale: prefillPacket.routing?.rationale,
    })

    return prefillPacket
  } catch (error) {
    // If error is already an Error with a message, re-throw it as-is
    // Otherwise wrap it
    if (error instanceof Error) {
      void logError('Error in getPrefillPacket', error)
      throw error
    }
    throw new Error(
      `Failed to get prefill packet: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generate filename for prefill packet download
 *
 * @param prefill - PrefillPacket to generate filename from
 * @returns Sanitized filename: prefill_{name}_{state}_{productType}_{YYYYMMDD}.json
 */
export function generatePrefillFilename(prefill: PrefillPacket): string {
  // Sanitize name: Remove spaces, special characters (keep only alphanumeric and underscores), convert to lowercase, limit length to 50 characters
  const sanitizedName = prefill.profile.name
    ? prefill.profile.name
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase()
        .slice(0, 50)
    : 'unknown'

  const state = (prefill.profile.state || 'unknown').toLowerCase()
  const productType = prefill.profile.productType || 'unknown'

  // Use current date in YYYYMMDD format
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  return `prefill_${sanitizedName}_${state}_${productType}_${dateStr}.json`
}

/**
 * Handle export: Download prefill packet as JSON file
 *
 * @param prefill - PrefillPacket to export
 * @param filename - Optional filename (auto-generated if not provided)
 */
export function handleExport(prefill: PrefillPacket, filename?: string): void {
  const jsonString = JSON.stringify(prefill, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const downloadFilename = filename || generatePrefillFilename(prefill)

  // Create temporary anchor element and trigger download
  const link = document.createElement('a')
  link.href = url
  link.download = downloadFilename
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Handle copy: Copy prefill packet JSON to clipboard
 *
 * @param prefill - PrefillPacket to copy
 * @returns Promise that resolves when copy is complete
 */
export async function handleCopy(prefill: PrefillPacket): Promise<void> {
  const jsonString = JSON.stringify(prefill, null, 2) // Pretty-printed

  try {
    await navigator.clipboard.writeText(jsonString)
  } catch (error) {
    // Fallback for browsers that don't support clipboard API
    throw new Error(
      `Failed to copy to clipboard: ${error instanceof Error ? error.message : 'Clipboard API not available'}`
    )
  }
}
