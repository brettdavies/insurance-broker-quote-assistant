// Export knowledge pack types
export type {
  Carrier,
  CarrierFile,
  State,
  StateFile,
  Discount,
  Compensation,
  Source,
  FieldWithMetadata,
  ProductEligibility,
  AutoMinimums,
  HomeMinimums,
  RentersMinimums,
} from './schemas/knowledge-pack'

// Export user profile schema and types
export {
  userProfileSchema,
  existingPolicySchema,
  type UserProfile,
  type ExistingPolicy,
} from './schemas/user-profile'

// Export user profile field metadata
export {
  userProfileFieldMetadata,
  getFieldMetadata,
  getFieldsWithShortcuts,
  getFieldShortcut,
  getFieldFromShortcut,
  getFieldFromAlias,
  type FieldMetadata,
} from './schemas/user-profile-metadata'

// Export intake result schema and types
export {
  intakeResultSchema,
  routeDecisionSchema,
  routeDecisionStubSchema,
  citationSchema,
  opportunityStubSchema,
  prefillPacketStubSchema,
  type IntakeResult,
  type RouteDecision,
  type RouteDecisionStub,
  type Citation,
  type OpportunityStub,
  type PrefillPacketStub,
} from './schemas/intake-result'

// Export opportunity schema and types
export {
  opportunitySchema,
  type Opportunity,
} from './schemas/opportunity'

// Export policy analysis result schema and types
export {
  policyAnalysisResultLLMSchema,
  policyAnalysisResultSchema,
  bundleOptionSchema,
  deductibleOptimizationSchema,
  type PolicyAnalysisResult,
  type BundleOption,
  type DeductibleOptimization,
} from './schemas/policy-analysis-result'

// Export prefill packet schema and types
export { prefillPacketSchema, type PrefillPacket } from './schemas/prefill-packet'

// Export missing field schema and types
export {
  missingFieldSchema,
  type MissingField,
  type MissingFieldInfo,
} from './schemas/missing-field'

// Export decision trace schema and types
export {
  decisionTraceSchema,
  llmCallSchema,
  type DecisionTrace,
  type LLMCall,
} from './schemas/decision-trace'

// Export compliance result schema and types
export { complianceResultSchema, type ComplianceResult } from './schemas/compliance-result'

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
} from './schemas/policy-summary'

// Export file upload constants
export {
  MAX_FILE_SIZE,
  ACCEPTED_MIME_TYPES,
  ACCEPTED_EXTENSIONS,
  FILE_TYPE_DESCRIPTIONS,
  isAcceptedFileType,
  isFileSizeValid,
  formatFileSize,
} from './constants/file-upload'

// Export policy summary metadata
export {
  policySummaryFieldMetadata,
  POLICY_CATEGORY_MAP,
  POLICY_CATEGORY_LABELS,
  type PolicyFieldMetadata,
} from './schemas/policy-summary-metadata'

// Export test utilities (for use in test files only)
export * from './test-utils'
