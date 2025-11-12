# Epic 2: Policy Analysis & Savings Intelligence Flow

**Epic Goal:** Enable brokers to upload or manually enter existing policy data, review and edit extracted information, analyze coverage/limits/premiums against the knowledge pack, and generate data-driven savings recommendations. By the end of this epic, a broker can upload a PDF declarations page or type policy details, review the extracted data in an editable text format, make corrections as needed, then receive intelligent analysis identifying bundle opportunities and discount eligibility, and download/copy a savings pitch for client discussion. This epic delivers the second major value stream.

**Workflow:**

1. Broker uploads PDF or enters policy data manually
2. Backend extracts raw text from PDF (if uploaded)
3. Backend extracts PolicySummary (structured data) from text using LLM
4. PolicySummary is converted to key-value text format and displayed in editor
5. Broker reviews and edits the extracted text
6. When ready, broker triggers analysis (sends edited text to backend)
7. Backend analyzes policy against knowledge pack (LLM-powered identification via Policy Analysis Agent)
8. Backend validates identified opportunities against knowledge pack rules (deterministic validation via Discount Rules Validator)
9. Backend generates savings pitch from validated opportunities
10. Broker views savings pitch dashboard and can export/copy results

## Implementation Notes

**Architectural Patterns from Epic 1:**

- API endpoints use flat structure (e.g., `/api/intake`, `/api/generate-prefill`) rather than nested paths for Hono RPC client compatibility
- LLM provider uses Gemini 2.5 Flash-Lite (via `GeminiProvider`) rather than OpenAI GPT-4o-mini
- Endpoints are created via factory functions (e.g., `createIntakeRoute()`) and mounted at root level
- Services follow three-layer pattern: Routes → Services → Data layer (knowledge pack RAG)
- Decision trace logging integrated into all flows via `createDecisionTrace()` and `logDecisionTrace()`

**Hybrid LLM + Validation Pattern:**

- Policy Analysis Agent (Story 2.2) uses LLM to identify opportunities (non-deterministic)
- Discount Rules Validator (Story 2.3) validates LLM-identified opportunities against knowledge pack rules (deterministic)
- This two-layer approach ensures accuracy: LLM provides intelligent identification, validator ensures compliance
- Flow sequence: Policy Analysis Agent → Discount Rules Validator → Pitch Generator → Compliance Filter

## Story 2.1: Policy Upload & PDF Parsing

**As a** broker,
**I want** to drag-and-drop a PDF declarations page or manually enter policy data,
**so that** I can quickly analyze existing policies during competitive positioning conversations.

**Acceptance Criteria:**

1. Policy upload panel (right sidebar from Epic 1) accepts PDF drag-and-drop or file picker
2. POST `/api/policy/upload` endpoint receives file and uploads to Gemini File API first (best practice: upload before processing)
3. Backend extracts PolicySummary (structured data) directly from uploaded file using Gemini 2.5 Flash-Lite with structured outputs (no text extraction step needed)
4. Enhanced extraction prompt includes insurance agent context: "You are an insurance agent extracting policy information from a client's insurance policy document..."
5. PolicySummary is converted to key-value text format (e.g., `carrier:GEICO state:CA productType:auto premium:$1200/yr deductible:$500`)
6. Converted key-value text is displayed in the manual entry text box for broker review
7. Broker can review and edit the extracted text before sending for competitive shopping/analysis
8. Manual entry form available as fallback if file upload fails or broker prefers typing
9. Key-value syntax supported in manual entry (e.g., `carrier:StateFarm`, `premium:$1200/yr`, `deductible:$500`)
10. Key-value pairs are displayed as interactive pills (green/red/yellow validation) in the editor
11. File upload restrictions (type, size) enforced using shared constants from `@repo/shared` (single source of truth)
12. File drop zone changes color on hover (purple accent `#8b5cf6` for policy mode per front-end-spec.md)
13. Emacs shortcut `Ctrl+X P` focuses policy upload panel
14. Decision trace logged for file upload, Gemini extraction, and PolicySummary conversion

## Story 2.2: Policy Analysis Agent (LLM-Powered Coverage Review)

**As a** backend system,
**I want** an LLM agent that analyzes policy data against knowledge pack to identify savings opportunities,
**so that** brokers receive intelligent, data-grounded recommendations for client discussions.

**Acceptance Criteria:**

1. POST `/api/policy/analyze` endpoint accepts policy text (key-value format from editor after broker review/editing)
2. Backend extracts PolicySummary from the edited text using LLM (if not already structured)
3. LLM agent (Gemini 2.5 Flash-Lite via `GeminiProvider`) analyzes coverage, limits, deductibles, premiums against knowledge pack
4. Identifies eligible discounts not currently applied (e.g., multi-policy, good driver, home security)
5. Suggests bundle opportunities if only single product (e.g., "Client has home but no auto quote")
6. Evaluates deductible/limit trade-offs (e.g., "Raising deductible $500→$1000 saves $200/yr")
7. Returns structured JSON with savings opportunities ranked by impact
   - Note: Returns raw `Opportunity[]` (not validated) - validation happens in Story 2.3
8. All recommendations cite specific knowledge pack sections (cuid2-based citations)
9. Token usage logged for each analysis
10. Savings pitch clarity ≥85% validated in evaluation harness
11. Decision trace logged with citations

## Story 2.3: Discount Rules Engine (Eligibility Validation)

**As a** backend system,
**I want** a deterministic rules engine that validates discount eligibility,
**so that** savings recommendations are accurate and compliant with carrier rules.

**Acceptance Criteria:**

1. Cross-references identified discounts (from Story 2.2 Policy Analysis Agent) against knowledge pack eligibility rules
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
