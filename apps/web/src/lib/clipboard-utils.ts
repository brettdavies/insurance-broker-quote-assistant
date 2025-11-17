/**
 * Clipboard Utilities
 *
 * Functions for copying savings pitch data to clipboard in formatted text.
 */

import type { PolicyAnalysisResult } from '@repo/shared'

/**
 * Format savings pitch for client email (markdown format)
 */
function formatSavingsPitchText(result: PolicyAnalysisResult): string {
  const lines: string[] = []

  // Header
  lines.push('# Savings Opportunities Analysis')
  lines.push('')

  // Current Policy Summary
  lines.push('## Current Policy')
  const policy = result.currentPolicy
  if (policy.carrier) lines.push(`**Carrier:** ${policy.carrier}`)
  if (policy.state) lines.push(`**State:** ${policy.state}`)
  if (policy.productType) lines.push(`**Product:** ${policy.productType}`)
  if (policy.premiums?.annual) {
    lines.push(`**Annual Premium:** $${policy.premiums.annual}`)
  }
  lines.push('')

  // Discounts Section
  if (result.opportunities.length > 0) {
    lines.push('## Discounts')
    for (const opp of result.opportunities) {
      lines.push(`### ${opp.discount}`)
      lines.push(`- **Estimated Savings:** $${opp.annualSavings.toFixed(0)}/year`)
      lines.push(`- **Confidence:** ${opp.confidenceScore}%`)
      if (opp.requires && opp.requires.length > 0) {
        lines.push('- **Requirements:**')
        for (const req of opp.requires) {
          lines.push(`  - ${req}`)
        }
      }
      lines.push(`- **Source:** ${opp.citation.id} (${opp.citation.file})`)
      lines.push('')
    }
  }

  // Bundles Section
  if (result.bundleOptions.length > 0) {
    lines.push('## Bundle Opportunities')
    for (const bundle of result.bundleOptions) {
      lines.push(`### Add ${bundle.product} Policy`)
      lines.push(`- **Estimated Savings:** $${bundle.estimatedSavings.toFixed(0)}/year`)
      if (bundle.requiredActions && bundle.requiredActions.length > 0) {
        lines.push('- **Required Actions:**')
        for (const action of bundle.requiredActions) {
          lines.push(`  - ${action}`)
        }
      }
      lines.push(`- **Source:** ${bundle.citation.id} (${bundle.citation.file})`)
      lines.push('')
    }
  }

  // Coverage Adjustments Section
  if (result.deductibleOptimizations.length > 0) {
    lines.push('## Coverage Adjustments')
    for (const opt of result.deductibleOptimizations) {
      lines.push('### Deductible Optimization')
      lines.push(
        `- **Current Deductible:** $${opt.currentDeductible} → **Suggested:** $${opt.suggestedDeductible}`
      )
      lines.push(`- **Estimated Savings:** $${opt.estimatedSavings.toFixed(0)}/year`)
      lines.push(`- **Source:** ${opt.citation.id} (${opt.citation.file})`)
      lines.push('')
    }
  }

  // Pitch Section
  if (result.pitch) {
    lines.push('## Summary')
    lines.push(result.pitch)
    lines.push('')
  }

  // Compliance Disclaimers
  if (result.complianceValidated) {
    lines.push('---')
    lines.push('')
    lines.push('## Important Disclaimers')
    lines.push(
      'This analysis is for informational purposes only. Actual savings may vary based on individual circumstances and carrier underwriting guidelines.'
    )
    if (result.currentPolicy.state) {
      lines.push(`State-specific regulations apply for ${result.currentPolicy.state}.`)
    }
  }

  return lines.join('\n')
}

/**
 * Copy savings pitch to clipboard
 */
export async function copySavingsPitchToClipboard(result: PolicyAnalysisResult): Promise<void> {
  try {
    const text = formatSavingsPitchText(result)

    // Use modern clipboard API
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Copy failed: ${error.message}`
        : 'Copy failed: Clipboard API unavailable'
    )
  }
}
