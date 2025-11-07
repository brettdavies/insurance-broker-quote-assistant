# 14. Deployment Architecture

**Purpose:** Self-hosted Docker deployment with externally mounted knowledge pack for easy knowledge curation and updates.

## 14.1 Deployment Strategy

**What We Use:**
- **Container:** Docker with multi-stage build (frontend + backend in single container)
- **Knowledge Pack:** External volume mount (not bundled with container)
- **Runtime:** Node.js 20+ with Bun installed
- **No cloud services required**

**Why Docker with External Knowledge Pack:**
- **Self-hosted:** PEAK6 runs on their infrastructure, no cloud dependencies
- **Easy knowledge updates:** Update JSON files without rebuilding container (mount `/knowledge_pack` volume)
- **Simple deployment:** Single `docker run` command, no orchestration needed
- **Portable:** Same container runs on any machine with Docker (dev laptops, PEAK6 servers)

**Docker Architecture:**
```dockerfile
# Multi-stage build
# Stage 1: Build frontend + backend
# Stage 2: Production runtime with Bun
# External volume: /knowledge_pack mounted at runtime
```

**Why External Knowledge Pack Mount:**
- **Knowledge curation workflow:** Data team updates JSON files, restart container (no rebuild)
- **Version control separation:** Knowledge pack can have separate git repo if needed
- **Demo flexibility:** PEAK6 judges can modify knowledge pack to test edge cases

## 14.2 CI/CD Pipeline

**What We Use:**
- GitHub Actions for automated testing
- Bun for all commands (install, typecheck, test, lint)
- Parallel jobs for speed (test + lint run simultaneously)

**Why CI/CD for 5-Day Demo:**
- **Quality gates:** Ensures code passes tests before merging
- **Fast feedback:** Parallel jobs complete in ~2 minutes
- **PEAK6 confidence:** Shows production-ready practices, not throwaway demo code

**Pipeline Steps:**
1. Install dependencies with Bun (`bun install`)
2. Type check with TypeScript strict mode (`bun run typecheck`)
3. Run all unit + integration tests (`bun test`)
4. Lint with Biome (`bun run lint`)

## 14.3 Environment Configuration

**What We Support:**
- **Development:** Local (http://localhost:3000 frontend, http://localhost:7070 API)
- **Production:** Docker container with external knowledge pack mount

**Environment Variables for Docker:**
```bash
# Required
OPENAI_API_KEY=sk-...              # OpenAI API key
KNOWLEDGE_PACK_PATH=/knowledge_pack # External mount point

# Optional
NODE_ENV=production
API_PORT=7070
FRONTEND_PORT=3000
LOG_LEVEL=info
```

**Why Simple Environment Strategy:**
- **5-day timeline:** Focus on local dev + production, no staging environment
- **PEAK6 deployment:** Single docker run command with knowledge pack volume
- **Same .env structure:** Local and Docker use identical environment variables

---

## 14.4 Docker Configuration

**Purpose:** One-command setup with `docker compose up` for PEAK6 evaluators, with external knowledge pack volume for data updates without rebuilds.

**What We Provide:**
1. **docker-compose.yml** - Service orchestration for frontend + backend
2. **Dockerfile** - Multi-stage build for optimized production image
3. **External Volume Mount** - Knowledge pack loaded at runtime (not baked into image)
4. **Health Checks** - Readiness validation before demo

**Why Docker Compose:**
- **One-Command Setup:** `docker compose up` starts entire system (no manual service coordination)
- **Knowledge Pack Updates:** External volume allows data changes without container rebuild
- **Offline Guarantee:** No network dependencies except OpenAI API (validated in decision logs)
- **Production Simulation:** Demonstrates deployment readiness despite local-only demo requirement
- **Consistent Environment:** Eliminates "works on my machine" issues for PEAK6 evaluators

---

### 14.4.1 docker-compose.yml Structure

**What Should Be Defined:**

**Services:**
- `frontend` - React app serving at port 3000
  - Depends on: `backend` health check passes
  - Environment: Loads from `.env` file
  - Restart policy: `unless-stopped` (survives crashes during demo)

- `backend` - Hono API serving at port 7070
  - Depends on: Knowledge pack volume mounted
  - Environment: `OPENAI_API_KEY`, `KNOWLEDGE_PACK_PATH=/knowledge_pack`, `NODE_ENV=production`
  - Restart policy: `unless-stopped`

**Volumes:**
```yaml
volumes:
  - ./knowledge_pack:/knowledge_pack:ro  # Read-only external mount
```

**Network:**
- Default bridge network (frontend → backend communication via service names)

**Environment:**
- Load from `.env` file in repo root
- Required: `OPENAI_API_KEY`
- Optional: `NODE_ENV`, `API_PORT`, `FRONTEND_PORT`, `LOG_LEVEL`

**Health Checks:**
- Frontend: `GET /` returns HTTP 200 when React app loaded
- Backend: `GET /api/health` returns JSON with knowledge pack status

**Why External Volume Mount (Not COPY):**
- **Knowledge pack updates after build:** Add new carriers/states without container rebuild
- **Separation of concerns:** Code (immutable container) vs data (mutable knowledge pack)
- **Demo convenience:** Swap knowledge pack files during demo to test edge cases
- **Version control flexibility:** Knowledge pack can live in separate repo if needed

---

### 14.4.2 Multi-Stage Dockerfile Approach

**What Should Be Implemented:**

**Stage 1: Dependencies (Base)**
```dockerfile
FROM oven/bun:1.3 AS deps
WORKDIR /app
COPY package.json bun.lockb ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile
```

**Stage 2: Build (Compile)**
```dockerfile
FROM deps AS build
COPY . .
RUN bun run build  # Builds both frontend and backend
```

**Stage 3: Runtime (Production)**
```dockerfile
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000 7070
CMD ["node", "dist/index.js"]
```

**Why Multi-Stage Build:**
- **Smaller final image:** Stage 3 only includes runtime artifacts, excludes build tools and dev dependencies
- **Faster deployments:** Smaller image = faster pull/push
- **Security:** Production image doesn't include source code or build tooling
- **Layer caching:** Docker caches each stage, rebuilds only what changed

**Image Size Optimization:**
- Expected size: ~200-300MB (Node.js Alpine + compiled artifacts)
- Excludes: TypeScript source (~50MB), dev dependencies (~150MB), git history
- Production-only dependencies in final stage

---

### 14.4.3 Health Check Endpoint Requirements

**What Backends Must Implement:**

**Endpoint:** `GET /api/health`

**Response Format:**
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "knowledgePack": {
    "status": "loaded" | "loading" | "error",
    "entities": {
      "carriers": 3,
      "states": 5,
      "products": 12,
      "discounts": 47
    },
    "loadedAt": "2025-11-06T14:30:00Z"
  },
  "timestamp": "2025-11-06T14:35:00Z"
}
```

**Health Status Logic:**
- **healthy:** Knowledge pack loaded, all entities present
- **degraded:** Knowledge pack loading in progress (acceptable during startup)
- **unhealthy:** Knowledge pack failed to load or missing critical entities

**Why This Endpoint:**
- **Docker Compose depends_on:** Frontend waits for backend `healthy` status before starting
- **Demo validation:** PEAK6 evaluators can verify knowledge pack loaded before demo
- **Offline proof:** Entity counts in health check prove data loaded from local files (not fetched from web)
- **Debugging:** If demo fails, health check shows exactly what's wrong (missing files, parse errors)

**Frontend Health Check:**
- Simple `GET /` returns HTTP 200 if React app rendered
- No custom endpoint needed (static assets served by default)

---

### 14.4.4 One-Command Demo Setup

**What PEAK6 Evaluators Run:**

**Initial Setup:**
```bash
# Clone repo
git clone <repo-url>
cd insurance-broker-docs

# Create .env file (copy from template)
cp .env.example .env
# Edit .env to add OPENAI_API_KEY

# Start everything
docker compose up
```

**Access URLs:**
- Frontend: http://localhost:3000
- Backend: http://localhost:7070
- Health check: http://localhost:7070/api/health

**Teardown:**
```bash
docker compose down
```

**Knowledge Pack Update (Without Rebuild):**
```bash
# Stop containers
docker compose down

# Update knowledge pack files
vi knowledge_pack/carriers/geico.json  # Edit data

# Restart (no rebuild needed!)
docker compose up
```

**Why This Workflow:**
- **Zero configuration:** `.env.example` template includes all required variables with placeholders
- **Single command:** `docker compose up` handles build + start + network setup
- **Fast iteration:** Knowledge pack updates don't require `docker build` (just restart)
- **Clean teardown:** `docker compose down` removes all containers and networks

---

### 14.4.5 Offline Operation Validation

**How to Verify Offline Guarantee:**

1. Start Docker Compose: `docker compose up`
2. Wait for health checks to pass (knowledge pack loaded)
3. Disable network (except localhost loopback):
   ```bash
   # macOS: Disconnect WiFi/Ethernet
   # Linux: sudo iptables -A OUTPUT -p tcp --dport 80 -j REJECT
   ```
4. Run conversational intake flow (submit messages, get responses)
5. Check decision trace logs: `docker compose logs backend | grep "knowledge_pack"`
6. Verify: All knowledge pack queries show `cache_hit: true` (no external HTTP calls)

**Expected Log Output:**
```
[INFO] Knowledge pack query: carrier=GEICO, cache_hit=true, source=memory
[INFO] Knowledge pack query: state=CA, cache_hit=true, source=memory
[INFO] LLM API call: openai.com/v1/chat/completions (ALLOWED - external API)
```

**Why This Validation:**
- **PEAK6 requirement:** System must work offline except for OpenAI API
- **Decision logs prove it:** Every knowledge pack query logged with `cache_hit` flag
- **Network test simulates reality:** Real-world deployments may have restricted network access
- **Confidence for demo:** PEAK6 evaluators see proof system doesn't rely on web scraping

---

**Related Documentation:**
- [Section 3.2 (Logging Strategy)](./3-tech-stack.md#32-logging-strategy) - Decision trace log format
- [Section 6.6 (Knowledge Pack RAG)](./6-components.md#66-knowledge-pack-rag-structured-query) - Startup loading and in-memory caching
- [Section 19.1 (Monitoring)](./19-monitoring-and-observability.md#191-monitoring-strategy) - Health check endpoint details

---
