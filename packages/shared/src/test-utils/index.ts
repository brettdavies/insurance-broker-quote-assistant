/**
 * Test Utilities
 *
 * Shared test utilities for use across frontend and backend tests.
 * Eliminates duplication and provides consistent test patterns.
 */

// Test targets
export {
  type TestTarget,
  getTestTargets,
  isTargetEnabled,
} from './test-targets'

// LLM test factories
export {
  type ExtractionResult,
  type LLMProvider,
  createMockLLMProvider,
  createRealLLMProvider,
  createLLMProviderForTarget,
} from './llm-test-factories'

// Test data builders
export {
  buildUserProfile,
  buildRouteDecision,
  buildCitation,
} from './test-data-builders'

// Test cases
export {
  type ExtractionTestCase,
  type RoutingTestCase,
  extractionTestCases,
  routingTestCases,
  keyValueTestCases,
  naturalLanguageTestCases,
} from './test-cases'

// Test assertions
export {
  assertExtractionResult,
  assertRouteDecision,
  assertUserProfile,
} from './test-assertions'
