/**
 * Knowledge Pack RAG Service Interface
 *
 * Provides read-only query interface for knowledge pack data.
 * All queries read from in-memory Maps (no filesystem access).
 *
 * This file re-exports all query functions from domain-specific modules.
 */

// Carrier queries
export {
  getCarrierByName,
  getAllCarriersList,
  carrierOperatesInState,
  getCarriersForState,
  getCarrierProducts,
  getCarrierProductsForState,
  getCarrierStateAvailability,
} from './knowledge-pack-rag/carrier-queries'

// State queries
export { getStateByCode, getAllStatesList } from './knowledge-pack-rag/state-queries'

// Product queries
export { getProductByCode, getProductFieldRequirements } from './knowledge-pack-rag/product-queries'

// Discount queries
export {
  getCarrierDiscounts,
  getCarrierBundleDiscounts,
  getDiscountById,
} from './knowledge-pack-rag/discount-queries'

// Requirement queries
export {
  getCarrierFieldRequirements,
  getStateFieldRequirements,
} from './knowledge-pack-rag/requirement-queries'
