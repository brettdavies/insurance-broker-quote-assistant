# 14. Deployment Architecture

**Purpose:** Self-hosted Docker deployment with externally mounted knowledge pack for easy knowledge curation and updates.

## 14.1 Current Deployment Setup

**Development:**
- **Frontend:** `bun run dev` on port 3000 (Bun with --hot flag for hot reload)
- **Backend:** `bun run dev` on port 7070 (Bun with --hot flag for hot reload)
- **Concurrent:** `bun run dev` at root (runs both via concurrently package)

**Build Process:**
- **Frontend:** Custom `build.ts` script generates static assets
- **Backend:** `bun build src/index.ts --target node` → `dist/index.js`
- **Monorepo:** `bun run build` builds all workspaces in dependency order

**Environment Variables:**
- `.env.example` provides template
- Required: `GEMINI_API_KEY` (optional for free tier)
- Optional: `GEMINI_MODEL` (defaults to `gemini-2.5-flash-lite`), `NODE_ENV`, `API_PORT`, `FRONTEND_PORT`, `LOG_LEVEL`, log file paths

## 14.2 Deployment Strategy (Recommended)

**For Production Deployment:**

1. **Frontend Deployment Options:**
   - **Vercel** (recommended for Bun + React)
   - **Netlify** (static site hosting)
   - **Cloudflare Pages** (edge deployment)

2. **Backend Deployment Options:**
   - **Fly.io** (Bun-native, recommended)
   - **Railway** (supports Bun)
   - **Render** (Docker-based)

3. **Environment Management:**
   - Use platform environment variables (not .env files)
   - Separate dev/staging/prod environments
   - Store secrets in platform-specific secret managers

4. **CI/CD Pipeline:**
   - Existing GitHub Actions handle tests
   - Add deployment step after tests pass
   - Deploy frontend and backend independently

**Alternative: Docker Deployment (Self-Hosted)**

- **Container:** Docker with multi-stage build (frontend + backend in single container)
- **Knowledge Pack:** External volume mount (not bundled with container)
- **Runtime:** Bun runtime
- **Why Docker:** Self-hosted option for the client's infrastructure, easy knowledge updates via volume mount

**Why External Knowledge Pack Mount:**

- **Knowledge curation workflow:** Data team updates JSON files, restart container (no rebuild)
- **Version control separation:** Knowledge pack can have separate git repo if needed
- **Demo flexibility:** Judges can modify knowledge pack to test edge cases

## 14.3 Infrastructure Tools

**Current Tools:**
- **Runtime:** Bun (JavaScript runtime + package manager)
- **Version Control:** Git with GitHub
- **CI/CD:** GitHub Actions (typecheck, lint, test)
- **Monitoring:** File-based logging (program.log, compliance.log)

## 14.4 Monitoring & Logging

**Current Logging:**
- **Program Log:** All application events → `logs/program.log`
- **Compliance Log:** Compliance → `logs/compliance.log`
- **Structured Logging:** JSON format with metadata

## 14.5 Rollback Strategy

**Current:** Not implemented (development only)

## 14.6 CI/CD Pipeline

**What We Use:**

- GitHub Actions for automated testing
- Bun for all commands (install, typecheck, test, lint)
- Parallel jobs for speed (test + lint run simultaneously)

**Why CI/CD for 5-Day Demo:**

- **Quality gates:** Ensures code passes tests before merging
- **Fast feedback:** Parallel jobs complete in ~2 minutes
- **Confidence:** Shows production-ready practices, not throwaway demo code

**Pipeline Steps:**

1. Install dependencies with Bun (`bun install`)
2. Type check with TypeScript strict mode (`bun run typecheck`)
3. Run all unit + integration tests (`bun test`)
4. Lint with Biome (`bun run lint`)
5. Format check with Biome + Prettier (`bun run format:check`)

## 14.7 Environment Configuration

**What We Support:**

- **Development:** Local (http://localhost:3000 frontend, http://localhost:7070 API)
- **Production:** Docker container with external knowledge pack mount

**Environment Variables for Docker:**

```bash
# Required
GEMINI_API_KEY=...                  # Google Gemini API key (optional for free tier)
KNOWLEDGE_PACK_PATH=/knowledge_pack # External mount point

# Optional
NODE_ENV=production
API_PORT=7070
FRONTEND_PORT=3000
LOG_LEVEL=info
```

**Why Simple Environment Strategy:**

- **5-day timeline:** Focus on local dev + production, no staging environment
- **Deployment:** Single docker run command with knowledge pack volume
- **Same .env structure:** Local and Docker use identical environment variables

---
