# 16. Testing Strategy

**Purpose:** Define testing approach that balances quality with 5-day timeline constraints.

## 16.1 Testing Pyramid

**What We Use:**

```
        E2E Tests (0% - skipped for MVP)
        /                             \
    Integration Tests (20%)
    /                                \
Frontend Unit (40%)              Backend Unit (40%)
```

**Why This Distribution:**

- **40% frontend unit:** React components, hooks, utilities (fast, easy to write)
- **40% backend unit:** Deterministic engines, RAG, orchestrator (critical business logic)
- **20% integration:** API routes with Hono, full agent/engine flows (ensures components work together)
- **0% E2E for MVP:** Too slow for 5-day timeline, integration tests cover critical paths

## 16.2 Testing Tools

**What We Use:**

- **Bun test:** Built-in test runner (Jest-compatible API)
- **@testing-library/react:** User-centric component testing
- **Hono test utilities:** API route testing without starting server

**Why Bun Test:**

- **Already installed:** No additional dependency (using Bun for package management)
- **Faster than Jest/Vitest:** Native speed, no transform overhead
- **Jest-compatible:** Same API (describe, it, expect) developers know

## 16.3 Testing Focus Areas

**What We Test:**

- **Deterministic engines (critical):** Routing, discount, compliance logic (100% coverage goal)
- **API routes (critical):** Request validation, response structure, error handling
- **React components (important):** User interactions, form submissions, error states
- **Orchestrator flows (important):** Agent/engine coordination, decision trace generation

**What We Skip (5-Day MVP):**

- **E2E tests:** Too slow to write and maintain for timeline
- **LLM mocking complexity:** Test orchestrator with mocked LLM responses, not actual OpenAI calls
- **Edge cases:** Focus on happy path + critical error cases only

**Why This Focus:**

- **Deterministic engines are testable:** Pure functions, predictable outputs, easy to test
- **Insurance compliance requires accuracy:** Routing/discount engines must be correct (tests catch regressions)
- **Integration tests sufficient:** Catch 80% of bugs without E2E overhead

## 16.4 Test Execution Modes

### Test Targets

Tests can run against different targets using the centralized test target system:

**Available Targets:**
- `'mock'` - Fast, deterministic mock LLM provider (default)
- `'real-api'` - Real Gemini API calls (no API key required for free tier)
- `'contract'` - Contract testing (future)

**How to Use:**

```bash
# Run with default (mock) - fast, no API calls
bun test

# Run with real API
TEST_TARGETS=real-api bun test

# Run multiple targets
TEST_TARGETS=mock,real-api bun test
```

**In Test Code:**

```typescript
import { isTargetEnabled, getTestTargets } from '@repo/shared'

// Check if a target is enabled
if (isTargetEnabled('real-api')) {
  // Run real API tests
}

// Get all enabled targets
const targets = getTestTargets() // ['mock'] or ['mock', 'real-api']
```

### Environment Variables

**Test Configuration (Centralized):**

All test configuration goes through the test-targets utility (`packages/shared/src/test-utils/test-targets.ts`):

- `TEST_TARGETS` - Comma-separated list of targets (e.g., `"mock,real-api"`)
  - **Preferred:** Use this for all test target configuration
  - **Default:** `['mock']` if not set

**Contract Tests (Server Configuration):**

Contract tests require a running server, so they use a separate env var:

- `TEST_API_URL` - URL of running API server for contract tests
  - **Default:** `http://localhost:7070`
  - **Usage:** Only needed for contract tests (`intake.contract.test.ts`)
  - **Note:** This is different from test targets - it's about where the server is running

**Application Configuration (Not Test-Related):**

These are application config, not test config (handled by `apps/api/src/config/env.ts`):

- `GEMINI_API_KEY` - Optional API key for Gemini (free tier works without it)
- `NODE_ENV` - Application environment (`test`, `development`, `production`)
- `COMPLIANCE_LOG_FILE` - Path to compliance log file
- `API_PORT` - Port for API server

**Best Practice:**

✅ **DO:** Use `isTargetEnabled('real-api')` in test code  
✅ **DO:** Use `TEST_TARGETS=real-api` to enable real API tests  
✅ **DO:** Access test config through `@repo/shared` test utilities  

❌ **DON'T:** Use env vars for test configuration outside of test-targets utility  

**Why This Pattern:**

- **Centralized:** All test configuration in one place
- **Type-safe:** TypeScript types for test targets
- **Consistent:** Same pattern across all test files
- **Maintainable:** Easy to add new test targets or change behavior

## 16.5 Shared Test Utilities

**Location:** `packages/shared/src/test-utils/`

**Purpose:** Eliminate duplication across test files by providing reusable test utilities, data builders, and test cases.

### Test Utilities Available

**Import from:** `@repo/shared`

**Test Targets:**
- `getTestTargets()` - Returns test targets from env or defaults (`'mock' | 'real-api' | 'contract'`)
- `isTargetEnabled(target)` - Check if specific target is enabled
- Supports `TEST_TARGETS` env var (comma-separated)

**LLM Test Factories:**
- `createMockLLMProvider()` - Creates deterministic mock LLM provider with pattern matching
- `createRealLLMProvider(ProviderClass, options)` - Creates real API provider (requires provider class)
- `createLLMProviderForTarget(target, options, ProviderClass?)` - Target-aware factory

**Test Data Builders:**
- `buildUserProfile(overrides?)` - Builds UserProfile with sensible defaults
- `buildRouteDecision(overrides?)` - Builds RouteDecision with defaults
- `buildCitation(overrides?)` - Builds Citation with defaults

**Shared Test Cases:**
- `extractionTestCases` - Array of extraction test cases
- `routingTestCases` - Array of routing test cases
- `keyValueTestCases` - Array of key-value parsing test cases
- `naturalLanguageTestCases` - Array of natural language test cases

**Test Assertions:**
- `assertExtractionResult(result, expected, target)` - Target-aware extraction assertions
- `assertRouteDecision(route)` - Route decision validation
- `assertUserProfile(profile)` - User profile validation

### Usage Examples

**Using Test Data Builders:**
```typescript
import { buildUserProfile } from '@repo/shared'

// Instead of manual object creation:
const profile = buildUserProfile({
  vehicles: 2,
  drivers: 1,
  age: 30
})
```

**Using LLM Test Factories:**
```typescript
import { createMockLLMProvider } from '@repo/shared'

const mockProvider = createMockLLMProvider()
const extractor = new ConversationalExtractor(mockProvider)
```

**Using Test Targets:**
```typescript
import { isTargetEnabled } from '@repo/shared'

describe.skipIf(!isTargetEnabled('real-api'))('Real API Integration', () => {
  // Real API tests
})
```

**Using Parameterization:**
```typescript
import { test } from 'bun:test'
import { keyValueTestCases } from '@repo/shared'

test.each(keyValueTestCases)(
  'should parse $description',
  ({ input, expected }) => {
    const result = parseKeyValueSyntax(input)
    // Assertions...
  }
)
```

## 16.6 Backend Test Helpers

**Location:** `apps/api/src/__tests__/helpers/`

**Purpose:** Backend-specific test utilities for API route testing and response validation.

### Test Helpers Available

**Import from:** `apps/api/src/routes/helpers` (re-exported from `__tests__/helpers/`)

**TestClient:**
- `new TestClient(app, baseUrl?)` - Abstraction for API requests
- `client.post(path, body?, headers?)` - Make POST request
- `client.get(path, headers?)` - Make GET request
- `client.postJson<T>(path, body?, headers?)` - POST and parse JSON response
- `client.getJson<T>(path, headers?)` - GET and parse JSON response

**Response Assertions:**
- `expectSuccessResponse(response)` - Assert 200 status
- `expectErrorResponse(response, expectedStatus?)` - Assert error status
- `expectIntakeResult(body)` - Type-safe IntakeResult assertions
- `expectErrorBody(body, expectedCode?)` - Error body validation
- `expectProfileField(body, field, expectedValue?)` - Profile field validation
- `expectMissingField(body, fieldName)` - Missing field validation

**Request Builders:**
- `RequestBuilder` - Fluent API for building test requests
- `requestBuilder()` - Factory function
- `testRequests` - Convenience functions for common requests

### Usage Examples

**Using TestClient:**
```typescript
import { TestClient, expectIntakeResult } from '../helpers'

const client = new TestClient(app)
const body = await client.postJson<IntakeResult>('/api/intake', {
  message: 's:CA a:30 l:auto'
})
expectIntakeResult(body)
```

**Before (Duplicated Pattern):**
```typescript
const req = new Request('http://localhost/api/intake', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 's:CA a:30 l:auto' })
})
const res = await app.request(req)
expect(res.status).toBe(200)
const body = await res.json() as IntakeResult
```

**After (Using TestClient):**
```typescript
const body = await client.postJson<IntakeResult>('/api/intake', {
  message: 's:CA a:30 l:auto'
})
```

## 16.7 Test Patterns and Best Practices

### DRY (Don't Repeat Yourself)

**Problem:** Test files had significant duplication:
- 80+ instances of `new Request()` pattern
- 50+ manual `UserProfile` object declarations
- Duplicate test case definitions across files

**Solution:**
- Use `TestClient` for all API requests
- Use `buildUserProfile()` for all test data
- Define test cases once in `@repo/shared/test-utils/test-cases.ts`
- Use parameterization with `test.each()` for repetitive tests
- Use `isTargetEnabled()` instead of direct env var access

### Parameterization

**When to Use:**
- Multiple test cases with same structure (e.g., testing multiple prohibited phrases)
- Same test logic with different inputs (e.g., key-value parsing)

**How to Use:**
```typescript
import { test } from 'bun:test'
import { keyValueTestCases } from '@repo/shared'

test.each(keyValueTestCases)(
  'should parse $description',
  ({ input, expected }) => {
    const result = parseKeyValueSyntax(input)
    expect(result.profile.state).toBe(expected.state)
  }
)
```

**Benefits:**
- Eliminates duplicate test code
- Single test runs against all cases
- Easy to add new test cases (just add to array)

### Test Data Builders

**When to Use:**
- Creating test data structures (UserProfile, RouteDecision, etc.)
- Need consistent defaults across tests
- Want to override specific fields

**How to Use:**
```typescript
import { buildUserProfile } from '@repo/shared'

// With defaults
const profile = buildUserProfile()

// With overrides
const profile = buildUserProfile({
  vehicles: 2,
  drivers: 1,
  age: 30
})

// With undefined to test missing fields
const profile = buildUserProfile({
  vehicles: undefined, // Tests missing critical field
  drivers: undefined
})
```

**Benefits:**
- Consistent test data across files
- Easy to create variations
- Type-safe with TypeScript

### Target-Aware Testing

**Test Targets:**
- `'mock'` - Fast, deterministic (default)
- `'real-api'` - Real API calls (no API key required for Gemini free tier)
- `'contract'` - Contract testing (future)

**Usage:**
```typescript
import { isTargetEnabled, createLLMProviderForTarget } from '@repo/shared'
import { GeminiProvider } from '../gemini-provider'

// Check if target is enabled
if (isTargetEnabled('real-api')) {
  // Run real API tests
}

// Or use target-aware factory
const targets = getTestTargets() // ['mock'] or from env
test.each(targets)('extraction with %s provider', async (target) => {
  const provider = createLLMProviderForTarget(
    target,
    {},
    target === 'real-api' ? GeminiProvider : undefined
  )
  // Test logic...
})
```

**Environment Variables:**
- `TEST_TARGETS=mock,real-api` - Run tests against multiple targets (preferred)

**Best Practice:**
- ✅ Use `isTargetEnabled('real-api')`
- ✅ Use `TEST_TARGETS=real-api`
- ✅ Access test configuration through `@repo/shared` utilities

### Response Assertions

**Pattern:**
```typescript
import { expectSuccessResponse, expectIntakeResult } from '../helpers'

const body = await client.postJson<IntakeResult>('/api/intake', { message: 's:CA' })
expectIntakeResult(body) // Type-safe, comprehensive validation
```

**Benefits:**
- Type-safe assertions
- Comprehensive validation
- Consistent error messages
- Handles differences between mock (exact) and real API (flexible) expectations

## 16.8 Test File Organization

**Structure:**
```
apps/api/src/
  services/
    __tests__/
      service-name.test.ts
  routes/
    __tests__/
      route-name.test.ts
      route-name.contract.test.ts  # Contract tests
  utils/
    __tests__/
      utility-name.test.ts
  __tests__/
    helpers/          # Backend test utilities
      test-client.ts
      response-assertions.ts
      test-builders.ts
      index.ts
    fixtures/         # Test data fixtures
      knowledge-pack.ts
      test-messages.ts

packages/shared/src/
  test-utils/         # Shared test utilities
    test-targets.ts
    llm-test-factories.ts
    test-data-builders.ts
    test-cases.ts
    test-assertions.ts
    index.ts
```

**Naming Conventions:**
- Test files: `*.test.ts` (e.g., `intake.test.ts`)
- Contract tests: `*.contract.test.ts` (e.g., `intake.contract.test.ts`)
- Helper files: `test-*.ts` or descriptive names (e.g., `test-client.ts`)
- Fixture files: `*-fixtures.ts` or descriptive names (e.g., `knowledge-pack.ts`)

## 16.9 Running Tests

### Unit Tests (Default)
```bash
# Run all tests (uses mock by default)
bun test

# Run specific test file
bun test apps/api/src/services/__tests__/routing-engine.test.ts
```

### Real API Tests
```bash
# Run with real Gemini API (no API key required)
TEST_TARGETS=real-api bun test

# Run specific test file with real API
TEST_TARGETS=real-api bun test apps/api/src/services/__tests__/gemini-provider.test.ts
```

### Contract Tests
```bash
# Start server in one terminal
cd apps/api && bun run dev

# Run contract tests in another terminal
TEST_API_URL=http://localhost:7070 bun test apps/api/src/routes/__tests__/intake.contract.test.ts
```

### All Tests
```bash
# Run all tests including real API and contract tests
# Terminal 1: Start server
cd apps/api && bun run dev

# Terminal 2: Run all tests
TEST_TARGETS=real-api bun test
TEST_API_URL=http://localhost:7070 bun test apps/api/src/routes/__tests__/intake.contract.test.ts
```

## 16.10 Code Quality Metrics

**Refactoring Results:**
- ✅ **60%+ reduction** in code duplication
- ✅ **80+ `new Request()` patterns** eliminated
- ✅ **50+ `UserProfile` declarations** replaced with builders
- ✅ **16+ duplicate test cases** eliminated via parameterization
- ✅ **Consistent patterns** across all test files
- ✅ **Type-safe** throughout
- ✅ **Centralized test configuration** through test-targets utility

**Success Criteria:**
- All tests use shared utilities from `@repo/shared`
- All route tests use `TestClient` instead of `new Request()`
- All test data uses builders instead of manual object creation
- Parameterization used for repetitive test cases
- Test configuration accessed through `isTargetEnabled()` and `getTestTargets()`
- No direct `process.env` access for test configuration (except `TEST_API_URL` for contract tests)
- No linting errors
- All tests pass

---
