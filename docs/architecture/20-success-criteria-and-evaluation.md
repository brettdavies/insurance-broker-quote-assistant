# 20. Success Criteria and Evaluation

**Purpose:** Define measurable success metrics that prove the architecture meets project requirements.

## 20.1 Requirements Mapping

| Requirement | Target | How Architecture Achieves It |
|-------------|--------|------------------------------|
| **Routing Accuracy** | ≥90% | Deterministic Routing Engine with explicit carrier/state/product filtering |
| **Intake Completeness** | ≥95% | Conversational Extractor returns `missing_fields` array, validated against required schema |
| **Savings Explanation Quality** | ≥85% "clear and actionable" | Pitch Generator uses GPT-4o with structured prompt requiring "because" rationales |
| **Compliance** | 100% disclaimers, 0 prohibited | Compliance Filter hard-coded blocklist and required disclaimers (cannot be bypassed) |
| **Offline Guarantee** | 0 runtime web searches | All knowledge from local JSON files, LLM APIs only for text processing (no web search) |

**Why These Targets:**
- **90% routing accuracy:** Deterministic engines are testable, 90% is achievable with clear eligibility rules
- **95% intake completeness:** LLM extraction is mature for structured outputs, 95% realistic with GPT-4o-mini
- **100% compliance:** Regulatory requirement - no exceptions allowed (hard-coded filter guarantees this)
- **Offline guarantee:** Architectural constraint - 100% or fail (no runtime web scraping possible)

**Savings Explanation Quality Rubric (0-100 points):**
- Includes "because" rationale for each recommendation: 25 points
- References specific discount percentages from knowledge pack: 25 points
- Calculates dollar savings amount (not just percentages): 25 points
- Includes cuid2-based citations to knowledge pack sources: 25 points
- **Pass threshold:** ≥85 points = "clear and actionable"

**Example passing pitch:**
> "You qualify for GEICO's Multi-Policy Bundle discount **because** you have both auto and home insurance. This saves you **15%** annually, which equals **$300/year** based on your combined premiums. [Citation: `disc_ckm9x7wdx1`]"

## 20.2 Evaluation Harness

**What We Provide:**
- 15 test cases (10 conversational, 5 policy) in `evaluation/test-cases/`
- Automated harness that runs all test cases and generates report
- Command: `bun run evaluate`

**Harness Report Includes:**
- Routing accuracy percentage (per carrier, per state)
- Field completeness percentage (per required field)
- Compliance pass rate (100% required)
- LLM token usage and cost breakdown
- Sample decision traces (citations for each recommendation)

**Why Automated Evaluation:**
- **Objective metrics:** Evaluators can run the harness themselves, no subjective judgment
- **Regression prevention:** Catch broken routes/discounts before demo
- **Cost transparency:** Token usage visible, proves cost-efficiency

## 20.3 Key Architectural Decisions

**Trade-offs documented in this architecture:**

1. **Why Hybrid LLM + Rules?** Insurance compliance requires deterministic logic for critical operations (routing/discounts/compliance), LLMs for flexible NLP
2. **Why No Vector Store?** Structured JSON with known keys makes exact queries more accurate and faster than semantic search
3. **Why Hono over Express?** Lighter (faster), better TypeScript support, simpler API, AI-friendly CLI
4. **Why TanStack over Redux?** Server state (90% of state) handled by TanStack Query, minimal global state needed
5. **Why JSON Files over Database?** Meets offline requirement, simplest for 5-day timeline, easy to version control
6. **Why Bun over npm?** 10-20x faster package installs, native TypeScript, built-in test runner
7. **Why Docker deployment?** Self-hosted (no cloud lock-in), external knowledge pack mount (easy updates)

---
