/**
 * Export Utilities
 *
 * Functions for exporting savings pitch data as JSON files.
 */

import { policyAnalysisResultSchema } from '@repo/shared'
import type { PolicyAnalysisResult } from '@repo/shared'

/**
 * Generate filename for savings pitch export
 * Format: savings_pitch_{name}_{state}_{product}_{date}.json
 */
function generateExportFilename(result: PolicyAnalysisResult): string {
  // Extract name from currentPolicy, fallback to carrier, then 'client'
  // currentPolicy is required in PolicyAnalysisResult schema, so it's always defined
  const currentPolicy = result.currentPolicy

  const name = currentPolicy.name
    ? currentPolicy.name.toLowerCase().replace(/\s+/g, '_')
    : currentPolicy.carrier
      ? currentPolicy.carrier.toLowerCase().replace(/\s+/g, '_')
      : 'client'
  const state = currentPolicy.state ?? 'unknown'
  const product = currentPolicy.productType ?? 'unknown'
  const dateStr = new Date().toISOString().split('T')[0]?.replace(/-/g, '') ?? '' // YYYYMMDD

  return `savings_pitch_${name}_${state}_${product}_${dateStr}.json`
}

/**
 * Export savings pitch as JSON file
 */
export function exportSavingsPitch(result: PolicyAnalysisResult): void {
  try {
    // Validate data using Zod schema
    const validated = policyAnalysisResultSchema.parse(result)

    // Generate filename
    const filename = generateExportFilename(validated)

    // Create JSON blob
    const jsonString = JSON.stringify(validated, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()

    // Clean up
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    // Re-throw error for caller to handle (e.g., show toast notification)
    throw new Error(
      error instanceof Error
        ? `Export failed: ${error.message}`
        : 'Export failed: Invalid data format'
    )
  }
}
