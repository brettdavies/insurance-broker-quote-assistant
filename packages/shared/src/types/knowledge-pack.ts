/**
 * Knowledge Pack Types
 *
 * TypeScript interfaces for the IQuote Pro knowledge pack.
 * These types define the structure of insurance data loaded from the
 * external knowledge_pack/ directory at runtime.
 *
 * @module knowledge-pack
 */

// ============================================================================
// Source & Citation Types
// ============================================================================

/**
 * Source metadata for entity-level citations (per PEAK6 spec requirement).
 * Each entity (discount, carrier, etc.) includes source tracking for compliance.
 */
export interface Source {
  /** Source URL (e.g., "https://www.geico.com/auto/discounts/") */
  uri: string

  /** Date page was accessed (YYYY-MM-DD format) */
  accessed: string

  /** Confidence level in extracted data */
  confidence: 'high' | 'medium' | 'low'

  /** Optional CSS selector or XPath reference */
  elementRef?: string
}

/**
 * Citation format for application outputs (footnote-style).
 * Used in savings pitches and broker-facing outputs.
 *
 * @example
 * ```
 * Based on GEICO's Multi-Policy Bundle discount: 15% off(1)
 *
 * Sources:
 * (1) https://www.geico.com/auto/discounts/, accessed 2025-11-09
 * ```
 */
export interface Citation {
  /** Footnote reference number */
  ref: number

  /** Entity ID (e.g., "disc_geico_multipolicy") */
  entityId: string

  /** Entity type for context */
  entityType: 'discount' | 'carrier' | 'eligibility' | 'state' | 'pricing'

  /** Source URL */
  uri: string

  /** Date accessed */
  accessed: string
}

// ============================================================================
// Discount Types
// ============================================================================

/**
 * Discount eligibility requirements.
 * Defines what conditions must be met to qualify for a discount.
 */
export interface DiscountRequirements {
  /** Products that must be bundled (e.g., ["auto", "home"]) */
  mustHaveProducts?: string[]

  /** Minimum number of products required */
  minProducts?: number

  /** Requires clean driving record for 3 years */
  cleanRecord3Yr?: boolean

  /** Requires homeownership */
  ownsHome?: boolean

  /** Age requirements */
  age?: {
    min?: number
    max?: number
  }

  /** GPA requirement for good student discount */
  minGPA?: number

  /** Other textual requirements */
  otherRequirements?: string
}

/**
 * Insurance discount with entity-level source tracking.
 */
export interface Discount {
  /** Unique discount ID (cuid2 format, e.g., "disc_geico_multipolicy") */
  id: string

  /** Discount name (e.g., "Multi-Policy Bundle") */
  name: string

  /** Discount percentage (e.g., 15 for 15%) */
  percentage: number

  /** Human-readable description */
  description: string

  /** Products this discount applies to (e.g., ["auto", "home"]) */
  products: string[]

  /** States where discount is available (e.g., ["CA", "TX", "FL"]) */
  states: string[]

  /** Eligibility requirements */
  requirements: DiscountRequirements

  /** Can be combined with other discounts */
  stackable: boolean

  /** Source citation */
  source: Source
}

// ============================================================================
// Eligibility Types
// ============================================================================

/**
 * Product-specific eligibility criteria.
 */
export interface ProductEligibility {
  /** Minimum driver age */
  minAge?: number

  /** Maximum driver age */
  maxAge?: number

  /** Maximum number of vehicles per policy */
  maxVehicles?: number

  /** Maximum number of drivers per policy */
  maxDrivers?: number

  /** Clean driving record required */
  cleanRecordRequired?: boolean

  /** State-specific rules */
  stateSpecific?: Record<string, unknown>

  /** Other eligibility criteria */
  otherCriteria?: string
}

/**
 * Carrier eligibility rules by product.
 */
export interface CarrierEligibility {
  auto?: ProductEligibility
  home?: ProductEligibility
  renters?: ProductEligibility
  umbrella?: ProductEligibility
}

// ============================================================================
// Pricing Types
// ============================================================================

/**
 * Pricing estimate for a product in a specific state.
 */
export interface PricingEstimate {
  /** Product type */
  product: string

  /** State code */
  state: string

  /** Average annual premium */
  averageAnnual?: number

  /** Price range (low-high) */
  range?: {
    low: number
    high: number
  }

  /** Contextual notes */
  context?: string

  /** Source citation */
  source: Source
}

// ============================================================================
// Carrier Types
// ============================================================================

/**
 * Insurance carrier with discounts, eligibility, and source tracking.
 */
export interface Carrier {
  /** Unique carrier ID (cuid2 format, e.g., "carr_geico001") */
  id: string

  /** Carrier name (e.g., "GEICO") */
  name: string

  /** States where carrier operates (e.g., ["CA", "TX", "FL", "NY", "IL"]) */
  operatesIn: string[]

  /** Products offered (e.g., ["auto", "home", "renters", "umbrella"]) */
  products: string[]

  /** Eligibility criteria by product */
  eligibility: CarrierEligibility

  /** Available discounts */
  discounts: Discount[]

  /** Pricing estimates (optional) */
  pricing?: PricingEstimate[]

  /** Carrier-level source */
  source: Source
}

// ============================================================================
// State Types
// ============================================================================

/**
 * State minimum coverage requirements.
 */
export interface StateMinimumCoverages {
  auto?: {
    /** Bodily injury per person (in dollars) */
    bodilyInjuryPerPerson?: number

    /** Bodily injury per accident (in dollars) */
    bodilyInjuryPerAccident?: number

    /** Property damage (in dollars) */
    propertyDamage?: number

    /** Uninsured motorist (in dollars) */
    uninsuredMotorist?: number

    /** Personal injury protection (in dollars) */
    personalInjuryProtection?: number
  }

  home?: {
    /** Dwelling coverage (in dollars) */
    dwellingCoverage?: number

    /** Liability coverage (in dollars) */
    liabilityCoverage?: number
  }

  renters?: {
    /** Personal property coverage (in dollars) */
    personalProperty?: number

    /** Liability coverage (in dollars) */
    liabilityCoverage?: number
  }
}

/**
 * State insurance requirements and regulations.
 */
export interface State {
  /** Unique state ID (cuid2 format, e.g., "state_ca001") */
  id: string

  /** State code (e.g., "CA") */
  code: string

  /** State name (e.g., "California") */
  name: string

  /** Minimum coverage requirements */
  minimumCoverages: StateMinimumCoverages

  /** Special state-specific requirements */
  specialRequirements?: string[]

  /** State-level source */
  source: Source
}

// ============================================================================
// Compliance Types
// ============================================================================

/**
 * Prohibited statement pattern for compliance filter.
 */
export interface ProhibitedPattern {
  /** Phrase to block (e.g., "guaranteed lowest price") */
  phrase: string

  /** Reason it's prohibited */
  reason: string

  /** Category (pricing, approval, guarantee, other) */
  category: 'pricing' | 'approval' | 'guarantee' | 'other'

  /** Severity level */
  severity: 'high' | 'medium' | 'low'
}

/**
 * Prohibited statements configuration (per PEAK6 spec).
 */
export interface ProhibitedStatements {
  /** Schema version */
  version: string

  /** Generation date */
  generated: string

  /** Description */
  description: string

  /** List of prohibited patterns */
  patterns: ProhibitedPattern[]

  /** Regex patterns for advanced matching */
  regexPatterns?: Array<{
    pattern: string
    reason: string
    category: string
    severity: string
  }>
}

/**
 * Required disclosures configuration (per PEAK6 spec).
 */
export interface RequiredDisclosures {
  /** Schema version */
  version: string

  /** Generation date */
  generated: string

  /** Description */
  description: string

  /** General disclosures (always shown) */
  general: string[]

  /** State-specific disclosures */
  byState: Record<string, string[]>

  /** Product-specific disclosures */
  byProduct: Record<string, string[]>

  /** Handoff to licensed agent requirement */
  handoff: {
    required: boolean
    message: string
    contactInfo: string
  }

  /** Data usage disclosures */
  dataUse: string[]
}

// ============================================================================
// FAQ Types
// ============================================================================

/**
 * Frequently asked question with categorization.
 */
export interface FAQ {
  /** Unique FAQ ID */
  id: string

  /** Question text */
  question: string

  /** Answer text */
  answer: string

  /** Category (pricing, discounts, coverage, requirements, savings) */
  category: string

  /** Applicable products */
  products: string[]
}

/**
 * FAQ collection.
 */
export interface FAQs {
  /** Schema version */
  version: string

  /** Generation date */
  generated: string

  /** Description */
  description: string

  /** List of FAQs */
  faqs: FAQ[]
}

// ============================================================================
// Metadata Types
// ============================================================================

/**
 * Knowledge pack metadata and statistics.
 */
export interface KnowledgePackMetadata {
  /** Schema version */
  schemaVersion: string

  /** Generation timestamp */
  generated: string

  /** Description */
  description: string

  /** Purpose statement */
  purpose: string

  /** Statistics */
  stats: {
    carriers: number
    states: number
    products: number
    totalDataPoints: number
    totalSources: number
    pagesScraped: number
    extractionMethod: string
  }

  /** Coverage details */
  coverage: {
    carriers: string[]
    states: string[]
    products: string[]
  }

  /** Source authority levels */
  sourceAuthority: Record<string, number>

  /** Compliance metrics */
  compliance: {
    prohibitedStatements: number
    requiredDisclosures: {
      general: number
      byState: number
      byProduct: number
    }
  }

  /** Pipeline stages */
  pipeline: Record<string, string>

  /** Runtime configuration */
  runtime: {
    loadMethod: string
    storage: string
    citationTracking: string
    offlineGuarantee: string
  }

  /** Additional notes */
  notes: string[]
}

// ============================================================================
// RAG Service Interface
// ============================================================================

/**
 * Knowledge Pack RAG service interface.
 * Defines the contract for querying the knowledge pack at runtime.
 */
export interface KnowledgePackRAG {
  /**
   * Load knowledge pack into memory at startup.
   * Should be called during app initialization (async, non-blocking).
   */
  loadKnowledgePack(): Promise<void>

  /**
   * Get all carriers (for routing engine).
   */
  getCarriers(): Carrier[]

  /**
   * Get specific carrier by ID or name.
   */
  getCarrier(identifier: string): Carrier | null

  /**
   * Get carrier's discounts for specific state.
   * Filters discounts by state availability.
   */
  retrieveDiscounts(carrierName: string, stateCode: string): Discount[]

  /**
   * Get state requirements by state code.
   */
  getState(stateCode: string): State | null

  /**
   * Get citation metadata for any entity ID.
   */
  getCitation(entityId: string): Citation | null

  /**
   * Check if knowledge pack is loaded.
   */
  isLoaded(): boolean

  /**
   * Get prohibited statements for compliance filter.
   */
  getProhibitedStatements(): ProhibitedStatements

  /**
   * Get required disclosures for compliance filter.
   */
  getRequiredDisclosures(): RequiredDisclosures

  /**
   * Get FAQs for user assistance.
   */
  getFAQs(category?: string): FAQ[]
}
