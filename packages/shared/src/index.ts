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

// Export prefill packet schema and types
export {
  prefillPacketSchema,
  type PrefillPacket,
} from './schemas/prefill-packet'

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
export {
  complianceResultSchema,
  type ComplianceResult,
} from './schemas/compliance-result'

// Export test utilities (for use in test files only)
export * from './test-utils'
