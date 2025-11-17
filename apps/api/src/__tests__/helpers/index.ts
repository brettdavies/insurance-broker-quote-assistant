/**
 * Test Helpers
 *
 * Backend-specific test utilities for API testing.
 */

export { TestClient } from './test-client'
export {
  expectSuccessResponse,
  expectErrorResponse,
  expectIntakeResult,
  expectErrorBody,
  expectProfileField,
  expectMissingField,
} from './response-assertions'
export { RequestBuilder, requestBuilder, testRequests } from './test-builders'
export {
  createTestUserProfile,
  createAutoProfile,
  createHomeProfile,
  createRentersProfile,
  createUmbrellaProfile,
  createCompleteAutoProfile,
  createCompleteHomeProfile,
  createTestRouteDecision,
  createExtendedRouteDecision,
  createTestDisclaimers,
  createTestMissingFields,
} from './prefill-test-factories'
