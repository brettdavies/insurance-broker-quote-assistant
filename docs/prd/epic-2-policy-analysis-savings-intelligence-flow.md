# Epic 2: Policy Analysis & Savings Intelligence Flow

**Epic Goal:** Enable brokers to upload or manually enter existing policy data, analyze coverage/limits/premiums against the knowledge pack, and generate data-driven savings recommendations. By the end of this epic, a broker can upload a PDF declarations page or type policy details, receive intelligent analysis identifying bundle opportunities and discount eligibility, and download/copy a savings pitch for client discussion. This epic delivers the second major value stream.

## Implementation Notes

**Architectural Patterns from Epic 1:**
- API endpoints use flat structure (e.g., `/api/intake`, `/api/generate-prefill`) rather than nested paths for Hono RPC client compatibility
- LLM provider uses Gemini 2.5 Flash-Lite (via `GeminiProvider`) rather than OpenAI GPT-4o-mini
- Endpoints are created via factory functions (e.g., `createIntakeRoute()`) and mounted at root level
- Services follow three-layer pattern: Routes → Services → Data layer (knowledge pack RAG)
- Decision trace logging integrated into all flows via `createDecisionTrace()` and `logDecisionTrace()`

## Story 2.1: Policy Upload & PDF Parsing

**As a** broker,
**I want** to drag-and-drop a PDF declarations page or manually enter policy data,
**so that** I can quickly analyze existing policies during competitive positioning conversations.

**Acceptance Criteria:**

1. Policy upload panel (right sidebar from Epic 1) accepts PDF drag-and-drop or file picker
2. POST `/api/policy/upload` endpoint receives PDF and extracts policy data using OCR/text extraction
3. Extracted fields include: carrier, state, product type, coverage limits, deductibles, premiums, effective dates
4. Manual entry form available as fallback if PDF parsing fails or broker prefers typing
5. Key-value syntax supported in manual entry (e.g., `carrier:StateFarm`, `premium:$1200/yr`, `deductible:$500`)
6. Emacs shortcut `Ctrl+X P` focuses policy upload panel
7. Parsing results displayed in sidebar with confidence scores
8. Broker can edit/correct extracted fields before analysis
9. Decision trace logged for PDF parsing and field extraction

## Story 2.2: Policy Analysis Agent (LLM-Powered Coverage Review)

**As a** backend system,
**I want** an LLM agent that analyzes policy data against knowledge pack to identify savings opportunities,
**so that** brokers receive intelligent, data-grounded recommendations for client discussions.

**Acceptance Criteria:**

1. POST `/api/policy/analyze` endpoint accepts policy data (parsed or manual)
2. LLM agent (Gemini 2.5 Flash-Lite via `GeminiProvider`) analyzes coverage, limits, deductibles, premiums against knowledge pack
3. Identifies eligible discounts not currently applied (e.g., multi-policy, good driver, home security)
4. Suggests bundle opportunities if only single product (e.g., "Client has home but no auto quote")
5. Evaluates deductible/limit trade-offs (e.g., "Raising deductible $500→$1000 saves $200/yr")
6. Returns structured JSON with savings opportunities ranked by impact
7. All recommendations cite specific knowledge pack sections (cuid2-based citations)
8. Token usage logged for each analysis
9. Savings pitch clarity ≥85% validated in evaluation harness
10. Decision trace logged with citations

## Story 2.3: Discount Rules Engine (Eligibility Validation)

**As a** backend system,
**I want** a deterministic rules engine that validates discount eligibility,
**so that** savings recommendations are accurate and compliant with carrier rules.

**Acceptance Criteria:**

1. Cross-references identified discounts against knowledge pack eligibility rules
2. Validates discount stacking rules (which discounts can combine)
3. Calculates accurate savings estimates based on knowledge pack pricing data
4. Flags discounts requiring additional documentation (e.g., good student requires transcript)
5. Returns discount eligibility confidence score based on available policy data
6. Unit tests cover all discount types across 3 carriers and 5 states
7. No LLM calls (100% deterministic logic)
8. Decision trace logs all rules evaluated with knowledge pack citations

## Story 2.4: Savings Pitch Dashboard & Export

**As a** broker,
**I want** a clear visual dashboard showing all savings opportunities with one-click export,
**so that** I can confidently present competitive offers to clients.

**Acceptance Criteria:**

1. Savings pitch dashboard renders after policy analysis completes
2. Displays savings opportunities grouped by category: Discounts, Bundles, Coverage Adjustments
3. Each opportunity shows: estimated savings, eligibility confidence, required actions, knowledge pack citation
4. Visual prioritization: High-impact (green), Medium-impact (yellow), Low-impact (gray)
5. Slash command `/export` exports savings pitch as JSON
6. Slash command `/copy` copies savings pitch to clipboard (formatted for client email)
7. See [keyboard-shortcuts-reference.md](../keyboard-shortcuts-reference.md) for complete shortcuts list
8. Savings pitch includes adaptive compliance disclaimers based on state/product
9. Export filename auto-generated (e.g., `savings_pitch_jane_doe_CA_home_20251106.json`)
10. Zod schema validation for savings pitch format
11. Decision trace logged for pitch generation

## Story 2.5: Bundle Opportunity Detection

**As a** backend system,
**I want** to detect when a client has single-product coverage and recommend relevant bundles,
**so that** brokers can proactively suggest additional products for savings.

**Acceptance Criteria:**

1. Analyzes uploaded policy to identify current product type (Auto, Home, Renters, Umbrella)
2. Queries knowledge pack for bundle discounts offered by client's current carrier
3. Identifies missing products that would qualify for bundle savings (e.g., "Add auto to home for 15% discount")
4. Calculates estimated bundle savings based on knowledge pack pricing
5. Includes bundle recommendations in savings pitch dashboard
6. Cross-checks carrier availability for recommended products in client's state
7. Unit tests cover all bundle combinations across 3 carriers
8. Decision trace logged with knowledge pack citations for bundle rules

---
