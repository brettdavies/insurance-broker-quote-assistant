# 12. Unified Project Structure

**Monorepo Organization:** Bun workspaces with clear separation between applications, shared packages, and data.

**Top-Level Structure:**

```
insurance-broker-quote-assistant/
├── apps/                                    # Deployable applications
│   ├── web/                                 # Frontend React app (@repo/web, port 3000)
│   └── api/                                 # Backend Hono API (@repo/api, port 7070)
├── packages/                                # Shared packages
│   └── shared/                              # Shared types, schemas, utilities (@repo/shared)
├── knowledge_pack/                          # Insurance data (JSON files)
│   ├── carriers/                            # 3 carrier files (GEICO, Progressive, State Farm)
│   ├── states/                              # 5 state files (CA, TX, FL, NY, IL)
│   ├── products/                            # 4 product files (auto, home, renters, umbrella)
│   ├── schemas/                             # JSON schemas (5 files)
│   ├── disclaimers.json                     # Compliance disclaimers
│   └── prohibited-phrases.json              # Compliance filter
├── evaluation/                              # E2E testing framework (15 test cases)
│   ├── test-cases/                          # 10 conversational + 5 policy tests
│   ├── services/                            # Test services (test-runner, metrics, reports)
│   ├── templates/                           # Report templates
│   └── result/                              # Generated reports (JSON + Markdown)
├── docs/                                    # Architecture documentation (20+ files)
│   └── architecture/                        # Architecture docs
├── logs/                                    # Runtime logs
│   ├── program.log                          # Application logs
│   └── compliance.log                       # Compliance events
├── .github/workflows/                       # CI/CD pipelines
│   ├── ci.yml                               # Main CI
│   ├── protect-main.yml
│   └── protect-development.yml
├── package.json                             # Root workspace config
├── tsconfig.json                            # Base TypeScript config
├── biome.json                               # Linting rules
├── bunfig.toml                              # Bun test config
├── .prettierrc                              # Prettier config
└── .env.example                             # Environment template
```

**Key Design Decisions:**

**Why Monorepo:**

- **Shared types:** Frontend/backend share types from `@repo/shared` without publishing to npm
- **Single bun install:** All dependencies installed with one command
- **Atomic changes:** Update API + frontend types in single commit
- **Simpler than micro-repos:** For 5-day timeline, one repo easier than coordinating multiple

**Why This Structure:**

- **apps/ for deployables:** Clear separation between what gets deployed vs what's shared
- **packages/ for shared code:** Types, constants, utilities used by both apps
- **knowledge_pack/ at root:** Data is separate from code, easy to update without touching application code
- **evaluation/ at root:** Test cases are first-class, not buried in apps/api/tests/

**Workspace Configuration (Root package.json):**

```json
{
  "name": "insurance-broker-quote-assistant",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "build": "bun run --filter '*' build",
    "test": "bun test"
  }
}
```

**Why Bun Workspaces:**

- **10-20x faster than npm:** Package installation and script execution
- **Native TypeScript:** No build step for scripts
- **Built-in test runner:** `bun test` replaces Jest/Vitest
- **Workspace filtering:** `--filter` flag runs scripts in specific packages

## 12.2 Detailed Source Tree

### Frontend Structure (apps/web/)

```
apps/web/
├── src/
│   ├── components/                          # React components (82 files)
│   │   ├── intake/                          # Chat interface (7 components)
│   │   │   └── UnifiedChatInterface.tsx     # Master component
│   │   ├── notes/                           # Lexical editor (6 components + plugins)
│   │   │   ├── NotesPanel.tsx
│   │   │   └── plugins/                     # PillExtraction, FieldInjection, etc.
│   │   ├── sidebar/                         # Status panels (8 components)
│   │   │   ├── CapturedFields.tsx
│   │   │   ├── MissingFields.tsx
│   │   │   ├── RoutingStatus.tsx
│   │   │   └── SavingsDashboard.tsx
│   │   ├── shortcuts/                       # Field modals (5 components)
│   │   │   └── FieldModal.tsx               # Multi-modal field editor
│   │   ├── policy/                          # Policy upload (3 components)
│   │   ├── layout/                          # App shell (5 components)
│   │   ├── shared/                          # Reusables (10 components)
│   │   └── ui/                              # Radix UI wrappers (15 components)
│   ├── hooks/                               # Custom hooks (30+ hooks)
│   │   ├── useUnifiedChatHooks.ts           # Hook composition
│   │   ├── useIntake.ts                     # Intake mutation
│   │   └── __tests__/                       # Hook tests
│   ├── lib/                                 # Utilities
│   │   ├── api-client.ts                    # Hono RPC client
│   │   ├── field-extraction.ts              # Frontend extraction (shared engine)
│   │   ├── compliance-utils.ts              # Compliance helpers
│   │   └── suppression-manager.ts           # Suppression list manager
│   ├── routes/                              # TanStack Router routes
│   │   ├── __root.tsx                       # Root layout
│   │   └── index.tsx                        # Home route
│   ├── config/                              # Configuration
│   │   └── shortcuts.ts                     # Field metadata (legacy, use unified-field-metadata)
│   ├── constants/                           # Constants
│   ├── utils/                               # Helper utilities
│   ├── main.tsx                             # App entry
│   ├── App.tsx                              # Root component
│   └── index.css                            # Global styles
├── build.ts                                 # Custom build script
├── tailwind.config.js                       # Tailwind theme
├── postcss.config.js                        # PostCSS config
├── tsconfig.json                            # TypeScript config
└── package.json                             # Dependencies
```

### Backend Structure (apps/api/)

```
apps/api/
├── src/
│   ├── routes/                              # API endpoints (7 route files)
│   │   ├── __tests__/                       # Route tests (unit, integration, contract)
│   │   ├── intake/                          # Intake flow
│   │   │   ├── handlers/                    # Request handlers
│   │   │   └── intake.ts                    # POST /api/intake
│   │   ├── policy/                          # Policy flow
│   │   │   ├── handlers/                    # Policy handlers
│   │   │   ├── policy.ts                    # Policy endpoints
│   │   │   └── upload-handler.ts            # File upload handler
│   │   ├── prefill.ts                       # Prefill generation
│   │   ├── routing.ts                       # Routing endpoint
│   │   ├── knowledge-pack.ts                # KB queries
│   │   ├── disclaimers.ts                   # Disclaimers
│   │   └── log.ts                           # Logging
│   ├── services/                            # Business logic (88 files)
│   │   ├── __tests__/                       # Service unit tests
│   │   ├── conversational-extractor.ts      # LLM extraction (hybrid)
│   │   ├── policy-analysis-agent.ts         # Policy analysis
│   │   ├── pitch-generator.ts               # Pitch generation
│   │   ├── routing-engine.ts                # Carrier routing
│   │   ├── discount-engine.ts               # Discount matching
│   │   ├── compliance-filter.ts             # Compliance validation
│   │   ├── knowledge-pack-loader.ts         # KB initialization
│   │   ├── knowledge-pack-rag.ts            # KB queries
│   │   ├── gemini-provider.ts               # Gemini LLM
│   │   ├── llm-provider.ts                  # LLM interface
│   │   ├── initialization.ts                # Service setup
│   │   ├── gemini/                          # Gemini helpers (7 files)
│   │   ├── pitch-generator/                 # Pitch helpers (4 files)
│   │   ├── policy-analysis-agent/           # Policy helpers (5 files)
│   │   ├── routing/                         # Routing helpers (10 files)
│   │   │   ├── eligibility/                 # 5 evaluators
│   │   │   ├── match-scorer.ts
│   │   │   └── carrier-ranker.ts
│   │   ├── discount-engine/                 # Discount helpers (15 files)
│   │   │   ├── evaluators/                  # Base, single-product, bundle
│   │   │   ├── requirements/                # Requirement checkers
│   │   │   └── bundle-analyzer.ts
│   │   └── extractors/                      # Extraction helpers (8 files)
│   ├── middleware/
│   │   ├── setup.ts                         # CORS, error handler
│   │   └── error-handler.ts                 # Global error handling
│   ├── prompts/                             # LLM prompts
│   │   ├── conversational-extraction-system.txt
│   │   └── conversational-extraction-user.txt
│   ├── config/
│   │   └── env.ts                           # Environment config
│   ├── utils/                               # Utilities
│   │   ├── logger.ts                        # Structured logging
│   │   ├── decision-trace.ts                # Audit trail
│   │   └── [other utils]
│   └── index.ts                             # Hono app setup
├── server.ts                                # Bun server
├── tsconfig.json                            # TypeScript config
└── package.json                             # Dependencies
```

### Shared Package Structure (packages/shared/)

```
packages/shared/
├── src/
│   ├── schemas/                             # Zod schemas (25+ files)
│   │   ├── field-metadata/                  # Field metadata (9 files)
│   │   ├── user-profile.ts
│   │   ├── intake-result.ts                 # Includes ExtractionResult
│   │   ├── policy-analysis-result.ts
│   │   ├── route-decision.ts
│   │   ├── opportunity.ts
│   │   ├── knowledge-pack.ts
│   │   ├── unified-field-metadata.ts        # Single source of truth
│   │   └── [other schemas]
│   ├── constants/                           # Shared constants (7 files)
│   │   ├── compliance.ts
│   │   ├── delimiters.ts
│   │   ├── error-messages.ts
│   │   ├── file-upload.ts
│   │   ├── llm-config.ts
│   │   └── validation.ts
│   ├── services/
│   │   └── inference-engine.ts              # Deterministic inference
│   ├── utils/                               # Shared utilities
│   │   ├── extraction/                      # Field extraction (8 files)
│   │   ├── field-normalization/             # Normalization (3 files)
│   │   ├── missing-fields/                  # Missing field logic (2 files)
│   │   └── pill-parsing/                    # Pill parsers (3 files)
│   ├── extraction-engine/                   # Shared extraction engine
│   │   └── index.ts                         # Extraction orchestrator
│   ├── test-utils/                          # Test helpers (6 files)
│   │   ├── test-targets.ts
│   │   ├── llm-test-factories.ts
│   │   ├── test-data-builders.ts
│   │   └── test-cases.ts
│   ├── config/
│   │   └── text-pattern-inferences.ts       # Pattern rules
│   ├── index/                               # Organized exports
│   │   ├── schemas.ts
│   │   ├── constants.ts
│   │   ├── services.ts
│   │   └── utils.ts
│   └── index.ts                             # Main entry point
├── tsconfig.json
└── package.json
```

## 12.3 File Organization Patterns

**Frontend Organization:**
- **Feature-based components** (`intake/`, `policy/`, `notes/`) - Grouped by user flow
- **Shared UI library** (`ui/` with Radix wrappers) - Reusable components
- **Hook composition** (30+ hooks in `hooks/`) - Composed via `useUnifiedChatHooks()`
- **Colocated tests** (`__tests__/` folders) - Tests next to source files

**Backend Organization:**
- **Route handlers** delegate to services (separation of concerns)
- **Service layer** contains business logic (88 service files)
- **Modular structure** (routing/, discount-engine/, gemini/, etc.) - Feature-based subdirectories
- **Colocated tests** (`__tests__/` in services and routes)

**Shared Package:**
- **Schemas** centralized in `schemas/` - All Zod schemas in one place
- **Constants** organized by domain - Compliance, LLM config, validation, etc.
- **Services** for cross-cutting logic - Inference engine shared by FE/BE
- **Utilities** for reusable helpers - Extraction, normalization, pill parsing

**Naming Conventions:**
- **TypeScript files:** `kebab-case.ts`
- **React components:** `PascalCase.tsx`
- **Test files:** `*.test.ts`, `*.integration.test.tsx`, `*.contract.test.ts`
- **Types/Interfaces:** `PascalCase`
- **Functions:** `camelCase`
- **Constants:** `SCREAMING_SNAKE_CASE`

**Path Aliases:**
- `@repo/shared` - Shared package imports
- `@repo/web` - Web app imports
- `@repo/api` - API app imports
- `@/*` - Local imports within package

**Import Order:**
1. External dependencies (React, Zod, etc.)
2. Internal workspace imports (`@repo/*`)
3. Relative imports (`./`, `../`)

---
