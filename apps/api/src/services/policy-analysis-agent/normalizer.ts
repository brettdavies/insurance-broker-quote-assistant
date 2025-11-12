/**
 * Policy Analysis Result Normalizer
 *
 * Validates and normalizes PolicyAnalysisResult from LLM:
 * - Resolves citation IDs to actual knowledge pack file paths
 * - Normalizes percentage values (decimals to integers)
 * - Ensures token tracking is included
 */

import type {
  BundleOption,
  DeductibleOptimization,
  Opportunity,
  PolicyAnalysisResult,
} from '@repo/shared'
import { logError } from '../../utils/logger'
import { getCarrierByName } from '../knowledge-pack-rag'
import type { NormalizerInput } from './types'

/**
 * Resolve citation file path from knowledge pack
 *
 * Walks the knowledge pack tree to find the actual file path for a citation ID.
 * Looks up the discount/carrier by ID and extracts the source file path from _sources.
 *
 * @param citationId - cuid2 ID from LLM response
 * @param carrierName - Carrier name for lookup
 * @param type - Citation type ('discount', 'carrier', etc.)
 * @returns Actual file path from knowledge pack, or fallback path
 */
async function resolveCitationFile(
  citationId: string,
  carrierName: string,
  type: string
): Promise<string> {
  try {
    const carrier = getCarrierByName(carrierName)
    if (!carrier) {
      // Fallback to standard path if carrier not found
      return `knowledge_pack/carriers/${carrierName.toLowerCase().replace(/\s+/g, '-')}.json`
    }

    // If citation is for a discount, find it in carrier discounts
    if (type === 'discount') {
      const discount = carrier.discounts.find((d) => d._id === citationId)
      if (discount) {
        // Discount fields are FieldWithMetadata, use name field's sources
        const nameField = discount.name
        if (nameField?._sources && nameField._sources.length > 0) {
          const source = nameField._sources[0]
          if (source?.pageFile) {
            return source.pageFile
          }
          // If pageFile not available, try to use URI
          if (source?.uri) {
            return source.uri
          }
        }
      }
    }

    // If citation is for carrier itself, use carrier sources
    if (type === 'carrier' && carrier._sources && carrier._sources.length > 0) {
      const source = carrier._sources[0]
      if (source?.pageFile) {
        return source.pageFile
      }
      // If pageFile not available, try to use URI
      if (source?.uri) {
        return source.uri
      }
    }

    // Fallback to standard carrier file path
    return `knowledge_pack/carriers/${carrier.name.toLowerCase().replace(/\s+/g, '-')}.json`
  } catch (error) {
    await logError('Failed to resolve citation file', error as Error, {
      citationId,
      carrierName,
      type,
    })
    // Return fallback path on error
    return `knowledge_pack/carriers/${carrierName.toLowerCase().replace(/\s+/g, '-')}.json`
  }
}

/**
 * Normalize percentage value (convert decimal to integer if needed)
 *
 * @param value - Percentage value (may be 0.1 or 10)
 * @returns Normalized percentage as integer (10)
 */
function normalizePercentage(value: number): number {
  // If value is between 0 and 1, assume it's a decimal (0.1 = 10%)
  if (value > 0 && value <= 1) {
    return Math.round(value * 100)
  }
  // Otherwise assume it's already a percentage
  return Math.round(value)
}

/**
 * Normalize a single opportunity
 */
async function normalizeOpportunity(
  opportunity: Opportunity,
  carrierName: string
): Promise<Opportunity> {
  const filePath = await resolveCitationFile(
    opportunity.citation.id,
    carrierName,
    opportunity.citation.type
  )
  return {
    ...opportunity,
    percentage: normalizePercentage(opportunity.percentage),
    citation: {
      ...opportunity.citation,
      // Resolve file path from knowledge pack
      file: filePath,
    },
  }
}

/**
 * Normalize a bundle option
 */
async function normalizeBundleOption(
  bundle: BundleOption,
  carrierName: string
): Promise<BundleOption> {
  const filePath = await resolveCitationFile(bundle.citation.id, carrierName, bundle.citation.type)
  return {
    ...bundle,
    citation: {
      ...bundle.citation,
      // Resolve file path from knowledge pack
      file: filePath,
    },
  }
}

/**
 * Normalize a deductible optimization
 */
async function normalizeDeductibleOptimization(
  opt: DeductibleOptimization,
  carrierName: string
): Promise<DeductibleOptimization> {
  const filePath = await resolveCitationFile(opt.citation.id, carrierName, opt.citation.type)
  return {
    ...opt,
    citation: {
      ...opt.citation,
      // Resolve file path from knowledge pack
      file: filePath,
    },
  }
}

/**
 * Normalize PolicyAnalysisResult from LLM
 *
 * - Resolves citation file paths from knowledge pack (walks tree to find actual file)
 * - Normalizes percentage values (decimals to integers)
 * - Ensures token tracking is included
 *
 * @param result - Raw result from LLM
 * @param carrierName - Carrier name for citation resolution
 * @returns Normalized result with resolved citations and normalized values (opportunities are raw, will be validated)
 */
export async function normalizePolicyAnalysisResult(
  result: NormalizerInput,
  carrierName: string
): Promise<
  Omit<PolicyAnalysisResult, 'opportunities'> & {
    opportunities: import('@repo/shared').Opportunity[]
    _metadata?: { tokensUsed?: number; analysisTime?: number }
  }
> {
  try {
    // Normalize opportunities (async - resolve file paths from knowledge pack)
    const normalizedOpportunities = await Promise.all(
      result.opportunities.map((opp) => normalizeOpportunity(opp, carrierName))
    )

    // Normalize bundle options
    const normalizedBundleOptions = await Promise.all(
      result.bundleOptions.map((bundle) => normalizeBundleOption(bundle, carrierName))
    )

    // Normalize deductible optimizations
    const normalizedDeductibleOptimizations = await Promise.all(
      result.deductibleOptimizations.map((opt) => normalizeDeductibleOptimization(opt, carrierName))
    )

    return {
      ...result,
      opportunities: normalizedOpportunities,
      bundleOptions: normalizedBundleOptions,
      deductibleOptimizations: normalizedDeductibleOptimizations,
      // Ensure metadata is included
      _metadata: {
        tokensUsed: result._metadata?.tokensUsed ?? 0,
        analysisTime: result._metadata?.analysisTime ?? 0,
      },
    }
  } catch (error) {
    await logError('Failed to normalize policy analysis result', error as Error, {
      carrierName,
    })
    // Return original result on error (better than failing completely)
    return result
  }
}
