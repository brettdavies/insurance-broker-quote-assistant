/**
 * Citation Utilities
 *
 * Creates citations for discounts and other knowledge pack entities
 */

import type { Carrier, Citation, Discount } from '@repo/shared'

/**
 * Create citation for a discount
 *
 * @param discount - Discount from knowledge pack
 * @param carrier - Carrier from knowledge pack
 * @returns Citation object with cuid2 ID and source info
 */
export function createCitation(discount: Discount, carrier: Carrier): Citation {
  return {
    id: discount._id,
    type: 'discount',
    carrier: carrier.name,
    file: `knowledge_pack/carriers/${carrier.name.toLowerCase().replace(/\s+/g, '-')}.json`,
  }
}
