# 11. Backend Architecture

**Purpose:** Node.js Hono API server coordinating hybrid LLM + deterministic rules architecture.

**Tech Stack:** Hono 4.0, TypeScript 5.6, Google Gemini SDK (@google/generative-ai), Zod validation, Node.js 20+

---

## 11.1 Service Layer Architecture

**Service Organization:**

- **Routes (thin layer):** Hono route handlers, Zod validation, HTTP concerns only
- **Services (business logic):** Orchestrator, Agents (LLM), Engines (deterministic), RAG, InferenceEngine
- **Middleware:** Error handling, logging, request validation

**Core Services:**

1. **InferenceEngine** (`packages/shared/src/services/inference-engine.ts`)
   - Applies deterministic field-to-field and text pattern inferences
   - Respects suppression list (broker-dismissed fields)
   - Generates confidence scores and reasoning
   - Zero LLM tokens (instant, free)
   - Shared package (used by both frontend preview and backend)

2. **ConversationalExtractor** (`apps/api/src/services/conversational-extractor.ts`)
   - Orchestrates LLM extraction with hybrid inference context
   - Builds system/user prompts with CRITICAL RULES
   - Separates known (≥85%) vs inferred (<85%) fields
   - Tracks token usage and prompts for logging
   - Method: `extractFields(message, knownFields?, inferredFields?, suppressedFields?)`

3. **GeminiProvider** (`apps/api/src/services/gemini-provider.ts`)
   - Implements LLMProvider interface for abstraction
   - Handles Gemini API calls with structured outputs
   - Delegates to specialized classes (file upload, prompt building, schema transformation)
   - Tracks prompts for DecisionTrace logging

4. **Routing Engine** (deterministic rules)
5. **Discount Engine** (deterministic rules)
6. **Compliance Filter** (deterministic rules)
7. **Knowledge Pack RAG** (in-memory Maps, loaded at startup)

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

## 11.3 Google Gemini Integration

**What We Use:**

- Google Gemini API via `@google/generative-ai` (^0.21.0)
- Gemini 1.5 Flash model (cost-efficient, fast)
- Native structured outputs (JSON schema support)
- File API for policy document extraction (upload → URI reference)

**Why Gemini Over OpenAI:**

- **Cost efficiency:** Gemini 1.5 Flash is 2x cheaper than GPT-4o-mini ($0.075/1M input tokens vs $0.15/1M)
- **Native structured outputs:** Built-in JSON schema validation with `responseSchema` parameter (no prompt engineering)
- **Unified model:** Single model for both extraction and pitch generation (simpler integration)
- **File API:** Direct PDF/DOCX processing without separate parsing step
- **Performance:** Faster response times for extraction tasks

**GeminiProvider Architecture:**

- **Location:** `apps/api/src/services/gemini-provider.ts`
- **Interface:** Implements `LLMProvider` interface for abstraction
- **Composition pattern:** Delegates to specialized classes (DRY, SOLID principles)
  - `GeminiFileUploader` - file upload to Gemini API
  - `PromptBuilder` - prompt construction with context injection
  - `PromptLoader` - template loading from filesystem
  - `SchemaTransformer` - Zod → Gemini JSON schema conversion
  - Response parsers - JSON parsing, confidence calculation, token usage extraction

**Key Design Decisions:**

- **Client initialization once:** GoogleGenAI client created at provider instantiation, reused across requests
- **Error handling:** Gemini errors caught and transformed to standard API errors (different format than OpenAI, wrapped in `candidates[0].content`)
- **Token tracking:** Every API call logs token usage to program log
- **Timeout:** 10s default timeout for extraction (configurable)
- **No retries for LLM calls:** If Gemini fails, return error to user (fail fast)
- **Why no streaming:** Simplifies implementation, pitch must pass compliance filter before sending

**Prompt Template System:**

- System prompt: `apps/api/src/prompts/conversational-extraction-system.txt`
- User prompt: `apps/api/src/prompts/conversational-extraction-user.txt`
- Variable substitution: `{{knownFields}}`, `{{inferredFields}}`, `{{suppressedFields}}`
- CRITICAL RULES injection: LLM receives strict instructions on field handling (never modify known fields, can edit inferred fields, respect suppression list)

**Structured Output Flow:**

1. Transform Zod schema to Gemini JSON schema format
2. Build prompts with known/inferred/suppressed context
3. Call Gemini API with `responseSchema` parameter
4. Parse JSON response, validate against Zod schema
5. Calculate confidence scores, separate known vs inferred fields
6. Extract token usage for logging

---

## 11.4 Prompt Template System

**Purpose:** Template-based prompt construction with variable substitution for Epic 4 known/inferred/suppressed field injection.

**Template Files:**

- **System prompt:** `apps/api/src/prompts/conversational-extraction-system.txt`
  - Contains CRITICAL RULES for LLM behavior
  - Variable placeholders: `{{knownFields}}`, `{{inferredFields}}`, `{{suppressedFields}}`
  - Loaded once at service initialization, cached in memory

- **User prompt:** `apps/api/src/prompts/conversational-extraction-user.txt`
  - Contains user message and field context
  - Variable placeholders: `{{message}}`, `{{knownFields}}`, `{{inferredFields}}`, `{{suppressedFields}}`
  - Built per request with current field state

**Variable Substitution:**

- `{{knownFields}}` → JSON stringified `Partial<UserProfile>` (read-only fields)
- `{{inferredFields}}` → JSON stringified `Partial<UserProfile>` (editable fields)
- `{{suppressedFields}}` → Comma-separated string array (never infer these)
- `{{message}}` → User's conversational input text

**CRITICAL RULES Injection:**

The system prompt template includes strict instructions:
- **Never modify known fields:** LLM receives known fields as read-only context
- **Can edit inferred fields:** LLM can confirm, modify, delete, or upgrade inferred fields
- **Respect suppression list:** LLM must never infer fields in suppression list
- **Confidence separation:** Fields with ≥85% confidence become known, <85% remain inferred

**Why Template-Based:**

- **Separation of concerns:** Prompt logic separated from code (easier to iterate)
- **Version control:** Prompt changes tracked in git, not buried in code
- **A/B testing:** Easy to swap templates for experimentation
- **Non-developer editing:** Product team can edit prompts without code changes

---

## 11.5 Hybrid Inference Architecture (Deterministic + LLM)

**Service Flow:**

1. **InferenceEngine (Deterministic)** - applies rules first
2. **ConversationalExtractor (LLM)** - receives inferred fields as context
3. **Response Separation** - splits by confidence threshold (85%)

**InferenceEngine Service:**

- **Location:** `packages/shared/src/services/inference-engine.ts`
- **Purpose:** Apply deterministic inference rules before LLM extraction
- **Input:** Known fields + user message + suppression list
- **Output:** Inferred fields + reasons + confidence scores
- **Rule Sources:**
  - Field-to-field rules: `packages/shared/src/schemas/unified-field-metadata.ts` (infers property)
  - Text pattern rules: `packages/shared/src/config/text-pattern-inferences.ts`

**Inference Priority:**

1. **Field-to-field inferences** run first (higher confidence, structured data)
   - Example: `productType="renters"` → `ownsHome=false` (confidence: 0.75)
2. **Text pattern inferences** run second (lower confidence, natural language)
   - Example: "Lives alone" → `householdSize=1` (confidence: 0.82)
3. **Already-inferred fields** are not overwritten by text patterns (first inference wins)

**Suppression List Handling:**

- User can dismiss inferred fields via [✕] button in UI
- Dismissed fields added to suppression list (session-scoped)
- InferenceEngine skips suppressed fields (never generates inference)
- ConversationalExtractor receives suppression list in prompt (LLM also skips)
- Suppression list cleared on page refresh or /reset command

**ConversationalExtractor Updates (Epic 4):**

- **New method signature:** `extractFields(message, knownFields?, inferredFields?, suppressedFields?)`
- **Prompt building:**
  - `buildSystemPrompt()` - loads template, injects CRITICAL RULES
  - `buildUserPrompt()` - injects known/inferred/suppressed fields as JSON
- **LLM receives:**
  - Known fields (read-only, never modify)
  - Inferred fields (can confirm, edit, delete, or upgrade to known)
  - Suppressed fields (never infer)
- **Response separation:**
  - Confidence ≥85% → known fields
  - Confidence <85% → inferred fields
  - Suppressed fields → excluded from response

**Confidence Threshold:**

- **High confidence (≥85%):** LLM can upgrade inferred → known
- **Medium confidence (70-84%):** Remains inferred, needs user confirmation
- **Low confidence (<70%):** Remains inferred, low priority for validation

**Why This Architecture:**

- **Efficiency:** Deterministic rules are instant and free (no LLM tokens)
- **Accuracy:** LLM receives more context (inferred fields guide extraction)
- **User control:** Suppression list prevents re-inferring dismissed fields
- **Transparency:** Separate known/inferred fields with reasons and confidence scores
- **Cost reduction:** Reduces LLM token usage by pre-populating inferred fields

---
