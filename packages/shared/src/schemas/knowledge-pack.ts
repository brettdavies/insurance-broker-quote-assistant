/**
 * Type definitions for Knowledge Pack entities
 *
 * These types match the JSON schema structure defined in knowledge_pack/schemas/
 * Future: Convert to Zod schemas for runtime validation
 */

export interface Source {
  uri: string
  pageId?: string
  pageFile?: string
  elementRef?: string
  lineRef?: number
  accessedDate: string
  extractedValue?: string
  confidence: 'high' | 'medium' | 'low'
  confidenceScore?: number
  primary?: boolean
}

export interface FieldWithMetadata<T = unknown> {
  _id: string
  value: T
  _sources: Source[]
  _inheritedFrom?: string
  _resolution?: {
    conflictId: string
    selectedValue: unknown
    method: string
    rationale: string
    resolvedBy: string
    resolvedDate: string
  }
}

export interface ProductEligibility {
  _id?: string
  _sources?: Source[]
  minAge?: FieldWithMetadata<number>
  maxAge?: FieldWithMetadata<number>
  maxVehicles?: FieldWithMetadata<number>
  minCreditScore?: FieldWithMetadata<number> // Minimum credit score required
  propertyTypeRestrictions?: FieldWithMetadata<string[]> // Allowed property types (e.g., ['single-family', 'condo', 'townhouse'])
  requiresCleanDrivingRecord?: FieldWithMetadata<boolean> // Whether clean driving record is required
  stateSpecific?: Record<string, unknown>
}

export interface Discount {
  _id: string
  name: FieldWithMetadata<string>
  percentage: FieldWithMetadata<number>
  products: FieldWithMetadata<string[]>
  states: FieldWithMetadata<string[]>
  requirements: FieldWithMetadata<unknown>
  stackable?: FieldWithMetadata<boolean>
  description?: FieldWithMetadata<string>
}

export interface Compensation {
  _id?: string
  commissionRate?: FieldWithMetadata<number>
  commissionType?: FieldWithMetadata<string>
}

export interface Carrier {
  _id: string
  _sources: Source[]
  name: string
  operatesIn: FieldWithMetadata<string[]>
  products: FieldWithMetadata<string[]>
  eligibility: {
    _id?: string
    _sources?: Source[]
    auto?: ProductEligibility
    home?: ProductEligibility
    renters?: ProductEligibility
    umbrella?: ProductEligibility
  }
  discounts: Discount[]
  compensation?: Compensation
  averagePricing?: {
    _id?: string
    auto?: unknown
    home?: unknown
    renters?: unknown
    umbrella?: unknown
  }
}

export interface CarrierFile {
  meta: {
    schemaVersion: string
    generatedDate: string
    carrier: string
    totalDataPoints?: number
    totalSources?: number
    conflictsResolved?: number
  }
  carrier: Carrier
}

export interface AutoMinimums {
  _id?: string
  bodilyInjuryPerPerson?: FieldWithMetadata<number>
  bodilyInjuryPerAccident?: FieldWithMetadata<number>
  propertyDamage?: FieldWithMetadata<number>
  uninsuredMotorist?: FieldWithMetadata<number>
  personalInjuryProtection?: FieldWithMetadata<number>
}

export interface HomeMinimums {
  _id?: string
  dwellingCoverage?: FieldWithMetadata<number>
  liabilityCoverage?: FieldWithMetadata<number>
}

export interface RentersMinimums {
  _id?: string
  personalProperty?: FieldWithMetadata<number>
  liabilityCoverage?: FieldWithMetadata<number>
}

export interface State {
  _id: string
  _sources: Source[]
  code: string
  name: string
  minimumCoverages: {
    _id?: string
    auto?: AutoMinimums
    home?: HomeMinimums
    renters?: RentersMinimums
  }
  specialRequirements?: FieldWithMetadata<unknown>
  averagePremiums?: FieldWithMetadata<unknown>
}

export interface StateFile {
  meta: {
    schemaVersion: string
    generatedDate: string
    state: string
  }
  state: State
}
