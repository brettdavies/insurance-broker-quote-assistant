/**
 * Prefill Packet Utilities
 *
 * Functions for getting prefill packet and handling export/copy operations.
 *
 * @see docs/stories/1.8.prefill-packet-generation.md
 */

import { api } from '@/lib/api-client'
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
  // Prefer using prefill from IntakeResult if already available (more efficient, already validated by compliance filter)
  if (intakeResult?.prefill) {
    return intakeResult.prefill
  }

  // Otherwise call POST /api/intake/generate-prefill endpoint
  try {
    const response = await fetch('http://localhost:7070/api/intake/generate-prefill', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || 'Failed to generate prefill packet')
    }

    const prefillPacket: PrefillPacket = await response.json()
    return prefillPacket
  } catch (error) {
    throw new Error(
      `Failed to get prefill packet: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generate filename for prefill packet download
 *
 * @param prefill - PrefillPacket to generate filename from
 * @returns Sanitized filename: prefill_{name}_{state}_{productLine}_{YYYYMMDD}.json
 */
export function generatePrefillFilename(prefill: PrefillPacket): string {
  // Sanitize name: Remove spaces, special characters (keep only alphanumeric and underscores), convert to lowercase, limit length to 50 characters
  const sanitizedName = prefill.fullName
    ? prefill.fullName
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase()
        .slice(0, 50)
    : 'unknown'

  const state = (prefill.state || 'unknown').toLowerCase()
  const productLine = prefill.productLine || 'unknown'

  // Use current date in YYYYMMDD format
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  return `prefill_${sanitizedName}_${state}_${productLine}_${dateStr}.json`
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
