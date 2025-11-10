# 8. Core Workflows

This section illustrates the two primary workflows that fulfill the spec requirements: conversational intake and policy-based savings analysis.

**Why These Workflows:**
- **Conversational intake:** Enables brokers to start with natural language (no forms), system extracts structured data
- **Policy analysis:** Enables brokers to identify savings from existing policies (competitive advantage use case)
- **Sequential execution:** Each step depends on previous results, ensuring data flows correctly through hybrid LLM + rules architecture

---

## 8.1 Conversational Intake Flow

**What This Flow Accomplishes:**
- Broker provides free-form text → System returns complete quote recommendation with carrier routing, discount opportunities, and prefill packet

**Key Architectural Decisions:**
- **5-step sequential pipeline:** Extract → Route → Discounts → Pitch → Compliance (cannot parallelize due to data dependencies)
- **LLM for extraction and pitch only:** Deterministic engines handle routing/discounts/compliance (insurance regulatory requirement)
- **Compliance filter runs last:** Ensures 100% of outputs are regulation-compliant before reaching broker
- **Missing fields tracked:** Enables progressive disclosure UI (system asks for more info as needed)

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Extractor
    participant Routing
    participant Discount
    participant Pitch
    participant Compliance
    participant OpenAI
    participant KnowledgePack

    User->>Frontend: "I need auto insurance in CA for 2 cars"
    Frontend->>API: POST /api/intake { message }

    API->>Extractor: extract(message)
    Extractor->>OpenAI: GPT-4o-mini chat completion
    OpenAI-->>Extractor: { state: "CA", product: "auto", vehicles: 2 }
    Extractor-->>API: UserProfile + missing_fields

    API->>Routing: routeToCarrier(profile)
    Routing->>KnowledgePack: getCarriers()
    KnowledgePack-->>Routing: [GEICO, Progressive, State Farm]
    Routing->>Routing: Filter by state/product/eligibility
    Routing-->>API: [GEICO (primary), Progressive, State Farm]

    API->>Discount: findDiscounts(carrier, profile)
    Discount->>KnowledgePack: retrieveDiscounts(carrier, state)
    KnowledgePack-->>Discount: [multi-policy 15%, safe-driver 10%, ...]
    Discount->>Discount: Check eligibility for each
    Discount-->>API: [Opportunity with citations]

    API->>Pitch: generate(opportunities, profile)
    Pitch->>OpenAI: GPT-4o chat completion with context
    OpenAI-->>Pitch: "Based on your CA auto needs..."
    Pitch-->>API: Human-friendly pitch with rationales

    API->>Compliance: validate(pitch)
    Compliance->>Compliance: Check prohibited statements
    Compliance->>Compliance: Inject required disclaimers
    Compliance-->>API: { valid: true, output: pitch + disclaimers }

    API-->>Frontend: IntakeResult
    Frontend-->>User: Display pitch, prefill packet, route decision
```

**Why This Sequence:**
1. **Extraction first:** Must understand what user wants before routing
2. **Routing before discounts:** Need to know which carrier to query for discount rules
3. **Discounts before pitch:** Pitch Generator needs structured opportunity data to write compelling prose
4. **Compliance last:** Final safeguard ensures nothing non-compliant reaches broker

### 8.1.5 Pitch Generation with Citations

**Purpose:** Format opportunity data into broker-facing narrative text with industry-standard footnote citations for regulatory compliance.

**Project Requirement:**
All discount information must include citation to source material (industry-standard footnote format per spec).

**What Citations Must Include:**
- Entity-level source tracking (every discount/carrier/state has `source` field with URI + accessed date)
- Unique cuid2 ID for each entity (enables precise citation without line number fragility)
- Footnote-style references linking narrative claims to source URLs

**Example Citation Output:**

```
Based on GEICO's Multi-Policy Bundle discount: 15% off when bundling
auto and home insurance.(1)

Potential Annual Savings: $450

Additional opportunity: Safe Driver Discount (10% reduction for
accident-free record).(2)

Sources:
(1) https://www.geico.com/auto/discounts/, accessed 2025-11-09
(2) https://www.geico.com/safe-driver/, accessed 2025-11-09
```

**Architectural Decision: Two Valid Implementation Strategies**

The dev team may choose either approach based on implementation complexity vs accuracy trade-offs:

**Option A: Deterministic Citation Formatting** (more predictable)
- **What:** Build citation map programmatically, assign footnote numbers sequentially
- **How it works:** Track entity IDs in Map, increment counter for each new source, deduplicate identical sources
- **Pros:** Predictable output format, easier to test, no LLM variability
- **Cons:** Requires custom string formatting logic in Pitch Generator

**Option B: LLM-Generated Citations** (more flexible)
- **What:** Include source data in system prompt, let GPT-4o format citations naturally
- **How it works:** Pass all opportunity sources to LLM, prompt to "use footnote-style citations"
- **Pros:** Natural integration with prose generation, handles complex citation scenarios
- **Cons:** LLM may occasionally misformat, requires prompt engineering to ensure consistency

**Why Both Are Valid:**
- **Option A** prioritizes predictability and testability (preferred for high-stakes regulatory scenarios)
- **Option B** prioritizes natural prose integration (acceptable if Compliance Filter validates output)
- Choice depends on dev team's comfort with LLM reliability vs custom formatting code

**Data Flow for Citations:**

```
Knowledge Pack → RAG Service → Discount Engine → Pitch Generator → Output
     ↓                ↓                 ↓                ↓
  source field    cuid2 ID      opportunity.source    footnote text
```

1. **Knowledge Pack:** Every entity has `source: { uri, accessed, confidence }` field
2. **RAG Service:** Preserves source metadata when returning query results
3. **Discount Engine:** Attaches source to each opportunity object
4. **Pitch Generator:** Formats sources as footnotes in narrative output
5. **Compliance Filter:** Validates citation presence (catches missing sources before output)

**Why This Matters:**
- Insurance advertising regulations require substantiation of savings claims
- Footnote citations enable broker to verify claims with carrier websites
- cuid2-based entity IDs enable precise audit trail (superior to line numbers which break on file edits)
- Compliance Filter can verify citation presence as part of regulatory checks

**Cross-Reference:**
- Entity-level source tracking: See Section 6.6 (Knowledge Pack RAG - Citation Format)
- cuid2 ID conventions: See `docs/knowledge-pack/id-conventions.md`

---

## 8.2 Policy Analysis Flow

**What This Flow Accomplishes:**
- Broker uploads existing policy → System identifies missing discounts, bundle opportunities, and deductible optimizations

**Key Architectural Decisions:**
- **5-step sequential pipeline:** Parse → Route → Discounts (includes bundle analysis) → Pitch → Compliance
- **Bundle analysis workflow:** Two invocations of the same Discount Engine component (Section 6.4):
  - **First call:** `findDiscounts()` identifies missing discounts on current policy
  - **Second call:** `analyzeBundleOptions()` identifies additional products for bundle discounts
  - Both functions are methods of the same Discount Engine, not separate components
- **Reuses routing/discount engines:** Same deterministic logic as conversational intake (code reuse)
- **Three opportunity types:** Missing discounts, bundle options, deductible trade-offs (comprehensive savings analysis per spec)
- **No new carrier routing:** Analyzes current carrier only (scope limitation for 5-day timeline)

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Extractor
    participant Discount
    participant Pitch
    participant Compliance
    participant OpenAI
    participant KnowledgePack

    User->>Frontend: Upload/paste existing policy
    Frontend->>API: POST /api/policy/analyze { policy_text }

    API->>Extractor: extractPolicy(policy_text)
    Extractor->>OpenAI: GPT-4o-mini parse policy
    OpenAI-->>Extractor: { carrier: "GEICO", premium: 1200, ... }
    Extractor-->>API: PolicySummary

    API->>Discount: findDiscounts(current_policy)
    Discount->>KnowledgePack: retrieveDiscounts(carrier, state)
    KnowledgePack-->>Discount: Available discounts
    Discount->>Discount: Compare current vs available
    Discount-->>API: Missing discounts as opportunities

    API->>Discount: analyzeBundleOptions(current_policy)
    Discount->>KnowledgePack: getCarrier(carrier)
    KnowledgePack-->>Discount: Carrier products and bundle discounts
    Discount-->>API: [BundleOption: add home for 15% off]

    API->>Pitch: generate(opportunities, bundles, profile)
    Pitch->>OpenAI: GPT-4o with savings context
    OpenAI-->>Pitch: "Here are 3 ways to save..."
    Pitch-->>API: Agent talking points

    API->>Compliance: validate(pitch)
    Compliance-->>API: { valid: true, output }

    API-->>Frontend: PolicyAnalysisResult
    Frontend-->>User: Display savings opportunities
```

**Why This Sequence:**
1. **Parse policy first:** Extract current carrier, premium, coverage details
2. **Missing discounts:** Compare what user has vs what they qualify for
3. **Bundle analysis:** Identify additional products (home, umbrella) that qualify for multi-policy discount
4. **Pitch generation:** Synthesize all opportunities into agent-ready talking points
5. **Compliance last:** Ensures savings claims don't violate insurance advertising regulations

**Key Difference from Intake Flow:**
- No routing engine (analyzes existing carrier only)
- Bundle analysis step added (home + auto = 15% discount)
- Pitch format optimized for "here's how to save" vs "here's a new quote"

**Bundle Discount Analysis (Non-Standard Implementation):**
- **Requires multi-carrier data:** Bundle opportunities depend on `existingPolicies` field in UserProfile tracking which carriers the user currently has for each product
- **Example:** User has auto with GEICO ($1200) + home with State Farm ($800) → Discount Engine identifies consolidation opportunity: move both to GEICO for 15% multi-policy discount = $300/year savings
- **Why this matters:** Many users have fragmented coverage across carriers and don't realize consolidation savings potential

---

## 8.3 Error Handling Flow

**What This Flow Accomplishes:**
- Any error in agents/engines → Structured error response → User-friendly message displayed

**Key Architectural Decisions:**
- **Centralized error handler:** Single place for error transformation and logging (DRY principle)
- **Structured error codes:** Machine-readable codes enable client-side error handling logic
- **Compliance violations logged separately:** All blocked outputs written to compliance log for regulatory review
- **No partial failures:** If any step fails, entire flow fails gracefully (no inconsistent state)

```mermaid
sequenceDiagram
    participant API
    participant Agent/Engine
    participant ErrorHandler
    participant Logger
    participant Frontend

    API->>Agent/Engine: Execute operation

    alt LLM API Error
        Agent/Engine->>ErrorHandler: LLM_API_ERROR
        ErrorHandler->>Logger: Log error with context
        ErrorHandler->>API: { error: { code, message } }
    else Compliance Violation
        Agent/Engine->>ErrorHandler: COMPLIANCE_VIOLATION
        ErrorHandler->>Logger: Log violation + original output
        ErrorHandler->>API: { error: { code, violations } }
    else Extraction Failed
        Agent/Engine->>ErrorHandler: EXTRACTION_FAILED
        ErrorHandler->>Logger: Log input + missing fields
        ErrorHandler->>API: { error: { code, missing_fields } }
    else No Eligible Carriers
        Agent/Engine->>ErrorHandler: ROUTING_FAILED
        ErrorHandler->>Logger: Log profile + reason
        ErrorHandler->>API: { error: { code, reason } }
    end

    API-->>Frontend: ApiError response (4xx/5xx)
    Frontend->>Frontend: Display user-friendly error message
```

**Why Centralized Error Handling:**
- **Consistent error format:** All errors follow same structure (predictable client handling)
- **Comprehensive logging:** Every error logged with full context for debugging
- **User-friendly messages:** Error codes mapped to human-readable messages on frontend
- **Audit trail:** Compliance violations logged separately for regulatory review

---
