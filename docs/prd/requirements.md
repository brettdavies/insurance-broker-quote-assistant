# Requirements

## Functional

**FR1:** The system shall support **conversational intake mode** where the assistant guides a broker through a dialogue to gather shopper information (identity, state, product line, household/vehicle/home basics) and route to the appropriate carrier/state/product quoting path.

**FR2:** The system shall support **policy-based analysis mode** where the assistant ingests a synthetic declarations page (PDF or structured data) and generates a savings pitch with rationale including eligible discounts, bundle opportunities, and deductible/limit trade-offs.

**FR3:** The system shall implement **multi-carrier/state routing logic** that accurately routes quote requests based on carrier availability by state, product lines (Auto/Home/Renters/Umbrella), eligibility rules, discount programs, and compensation structures for the supported carriers and states.

**FR4:** The system shall operate entirely on an **offline knowledge pack** consisting of local files (YAML/JSON/CSV) containing carrier/state/product rules, average prices, eligibility criteria, discounts, pay structures, and FAQs—with zero runtime calls to external web search or APIs.

**FR5:** The system shall generate **IQuote Pro pre-fill packets** (or structured stubs) containing captured shopper data formatted for carrier submission, along with a lead handoff summary for the licensed agent.

**FR6:** The system shall identify and flag **missing required fields** during intake, providing a checklist of information needed to complete the quote application.

**FR7:** The system shall enforce **mandatory compliance guardrails** including: (a) displaying required insurance sales disclaimers, (b) refusing prohibited statements (guarantees, binding quotes, price promises), and (c) triggering licensed-agent handoff for regulated activities.

**FR8:** The system shall provide **structured outputs** for all interactions including: route decision (carrier/state/product), missing fields checklist, pre-fill packet JSON, and savings pitch with **industry-standard footnote citations** (e.g., "(1) https://geico.com/discounts/, accessed 2025-11-09") to knowledge pack sections. This citation format meets PEAK6 requirements for broker credibility and regulatory compliance.

**FR9:** The system shall support **test case evaluation** through an automated harness that measures routing accuracy, intake completeness, savings-pitch clarity, and compliance checks against synthetic test data.

**FR10:** The system shall log **decision traces** for each interaction showing inputs received, knowledge pack sections consulted, rules applied, and outputs generated—with all PII redacted.

**FR11:** The system shall include **citations for all compliance decisions** (disclaimers, prohibited statements, handoff triggers) using industry-standard footnote format with knowledge pack cuid2 IDs. This provides regulatory audit trail and broker credibility by showing the source of each compliance rule. Example format: "This statement is prohibited(1)" → "(1) CA Insurance Code §1861.01(a), knowledge pack ref: comp_ckm9x7wdx1"

## Non Functional

**NFR1:** The system architecture shall be **clear and maintainable** using either a multi-agent orchestrator pattern (preferred) or a modular single-agent design with well-defined component boundaries.

**NFR2:** The system shall provide a **deterministic local demo** with one-command setup that runs successfully on local hardware without cloud deployment, DNS configuration, or external service dependencies.

**NFR3:** The system shall achieve **offline operation guarantee** where disabling network access does not break core conversational intake or policy analysis flows—validated through logs showing zero external API calls during runtime.

**NFR4:** The system shall achieve **routing accuracy ≥90%** on test cases covering the supported carrier/state/product combinations.

**NFR5:** The system shall achieve **intake completeness ≥95%** by capturing or flagging all required quote fields during conversational interactions.

**NFR6:** The system shall achieve **savings pitch clarity ≥85%** as rated by reviewers using the internal evaluation rubric that assesses whether generated pitches are clear, actionable, and grounded in policy data and knowledge pack.

**NFR7:** The system shall achieve **100% compliance enforcement** with zero prohibited statements in outputs, all required disclaimers displayed, and proper licensed-agent handoff triggered.

**NFR8:** The system shall maintain **synthetic data only** with no real PII in inputs, outputs, or logs—all test cases and demonstrations use synthetic shopper profiles and policy declarations.

**NFR9:** The system shall provide **configurable response time targets** for conversational interactions (e.g., assistant responses within N seconds), with timeout values externalized to configuration rather than hardcoded.

**NFR10:** The system UI shall support **keyboard shortcuts** for common broker workflows to enable power-user efficiency during demonstrations and real-world usage.

**NFR11:** The system shall implement **graceful error handling** for common failure scenarios including: (a) network failures during LLM calls with automatic retry logic, (b) LLM timeout failures with user-facing timeout messages, (c) PDF parsing failures with fallback to manual entry, (d) malformed knowledge pack data with startup warnings, and (e) invalid user inputs with clear validation error messages.

**NFR12:** The system shall complete **deterministic operations in <500ms** for typical queries, specifically: routing engine carrier eligibility checks, compliance filter prohibited statement detection, and discount calculator savings estimates. This performance target enables real-time broker workflows during live client calls where sub-second response times are critical for maintaining conversation flow.

**NFR13:** The system shall complete **knowledge pack cache queries in <50ms** through in-memory indexing loaded at startup. Fast cache performance supports the overall sub-second response time requirement for power users and ensures smooth UI interactions for keyboard-driven workflows.

---
