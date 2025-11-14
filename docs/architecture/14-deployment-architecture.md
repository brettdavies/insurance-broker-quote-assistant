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
5. Format check with Biome + Prettier (`bun run format:check`)

## 14.3 Environment Configuration

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
- **PEAK6 deployment:** Single docker run command with knowledge pack volume
- **Same .env structure:** Local and Docker use identical environment variables

---
