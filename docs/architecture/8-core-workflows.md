# 8. Core Workflows

This section illustrates the two primary workflows that fulfill PEAK6's spec requirements: conversational intake and policy-based savings analysis.

**Why These Workflows:**

- **Conversational intake:** Enables brokers to start with natural language (no forms), system extracts structured data
- **Policy analysis:** Enables brokers to identify savings from existing policies (competitive advantage use case)
- **Sequential execution:** Each step depends on previous results, ensuring data flows correctly through hybrid LLM + rules architecture

---

## 8.1 Conversational Intake Flow

**What This Flow Accomplishes:**

- Broker provides free-form text → System returns complete quote recommendation with carrier routing, discount opportunities, and prefill packet

**Key Architectural Decisions:**

- **5-step sequential pipeline:** Extract (Inference + LLM) → Route → Discounts → Pitch → Compliance (cannot parallelize due to data dependencies)
- **Hybrid extraction approach:** Deterministic InferenceEngine runs first, then LLM extraction with known/inferred awareness
- **Known vs inferred separation:** System separates broker-curated fields (known, read-only) from system-derived fields (inferred, editable)
- **Suppression list enforcement:** System respects broker's explicit field dismissals across entire session
- **LLM for extraction and pitch only:** Deterministic engines handle routing/discounts/compliance (insurance regulatory requirement)
- **Compliance filter runs last:** Ensures 100% of outputs are regulation-compliant before reaching broker
- **Missing fields tracked:** Enables progressive disclosure UI (system asks for more info as needed)

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Inference as InferenceEngine<br/>(Deterministic)
    participant Extractor as ConversationalExtractor<br/>(Hybrid LLM)
    participant Routing
    participant Discount
    participant Pitch
    participant Compliance
    participant Gemini as Gemini API<br/>(1.5 Flash)
    participant KnowledgePack

    User->>Frontend: "I need renters in FL. Age 28. Lives alone."
    Frontend->>API: POST /api/intake<br/>{ message, knownFields, suppressedFields }

    Note over API: Step 1: Deterministic Inferences
    API->>Inference: applyInferences(knownFields, message)
    Note right of Inference: Field-to-field rules:<br/>productType="renters" → ownsHome=false<br/>Text patterns:<br/>"Lives alone" → householdSize=1<br/>Skip suppressed fields
    Inference-->>API: { inferred, reasons, confidence }

    Note over API: Step 2: LLM Extraction (Hybrid)
    API->>Extractor: extractFields(message, knownFields, inferred, suppressedFields)
    Extractor->>Extractor: buildSystemPrompt()<br/>Inject CRITICAL RULES for known/inferred/suppressed
    Extractor->>Extractor: buildUserPrompt()<br/>Inject field data + message
    Extractor->>Gemini: extractWithStructuredOutput(prompt, schema)
    Note right of Gemini: Respects 5 CRITICAL RULES:<br/>1. Never modify known fields<br/>2. Can edit/delete/upgrade inferred<br/>3. Never infer suppressed fields<br/>4. Confidence thresholds (≥85% → known)<br/>5. Fill missing fields
    Gemini-->>Extractor: { known, inferred, confidence, reasoning }
    Extractor->>Extractor: Separate known (≥85%) vs inferred (<85%)
    Extractor->>Extractor: Filter suppressed fields (defensive)
    Extractor-->>API: ExtractionResult { known, inferred, suppressedFields, inferenceReasons, confidence }

    API->>Routing: routeToCarrier(known + inferred)
    Routing->>KnowledgePack: getCarriers()
    KnowledgePack-->>Routing: [GEICO, Progressive, State Farm]
    Routing->>Routing: Filter by state/product/eligibility
    Routing-->>API: [GEICO (primary), Progressive, State Farm]

    API->>Discount: findDiscounts(carrier, known + inferred)
    Discount->>KnowledgePack: retrieveDiscounts(carrier, state)
    KnowledgePack-->>Discount: [multi-policy 15%, safe-driver 10%, ...]
    Discount->>Discount: Check eligibility for each
    Discount-->>API: [Opportunity with citations]

    API->>Pitch: generate(opportunities, known + inferred)
    Pitch->>Gemini: extractWithStructuredOutput(prompt, schema)
    Gemini-->>Pitch: "Based on your FL renters needs..."
    Pitch-->>API: Human-friendly pitch with rationales

    API->>Compliance: validate(pitch)
    Compliance->>Compliance: Check prohibited statements
    Compliance->>Compliance: Inject required disclaimers
    Compliance-->>API: { valid: true, output: pitch + disclaimers }

    API-->>Frontend: IntakeResult { extraction: { known, inferred, suppressedFields, inferenceReasons, confidence }, ... }
    Frontend-->>User: Display pitch, prefill packet, route decision<br/>Known fields: normal styling<br/>Inferred fields: muted + [✕] button
```

**Why This Sequence:**

1. **Deterministic inferences first:** Fast, cheap, reliable rule-based inferences run before expensive LLM call
2. **Hybrid LLM extraction:** LLM receives inferred fields as context, can confirm/edit/delete/upgrade based on text evidence
3. **Known vs inferred separation:** Enables transparent broker control - known fields are read-only, inferred fields are editable
4. **Suppression enforcement:** System respects broker's explicit dismissals (passed to both InferenceEngine and ConversationalExtractor)
5. **Routing before discounts:** Need to know which carrier to query for discount rules
6. **Discounts before pitch:** Pitch Generator needs structured opportunity data to write compelling prose
7. **Compliance last:** Final safeguard ensures nothing non-compliant reaches broker

**Hybrid Extraction Details:**

**InferenceEngine (Deterministic):**
- Field-to-field rules: `productType="renters"` → `ownsHome=false` (75% confidence)
- Text pattern rules: `"Lives alone"` → `householdSize=1` (82% confidence)
- Generates inference reasons and confidence scores
- Respects suppression list (skips dismissed fields)

**ConversationalExtractor (LLM):**
- Receives known fields, inferred fields, and suppressed fields as context
- Applies 5 CRITICAL RULES via system prompt:
  1. **KNOWN FIELDS (read-only):** Never modify broker-set fields
  2. **INFERRED FIELDS (can modify):** Confirm, edit, delete, or upgrade based on text evidence
  3. **SUPPRESSED FIELDS (never infer):** Respect user dismissals
  4. **CONFIDENCE LEVELS:** High (≥85%), Medium (70-84%), Low (<70%). Upgrade to known if ≥85%
  5. **EXTRACTION PRIORITY:** Fill missing fields, improve inferred fields with better evidence
- Separates response into known (≥85% confidence) vs inferred (<85% confidence)
- Filters suppressed fields (defensive layer, should be handled by prompt)

**Frontend Integration:**

- **Known fields:** Normal color (#f5f5f5), 2 buttons (ℹ️ + [Click])
- **Inferred fields:** Muted color (#a3a3a3), 3 buttons (ℹ️ + [✕] + [Click])
- **Clicking [✕] or [Delete]:** Adds field to suppression list (sent in next API request)
- **Clicking [Save Known]:** Injects pill into notes, converts inferred → known, removes from suppression list
- **Page refresh:** Clears suppression list (session-scoped only, no localStorage)

---

## 8.2 Policy Analysis Flow

**What This Flow Accomplishes:**

- Broker uploads existing policy → System identifies missing discounts, bundle opportunities, and deductible optimizations

**Key Architectural Decisions:**

- **7-step sequential pipeline:** PolicySummary (pre-parsed) → Policy Analysis Agent (LLM) → Bundle Analyzer (deterministic) → Discount Rules Validator → Pitch → Compliance → Decision Trace
- **Policy parsing separation:** Policy parsing happens in `/api/policy/upload` endpoint (Story 2.1), not in analyze flow. Analyze endpoint receives pre-parsed `PolicySummary` as source of truth.
- **LLM-based opportunity identification:** Policy Analysis Agent uses LLM (Gemini 2.5 Flash-Lite) to identify opportunities from policy data + knowledge pack context, not deterministic discount engine calls
- **Dual bundle analysis approach:** 
  - **LLM identification:** Policy Analysis Agent identifies bundle options via LLM analysis
  - **Deterministic validation:** Bundle Analyzer (`analyzeBundleOptions()`) runs separately using deterministic rules
  - **Merge and deduplicate:** Results from both sources are merged, keeping highest estimated savings per product
- **Validation layer (Story 2.3):** Discount Rules Validator validates LLM-identified opportunities before pitch generation:
  - Validates stacking rules (which discounts can combine)
  - Re-validates eligibility using Discount Engine evaluators
  - Validates savings calculations
  - Calculates confidence scores based on data completeness
  - Flags discounts requiring additional documentation
- **Three opportunity types:** Missing discounts, bundle options, deductible trade-offs (comprehensive savings analysis per spec)
- **No carrier routing:** Analyzes current carrier only (scope limitation for 5-day timeline)
- **Decision trace logging:** All analysis steps logged to `logs/compliance.log` for audit trail and debugging

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant PAA as Policy Analysis Agent<br/>(LLM-based)
    participant BA as Bundle Analyzer<br/>(Deterministic)
    participant DRV as Discount Rules Validator<br/>(Deterministic)
    participant PG as Pitch Generator<br/>(LLM-based)
    participant CF as Compliance Filter<br/>(Deterministic)
    participant LLM as External LLM Provider<br/>(Gemini 2.5 Flash-Lite)
    participant KP as Knowledge Pack<br/>(Data Layer)
    participant DE as Discount Engine<br/>(Deterministic)

    User->>Frontend: Upload/paste existing policy
    Note over Frontend: Policy parsing happens<br/>in /api/policy/upload<br/>(Story 2.1)
    Frontend->>API: POST /api/policy/analyze<br/>{ policySummary, policyText? }

    Note over API: Step 1: PolicySummary already provided<br/>(parsing done in upload endpoint)
    API->>KP: getCarrierByName(carrier)
    KP-->>API: Carrier data

    Note over API: Step 2: Policy Analysis Agent (LLM)
    API->>PAA: analyzePolicy(policySummary, policyText)
    PAA->>KP: getCarrierByName(carrier)
    KP-->>PAA: Carrier data with discounts
    PAA->>KP: getCarrierDiscounts(carrier, state, product)
    KP-->>PAA: Available discounts with citations
    
    PAA->>PAA: buildAnalysisPrompt(policy, discounts, bundleRules)
    PAA->>LLM: extractWithStructuredOutput()<br/>Identify opportunities from policy + KP context
    Note right of LLM: LLM identifies opportunities<br/>Returns JSON with citations<br/>⚠️ NON-DETERMINISTIC
    LLM-->>PAA: { opportunities, bundleOptions, deductibleOptimizations }
    PAA->>PAA: normalizeCitations() - adds file paths
    PAA-->>API: Raw Opportunity[] (not validated)

    Note over API: Step 3: Bundle Analyzer (Deterministic)
    API->>BA: analyzeBundleOptions(carrier, policySummary)
    BA->>KP: getCarrier(carrier)
    KP-->>BA: Carrier products and bundle discounts
    BA->>DE: Evaluate bundle eligibility
    DE-->>BA: Bundle eligibility results
    BA-->>API: [BundleOption: add home for 15% off]

    Note over API: Merge LLM + deterministic bundle options<br/>(deduplicate by product, keep highest savings)

    Note over API: Step 4: Discount Rules Validator (Deterministic)
    API->>DRV: validateOpportunities(opportunities, policy, carrier)
    Note right of DRV: ✅ DETERMINISTIC<br/>No LLM calls
    
    DRV->>DRV: validateStacking(opportunities, carrier)
    
    loop For each opportunity
        DRV->>KP: getDiscountById(citation.id)
        KP-->>DRV: Discount object with requirements
        DRV->>DE: getDiscountEvaluator(discount)
        DE-->>DRV: Evaluator instance
        DRV->>DE: evaluator.evaluateEligibility()
        DE-->>DRV: { eligible, missingRequirements }
        DRV->>DE: evaluator.calculateSavings()
        DE-->>DRV: { annualSavings, explanation }
        DRV->>DRV: calculateConfidenceScore()
    end
    
    DRV-->>API: ValidatedOpportunity[] with confidence scores

    Note over API: Step 5: Pitch Generator (LLM)
    API->>PG: generatePitch(validatedOpportunities, bundles, deductibles, policy)
    PG->>LLM: extractWithStructuredOutput()<br/>Generate agent-ready talking points
    Note right of LLM: Creates narrative<br/>Includes "because" rationales<br/>⚠️ NON-DETERMINISTIC
    LLM-->>PG: Savings pitch (markdown)
    PG-->>API: Pitch string

    Note over API: Step 6: Compliance Filter (Deterministic)
    API->>CF: validateOutput(pitch, state, productType)
    Note right of CF: ✅ DETERMINISTIC<br/>No LLM calls
    CF->>CF: Check prohibited statements
    CF->>CF: Inject required disclaimers
    CF-->>API: { passed: true, output: pitch + disclaimers }

    Note over API: Step 7: Decision Trace
    API->>API: createDecisionTrace()<br/>Includes validation results, LLM calls, stacking results
    API->>API: logDecisionTrace() - write to compliance.log

    API-->>Frontend: PolicyAnalysisResult<br/>{ opportunities, bundleOptions, pitch, trace, ... }
    Frontend-->>User: Display savings dashboard<br/>with confidence scores
```

**Why This Sequence:**

1. **PolicySummary pre-parsed:** Policy parsing happens in upload endpoint (Story 2.1), analyze endpoint receives structured data as source of truth
2. **LLM opportunity identification:** Policy Analysis Agent uses LLM to identify opportunities from policy context + knowledge pack, enabling nuanced analysis of policy details
3. **Dual bundle analysis:** Combines LLM insights with deterministic rules for comprehensive bundle opportunity detection
4. **Validation layer:** Discount Rules Validator ensures LLM-identified opportunities are valid, eligible, and properly calculated before pitch generation
5. **Pitch generation:** Synthesizes validated opportunities into agent-ready talking points with "because" rationales
6. **Compliance last:** Ensures savings claims don't violate insurance advertising regulations
7. **Decision trace:** Logs all analysis steps for audit trail and debugging

**Key Differences from Intake Flow:**

- **No routing engine:** Analyzes existing carrier only (no carrier selection needed)
- **LLM-based opportunity identification:** Uses Policy Analysis Agent instead of deterministic Discount Engine `findDiscounts()` call
- **Validation layer added:** Discount Rules Validator validates LLM-identified opportunities (Story 2.3)
- **Dual bundle analysis:** LLM + deterministic bundle analysis with merge/deduplication
- **Policy parsing separated:** Parsing happens in upload endpoint, not in analyze flow
- **Decision trace logging:** Comprehensive logging of all analysis steps
- **Pitch format:** Optimized for "here's how to save" vs "here's a new quote"

**Bundle Discount Analysis Implementation:**

- **Dual approach:** 
  - Policy Analysis Agent (LLM) identifies bundle opportunities from policy context
  - Bundle Analyzer (deterministic) identifies bundle opportunities using Discount Engine rules
  - Results merged and deduplicated by product, keeping highest estimated savings
- **Deterministic bundle analysis:** Uses `analyzeBundleOptions()` function from Discount Engine to check:
  - Carrier product availability in state
  - Bundle discount eligibility rules
  - Estimated savings calculations
- **Example:** User has auto with GEICO ($1200) → Both LLM and Bundle Analyzer identify home insurance bundle opportunity → System merges results, shows highest savings estimate
- **Why this matters:** Combines LLM's ability to infer context with deterministic rules' reliability for comprehensive bundle opportunity detection

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
