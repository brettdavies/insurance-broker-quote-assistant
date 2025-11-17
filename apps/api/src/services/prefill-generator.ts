/**
 * Prefill Generator Service
 *
 * Generates IQuote Pro pre-fill packet from UserProfile, RouteDecision,
 * missing fields, and disclaimers for broker handoff to licensed agents.
 *
 * @see docs/stories/1.8.prefill-packet-generation.md
 */

/**
 * Prefill Generator Service
 *
 * Generates IQuote Pro pre-fill packet from UserProfile, RouteDecision,
 * missing fields, and disclaimers for broker handoff to licensed agents.
 *
 * @see docs/stories/1.8.prefill-packet-generation.md
 */

// Re-export all functions from extracted modules
export { getMissingFields } from './prefill-generator/missing-fields-calculator'
export {
  generatePrefillPacket,
  generateLeadHandoffSummary,
} from './prefill-generator/packet-builder'
export { createPrefillRouting } from './prefill-generator/routing-builder'
