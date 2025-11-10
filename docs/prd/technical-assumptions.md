# Technical Assumptions

## Repository Structure: **Monorepo**

The project uses a **Bun workspace monorepo** with the structure:
- `apps/web` - React frontend (port 3000)
- `apps/api` - Hono backend (port 7070)
- `packages/shared` - Shared TypeScript types, schemas, and utilities

**Rationale:** Monorepo enables type sharing across frontend/backend, simplifies coordinated changes, and aligns with the 5-day timeline by reducing coordination overhead between separate repos.

## Service Architecture: **Monolith within Monorepo**

Both frontend and backend are **monolithic applications** (not microservices or serverless functions). The backend uses a **hybrid LLM + deterministic rules architecture**:
- **2 LLM Agents:** Conversational Extractor (field extraction) + Pitch Generator (recommendations)
- **3 Rules Engines:** Routing (carrier eligibility) + Discount (savings) + Compliance (regulatory guardrails)
- **Offline Knowledge Pack:** All insurance data in local JSON files loaded at startup into in-memory cache

**Rationale:** Per architecture documentation ([docs/architecture/2-high-level-architecture.md](docs/architecture/2-high-level-architecture.md)), this hybrid approach provides deterministic compliance/routing logic (required for insurance regulations) while maintaining flexible NLP for conversational intake. Monolith simplifies deployment for local demo.

## Testing Requirements: **Unit + Integration (No E2E)**

Testing pyramid prioritizes:
- **Unit tests** using Bun test (Jest-compatible) for core business logic (rules engines, LLM prompt logic)
- **Integration tests** for API endpoints and multi-component workflows
- **Evaluation harness** (`bun run evaluate`) for routing accuracy, intake completeness, and compliance metrics
- **Manual testing** for demo scenarios

**E2E tests explicitly out of scope** for 5-day MVP to focus on functional correctness over browser automation.

**Rationale:** Project spec emphasizes measurable evaluation metrics (90%/95%/85%/100%) delivered through automated harness, not browser-level E2E tests.

## Additional Technical Assumptions and Requests

The following technical decisions are documented in [docs/architecture/3-tech-stack.md](docs/architecture/3-tech-stack.md) and serve as constraints for implementation:

**Core Technology Stack:**
- **Languages:** TypeScript ^5.6 (frontend + backend) with strict mode enabled
- **Frontend:** React 18.2 + TanStack Router + TanStack Query + TanStack Form + Tailwind CSS + shadcn/ui
- **Backend:** Hono 4.0 + OpenAI Node SDK 4.0 for LLM integration
- **Package Manager:** Bun 1.3+ (10-20x faster than npm, native TypeScript support)
- **Validation:** Zod 3.23 for runtime schema validation across frontend/backend
- **Storage:** JSON files on local filesystem (knowledge pack), in-memory Map cache (loaded at startup)
- **Tooling:** Biome 1.9 (linting + formatting for most files) + Prettier 3.0 with prettier-plugin-tailwindcss (React component formatting), Husky 9.0 (pre-commit hooks), GitHub Actions (CI)

**Key Architectural Decisions (Rationale Documented in Architecture):**
- **No database:** JSON files meet offline requirement and simplify 5-day timeline
- **No authentication:** Out of scope for demo per project spec
- **No vector store:** Structured JSON with exact queries faster/more accurate than semantic search for insurance rules
- **React StrictMode disabled:** Reduces LLM API costs during development (prevents double-rendering)
- **Desktop-only UI:** 1024px window size, no mobile/tablet support

## Data Models

The following key data entities are defined in [docs/architecture/4-data-models.md](docs/architecture/4-data-models.md):

- **UserProfile** - Shopper identity, contact info, state, product preferences, household/vehicle/property details
- **Carrier** - Carrier name, supported states, supported products, eligibility rules, discount programs, compensation structure
- **Product** - Product type (Auto/Home/Renters/Umbrella), required fields per product, coverage options, state-specific rules
- **Opportunity** - Savings recommendation with estimated savings, confidence score, required actions, **mandatory cuid2-based citations formatted as industry-standard footnotes** (providing regulatory audit trail and stable references across knowledge pack updates)
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
