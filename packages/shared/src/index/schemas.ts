/**
 * Schema Exports
 *
 * All schema and type exports from the shared package.
 */

// Export knowledge pack types
export type {
  Carrier,
  CarrierFile,
  State,
  StateFile,
  Product,
  ProductFile,
  Discount,
  Compensation,
  Source,
  FieldWithMetadata,
  ProductEligibility,
  AutoMinimums,
  HomeMinimums,
  RentersMinimums,
} from '../schemas/knowledge-pack'

// Export user contact schema and types
export { userContactSchema, type UserContact } from '../schemas/user-contact'

// Export user profile schema and types
export {
  userProfileSchema,
  existingPolicySchema,
  type UserProfile,
  type ExistingPolicy,
} from '../schemas/user-profile'

// Export unified field metadata definitions
export {
  unifiedFieldMetadata,
  type UnifiedFieldMetadata,
  type InferenceRule,
} from '../schemas/unified-field-metadata'

// Export unified field metadata utilities
export {
  getUnifiedFieldMetadata,
  getFieldsForFlow,
  getUnifiedFieldShortcut,
  getUnifiedFieldFromShortcut,
  getUnifiedFieldFromAlias,
  // Backward compatibility exports (intake-only) - these filter to intake flow only
  userProfileFieldMetadata,
  getFieldMetadata,
  getFieldsWithShortcuts,
  getFieldShortcut,
  getFieldFromShortcut,
  getFieldFromAlias,
  type FieldMetadata,
} from '../schemas/unified-field-metadata-utils'

// Export intake result schema and types
export {
  intakeRequestSchema,
  intakeResultSchema,
  routeDecisionSchema,
  citationSchema,
  discountOpportunitySchema,
  type IntakeRequest,
  type IntakeResult,
  type RouteDecision,
  type Citation,
  type DiscountOpportunity,
} from '../schemas/intake-result'

// Export opportunity schema and types
export { opportunitySchema, type Opportunity } from '../schemas/opportunity'

// Export validated opportunity schema and types
export {
  validatedOpportunitySchema,
  validationDetailsSchema,
  type ValidatedOpportunity,
  type ValidationDetails,
} from '../schemas/validated-opportunity'

// Export policy analysis result schema and types
export {
  policyAnalysisResultLLMSchema,
  policyAnalysisResultSchema,
  bundleOptionSchema,
  deductibleOptimizationSchema,
  type PolicyAnalysisResult,
  type BundleOption,
  type DeductibleOptimization,
} from '../schemas/policy-analysis-result'

// Export prefill packet schema and types
export {
  prefillPacketSchema,
  prefillRoutingSchema,
  producerInfoSchema,
  type PrefillPacket,
  type PrefillRouting,
  type ProducerInfo,
} from '../schemas/prefill-packet'

// Export missing field schema and types
export {
  missingFieldSchema,
  type MissingField,
  type MissingFieldInfo,
} from '../schemas/missing-field'

// Export decision trace schema and types
export {
  decisionTraceSchema,
  llmCallSchema,
  type DecisionTrace,
  type LLMCall,
} from '../schemas/decision-trace'

// Export compliance result schema and types
export { complianceResultSchema, type ComplianceResult } from '../schemas/compliance-result'

// Export policy summary schema and types
export {
  policySummarySchema,
  coverageLimitsSchema,
  deductiblesSchema,
  premiumsSchema,
  effectiveDatesSchema,
  confidenceScoresSchema,
  type PolicySummary,
  type CoverageLimits,
  type Deductibles,
  type Premiums,
  type EffectiveDates,
  type ConfidenceScores,
} from '../schemas/policy-summary'

// Export shared enums
export {
  productTypeEnum,
  propertyTypeEnum,
  type ProductType,
  type PropertyType,
} from '../schemas/shared-enums'
