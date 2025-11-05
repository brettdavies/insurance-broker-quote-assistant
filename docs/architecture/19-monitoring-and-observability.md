# 19. Monitoring and Observability

**Purpose:** Define dual logging strategy for debugging (program.log) and regulatory compliance (compliance.log).

## 19.1 Monitoring Strategy

**What We Use:**
- **Program Log (`./logs/program.log`):** API requests, errors, LLM token usage, performance metrics
- **Compliance Log (`./logs/compliance.log`):** DecisionTrace objects only (routing decisions, discount calculations, compliance violations)
- **Console output:** Program log echoed to stdout for Docker logs
- **TanStack Query DevTools:** **Development troubleshooting only** (automatically excluded from production builds) - visualizes queries, mutations, cache state, network activity for real-time debugging. See Section 13.3 for detailed usage. Not for production monitoring.

**Why Dual Logging:**
- **Different audiences:** Developers read program.log (debugging), regulators read compliance.log (audit trail)
- **Regulatory requirement:** Insurance compliance needs complete audit trail separate from operational logs
- **No PII in program logs:** Compliance log has citations/decisions, not user data
- **Structured JSON:** Machine-readable logs for parsing/analysis

**TanStack Query DevTools Benefits:**
- **Real-time debugging:** Inspect query state, cache behavior, mutations without adding console.log statements
- **Chrome DevTools MCP integration:** AI agents can automate troubleshooting by inspecting devtools state via browser automation
- **Query timeline:** See when queries fetch, refetch, become stale, or get invalidated
- **Manual interventions:** Test edge cases by manually triggering refetches or invalidating cache
- **Not for E2E testing:** Used for development troubleshooting only, not automated testing (see Section 13.3 for detailed usage)

## 19.2 Key Metrics

**What We Monitor:**

**Frontend:**
- API response times (via TanStack Query metrics)
- JavaScript errors (via React Error Boundary)
- Bundle size (< 200KB gzipped target)

**Backend:**
- Request rate (requests per minute)
- Error rate (errors per 100 requests)
- Response time (p50, p95, p99 latency)
- LLM token usage (prompt + completion tokens per request)
- LLM cost (calculated from token usage)

**Why These Metrics:**
- **Response times:** Detect slow LLM API calls or knowledge pack queries
- **Error rates:** Early warning for broken APIs or invalid knowledge pack data
- **LLM token usage:** Required for PEAK6 cost evaluation, tracks expensive operations
- **No user analytics:** Demo doesn't track user behavior (out of scope)

## 19.3 Observability for PEAK6 Evaluation

**What We Provide:**
- **Token usage per test case:** Logged to program.log, aggregated in evaluation report
- **Decision traces:** Every routing/discount decision logged to compliance.log with citations
- **Cost estimation:** Total OpenAI cost calculated from token usage logs
- **Error breakdown:** Compliance violations, extraction failures, routing failures categorized

**Why This Matters:**
- **PEAK6 requirement:** "Demonstrate cost-efficiency of LLM usage"
- **Compliance audit:** Regulators can review decision traces for any recommendation
- **Debugging:** If test case fails, decision trace shows exactly which rule/query failed

---
