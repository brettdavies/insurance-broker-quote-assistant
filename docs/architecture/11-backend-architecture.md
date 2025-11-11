# 11. Backend Architecture

**Purpose:** Node.js Hono API server coordinating hybrid LLM + deterministic rules architecture.

**Tech Stack:** Hono 4.0, TypeScript 5.6, OpenAI SDK, Zod validation, Node.js 20+

---

## 11.1 Service Layer Architecture

**Service Organization:**

- **Routes (thin layer):** Hono route handlers, Zod validation, HTTP concerns only
- **Services (business logic):** Orchestrator, Agents (LLM), Engines (deterministic), RAG
- **Middleware:** Error handling, logging, request validation

**Key Design Decisions:**

- **Services folder pattern:** Business logic separated from route handlers (testable without HTTP)
- **Orchestrator coordinates flows:** Routes call orchestrator, orchestrator calls agents/engines
- **Middleware chain:** Error handler → Logger → Validator → Route handler
- **Why thin routes:** Makes business logic reusable (e.g., orchestrator testable without Hono context)

**Three-Layer Pattern (Non-Standard):**

1. **Routes layer:** HTTP concerns (request parsing, response serialization, status codes)
2. **Service layer:** Business logic (orchestrator, agents, engines)
3. **Data layer:** Knowledge pack RAG, in-memory Maps

**Why this pattern:**

- **Testability:** Service layer pure TypeScript, no HTTP mocking needed
- **Type safety:** Routes use Hono RPC, services use domain types
- **Clear separation:** HTTP concerns don't leak into business logic

---

## 11.2 Middleware Stack

**What We Use:**

- **Error handler (global):** Catches all errors, transforms to structured API errors, logs to program log
- **Logger middleware:** Request/response logging to program log, LLM token usage to program log, decision traces to compliance log
- **Zod validator:** `@hono/zod-validator` for automatic request validation

**Why This Stack:**

- **Error handler first:** Ensures all errors caught, even from other middleware
- **Separate logs:** Program logs (debugging) vs compliance logs (audit trail)
- **Zod integration:** Validates requests before handler executes, automatic 400 errors

**Dual Logging Pattern (Non-Standard):**

- **Program log (`./logs/program.log`):** API requests, errors, LLM calls, token usage
- **Compliance log (`./logs/compliance.log`):** DecisionTrace objects only, audit trail for regulatory review

**Why dual logging:**

- **Regulatory requirement:** Insurance compliance needs separate audit trail
- **No PII in program logs:** Compliance log has citations/decisions, not user data
- **Different audiences:** Devs read program log, regulators read compliance log

---

## 11.3 OpenAI Integration

**What We Use:**

- Official `openai` npm package
- Structured outputs (JSON mode) for extraction
- Synchronous responses (no streaming for 5-day timeline)

**Why This Pattern:**

- **Client initialization once:** OpenAI client created at server startup, reused across requests
- **Error handling:** OpenAI errors caught and transformed to standard API errors
- **Token tracking:** Every API call logs token usage to program log

**Key Design Decisions:**

- **No retries for LLM calls:** If OpenAI fails, return error to user (don't auto-retry and delay response)
- **Timeouts:** 30s for extraction, 60s for pitch generation
- **Why no streaming:** Simplifies implementation, pitch needs to be compliance-checked before sending

---
