# Testing Guide

## Test Types

### Unit Tests

Fast, isolated tests for individual functions and utilities. **All LLM calls are mocked.**

```bash
bun run test:unit
```

**Coverage:**

- Key-value parser (`src/utils/__tests__/key-value-parser.test.ts`)
- Conversational extractor service (`src/services/__tests__/conversational-extractor.test.ts`)

### Integration Tests

Tests API routes using Hono test utilities (no server required). **All LLM calls are mocked.**

```bash
bun run test:integration
```

**Coverage:**

- Intake endpoint (`src/routes/__tests__/intake.test.ts`)
- Health endpoint (`src/routes/__tests__/health.test.ts`)
- Carriers endpoints (`src/routes/__tests__/carriers.test.ts`)
- States endpoints (`src/routes/__tests__/states.test.ts`)

### Contract Tests (Live API)

Tests against actual running server with real HTTP requests and schema validation. **Uses real Gemini API if server is running.**

```bash
# Start server in one terminal
bun run dev

# Run contract tests in another terminal
TEST_API_URL=http://localhost:7070 bun run test:contract
```

**Coverage:**

- Live API contract validation (`src/routes/__tests__/intake.contract.test.ts`)
- Response schema validation against IntakeResult Zod schema
- Request validation
- Error handling
- Performance benchmarks

### Gemini Provider Tests (Real API)

Tests against actual Gemini API to verify integration. **Requires `TEST_TARGETS=real-api` and may incur API costs.**

```bash
TEST_TARGETS=real-api bun run test:gemini
```

**Coverage:**

- Real Gemini API integration (`src/services/__tests__/gemini-provider.test.ts`)
- Structured output validation
- Conversation history handling
- Timeout handling
- Schema compliance

## Test Data

### Test Messages

All test messages are centralized in:
**`src/__tests__/fixtures/test-messages.ts`**

This includes:

- Key-value examples (`testMessages.keyValue`)
- Natural language examples (`testMessages.naturalLanguage`)
- Complex scenarios (`testMessages.complex`)
- Edge cases (`testMessages.edgeCases`)
- Conversation history examples (`testMessages.conversationHistory`)

### Knowledge Pack Data

Tests use the **real knowledge pack** data from `knowledge_pack/` directory instead of test fixtures. This ensures tests validate against actual production data structures and schemas.

**Location:** `knowledge_pack/` (root of monorepo)
- Carriers: `knowledge_pack/carriers/*.json`
- States: `knowledge_pack/states/*.json`
- Products: `knowledge_pack/products/*.json`
- Schemas: `knowledge_pack/schemas/*.json`

### Example Usage

```typescript
import { testMessages } from '../../__tests__/fixtures/test-messages'

// Use in tests
const message = testMessages.naturalLanguage.complete
// "I need auto insurance in California. I am 30 years old and have 2 vehicles."
```

## Are We Hitting the Real Gemini API?

### Default Behavior: **NO** ❌

- **Unit tests**: Mock LLM provider (no API calls)
- **Integration tests**: Mock LLM provider (no API calls)
- **Contract tests**: Use real API **only if server is running** (skipped otherwise)

### To Test with Real API: **YES** ✅

**Option 1: Contract Tests (Full Stack)**

```bash
# Terminal 1: Start server (uses real Gemini API)
bun run dev

# Terminal 2: Run contract tests
TEST_API_URL=http://localhost:7070 bun run test:contract
```

**Option 2: Gemini Provider Tests (Unit Level)**

```bash
# Run tests against real Gemini API
TEST_TARGETS=real-api bun run test:gemini
```

## Running All Tests

```bash
# Run all tests (unit + integration, no real API)
bun test

# Run all tests including contract tests (requires running server)
bun run test:all

# Run with real Gemini API (requires TEST_TARGETS=real-api)
TEST_TARGETS=real-api bun run test:gemini
```

## Test Coverage Summary

| Test Type             | Count | Real API?            | Status     |
| --------------------- | ----- | -------------------- | ---------- |
| Unit Tests            | ~200 | ❌ Mocked            | ✅ Passing |
| Integration Tests     | ~330 | ❌ Mocked            | ✅ Passing |
| Contract Tests        | 28   | ✅ If server running | ⏭️ Skipped |
| Gemini Provider Tests | 8    | ✅ If enabled        | ⏭️ Skipped |
| **Total**             | **564** (530 pass, 28 skip, 6 fail) | | ✅         |

**Note:** Test counts are approximate as tests span multiple categories. Contract and Gemini provider tests are skipped by default (require server running or `TEST_TARGETS=real-api`).

## Schema Validation

Contract tests use Zod schema validation to ensure API responses match the TypeScript types:

```typescript
import { intakeResultSchema } from '@repo/shared'

const validationResult = intakeResultSchema.safeParse(responseBody)
expect(validationResult.success).toBe(true)
```

This catches:

- Missing required fields
- Incorrect field types
- Invalid enum values
- Schema drift between TypeScript types and runtime responses

## CI/CD Integration

For CI/CD, you can start the server in the background:

```bash
# Start server in background
bun run dev &
SERVER_PID=$!

# Wait for server to be ready
sleep 2

# Run contract tests
TEST_API_URL=http://localhost:7070 bun run test:contract

# Cleanup
kill $SERVER_PID
```

## Cost Considerations

- **Mocked tests**: Free, no API costs
- **Contract tests**: May incur Gemini API costs if server uses real API
- **Gemini provider tests**: Will incur API costs (use free tier `gemini-2.5-flash-lite`)

To minimize costs:

- Use `TEST_TARGETS=real-api` only when needed
- Contract tests skip gracefully if server isn't running
- Default test runs use mocks (no API calls)
