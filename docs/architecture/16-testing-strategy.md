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

---
