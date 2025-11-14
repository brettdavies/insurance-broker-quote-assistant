# 5. API Specification

**Base URL:** `http://localhost:7070/api`

**Request/Response Format:** JSON with snake_case keys (auto-transformed from camelCase TypeScript types)

**Authentication:** None (demo environment)

---

## 5.1 Core Endpoints

| Endpoint              | Method | Purpose                             | Request Schema         | Response Schema        |
| --------------------- | ------ | ----------------------------------- | ---------------------- | ---------------------- |
| `/api/intake`         | POST   | Conversational intake flow          | `IntakeRequest`        | `IntakeResult`         |
| `/api/policy/analyze` | POST   | Policy analysis flow                | `PolicyAnalyzeRequest` | `PolicyAnalysisResult` |
| `/api/carriers`       | GET    | List all carriers in knowledge pack | None                   | `CarriersResponse`     |
| `/api/states`         | GET    | List states with requirements       | None                   | `StatesResponse`       |
| `/api/health`         | GET    | Health check                        | None                   | `HealthResponse`       |

**Design Decisions:**

- **Simple REST:** No GraphQL complexity needed for 5-day demo
- **Two primary flows:** Intake and policy analysis map directly to spec requirements
- **Read-only metadata endpoints:** Carriers and states for frontend dropdowns (optional, nice-to-have)

---

## 5.2 Endpoint Details

### POST /api/intake

**Purpose:** Conversational intake - extract fields from user message, route to carrier, generate pitch

**Request:**

- `message` (string, required) - User's conversational input
- `pills` (Partial<UserProfile>, optional) - Known fields extracted from lexical editor pills (broker-curated, read-only for LLM)
- `suppressedFields` (string[], optional) - Fields broker has explicitly dismissed (never re-infer)
- `conversationHistory` (array, optional) - Previous messages for context (future: multi-turn conversations)

**Response:** IntakeResult (see [Section 4.6](#46-intakeresult))

**Response Structure:**

The response includes an `extraction` object with known/inferred field separation:

```typescript
{
  extraction: {
    method: 'key-value' | 'llm',           // Extraction method used
    known: Partial<UserProfile>,            // Known fields (high confidence ≥85% or broker-set)
    inferred: Partial<UserProfile>,        // Inferred fields (confidence <85%)
    suppressedFields: string[],            // Fields broker dismissed (echoed back)
    inferenceReasons: Record<string, string>, // Reasoning for each inferred field
    confidence: Record<string, number>     // Field-level confidence scores (0-1)
  },
  // ... rest of IntakeResult (route, opportunities, prefill, pitch, etc.)
}
```

**Design Decisions:**

- **Known vs inferred separation:** Enables broker curation workflow (dismiss or convert inferred → known)
- **Hybrid inference architecture:** Deterministic InferenceEngine runs first (free, instant), then LLM extraction receives inferred fields as context
- **Suppression list:** Prevents re-inferring dismissed fields (broker has final say)
- **Progressive enhancement:** Both `pills` and `suppressedFields` optional for backward compatibility (first request has no pills)
- **Synchronous:** Returns complete result (extraction + routing + pitch) in one call

---

### POST /api/policy/analyze

**Purpose:** Policy analysis - parse existing policy and identify savings opportunities

**Request:**

- `policyText` (string, optional) - Free-form text from declarations page (OCR or manual entry)
- `policyData` (PolicySummary, optional) - Structured policy data if already parsed
- `policyFile` (File, optional) - Uploaded policy document (PDF, DOCX, TXT only)

**File Upload Implementation:**

- **Supported formats:** PDF (.pdf), Word (.doc, .docx), Plain text (.txt)
- **File type validation:** Backend validates MIME type and file extension before processing
- **LLM parsing:** Conversational Extractor Agent parses uploaded documents to extract PolicySummary
- **Text extraction:** PDF/DOCX files converted to text, then passed to LLM for structured extraction
- **Max file size:** 5MB per upload (configurable via environment variable)

**Response:** PolicyAnalysisResult (see [Section 4.7](#47-policyanalysisresult))

**Design Decisions:**

- **Flexible input:** Accept raw text, structured data, OR file upload (LLM extracts from any format)
- **Three opportunity types:** Missing discounts, bundles, deductible trade-offs
- **File validation:** Restrict file types to prevent malicious uploads, validate before LLM processing

---

### GET /api/carriers

**Purpose:** List all carriers in knowledge pack (for frontend dropdowns, optional)

**Response:**

```typescript
{
  carriers: Array<{
    name: string
    operatesIn: string[]
    products: string[]
  }>
}
```

---

### GET /api/health

**Purpose:** Health check for monitoring

**Response:**

```typescript
{
  status: 'ok' | 'degraded'
  knowledgePackLoaded: boolean
  carriersCount: number
  timestamp: string
}
```

---

## 5.3 Type-Safe API Client (Hono RPC)

**Pattern:** Use Hono's RPC client for type-safe frontend/backend communication

**Why This Matters:**

- **Automatic type inference:** Frontend gets autocomplete for all API endpoints and types
- **No manual type sync:** Changes to backend types automatically reflected in frontend
- **Runtime safety:** Errors caught at compile time, not runtime
- **Zero boilerplate:** No need to manually define API client functions

**Implementation Approach:**

**Backend exports app type:**

```typescript
// apps/api/src/index.ts
const app = new Hono()
  .post('/api/intake', ...)
  .post('/api/policy/analyze', ...)
  .get('/api/carriers', ...)

export type AppType = typeof app
```

**Frontend imports type and creates client:**

```typescript
// apps/web/src/lib/api-client.ts
import { hc } from 'hono/client'
import type { AppType } from '@repo/api'

export const api = hc<AppType>('http://localhost:7070')
```

**Usage in frontend:**

```typescript
// apps/web/src/hooks/useIntake.ts
// Method 1: Standard fetch-style response handling (recommended for explicit error handling)
const result = await api.api.intake.$post({
  json: { message: 'I need auto insurance in CA' },
})
const data = await result.json() // REQUIRED: Hono RPC returns standard Response object
// `data` is fully typed as IntakeResult

// Method 2: Using TanStack Query (recommended pattern)
const { mutate } = useMutation({
  mutationFn: async (data) => {
    const res = await api.api.intake.$post({ json: data })
    return res.json() // Parse response body
  },
})

// Method 3: Using parseResponse utility (automatic parsing + error handling)
import { parseResponse } from 'hono/client'
const data = await parseResponse(api.api.intake.$post({ json: message }))
// Automatically parses based on Content-Type and throws on error responses
```

**Design Decisions:**

- **Hono RPC over manual fetch:** Type safety across API boundaries without code generation
- **Response parsing required:** Hono RPC returns standard `fetch()` Response objects - must call `.json()` to extract data
- **parseResponse utility optional:** Convenience function for automatic parsing and error handling
- **No OpenAPI needed:** Types shared directly via TypeScript, faster for 5-day project
- **Works with TanStack Query:** RPC client functions wrap in TanStack Query hooks for caching

---

## 5.4 Error Handling

**Standard Error Response:**

```typescript
{
  error: {
    code: string           // Machine-readable error code
    message: string        // Human-readable error message
    details?: object       // Optional additional context
    timestamp: string      // ISO 8601 timestamp
  }
}
```

**Error Codes:**

| Code                    | HTTP Status | Meaning                              | Example                                 |
| ----------------------- | ----------- | ------------------------------------ | --------------------------------------- |
| `VALIDATION_ERROR`      | 400         | Invalid request data                 | Missing required field                  |
| `EXTRACTION_FAILED`     | 400         | LLM couldn't extract required fields | Ambiguous user input                    |
| `ROUTING_FAILED`        | 400         | No eligible carriers found           | State/product combination not supported |
| `COMPLIANCE_VIOLATION`  | 400         | Output blocked by compliance filter  | Pitch contained prohibited statements   |
| `DISCOUNT_ENGINE_ERROR` | 500         | Discount calculation failed          | Unexpected error calculating savings    |
| `KNOWLEDGE_PACK_ERROR`  | 500         | Knowledge pack query failed          | Missing or corrupt data files           |
| `LLM_API_ERROR`         | 503         | Gemini API call failed               | API timeout or rate limit               |
| `INTERNAL_ERROR`        | 500         | Unexpected error                     | Unhandled exception                     |

**Note:** Complete error code reference with detailed definitions in Section 18.3. Error types are defined in `packages/shared/src/types/errors.ts`.

**Design Decisions:**

- **Consistent format:** All errors follow same structure for predictable client handling
- **Machine-readable codes:** Enable client-side error handling logic
- **Compliance violations logged:** All blocked outputs written to compliance log for review

---
