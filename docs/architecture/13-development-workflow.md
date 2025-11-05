# 13. Development Workflow

**Purpose:** Define the development tools and environment configuration that enable rapid iteration on the 5-day timeline.

## 13.1 Development Tools

**What We Use:**
- **Bun:** Package manager, workspace orchestrator, AND frontend dev server (with React HMR)
- **Hono CLI:** Backend dev server via `hono serve` (port 7070)
- **Bun test:** Built-in test runner (Jest-compatible)

**Why Bun for Everything:**
- **Simpler stack:** One tool (Bun) instead of two (Bun + Vite)
- **10-20x faster:** Package installs, dev server startup, test execution
- **Native TypeScript:** Built-in JSX/TSX support, no build step needed
- **React Fast Refresh:** Bun 1.3.1+ includes native React HMR via `bun --hot` flag (instant updates without full page reload)
- **Unified tooling:** Same command structure for frontend/backend/tests

**Development Commands:**
```bash
# Install dependencies (once)
bun install

# Parallel dev (Bun frontend + Hono backend)
bun run dev                   # Starts both on ports 3000 and 7070

# Individual services
bun --hot run apps/web              # Frontend only with hot reload (port 3000)
hono serve apps/api/src/index.ts    # Backend only (port 7070)

# Testing
bun test                      # All workspaces
bun test --filter apps/api    # Specific workspace

# Production build
bun run build
```

**Why This Combination:**
- **Bun workspace filtering:** `--filter` flag targets specific packages without cd-ing
- **Parallel execution:** `bun run dev` starts both apps simultaneously (faster than sequential)
- **Single command development:** Developers don't need to open multiple terminals
- **Hono CLI for backend:** `hono serve` defaults to port 7070, AI-friendly `hono request` for testing

## 13.2 Environment Configuration

**What We Use:**
- Root `.env` file for all environment variables (backend + frontend)
- No special prefix needed (Bun natively supports env vars)
- Environment-specific log paths

**Environment Variables:**
```bash
# Backend + Frontend (.env at root)
OPENAI_API_KEY=sk-...              # Required: OpenAI API key
API_PORT=7070                      # Hono serve port (default)
FRONTEND_PORT=3000                 # Bun dev server port (default)
API_URL=http://localhost:7070      # Backend API URL for frontend
LOG_LEVEL=info                     # Controls program.log verbosity
NODE_ENV=development               # development | production

# Logging paths (configured in code, not .env)
PROGRAM_LOG_FILE=./logs/program.log       # Debug + performance
COMPLIANCE_LOG_FILE=./logs/compliance.log # Audit trail
```

**Why This Structure:**
- **Single .env file:** Simpler than separate frontend/backend config
- **No VITE_ prefix:** Bun doesn't require special prefix for frontend env vars
- **LOG_LEVEL for program.log only:** Compliance log always logs everything (regulatory requirement)
- **Separate log files:** Different audiences (devs read program.log, regulators read compliance.log)

## 13.3 Frontend Troubleshooting with TanStack Query DevTools

**Purpose:** Real-time inspection of TanStack Query state for debugging API calls, cache behavior, and data fetching issues during development.

**Installation:**
```bash
bun add -d @tanstack/react-query-devtools
```

**Setup (Floating Mode - Recommended):**
```typescript
// apps/web/src/main.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app components */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  )
}
```

**What You Can Debug:**
- **Query State:** Inspect query keys, data, status (loading/success/error), timestamps
- **Cache Inspection:** View cached data, stale/fresh status, cache keys
- **Mutations:** Track mutation state, variables, results, retry counts
- **Network Activity:** See which queries are fetching, refetching, or waiting
- **Query Invalidation:** Manually invalidate queries to test refetch behavior

**DevTools Options:**
- `initialIsOpen: false` - Starts minimized (toggle with button)
- `buttonPosition: "bottom-right"` - Position of toggle button
- `position: "bottom"` - Position of devtools panel when open

**MCP Integration (Chrome DevTools):**
When paired with Chrome DevTools MCP server, AI agents can:
1. **Inspect query state** via DevTools panel
2. **Trigger manual refetches** to test stale data behavior
3. **Invalidate specific queries** to debug cache issues
4. **Monitor network requests** alongside TanStack Query state
5. **Take screenshots** of devtools panel for context

**Common Troubleshooting Scenarios:**

**1. API Call Not Triggering:**
- Check query key in devtools - is it correct?
- Verify `enabled` option isn't preventing fetch
- Look for stale cache data being served

**2. Stale Data Displayed:**
- Check `staleTime` and `cacheTime` settings in devtools
- Manually invalidate query to force refetch
- Verify query key includes all dependencies

**3. Mutation Not Updating UI:**
- Check if `onSuccess` callback is invalidating related queries
- Verify optimistic update logic in devtools mutation panel
- Look for race conditions in mutation timeline

**4. Infinite Refetch Loop:**
- Inspect query dependencies in devtools
- Check if query key is changing on every render
- Verify `refetchOnWindowFocus` settings

**Why DevTools for Troubleshooting (Not E2E Testing):**
- **Real-time inspection:** See exactly what TanStack Query is doing during development
- **Manual interventions:** Test edge cases by manually triggering actions
- **AI-friendly:** Chrome DevTools MCP enables automated troubleshooting scripts
- **No E2E overhead:** Faster feedback loop than writing/running E2E tests

**Note:** DevTools are automatically excluded from production builds when `process.env.NODE_ENV === 'production'`.

---
