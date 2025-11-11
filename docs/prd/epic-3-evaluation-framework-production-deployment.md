# Epic 3: Evaluation Framework & Production Deployment

**Epic Goal:** Validate that the system meets all success criteria through automated testing, package the application for one-command deployment, and ensure comprehensive observability. By the end of this epic, the system achieves ≥90% routing accuracy, ≥95% intake completeness, ≥85% pitch clarity, and 100% compliance—all validated through automated harness and ready for demo presentation.

## Implementation Notes

**Architectural Patterns from Epic 1:**
- Decision trace logging uses `createDecisionTrace()` and `logDecisionTrace()` utilities from `apps/api/src/utils/decision-trace.ts`
- Tests use Bun test framework with Hono test utilities (no server required)
- Test structure: Unit tests in `services/__tests__/`, integration tests in `routes/__tests__/`
- Error handling follows global error handler middleware pattern
- LLM calls use `GeminiProvider` with structured output via JSON schema

## Story 3.1: Evaluation Harness & Test Cases

**As a** developer,
**I want** an automated harness that runs 15 synthetic test cases and reports project metrics,
**so that** I can objectively validate system performance before demo.

**Acceptance Criteria:**

1. Create 15 synthetic test cases in `evaluation/test-cases/`: 10 conversational intake, 5 policy analysis
2. Test cases cover all 3 carriers, 5 states, 4 product types with varied scenarios (complete data, missing fields, edge cases)
3. Command `bun run evaluate` executes all test cases and generates report
4. Report includes: routing accuracy %, intake completeness %, savings pitch clarity scores, compliance pass/fail
5. Per-carrier and per-state routing accuracy breakdown
6. Field completeness percentage for each required field across all tests
7. LLM token usage and cost breakdown (input/output tokens per test)
8. Sample decision traces with citations for audit
9. Report format: JSON + human-readable markdown summary
10. Evaluation harness achieves target metrics: ≥90% routing, ≥95% intake, ≥85% pitch, 100% compliance

## Story 3.2: Decision Trace Logging Infrastructure

**As a** backend system,
**I want** comprehensive decision trace logging for every interaction,
**so that** evaluators can audit system behavior and verify offline operation.

**Acceptance Criteria:**

1. Every API call logs structured decision trace to `logs/decisions/` directory
2. Trace includes: timestamp, interaction ID, inputs received, knowledge pack sections queried, rules evaluated, LLM calls (if any), outputs generated
3. All PII redacted from logs (names/addresses replaced with placeholder IDs)
4. Citations include knowledge pack file paths and cuid2 IDs for recommendations
5. Offline operation proof: logs show zero external API calls except Gemini API (knowledge pack queries logged as in-memory cache hits)
6. Log rotation implemented (max 100MB per file, 7-day retention for demo)
7. Structured JSON format for machine parsing
8. Unit tests validate PII redaction works correctly
9. Sample traces included in evaluation report

## Story 3.3: Docker Compose Deployment Package

**As a** developer,
**I want** a docker-compose.yml that starts the entire system with one command,
**so that** evaluators can run the demo without environment setup.

**Acceptance Criteria:**

1. `docker-compose.yml` defines services: frontend (port 3000), backend (port 7070)
2. Knowledge pack mounted as external volume for easy updates
3. Environment variables configured via `.env` file (with `.env.example` template)
4. `docker compose up` starts all services and loads knowledge pack
5. Health checks implemented for both services
6. README includes Docker setup instructions and troubleshooting
7. Build optimization: images use multi-stage builds for smaller size
8. Logs accessible via `docker compose logs`
9. One-command teardown: `docker compose down`
10. Validated on macOS, Linux, and Windows (WSL2)

## Story 3.4: Integration Testing & CI/CD

**As a** developer,
**I want** automated integration tests and CI/CD pipeline,
**so that** code quality is maintained throughout development.

**Acceptance Criteria:**

1. Integration tests cover critical API flows: `/api/intake`, `/api/policy/analyze`, `/api/generate-prefill`
2. Tests validate end-to-end workflows: conversational intake → routing → pre-fill, policy upload → analysis → savings pitch
3. Bun test runner executes unit + integration tests
4. GitHub Actions CI pipeline runs on pull requests: type-check, lint, unit tests, integration tests
5. CI fails if tests don't pass or if code coverage drops below threshold (80%)
6. Integration tests use synthetic test data (no real PII)
7. Mocked LLM responses for deterministic CI testing
8. Test execution time <2 minutes for fast feedback

## Story 3.5: Documentation & Demo Preparation

**As a** developer,
**I want** comprehensive documentation for evaluators,
**so that** they can understand architecture, run the demo, and evaluate results.

**Acceptance Criteria:**

1. README updated with: project overview, architecture summary, setup instructions (Docker + local), demo scenarios, evaluation harness usage
2. Architecture documentation links to `docs/architecture/` for technical details
3. Demo script provided: step-by-step walkthrough of conversational intake and policy analysis workflows with sample inputs
4. Troubleshooting guide for common issues (API key missing, Docker not running, etc.)
5. Limitations documented: 3 carriers, 5 states, synthetic data only, no production deployment
6. Decision log of key trade-offs included in deliverables
7. Evaluation report generation documented (how to read metrics)
8. Video recording or animated GIF walkthrough of key workflows (optional, time permitting)

---
