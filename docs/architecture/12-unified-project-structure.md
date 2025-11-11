# 12. Unified Project Structure

**Monorepo Organization:** Bun workspaces with clear separation between applications, shared packages, and data.

**Top-Level Structure:**

```
insurance-broker-quote-assistant/
├── apps/                   # Deployable applications
│   ├── web/                # Frontend React SPA (Bun + React 18.2)
│   └── api/                # Backend Hono API (Node.js)
├── packages/               # Shared packages
│   └── shared/             # Shared types, constants, utilities
├── knowledge_pack/         # Offline insurance data (JSON files)
│   ├── carriers/           # 3 carrier files (GEICO, Progressive, State Farm)
│   └── states/             # 5 state requirement files (CA, TX, FL, NY, IL)
├── evaluation/             # PEAK6 test cases + evaluation harness
│   ├── test-cases/         # 15 scenarios (10 conversational + 5 policy)
│   ├── harness.ts          # Automated evaluation runner
│   └── report.md           # Results + success metrics
├── docs/                   # Architecture and decisions
├── .ai/                    # Planning documents (project spec, analysis)
└── logs/                   # Generated at runtime (program.log, compliance.log)
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

---
