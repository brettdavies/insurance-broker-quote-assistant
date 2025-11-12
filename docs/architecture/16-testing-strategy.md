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

## 16.4 Shared Test Utilities

**Location:** `packages/shared/src/test-utils/`

**Purpose:** Eliminate duplication across test files by providing reusable test utilities, data builders, and test cases.

### Test Utilities Available

**Import from:** `@repo/shared/test-utils`

**Test Targets:**
- `getTestTargets()` - Returns test targets from env or defaults (`'mock' | 'real-api' | 'contract'`)
- `isTargetEnabled(target)` - Check if specific target is enabled
- Supports `TEST_TARGETS` env var (comma-separated) or legacy `TEST_GEMINI_API=true`

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
import { buildUserProfile } from '@repo/shared/test-utils'

// Instead of manual object creation:
const profile = buildUserProfile({
  vehicles: 2,
  drivers: 1,
  age: 30
})
```

**Using LLM Test Factories:**
```typescript
import { createMockLLMProvider } from '@repo/shared/test-utils'

const mockProvider = createMockLLMProvider()
const extractor = new ConversationalExtractor(mockProvider)
```

**Using Parameterization:**
```typescript
import { test } from 'bun:test'
import { keyValueTestCases } from '@repo/shared/test-utils'

test.each(keyValueTestCases)(
  'should parse $description',
  ({ input, expected }) => {
    const result = parseKeyValueSyntax(input)
    // Assertions...
  }
)
```

## 16.5 Backend Test Helpers

**Location:** `apps/api/src/__tests__/helpers/`

**Purpose:** Backend-specific test utilities for API route testing and response validation.

### Test Helpers Available

**Import from:** `apps/api/src/__tests__/helpers` (relative to test file)

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

## 16.6 Test Patterns and Best Practices

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

### Parameterization

**When to Use:**
- Multiple test cases with same structure (e.g., testing multiple prohibited phrases)
- Same test logic with different inputs (e.g., key-value parsing)

**How to Use:**
```typescript
import { test } from 'bun:test'
import { keyValueTestCases } from '@repo/shared/test-utils'

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
import { buildUserProfile } from '@repo/shared/test-utils'

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
- `'real-api'` - Real API calls (requires API keys)
- `'contract'` - Contract testing (future)

**Usage:**
```typescript
import { getTestTargets, createLLMProviderForTarget } from '@repo/shared/test-utils'
import { GeminiProvider } from '../gemini-provider'

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
- `TEST_TARGETS=mock,real-api` - Run tests against multiple targets
- `TEST_GEMINI_API=true` - Legacy support (adds 'real-api' to targets)

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

## 16.7 Test File Organization

**Structure:**
```
apps/api/src/
  services/
    __tests__/
      service-name.test.ts
  routes/
    __tests__/
      route-name.test.ts
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
- Helper files: `test-*.ts` or descriptive names (e.g., `test-client.ts`)
- Fixture files: `*-fixtures.ts` or descriptive names (e.g., `knowledge-pack.ts`)

## 16.8 Code Quality Metrics

**Refactoring Results:**
- ✅ **60%+ reduction** in code duplication
- ✅ **80+ `new Request()` patterns** eliminated
- ✅ **50+ `UserProfile` declarations** replaced with builders
- ✅ **16+ duplicate test cases** eliminated via parameterization
- ✅ **Consistent patterns** across all test files
- ✅ **Type-safe** throughout

**Success Criteria:**
- All tests use shared utilities from `@repo/shared/test-utils`
- All route tests use `TestClient` instead of `new Request()`
- All test data uses builders instead of manual object creation
- Parameterization used for repetitive test cases
- No linting errors
- All tests pass

---
