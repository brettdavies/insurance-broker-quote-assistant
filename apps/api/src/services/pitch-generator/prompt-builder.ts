/**
 * Pitch Prompt Builder
 *
 * Builds the LLM prompt for pitch generation.
 */

import type { BundleOption, DeductibleOptimization, Opportunity, PolicySummary } from '@repo/shared'

/**
 * Build prompt for pitch generation
 */
export function buildPitchPrompt(
  opportunities: Opportunity[],
  bundleOptions: BundleOption[],
  deductibleOptimizations: DeductibleOptimization[],
  policySummary: PolicySummary
): string {
  const parts: string[] = []

  parts.push(
    'Generate an agent-ready savings pitch for an insurance broker to present to a client.'
  )
  parts.push(
    'The pitch should be clear, professional, and include "because" rationales for each recommendation.'
  )
  parts.push('')

  // Policy context
  parts.push('## Current Policy:')
  parts.push(`Carrier: ${policySummary.carrier || 'Unknown'}`)
  parts.push(`State: ${policySummary.state || 'Unknown'}`)
  parts.push(`Product: ${policySummary.productType || 'Unknown'}`)
  if (policySummary.premiums?.annual) {
    parts.push(`Current Annual Premium: $${policySummary.premiums.annual}`)
  }
  parts.push('')

  // Opportunities (with citations)
  if (opportunities.length > 0) {
    parts.push('## Missing Discount Opportunities:')
    for (const opp of opportunities) {
      parts.push(
        `- ${opp.discount}: ${opp.percentage}% off, estimated $${opp.annualSavings}/yr savings`
      )
      if (opp.requires.length > 0) {
        parts.push(`  Requirements: ${opp.requires.join(', ')}`)
      }
      parts.push(
        `  Citation ID: ${opp.citation.id} (type: ${opp.citation.type}, carrier: ${opp.citation.carrier})`
      )
    }
    parts.push('')
  }

  // Bundle options (with citations)
  if (bundleOptions.length > 0) {
    parts.push('## Bundle Opportunities:')
    for (const bundle of bundleOptions) {
      parts.push(
        `- Add ${bundle.product} insurance: Estimated $${bundle.estimatedSavings}/yr savings`
      )
      if (bundle.requiredActions.length > 0) {
        parts.push(`  Actions: ${bundle.requiredActions.join(', ')}`)
      }
      parts.push(
        `  Citation ID: ${bundle.citation.id} (type: ${bundle.citation.type}, carrier: ${bundle.citation.carrier})`
      )
    }
    parts.push('')
  }

  // Deductible optimizations (with citations)
  if (deductibleOptimizations.length > 0) {
    parts.push('## Deductible Adjustments:')
    for (const opt of deductibleOptimizations) {
      parts.push(
        `- Raise deductible from $${opt.currentDeductible} to $${opt.suggestedDeductible}: $${opt.estimatedSavings}/yr savings`
      )
      parts.push(`  Premium impact: $${opt.premiumImpact}`)
      parts.push(
        `  Citation ID: ${opt.citation.id} (type: ${opt.citation.type}, carrier: ${opt.citation.carrier})`
      )
    }
    parts.push('')
  }

  // Instructions
  parts.push('## Instructions:')
  parts.push('Generate a professional, client-friendly pitch that:')
  parts.push('1. Opens with a brief summary of the analysis')
  parts.push('2. Groups recommendations by category (Discounts, Bundles, Deductible Adjustments)')
  parts.push(
    '3. For each recommendation, includes a "because" rationale explaining why it saves money'
  )
  parts.push('4. Includes specific dollar amounts and percentages')
  parts.push('5. Uses clear, actionable language suitable for a broker-client conversation')
  parts.push('6. Maintains a professional, consultative tone')
  parts.push(
    '7. When referencing citations, use the format: [citation:ID] where ID is the cuid2 citation ID'
  )
  parts.push(
    '   Example: "This discount is available [citation:disc_xrcd4bhsnd58vx2yu99ca4bn] based on your clean driving record."'
  )
  parts.push(
    '8. Do NOT include citation IDs in a way that looks technical - embed them naturally in the text'
  )
  parts.push('')
  parts.push('Return only the pitch text, no additional formatting or explanations.')

  return parts.join('\n')
}
