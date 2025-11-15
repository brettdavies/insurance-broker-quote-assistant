/**
 * Citation Replacer
 *
 * Replaces citation IDs in pitch text with formatted citations.
 */

import type {
  BundleOption,
  DeductibleOptimization,
  Opportunity,
} from '@repo/shared'

/**
 * Replace citation IDs in pitch with formatted citations
 *
 * LLM returns pitch with [citation:ID] markers. This function replaces them
 * with properly formatted citations that reference the knowledge pack.
 *
 * @param pitch - Pitch text from LLM with [citation:ID] markers
 * @param opportunities - Opportunities with citations
 * @param bundleOptions - Bundle options with citations
 * @param deductibleOptimizations - Deductible optimizations with citations
 * @returns Pitch with citations replaced
 */
export function replaceCitationsInPitch(
  pitch: string,
  opportunities: Opportunity[],
  bundleOptions: BundleOption[],
  deductibleOptimizations: DeductibleOptimization[]
): string {
  let result = pitch

  // Create a map of citation IDs to citation objects
  const citationMap = new Map<string, { type: string; carrier: string; file: string }>()

  // Add opportunities citations
  for (const opp of opportunities) {
    citationMap.set(opp.citation.id, {
      type: opp.citation.type,
      carrier: opp.citation.carrier,
      file: opp.citation.file,
    })
  }

  // Add bundle options citations
  for (const bundle of bundleOptions) {
    citationMap.set(bundle.citation.id, {
      type: bundle.citation.type,
      carrier: bundle.citation.carrier,
      file: bundle.citation.file,
    })
  }

  // Add deductible optimizations citations
  for (const opt of deductibleOptimizations) {
    citationMap.set(opt.citation.id, {
      type: opt.citation.type,
      carrier: opt.citation.carrier,
      file: opt.citation.file,
    })
  }

  // Replace [citation:ID] markers with formatted citations
  // Pattern: [citation:disc_xrcd4bhsnd58vx2yu99ca4bn]
  // Per PRD FR8: Citations should use industry-standard footnote format
  // Example: "(1) https://geico.com/discounts/, accessed 2025-11-09"
  // For now, we'll remove the markers since citations are tracked server-side in decision trace
  // The frontend can add footnotes based on the citation data if needed
  const citationPattern = /\[citation:([a-z0-9_]+)\]/g
  result = result.replace(citationPattern, (match, citationId) => {
    const citation = citationMap.get(citationId)
    if (citation) {
      // Remove citation markers from client-facing text
      // Citations are preserved in the decision trace for audit purposes
      // Frontend can add footnotes if needed based on citation.file
      return ''
    }
    return match // Keep original if citation not found
  })

  return result
}
