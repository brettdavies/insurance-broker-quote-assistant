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

# Linting and Formatting
bun run lint                  # Lint all files with Biome
bun run format                # Format all files (Biome + Prettier)
bun run format:check          # Check formatting without changes (CI)

# Production build
bun run build
```

## 13.2 Pre-QA Checklist

**CRITICAL: Before marking a story "Ready for Review" or handing off to QA, run ALL of the following:**

1. **Linting:** `bun run lint` - Must pass with 0 errors (warnings acceptable)
2. **Formatting:** `bun run format` - Auto-fix formatting issues, then `bun run format:check` to verify
3. **Type Checking:** `bun run type-check` - Must pass with 0 errors
4. **Tests:** `bun test` - All tests must pass
5. **Manual Verification:** Test critical user flows in browser

**When to Run These Checks:**

- **After creating/modifying files:** Run `bun run format` to auto-fix formatting
- **Before marking tasks complete:** Run `bun run lint` and `bun run type-check`
- **As part of Task 15 (Validation and Testing):** Run all checks above
- **Before updating story status to "Ready for Review":** All checks must pass

**Why This Matters:**

- Catches issues early (import ordering, accessibility, type errors)
- Maintains code quality standards across the team
- Prevents accumulation of formatting issues
- Ensures consistent code style (Biome + Prettier hybrid approach)
- Type safety prevents runtime errors

**Why This Combination:**

- **Bun workspace filtering:** `--filter` flag targets specific packages without cd-ing
- **Parallel execution:** `bun run dev` starts both apps simultaneously (faster than sequential)
- **Single command development:** Developers don't need to open multiple terminals
- **Hono CLI for backend:** `hono serve` defaults to port 7070, AI-friendly `hono request` for testing

## 13.3 Environment Configuration
