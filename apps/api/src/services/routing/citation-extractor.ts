/**
 * Citation Extractor
 *
 * Extracts citations from eligible carriers.
 */

import type { Citation } from '@repo/shared'
import type { CarrierMatch } from './carrier-ranker'

/**
 * Extract citations from eligible carriers
 *
 * @param rankedCarriers - Carriers ranked by match score
 * @returns Array of citation objects
 */
export function extractCitations(rankedCarriers: CarrierMatch[]): Citation[] {
  return rankedCarriers.map((match) => {
    const carrier = match.carrier
    const sourceFile =
      carrier._sources[0]?.pageFile ||
      `knowledge_pack/carriers/${carrier.name.toLowerCase().replace(/\s+/g, '-')}.json`

    return {
      id: carrier._id,
      type: 'carrier',
      carrier: carrier._id,
      file: sourceFile,
    }
  })
}
