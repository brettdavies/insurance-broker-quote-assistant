# 3. Tech Stack

**⚠️ CRITICAL:** This is the DEFINITIVE technology selection for the entire project. This table is the single source of truth - all development must use these exact versions.

**Timeline Context:** 5-day interview project for PEAK6. NO SCOPE CREEP - stick to spec requirements only.

## 3.1 Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Package Manager** | Bun | ^1.3 (1.3.1+) | Monorepo workspaces, dependency installation, dev server with React HMR | 10-20x faster than npm, native TypeScript, built-in test runner, React Fast Refresh |
| **Frontend Language** | TypeScript | ^5.6 | Type-safe frontend development | Shared language with backend, strict null checks, excellent IDE support |
| **Frontend Framework** | React | ^18.2 | UI component library | Industry standard, excellent TypeScript support, large ecosystem (React 19 not needed for 5-day demo) |
| **Frontend Router** | TanStack Router | ^1.0 | Type-safe routing | Better TypeScript inference than React Router, built-in data loading |
| **Data Fetching** | TanStack Query | ^5.0 | Server state management | Automatic caching, refetching, optimistic updates for API calls |
| **Dev Tools (Frontend)** | @tanstack/react-query-devtools | ^5.0 | TanStack Query inspection and debugging | Visualizes queries/mutations, cache state, network activity; pairs with Chrome DevTools MCP for browser automation during troubleshooting |
| **Form Management** | TanStack Form | ^0.36 | Type-safe forms with Zod validation | Framework-agnostic, first-class Zod integration, excellent DX |
| **UI Component Library** | shadcn/ui | Latest | Pre-built accessible components | Copy-paste components (not NPM dependency), built on Radix UI, fully customizable |
| **CSS Framework** | Tailwind CSS | ^3.4 | Utility-first styling | Rapid styling, consistent design system, excellent with shadcn |
| **State Management** | TanStack Query + React Context | - | Client/server state separation | TanStack Query for server state, Context for UI state (minimal global state needed) |
| **Frontend Utilities** | es-toolkit | Latest | Lodash alternative | Smaller bundle size, modern ES features, TypeScript-first, better tree-shaking |
| **Validation** | Zod | ^3.23 | Runtime type validation | Schema-first validation, TypeScript inference, works with TanStack Form |
| **Backend Language** | TypeScript | ^5.6 | Type-safe backend development | Share types with frontend, better than JavaScript for rules engines |
| **Backend Framework** | Hono | ^4.0 | Lightweight web framework | Ultra-fast, edge-compatible, excellent TypeScript support, simpler than Express |
| **Backend Dev Server** | Hono CLI | Built-in | Local API testing without server | AI-friendly (`hono request`, `hono docs`), fast dev workflow |
| **API Style** | REST JSON | - | Simple request/response API | Straightforward for this use case, no need for GraphQL complexity |
| **LLM Integration** | OpenAI Node SDK | ^4.0 | GPT-4o/GPT-4o-mini API calls | Official SDK, structured outputs support, JSON mode |
| **Database** | JSON Files (Filesystem) | - | Knowledge pack storage | Spec requires offline operation, simplest for 5-day timeline |
| **Cache** | In-Memory (Map) | - | Knowledge pack loaded by RAG | Loaded at startup (async, non-blocking) into memory Maps for fast O(1) queries |
| **File Storage** | Local Filesystem | - | Knowledge pack JSON files | Meets offline requirement, easy to version control |
| **Authentication** | None (Demo) | - | Out of scope for PEAK6 demo | Not required by spec, focus on core functionality |
| **Testing (Unit)** | Bun test | Bun 1.3+ | API + Frontend unit tests | Built-in to Bun, Jest-compatible API, faster than Vitest |
| **Testing (Integration)** | Bun test | Bun 1.3+ | API integration tests | Same test runner, tests multiple components together |
| **Testing Utilities** | @testing-library/react | Latest | Component testing | User-centric tests, works with Bun test |
| **Testing (E2E)** | None (Skipped) | - | Out of scope for 5-day demo | Focus on unit + integration tests only |
| **Build Tool (Backend)** | Bun build | Bun 1.3+ | Bundle backend if needed | Built-in bundler, ESM + CJS output, tree-shakeable (optional for demo) |
| **Linting & Formatting (General)** | Biome | ^1.9 | Linting + formatting for most files | Rust-based, 25x faster than ESLint, handles TS/JS/JSON |
| **Formatting (React Components)** | Prettier + prettier-plugin-tailwindcss | ^3.0 / ^0.5 | React component formatting with Tailwind class sorting | Sorts Tailwind classes (Biome doesn't support Tailwind yet - [GitHub #1274](https://github.com/biomejs/biome/issues/1274)) |
| **Type Checking** | TypeScript strict mode | 5.6+ | All packages | `strict: true`, `noUncheckedIndexedAccess: true` |
| **Git Hooks** | Husky | ^9.0 | Pre-commit checks | Type check + lint + format before commit (may be no-op if Biome configured correctly) |
| **CI/CD** | GitHub Actions | - | Automated testing | Free for public repos, simple YAML config |
| **Logging (Program)** | Hono Logger Middleware + Custom | - | Request/response + debug logs | Console + file output, structured JSON |
| **Logging (Compliance)** | Custom File Logger | - | Compliance audit trail | Separate log files for regulatory compliance, includes decision traces |
| **Error Notifications** | React Toast (shadcn) | - | Real-time error display to broker | Centralized toast notifications for user-facing errors |
| **Error Handling** | Custom Error Handler + Boundaries | - | Global error handling | Backend error handler middleware + React error boundaries |

---

## 3.2 Critical Configuration

**Root Workspace (package.json):**
- Monorepo workspace pattern: `"workspaces": ["apps/*", "packages/*"]`
- Bun scripts for multi-package orchestration: `bun run --filter '*' dev`, `bun run --filter '*' build`

**TypeScript (tsconfig.json):**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

**Frontend Build (Bun):**
- Dev server: `bun --hot run apps/web` (defaults to `localhost:3000`)
- React Fast Refresh: Built-in HMR with instant updates
- Build output: `dist/` (via `bun build` if needed)
- No configuration file needed: Zero-config setup for React + TypeScript

**React Configuration (apps/web/src/main.tsx):**
```typescript
// ❌ DON'T wrap app in StrictMode for this demo
// Reason: StrictMode double-renders components to catch side effects,
// but this increases LLM API costs during development (2x API calls).
// For a 5-day demo with limited budget, disable to reduce costs.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />  // No <React.StrictMode> wrapper
)
```

**Backend Dev Server:**
- Use `hono serve apps/api/src/index.ts` for local development (defaults to port 7070)
- Use `hono request` for testing without starting server (AI-friendly)
- See `.claude/rules/hono.md` for complete Hono CLI usage

**Environment Variables:**
```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
NODE_ENV=development
API_PORT=7070
FRONTEND_PORT=3000
LOG_LEVEL=info

# Logging
PROGRAM_LOG_FILE=./logs/program.log
COMPLIANCE_LOG_FILE=./logs/compliance.log
```

**Logging Strategy:**

Two separate log streams for different purposes:

1. **Program Logs** (`logs/program.log`):
   - Request/response logging (Hono middleware)
   - Debug information
   - Performance metrics
   - LLM token usage
   - Output: Console (dev) + File (always)

2. **Compliance/Audit Logs** (`logs/compliance.log`):
   - Decision traces (inputs → rules consulted → outputs)
   - Compliance filter results (prohibited statements caught)
   - Routing decisions with citations
   - Discount calculations with knowledge pack references
   - Output: File only (compliance audit trail)

3. **User-Facing Errors**:
   - Real-time toast notifications (shadcn Toast component)
   - Centralized error handler wraps all API calls
   - React error boundaries catch component errors

**Log Format (JSON):**
```typescript
// Program log
{
  "level": "info",
  "timestamp": "2025-11-05T10:30:00Z",
  "type": "request",
  "method": "POST",
  "path": "/api/intake",
  "duration_ms": 1234,
  "status": 200
}

// Compliance log
{
  "timestamp": "2025-11-05T10:30:00Z",
  "type": "decision_trace",
  "flow": "conversational",
  "session_id": "sess_abc123",
  "inputs": { "message": "I need auto insurance in CA" },
  "extraction": { "state": "CA", "product": "auto" },
  "routing_decision": {
    "carrier": "GEICO",
    "eligible_carriers": ["GEICO", "Progressive", "State Farm"],
    "citations": [
      { "file": "knowledge_pack/carriers/geico.json", "line": 12 }
    ]
  },
  "compliance_check": {
    "passed": true,
    "violations": [],
    "disclaimers_added": 3
  }
}
```

---

## 3.3 Detailed Rationale for Key Choices

**1. Bun over npm**
- **Speed:** 10-20x faster installs, hot reloading, test execution
- **Simplicity:** Built-in test runner (no Vitest/Jest config), native TypeScript, React HMR with Fast Refresh
- **Trade-off:** Newer ecosystem (1.3.1+ stable), but 5-day demo acceptable
- **React HMR:** Bun 1.3+ includes native React Fast Refresh support via `bun --hot` flag

**2. React 18.2 (not React 19)**
- **Rationale:** React 19 offers compiler/actions, but unnecessary for 5-day demo
- **Trade-off:** None - React 18 is stable and sufficient for this scope
- **Decision:** Avoid bleeding-edge for interview project stability

**3. TanStack Form over React Hook Form**
- **Key advantage:** First-class Zod integration, framework-agnostic
- **Better DX:** Type inference from Zod schemas, less boilerplate
- **Trade-off:** Smaller ecosystem than RHF, but active development

**4. Hybrid Biome + Prettier (Non-Standard Decision)**
- **Biome for most files:** Written in Rust, 25x faster than ESLint, handles linting + formatting for TS/JS/JSON
- **Prettier for React components only:** Required for Tailwind CSS class sorting via prettier-plugin-tailwindcss
- **Why hybrid:** Biome doesn't support Tailwind class sorting yet ([GitHub issue #1274](https://github.com/biomejs/biome/issues/1274))
- **Configuration:** Biome excludes .tsx/.jsx from formatting via `formatter.includes: ["**", "!**/*.tsx", "!**/*.jsx"]`, Prettier handles only React components
- **Settings consistency:** Both tools configured with matching rules (single quotes, no semis, 2-space indent, 100 char width)
- **Trade-off:** Two tools instead of one, but necessary for Tailwind developer experience

**5. Hono over Express**
- **Performance:** Ultra-fast routing, minimal overhead
- **TypeScript:** Built for TypeScript (not retrofitted)
- **Spec alignment:** Required `hono CLI` for AI-friendly dev workflow
- **Trade-off:** Smaller ecosystem than Express, but simpler for demo

**6. JSON Files over Database**
- **Spec requirement:** "Offline guarantee" - no runtime database calls
- **Simplicity:** Fastest setup for 5-day timeline
- **Trade-off:** Not scalable, but demo doesn't need to scale

**7. Bun test over Vitest**
- **Speed:** Native test runner, no separate tool
- **Simplicity:** Jest-compatible API, works out of box
- **Trade-off:** Less mature than Jest/Vitest, but stable for demo

---

## 3.4 Key Success Factors

**✅ DO:**
- Use Bun for all package management (`bun install`, `bun run dev`)
- Use `hono serve` for backend dev server (see CLAUDE.md)
- Use `hono request` for testing API without starting server
- Use TanStack Form with Zod for all forms
- Use Biome for linting + formatting non-React files (add `biome.json` config)
- Use Prettier with prettier-plugin-tailwindcss for React components only (add `.prettierrc` config)
- Use Husky for pre-commit hooks (`typecheck` → `lint` → `format:check`)
- Use `bun test` for all unit tests
- Stick to spec requirements - NO SCOPE CREEP

**❌ DON'T:**
- Don't use npm (use Bun for speed)
- Don't use React Hook Form (use TanStack Form)
- Don't use ESLint (use Biome for linting)
- Don't format React components with Biome (use Prettier with Tailwind plugin)
- Don't use Vitest or Jest (use `bun test`)
- Don't write E2E tests (only unit + integration)
- Don't use OpenAPI generation (use Zod for types)
- Don't enable React StrictMode (disable double-rendering)
- Don't add authentication (out of scope for demo)
- Don't add database (use JSON files per spec)
- Don't add features not in spec (focus on 90% routing, 95% intake, 100% compliance)

---

## 3.5 Hono CLI Usage (AI-Friendly Development)

**Reference:** See `.claude/rules/hono.md` for complete guide

**Core Commands:**
```bash
# Search Hono documentation
hono search middleware
hono search "getting started"

# View documentation
hono docs /docs/api/routing
hono docs /docs/api/context

# Test API without starting server (AI-friendly!)
hono request -P /api/intake -X POST -d '{"message":"I need auto insurance in CA"}' apps/api/src/index.ts

# Start dev server
hono serve apps/api/src/index.ts
```

**Why This Matters:**
- Enables testing API during development without `npm run dev`
- AI agents can test implementations autonomously
- Faster feedback loop than starting full server

---
