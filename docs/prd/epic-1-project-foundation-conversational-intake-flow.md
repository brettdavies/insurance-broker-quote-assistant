# Epic 1: Project Foundation & Conversational Intake Flow

**Epic Goal:** Establish a working monorepo with CI/CD, basic UI infrastructure, and a fully functional conversational intake workflow. By the end of this epic, a broker can start a chat session, discuss shopper needs in natural language, have the system extract quote essentials and route to the appropriate carrier/state/product, see adaptive compliance disclaimers, and receive a downloadable IQuote Pro pre-fill packet. This epic delivers the first complete vertical slice of end-to-end value.

## Story 1.1: Monorepo Setup & Development Infrastructure

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

## Story 1.2: Integrated Home Screen with Dual Workflow Interface

**As a** broker,
**I want** a single home screen where I can immediately start conversational intake or upload a policy without extra navigation,
**so that** I can maximize efficiency during client interactions by eliminating unnecessary clicks.

**Acceptance Criteria:**

1. React 18.2 app renders at `localhost:3000` with Tailwind CSS styling, dark mode as default, and professional financial services aesthetic
2. Home screen displays integrated interface with two sections: (1) chat panel for conversational intake on left/center, (2) policy upload drop zone on right/sidebar
3. Chat interface is immediately usable - broker can start typing without clicking "Start" button
4. Policy upload panel accepts drag-and-drop PDF or manual data entry without navigation
5. Slash command shortcuts for rapid data entry: field shortcuts like `/k` (kids), `/v` (vehicles), `/n` (name); action shortcuts like `/export`, `/copy`, `/reset`; mode switching with `/policy` and `/intake`; help with `/help` or `/?`
6. Field-specific shortcuts open focused modals: `/k` → modal "How many kids?" → type number → Enter → injects `k:5` into chat
7. See [keyboard-shortcuts-reference.md](../keyboard-shortcuts-reference.md) for complete list of 27 field + 6 action shortcuts
8. TanStack Router configured with single route `/` (no separate intake/analysis routes)
9. Desktop-only responsive design tested at 1024px window width
10. shadcn/ui components integrated with dark mode theming
11. **Dark mode enabled as default theme** with light mode toggle
12. Keyboard shortcuts browser accessible via `/help` or `/?` for discoverability

## Story 1.3: Knowledge Pack Loader & In-Memory Cache

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

## Story 1.4: Real-Time Chat Interface with Live Field Capture Sidebar

**As a** broker,
**I want** a chat interface that shows me exactly what shopper data has been captured in real-time,
**so that** I can track progress and identify missing information during client calls.

**Acceptance Criteria:**

1. Chat panel displays conversation history with clear visual distinction between broker and AI messages (dark mode as default)
2. Right sidebar shows live captured fields organized by category: Identity (name, contact), Location (state), Product (type), Details (household/vehicles/property)
3. Missing required fields highlighted with red indicator and field name (e.g., "State: MISSING")
4. Captured fields update in real-time as conversation progresses (optimistic UI updates)
5. Slash command shortcuts: field shortcuts like `/k` (kids), `/d` (dependents), `/v` (vehicles); action shortcuts like `/export`, `/copy`, `/reset`; help with `/help` or `/?`
6. Direct key-value syntax support: broker can type `kids:3`, `k:3`, `deps:4`, `car:garage` in chat and system extracts as structured fields
7. Field-specific modals: shortcuts like `/k` open focused modal ("How many kids?") → broker types value → Enter → injects formatted key-value (e.g., `k:5`) into chat
8. See [keyboard-shortcuts-reference.md](../keyboard-shortcuts-reference.md) for complete shortcuts list
9. TanStack Query manages chat state with automatic refetching and cache invalidation
10. Adaptive compliance disclaimers displayed in chat based on discovered state and product (e.g., CA Auto disclaimer different from FL Home)
11. No auto-generated broker prompts - broker controls conversation, system only shows missing fields
12. Professional dark mode styling with monospace font for data fields and key-value syntax highlighting
13. Key-value pairs visually distinct in chat (e.g., syntax highlighting for `k:5`, `deps:4`)
14. **Chat panel displays ONLY broker input** - AI extraction is invisible (no "AI: ..." message bubbles, no chatbot dialogue)

## Story 1.5: Conversational Extractor (LLM Agent for Field Extraction)

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

## Story 1.6: Routing Rules Engine (Carrier/State/Product Eligibility)

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

## Story 1.7: Adaptive Compliance Filter (State/Product-Aware Guardrails)

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

## Story 1.8: Pre-Fill Packet Generation & Hyper-Efficient Export

**As a** broker,
**I want** to instantly export captured shopper data with a single keyboard shortcut,
**so that** I can seamlessly hand off qualified leads to licensed agents without interrupting client flow.

**Acceptance Criteria:**

1. POST `/api/intake/generate-prefill` endpoint generates IQuote Pro pre-fill packet stub
2. Pre-fill packet includes: shopper identity, state, product type, routing decision, captured details, missing fields checklist, timestamp
3. Missing fields clearly flagged in pre-fill packet with red indicators
4. Lead handoff summary includes next steps for licensed agent with state/product-specific guidance
5. Required disclaimers embedded in pre-fill packet based on state and product
6. Slash command `/export` triggers instant export (no modal confirmation - speed over safety for demo)
7. "Download JSON" exports pre-fill packet to filesystem with auto-generated filename (e.g., `prefill_john_doe_CA_auto_20251106.json`)
8. Slash command `/copy` copies entire pre-fill packet JSON to clipboard for pasting
9. See [keyboard-shortcuts-reference.md](../keyboard-shortcuts-reference.md) for complete shortcuts list
10. Zod schema validation ensures pre-fill packet matches documented stub format
11. Decision trace logged for pre-fill generation

## Story 1.9: Real-Time Missing Fields Detection & Visual Indicators

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
