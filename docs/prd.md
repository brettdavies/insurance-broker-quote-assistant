# IQuote Pro Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- **Enable insurance brokers to qualify shoppers efficiently** through conversational intake that captures quote essentials and routes to the correct carrier/state/product path within the supported coverage (3 carriers, 5 states)
- **Empower agents with data-driven savings pitches** by analyzing existing policies and identifying bundle opportunities, discount eligibility, and coverage optimization based on the offline knowledge pack
- **Ensure 100% regulatory compliance** through mandatory disclaimers, prohibited statement filtering, and proper licensed-agent handoff
- **Demonstrate production-quality architecture and working functionality** with offline operation, multi-agent orchestration, and comprehensive observability running on local hardware
- **Achieve measurable success metrics**: ≥90% routing accuracy, ≥95% intake completeness, ≥85% pitch clarity, 100% compliance, 0 runtime web calls

### Background Context

Insurance brokers face complexity when quoting across multiple carriers, states, and product lines—each with different eligibility rules, discount programs, and compensation structures. Manual qualification and quote preparation is time-consuming and error-prone, leading to incomplete applications and missed savings opportunities.

IQuote Pro addresses this by providing an AI-powered sales assistant that guides brokers through two critical workflows: (1) conversational intake that captures shopper information and routes to the appropriate quoting path, and (2) policy analysis that generates agent-ready talking points for positioning competitive offers. The system operates entirely on an offline "knowledge pack" of carrier/state/product rules (covering 3 carriers across 5 states with defined product lines), ensuring consistent, compliant, and fast responses without runtime dependencies on web search or live rate scraping. This 5-day MVP demonstrates both production-quality architectural thinking and a working local demo suitable for PEAK6 evaluation.

### Primary User Persona

**Sarah Chen, Senior Insurance Broker**
- **Experience:** 8 years in insurance sales, handles 50-60 quotes per week across multiple carriers
- **Typical Day:** Back-to-back client calls (phone + in-person), juggling multiple carrier portals, chasing missing information from clients, ensuring compliance with state regulations
- **Pain Points:**
  - Manual data entry across disparate carrier systems wastes 30-40% of day
  - Discovering missing fields late in quote process requires awkward client follow-ups
  - Compliance anxiety—uncertain if disclaimers are state/product appropriate
  - Missed cross-sell opportunities—no time to analyze existing policies for bundle savings
- **Goals:**
  - Qualify clients faster during initial conversations (reduce time-to-quote)
  - Capture complete information first time (eliminate follow-up calls)
  - Maintain compliance confidence (100% certainty disclaimers are correct)
  - Identify savings opportunities proactively (increase conversion rates)
- **Tech Comfort:** High—comfortable with keyboard shortcuts, prefers speed over GUI, uses multiple monitors

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-06 | 0.1 | Initial PRD creation | John (PM Agent) |

---

## Requirements

### Functional

**FR1:** The system shall support **conversational intake mode** where the assistant guides a broker through a dialogue to gather shopper information (identity, state, product line, household/vehicle/home basics) and route to the appropriate carrier/state/product quoting path.

**FR2:** The system shall support **policy-based analysis mode** where the assistant ingests a synthetic declarations page (PDF or structured data) and generates a savings pitch with rationale including eligible discounts, bundle opportunities, and deductible/limit trade-offs.

**FR3:** The system shall implement **multi-carrier/state routing logic** that accurately routes quote requests based on carrier availability by state, product lines (Auto/Home/Renters/Umbrella), eligibility rules, discount programs, and compensation structures for the supported carriers and states.

**FR4:** The system shall operate entirely on an **offline knowledge pack** consisting of local files (YAML/JSON/CSV) containing carrier/state/product rules, average prices, eligibility criteria, discounts, pay structures, and FAQs—with zero runtime calls to external web search or APIs.

**FR5:** The system shall generate **IQuote Pro pre-fill packets** (or structured stubs) containing captured shopper data formatted for carrier submission, along with a lead handoff summary for the licensed agent.

**FR6:** The system shall identify and flag **missing required fields** during intake, providing a checklist of information needed to complete the quote application.

**FR7:** The system shall enforce **mandatory compliance guardrails** including: (a) displaying required insurance sales disclaimers, (b) refusing prohibited statements (guarantees, binding quotes, price promises), and (c) triggering licensed-agent handoff for regulated activities.

**FR8:** The system shall provide **structured outputs** for all interactions including: route decision (carrier/state/product), missing fields checklist, pre-fill packet JSON, and savings pitch with citations to knowledge pack sections.

**FR9:** The system shall support **test case evaluation** through an automated harness that measures routing accuracy, intake completeness, savings-pitch clarity, and compliance checks against synthetic test data.

**FR10:** The system shall log **decision traces** for each interaction showing inputs received, knowledge pack sections consulted, rules applied, and outputs generated—with all PII redacted.

### Non Functional

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

---

## User Interface Design Goals

### Overall UX Vision

The IQuote Pro interface prioritizes **broker efficiency and confidence** during client interactions. The UX should feel like a professional sales tool—fast, keyboard-driven, and information-dense without being cluttered. Brokers need to maintain eye contact with clients while navigating the system, so the interface must support rapid data entry via shortcuts and provide clear visual feedback on routing decisions, missing fields, and compliance status. The overall aesthetic should convey trustworthiness and professionalism appropriate for financial services conversations.

### Key Interaction Paradigms

- **Conversational Flow with Shortcut Overlays**: Text-based chat interface with persistent keyboard shortcut hints (e.g., `Ctrl+S` to submit, `Ctrl+N` for new intake, `Ctrl+P` for policy analysis mode)
- **Progressive Disclosure**: Show only essential fields initially, expanding sections as the intake progresses (e.g., vehicle details only appear after Auto product is selected)
- **Real-Time Validation Feedback**: Instant visual indicators for routing eligibility, missing required fields, and compliance warnings
- **Export Actions**: One-click copy-to-clipboard for pre-fill packets, savings pitches, and lead summaries; plus file system export (download JSON) for pre-fill stubs
- **Dual Workflow Launch**: Home screen provides immediate access to both Conversational Intake and Policy Analysis workflows without intermediate mode selection

### AI Visibility Constraint

**Critical:** The AI operates **silently in the background** for the demo. The interface must NOT use a chatbot paradigm:

- **No chatbot interface:** AI extraction happens invisibly without conversational UI
- **No AI personas or avatars:** No "AI: ..." message bubbles in chat panel
- **No AI-initiated prompts:** AI does not ask the broker questions
- **Broker-centric input only:** Chat panel displays only broker's typed notes/input
- **Silent extraction feedback:** Real-time field capture shown in sidebar panels, not as AI responses in chat
- **Optional system notifications:** Brief, non-conversational status updates acceptable (e.g., "Field captured: Kids = 2") but must not resemble chatbot dialogue

**Rationale:** Brokers are professionals who know what information to collect. The AI is a background extraction and routing assistant, not a conversational partner. During live client calls, brokers need a note-taking interface with intelligent field extraction, not a chatbot asking them questions.

### Core Screens and Views

- **Home Screen with Dual Workflow Entry**: Main landing page with two prominent action areas—(1) start conversational intake chat or (2) upload/input policy for analysis—allowing brokers to begin either workflow immediately
- **Conversational Intake Chat View**: Full-screen chat with sidebar showing captured fields, routing status, and missing items checklist
- **Policy Upload/Input Panel**: Drag-and-drop for declarations page (PDF) or manual field entry available directly from home screen (no separate navigation required)
- **Savings Pitch Dashboard**: Generated recommendations with citations, discount eligibility, and bundle opportunities
- **Pre-Fill Packet Review**: Final review screen showing all captured data, disclaimers, and licensed-agent handoff instructions

### Accessibility: **None** (Minimal Usability Focus)

No formal WCAG compliance required. Focus on basic usability for target broker users: readable fonts, sufficient contrast for typical office lighting, keyboard navigation support (required for shortcuts anyway). Screen reader support and other advanced accessibility features are explicitly out of scope for this 5-day MVP.

### Branding

No specific branding requirements identified. Use clean, professional styling appropriate for financial services software:
- Neutral color palette (blues/grays suggesting trust and professionalism)
- Sans-serif fonts for readability
- Minimal visual flourishes—function over decoration
- Optional: PEAK6 logo placement if appropriate for demo presentation

### Target Device and Platforms: **Desktop Only**

**Desktop browsers only** (Chrome/Firefox/Safari) on broker workstations. Demo will be presented at **1024px window size**. The interface should handle window resizing gracefully, but mobile phone and tablet support are explicitly out of scope—brokers will use this on office computers or laptops during client meetings.

---

## Technical Assumptions

### Repository Structure: **Monorepo**

The project uses a **Bun workspace monorepo** with the structure:
- `apps/web` - React frontend (port 3000)
- `apps/api` - Hono backend (port 7070)
- `packages/shared` - Shared TypeScript types, schemas, and utilities

**Rationale:** Monorepo enables type sharing across frontend/backend, simplifies coordinated changes, and aligns with the 5-day timeline by reducing coordination overhead between separate repos.

### Service Architecture: **Monolith within Monorepo**

Both frontend and backend are **monolithic applications** (not microservices or serverless functions). The backend uses a **hybrid LLM + deterministic rules architecture**:
- **2 LLM Agents:** Conversational Extractor (field extraction) + Pitch Generator (recommendations)
- **3 Rules Engines:** Routing (carrier eligibility) + Discount (savings) + Compliance (regulatory guardrails)
- **Offline Knowledge Pack:** All insurance data in local JSON files loaded at startup into in-memory cache

**Rationale:** Per architecture documentation ([docs/architecture/2-high-level-architecture.md](docs/architecture/2-high-level-architecture.md)), this hybrid approach provides deterministic compliance/routing logic (required for insurance regulations) while maintaining flexible NLP for conversational intake. Monolith simplifies deployment for local demo.

### Testing Requirements: **Unit + Integration (No E2E)**

Testing pyramid prioritizes:
- **Unit tests** using Bun test (Jest-compatible) for core business logic (rules engines, LLM prompt logic)
- **Integration tests** for API endpoints and multi-component workflows
- **Evaluation harness** (`bun run evaluate`) for routing accuracy, intake completeness, and compliance metrics
- **Manual testing** for demo scenarios

**E2E tests explicitly out of scope** for 5-day MVP to focus on functional correctness over browser automation.

**Rationale:** Project spec emphasizes measurable evaluation metrics (90%/95%/85%/100%) delivered through automated harness, not browser-level E2E tests.

### Additional Technical Assumptions and Requests

The following technical decisions are documented in [docs/architecture/3-tech-stack.md](docs/architecture/3-tech-stack.md) and serve as constraints for implementation:

**Core Technology Stack:**
- **Languages:** TypeScript ^5.6 (frontend + backend) with strict mode enabled
- **Frontend:** React 18.2 + TanStack Router + TanStack Query + TanStack Form + Tailwind CSS + shadcn/ui
- **Backend:** Hono 4.0 + OpenAI Node SDK 4.0 for LLM integration
- **Package Manager:** Bun 1.3+ (10-20x faster than npm, native TypeScript support)
- **Validation:** Zod 3.23 for runtime schema validation across frontend/backend
- **Storage:** JSON files on local filesystem (knowledge pack), in-memory Map cache (loaded at startup)
- **Tooling:** Biome 1.9 (linting + formatting), Husky 9.0 (pre-commit hooks), GitHub Actions (CI)

**Key Architectural Decisions (Rationale Documented in Architecture):**
- **No database:** JSON files meet offline requirement and simplify 5-day timeline
- **No authentication:** Out of scope for demo per PEAK6 spec
- **No vector store:** Structured JSON with exact queries faster/more accurate than semantic search for insurance rules
- **React StrictMode disabled:** Reduces LLM API costs during development (prevents double-rendering)
- **Desktop-only UI:** 1024px window size, no mobile/tablet support

### Data Models

The following key data entities are defined in [docs/architecture/4-data-models.md](docs/architecture/4-data-models.md):

- **UserProfile** - Shopper identity, contact info, state, product preferences, household/vehicle/property details
- **Carrier** - Carrier name, supported states, supported products, eligibility rules, discount programs, compensation structure
- **Product** - Product type (Auto/Home/Renters/Umbrella), required fields per product, coverage options, state-specific rules
- **Opportunity** - Savings recommendation with estimated savings, confidence score, required actions, knowledge pack citations
- **IntakeResult** - Conversational intake output: captured fields, routing decision, missing fields checklist, confidence scores
- **PolicyAnalysisResult** - Policy analysis output: identified opportunities, bundle recommendations, coverage gaps, compliance disclaimers
- **PreFillPacket** - IQuote Pro submission stub: shopper data, routing decision, lead handoff summary, disclaimers
- **DecisionTrace** - Audit log: timestamp, interaction ID, inputs, knowledge pack queries, rules evaluated, LLM calls, outputs (PII redacted)

All models use Zod schemas for runtime validation and TypeScript type generation. See architecture documentation for complete schema definitions.

**Environment Configuration:**
```bash
# Required
OPENAI_API_KEY=sk-...

# Optional (with defaults)
NODE_ENV=development
API_PORT=7070
FRONTEND_PORT=3000
LOG_LEVEL=info
```

**One-Command Setup (Docker Compose):**
```bash
docker compose up  # Starts all services: frontend (3000), backend (7070)
```

**Development Setup (Local):**
```bash
bun install
bun run dev  # Starts both frontend (3000) and backend (7070)
```

---

## Epic List

### Epic 1: Project Foundation & Conversational Intake Flow
Establish project infrastructure (monorepo, dev environment, UI shell) and deliver complete conversational intake workflow enabling brokers to qualify shoppers through natural language dialogue, route to appropriate carriers, and generate IQuote Pro pre-fill packets.

### Epic 2: Policy Analysis & Savings Intelligence Flow
Enable brokers to upload existing policies (PDF or structured data), analyze coverage/limits/premiums, and generate data-driven savings recommendations including bundle opportunities, discount eligibility, and competitive positioning talking points.

### Epic 3: Evaluation Framework & Production Deployment
Implement automated evaluation harness with 15 test cases to validate PEAK6 success metrics (90%/95%/85%/100%), complete decision trace logging, and package application as Docker Compose deployment for demo presentation.

---

## Epic 1: Project Foundation & Conversational Intake Flow

**Epic Goal:** Establish a working monorepo with CI/CD, basic UI infrastructure, and a fully functional conversational intake workflow. By the end of this epic, a broker can start a chat session, discuss shopper needs in natural language, have the system extract quote essentials and route to the appropriate carrier/state/product, see adaptive compliance disclaimers, and receive a downloadable IQuote Pro pre-fill packet. This epic delivers the first complete vertical slice of end-to-end value.

### Story 1.1: Monorepo Setup & Development Infrastructure

**As a** developer,
**I want** a fully configured Bun monorepo with CI/CD pipeline,
**so that** I can develop frontend/backend code with shared types and automated quality checks.

**Acceptance Criteria:**

1. Monorepo structure created with `apps/web`, `apps/api`, `packages/shared` workspaces
2. TypeScript 5.6+ configured with strict mode across all packages
3. Biome 1.9 configured for linting and formatting with pre-commit hooks (Husky)
4. GitHub Actions CI pipeline runs type-check, lint, and unit tests on pull requests
5. `bun install` successfully installs all dependencies across workspaces
6. `bun run dev` starts both frontend (port 3000) and backend (port 7070) concurrently
7. Environment variable configuration documented in `.env.example` with `OPENAI_API_KEY` placeholder
8. README includes setup instructions and architecture overview link

### Story 1.2: Integrated Home Screen with Dual Workflow Interface

**As a** broker,
**I want** a single home screen where I can immediately start conversational intake or upload a policy without extra navigation,
**so that** I can maximize efficiency during client interactions by eliminating unnecessary clicks.

**Acceptance Criteria:**

1. React 18.2 app renders at `localhost:3000` with Tailwind CSS styling, dark mode as default, and professional financial services aesthetic
2. Home screen displays integrated interface with two sections: (1) chat panel for conversational intake on left/center, (2) policy upload drop zone on right/sidebar
3. Chat interface is immediately usable - broker can start typing without clicking "Start" button
4. Policy upload panel accepts drag-and-drop PDF or manual data entry without navigation
5. Emacs-style keyboard shortcuts with multi-keystroke combinations: `Ctrl+X Ctrl+C` new session, `Ctrl+X E` export, `Ctrl+X P` policy mode, `Ctrl+?` show shortcuts browser
6. Field-specific shortcuts with modal popups: `Ctrl+K` (kids) → modal "How many kids?" → type number → Enter → injects `k:5` into chat
7. TanStack Router configured with single route `/` (no separate intake/analysis routes)
8. Desktop-only responsive design tested at 1024px window width
9. shadcn/ui components integrated with dark mode theming
10. **Dark mode enabled as default theme** with light mode toggle
11. Keyboard shortcuts browser accessible via `Ctrl+?` for discoverability

### Story 1.3: Knowledge Pack Loader & In-Memory Cache

**As a** backend system,
**I want** to load all knowledge pack JSON files into memory at startup,
**so that** I can quickly query carrier/state/product rules without filesystem I/O during runtime.

**Acceptance Criteria:**

1. Hono backend starts at `localhost:7070` with startup logging
2. On startup, asynchronously load all JSON files from `knowledge-pack/` directory into in-memory Map structures
3. Knowledge pack includes carriers (3), states (5), products (Auto/Home/Renters/Umbrella), discounts, eligibility rules, and compensation data
4. Startup completes successfully even if knowledge pack loading is still in progress (non-blocking)
5. Health check endpoint `/api/health` returns knowledge pack status (loaded/loading/error)
6. Logging includes count of loaded entities (e.g., "Loaded 3 carriers, 5 states, 12 products, 47 discounts")
7. Error handling for missing or malformed JSON files with graceful degradation
8. No runtime filesystem reads after initial load (validated via decision trace logs)

### Story 1.4: Real-Time Chat Interface with Live Field Capture Sidebar

**As a** broker,
**I want** a chat interface that shows me exactly what shopper data has been captured in real-time,
**so that** I can track progress and identify missing information during client calls.

**Acceptance Criteria:**

1. Chat panel displays conversation history with clear visual distinction between broker and AI messages (dark mode as default)
2. Right sidebar shows live captured fields organized by category: Identity (name, contact), Location (state), Product (type), Details (household/vehicles/property)
3. Missing required fields highlighted with red indicator and field name (e.g., "State: MISSING")
4. Captured fields update in real-time as conversation progresses (optimistic UI updates)
5. Emacs-style keyboard shortcuts: `Ctrl+X Ctrl+C` new session, `Ctrl+X E` export, `Ctrl+K` kids modal, `Ctrl+D` dependents modal, `Ctrl+V` vehicles modal, `Ctrl+?` shortcuts browser
6. Direct key-value syntax support: broker can type `kids:3`, `k:3`, `deps:4`, `car:garage` in chat and system extracts as structured fields
7. Field-specific modals: shortcuts like `Ctrl+K` open focused modal ("How many kids?") → broker types value → Enter → injects formatted key-value (e.g., `k:5`) into chat
8. TanStack Query manages chat state with automatic refetching and cache invalidation
9. Adaptive compliance disclaimers displayed in chat based on discovered state and product (e.g., CA Auto disclaimer different from FL Home)
10. No auto-generated broker prompts - broker controls conversation, system only shows missing fields
11. Professional dark mode styling with monospace font for data fields and key-value syntax highlighting
12. Key-value pairs visually distinct in chat (e.g., syntax highlighting for `k:5`, `deps:4`)
13. **Chat panel displays ONLY broker input** - AI extraction is invisible (no "AI: ..." message bubbles, no chatbot dialogue)

### Story 1.5: Conversational Extractor (LLM Agent for Field Extraction)

**As a** backend system,
**I want** an LLM-powered agent that extracts structured shopper data from natural language dialogue,
**so that** brokers can have flexible conversations without following rigid forms.

**Acceptance Criteria:**

1. POST `/api/intake/message` endpoint accepts broker message and conversation history
2. **Hybrid extraction approach**: First parse for key-value syntax (`kids:3`, `k:3`, `deps:4`, `car:garage`) using deterministic regex, then optionally use LLM for natural language extraction
3. Key-value syntax parser recognizes predefined field aliases (e.g., `k`/`kids`, `d`/`deps`, `v`/`vehicles`, `c`/`car`) and extracts structured data
4. OpenAI GPT-4o-mini integration with structured output (JSON mode) for natural language field extraction (optional/fallback when key-value not detected)
5. Returns JSON response with extracted fields, confidence scores, and extraction method (key-value vs LLM)
6. Handles ambiguous natural language inputs gracefully - extracts what's clear, marks uncertain fields with low confidence
7. Token usage logged for LLM calls only (key-value extraction is free/deterministic)
8. Timeout configuration externalized to environment variable (default: 10 seconds for LLM)
9. Zod schema validation for extracted fields before returning to frontend
10. Decision trace logged: inputs, extraction method (key-value/LLM), extracted fields, confidence scores, reasoning
11. **Implementation note**: Framework should support iterative addition of field-specific shortcuts and aliases as broker workflows are discovered

### Story 1.6: Routing Rules Engine (Carrier/State/Product Eligibility)

**As a** backend system,
**I want** a deterministic rules engine that routes shoppers to eligible carriers based on extracted data,
**so that** I can guarantee accurate routing without LLM hallucinations.

**Acceptance Criteria:**

1. Routing logic queries in-memory knowledge pack for carrier availability by state and product
2. Evaluates eligibility rules (e.g., credit score minimums, property type restrictions, driving record requirements)
3. Returns list of eligible carriers ranked by match quality with explanations
4. If no carriers match, returns clear explanation of why (e.g., "No carriers available for Renters insurance in Wyoming")
5. Routing decision includes confidence score and rationale based on data completeness
6. Decision trace logs all rules evaluated and match results with citations to knowledge pack
7. Unit tests cover all 3 carriers across 5 states for Auto/Home/Renters/Umbrella products
8. Routing accuracy ≥90% validated against synthetic test cases
9. No LLM calls during routing (100% deterministic logic)

### Story 1.7: Adaptive Compliance Filter (State/Product-Aware Guardrails)

**As a** backend system,
**I want** a compliance filter that adapts disclaimers based on discovered state and product type,
**so that** brokers always see the correct regulatory language for their specific scenario.

**Acceptance Criteria:**

1. All AI responses pass through compliance filter before returning to frontend
2. Filter detects and blocks prohibited statements (guarantees, binding quotes, price promises, medical advice)
3. If prohibited content detected, replace with licensed-agent handoff message
4. Compliance disclaimers dynamically selected based on state and product (e.g., CA auto has different disclaimers than FL home)
5. Disclaimers update in chat interface as new state/product info is discovered during conversation
6. Required insurance sales disclaimers automatically embedded in final outputs (pre-fill packets)
7. Compliance filter is rules-based (not LLM-based) for deterministic enforcement
8. Unit tests validate detection of 10+ prohibited statement patterns across multiple state/product combinations
9. Decision trace logs all compliance checks performed with state/product context
10. 100% compliance enforcement validated in evaluation harness

### Story 1.8: Pre-Fill Packet Generation & Hyper-Efficient Export

**As a** broker,
**I want** to instantly export captured shopper data with a single keyboard shortcut,
**so that** I can seamlessly hand off qualified leads to licensed agents without interrupting client flow.

**Acceptance Criteria:**

1. POST `/api/intake/generate-prefill` endpoint generates IQuote Pro pre-fill packet stub
2. Pre-fill packet includes: shopper identity, state, product type, routing decision, captured details, missing fields checklist, timestamp
3. Missing fields clearly flagged in pre-fill packet with red indicators
4. Lead handoff summary includes next steps for licensed agent with state/product-specific guidance
5. Required disclaimers embedded in pre-fill packet based on state and product
6. Keyboard shortcut `Alt+E` triggers instant export (no modal confirmation - speed over safety for demo)
7. "Download JSON" exports pre-fill packet to filesystem with auto-generated filename (e.g., `prefill_john_doe_CA_auto_20251106.json`)
8. Keyboard shortcut `Alt+C` copies entire pre-fill packet JSON to clipboard for pasting
9. Zod schema validation ensures pre-fill packet matches documented stub format
10. Decision trace logged for pre-fill generation

### Story 1.9: Real-Time Missing Fields Detection & Visual Indicators

**As a** broker,
**I want** to see exactly which fields are still needed at any moment,
**so that** I can efficiently gather missing information from the client without system prompts.

**Acceptance Criteria:**

1. System maintains checklist of required fields per product type sourced from knowledge pack (Auto: drivers/vehicles/vin, Home: property details/construction, Renters: unit info/belongings, Umbrella: existing policies)
2. After each message, backend evaluates field completeness and returns updated missing fields list
3. Missing fields displayed in sidebar with visual priority: Critical (red), Important (yellow), Optional (gray)
4. Completeness percentage displayed with progress bar (e.g., "8/12 fields - 67% complete")
5. No auto-generated questions or prompts - system only shows what's missing, trusts broker to ask appropriate questions
6. Field requirements adapt based on discovered state and carrier (different carriers require different data)
7. If intake session ends with missing critical fields, pre-fill packet flags these with high priority for licensed agent
8. Real-time updates via WebSocket or SSE for instant feedback (no polling)
9. Intake completeness ≥95% validated in evaluation harness

---

## Epic 2: Policy Analysis & Savings Intelligence Flow

**Epic Goal:** Enable brokers to upload or manually enter existing policy data, analyze coverage/limits/premiums against the knowledge pack, and generate data-driven savings recommendations. By the end of this epic, a broker can upload a PDF declarations page or type policy details, receive intelligent analysis identifying bundle opportunities and discount eligibility, and download/copy a savings pitch for client discussion. This epic delivers the second major value stream.

### Story 2.1: Policy Upload & PDF Parsing

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

### Story 2.2: Policy Analysis Agent (LLM-Powered Coverage Review)

**As a** backend system,
**I want** an LLM agent that analyzes policy data against knowledge pack to identify savings opportunities,
**so that** brokers receive intelligent, data-grounded recommendations for client discussions.

**Acceptance Criteria:**

1. POST `/api/policy/analyze` endpoint accepts policy data (parsed or manual)
2. LLM agent (GPT-4o-mini) analyzes coverage, limits, deductibles, premiums against knowledge pack
3. Identifies eligible discounts not currently applied (e.g., multi-policy, good driver, home security)
4. Suggests bundle opportunities if only single product (e.g., "Client has home but no auto quote")
5. Evaluates deductible/limit trade-offs (e.g., "Raising deductible $500→$1000 saves $200/yr")
6. Returns structured JSON with savings opportunities ranked by impact
7. All recommendations cite specific knowledge pack sections (cuid2-based citations)
8. Token usage logged for each analysis
9. Savings pitch clarity ≥85% validated in evaluation harness
10. Decision trace logged with citations

### Story 2.3: Discount Rules Engine (Eligibility Validation)

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

### Story 2.4: Savings Pitch Dashboard & Export

**As a** broker,
**I want** a clear visual dashboard showing all savings opportunities with one-click export,
**so that** I can confidently present competitive offers to clients.

**Acceptance Criteria:**

1. Savings pitch dashboard renders after policy analysis completes
2. Displays savings opportunities grouped by category: Discounts, Bundles, Coverage Adjustments
3. Each opportunity shows: estimated savings, eligibility confidence, required actions, knowledge pack citation
4. Visual prioritization: High-impact (green), Medium-impact (yellow), Low-impact (gray)
5. Emacs shortcut `Ctrl+X S` exports savings pitch as JSON
6. Keyboard shortcut `Ctrl+C` copies savings pitch to clipboard (formatted for client email)
7. Savings pitch includes adaptive compliance disclaimers based on state/product
8. Export filename auto-generated (e.g., `savings_pitch_jane_doe_CA_home_20251106.json`)
9. Zod schema validation for savings pitch format
10. Decision trace logged for pitch generation

### Story 2.5: Bundle Opportunity Detection

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

## Epic 3: Evaluation Framework & Production Deployment

**Epic Goal:** Validate that the system meets all PEAK6 success criteria through automated testing, package the application for one-command deployment, and ensure comprehensive observability. By the end of this epic, the system achieves ≥90% routing accuracy, ≥95% intake completeness, ≥85% pitch clarity, and 100% compliance—all validated through automated harness and ready for demo presentation.

### Story 3.1: Evaluation Harness & Test Cases

**As a** developer,
**I want** an automated harness that runs 15 synthetic test cases and reports PEAK6 metrics,
**so that** I can objectively validate system performance before demo.

**Acceptance Criteria:**

1. Create 15 synthetic test cases in `evaluation/test-cases/`: 10 conversational intake, 5 policy analysis
2. Test cases cover all 3 carriers, 5 states, 4 product types with varied scenarios (complete data, missing fields, edge cases)
3. Command `bun run evaluate` executes all test cases and generates report
4. Report includes: routing accuracy %, intake completeness %, savings pitch clarity scores, compliance pass/fail
5. Per-carrier and per-state routing accuracy breakdown
6. Field completeness percentage for each required field across all tests
7. LLM token usage and cost breakdown (input/output tokens per test)
8. Sample decision traces with citations for audit
9. Report format: JSON + human-readable markdown summary
10. Evaluation harness achieves target metrics: ≥90% routing, ≥95% intake, ≥85% pitch, 100% compliance

### Story 3.2: Decision Trace Logging Infrastructure

**As a** backend system,
**I want** comprehensive decision trace logging for every interaction,
**so that** PEAK6 evaluators can audit system behavior and verify offline operation.

**Acceptance Criteria:**

1. Every API call logs structured decision trace to `logs/decisions/` directory
2. Trace includes: timestamp, interaction ID, inputs received, knowledge pack sections queried, rules evaluated, LLM calls (if any), outputs generated
3. All PII redacted from logs (names/addresses replaced with placeholder IDs)
4. Citations include knowledge pack file paths and cuid2 IDs for recommendations
5. Offline operation proof: logs show zero external API calls except OpenAI (knowledge pack queries logged as in-memory cache hits)
6. Log rotation implemented (max 100MB per file, 7-day retention for demo)
7. Structured JSON format for machine parsing
8. Unit tests validate PII redaction works correctly
9. Sample traces included in evaluation report

### Story 3.3: Docker Compose Deployment Package

**As a** developer,
**I want** a docker-compose.yml that starts the entire system with one command,
**so that** PEAK6 evaluators can run the demo without environment setup.

**Acceptance Criteria:**

1. `docker-compose.yml` defines services: frontend (port 3000), backend (port 7070)
2. Knowledge pack mounted as external volume for easy updates
3. Environment variables configured via `.env` file (with `.env.example` template)
4. `docker compose up` starts all services and loads knowledge pack
5. Health checks implemented for both services
6. README includes Docker setup instructions and troubleshooting
7. Build optimization: images use multi-stage builds for smaller size
8. Logs accessible via `docker compose logs`
9. One-command teardown: `docker compose down`
10. Validated on macOS, Linux, and Windows (WSL2)

### Story 3.4: Integration Testing & CI/CD

**As a** developer,
**I want** automated integration tests and CI/CD pipeline,
**so that** code quality is maintained throughout development.

**Acceptance Criteria:**

1. Integration tests cover critical API flows: `/api/intake/message`, `/api/policy/analyze`, `/api/intake/generate-prefill`
2. Tests validate end-to-end workflows: conversational intake → routing → pre-fill, policy upload → analysis → savings pitch
3. Bun test runner executes unit + integration tests
4. GitHub Actions CI pipeline runs on pull requests: type-check, lint, unit tests, integration tests
5. CI fails if tests don't pass or if code coverage drops below threshold (80%)
6. Integration tests use synthetic test data (no real PII)
7. Mocked LLM responses for deterministic CI testing
8. Test execution time <2 minutes for fast feedback

### Story 3.5: Documentation & Demo Preparation

**As a** developer,
**I want** comprehensive documentation for PEAK6 evaluators,
**so that** they can understand architecture, run the demo, and evaluate results.

**Acceptance Criteria:**

1. README updated with: project overview, architecture summary, setup instructions (Docker + local), demo scenarios, evaluation harness usage
2. Architecture documentation links to `docs/architecture/` for technical details
3. Demo script provided: step-by-step walkthrough of conversational intake and policy analysis workflows with sample inputs
4. Troubleshooting guide for common issues (API key missing, Docker not running, etc.)
5. Limitations documented: 3 carriers, 5 states, synthetic data only, no production deployment
6. Decision log of key trade-offs included in deliverables
7. Evaluation report generation documented (how to read metrics)
8. Video recording or animated GIF walkthrough of key workflows (optional, time permitting)

---

## Next Steps

### Demo Script (Example Scenarios)

Based on PEAK6 evaluation criteria, the following demo scenarios should be prepared:

**Scenario 1: Conversational Intake - Complete Flow (California Auto Insurance)**
1. Broker starts chat, types: "Client is John Smith in California, needs auto insurance"
2. System extracts state (CA), product (Auto), routes to available carriers
3. Broker uses key-value shortcuts: `k:2` (2 kids), `v:2` (2 vehicles), `drivers:3`
4. System shows missing critical fields in sidebar (VINs, driver ages, driving records)
5. Broker completes conversation with natural language + shortcuts
6. Broker presses `Ctrl+X E` to export pre-fill packet
7. System generates JSON with routing decision (e.g., "StateFarm CA Auto"), missing fields checklist, CA auto disclaimers
8. **Validation:** Routing accuracy ≥90%, intake completeness ≥95%, 100% compliance (CA disclaimers present)

**Scenario 2: Policy Analysis - Savings Pitch (Florida Home Insurance)**
1. Broker drags PDF declarations page into policy upload panel
2. System extracts: Carrier=Allstate, State=FL, Product=Home, Premium=$2400/yr, Deductible=$1000
3. System analyzes against knowledge pack, identifies:
   - Eligible discount: Hurricane shutters (not applied) - saves $180/yr
   - Bundle opportunity: Add auto for 15% multi-policy discount - saves $360/yr
   - Deductible trade-off: Raise to $2500 - saves $240/yr
4. Savings pitch dashboard shows opportunities ranked by impact with citations
5. Broker presses `Ctrl+X S` to export savings pitch JSON
6. System generates structured pitch with FL home disclaimers
7. **Validation:** Savings pitch clarity ≥85%, 100% compliance (FL disclaimers present), knowledge pack citations included

**Scenario 3: Compliance Validation - Prohibited Statement Handling**
1. Broker attempts to send message containing prohibited statement (e.g., "Guaranteed lowest price")
2. System blocks message, displays licensed-agent handoff message
3. **Validation:** 100% compliance enforcement (prohibited statement filtered)

**Scenario 4: Offline Operation Proof**
1. Disable network access (except OpenAI API)
2. Run conversational intake flow
3. Review decision trace logs showing knowledge pack queries as in-memory cache hits (zero external web calls)
4. **Validation:** Offline guarantee (0 runtime web calls besides LLM)

**Scenario 5: Evaluation Harness Execution**
1. Run `bun run evaluate` command
2. System executes 15 synthetic test cases (10 conversational, 5 policy)
3. Generate report with metrics:
   - Routing accuracy: X% (target ≥90%)
   - Intake completeness: Y% (target ≥95%)
   - Savings pitch clarity: Z% (target ≥85%)
   - Compliance: 100% (target 100%)
4. Report includes LLM token usage, sample decision traces
5. **Validation:** All target metrics met

### UX Expert Prompt

Review the **User Interface Design Goals** section above and create detailed UI specifications for the IQuote Pro integrated home screen. Prioritize:

1. **Dark mode design system** (default theme with light mode toggle) - define color palette, component tokens, and contrast ratios
2. **Emacs keyboard shortcuts** - design visual feedback for multi-keystroke combinations (Ctrl+X Ctrl+C, Ctrl+K, etc.) and modal popup UI patterns
3. **Field-specific modals** - specify modal dimensions, animations, and field injection behavior for structured data capture
4. **Key-value syntax highlighting** - design inline syntax highlighting for `kids:3`, `k:3`, `deps:4` patterns in chat interface
5. **Real-time field capture sidebar** - design layout for missing fields display and adaptive compliance disclaimers

**Critical constraint:** The AI must be invisible. **No chatbot interface, no "AI: ..." message bubbles, no AI asking questions.** The broker types naturally or uses key-value syntax, and extraction happens silently in the background. The sidebar shows captured fields, but the chat panel never contains AI responses—only broker input and optional system notifications (e.g., "✓ Field captured: Kids = 2"). The interface is a note-taking tool with intelligent background extraction, NOT a conversational assistant.

Reference Sarah Chen's persona (power-user broker) and ensure all UI patterns optimize for speed during live client calls. Deliverable should be Figma mockups or detailed component specifications ready for developer handoff.

### Architect Prompt

The architect should review this PRD alongside the comprehensive architecture documentation in [docs/architecture/](docs/architecture/) and proceed with implementation planning. Key focus areas:

1. **Validate Tech Stack** - Confirm all specified technologies (Hono, TanStack, shadcn/ui) are appropriate
2. **Knowledge Pack Schema Design** - Define JSON structure for carriers, states, products, discounts, eligibility rules
3. **Hybrid Extraction Implementation** - Design key-value parser (regex patterns for kids:3, k:3 syntax) + LLM fallback logic
4. **Routing Rules Engine** - Implement deterministic eligibility evaluation without LLM
5. **Compliance Filter** - Design state/product-aware disclaimer selection and prohibited statement detection
6. **Adaptive UI Components** - Implement Emacs shortcuts, modal popups, real-time field capture sidebar
7. **Decision Trace Logging** - Design structured logging with PII redaction and knowledge pack citations
8. **Docker Deployment** - Create docker-compose.yml with knowledge pack volume mount

The system architecture should follow the hybrid LLM + deterministic rules pattern documented in [docs/architecture/2-high-level-architecture.md](docs/architecture/2-high-level-architecture.md). All implementation decisions should prioritize the 5-day timeline while maintaining production-quality code standards.

---
