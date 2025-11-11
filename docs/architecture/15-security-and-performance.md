# 15. Security and Performance

**Purpose:** Define security measures and performance targets appropriate for a 5-day PEAK6 demo.

## 15.1 Security Strategy

**What We Use:**

- **Frontend:** React's built-in XSS protection, CSP headers, no localStorage for sensitive data
- **Backend:** Zod validation on all inputs, CORS policy, OpenAI API key in environment only
- **No authentication:** Out of scope for demo (broker tool, not end-user app)

**Why This Approach:**

- **React XSS protection sufficient:** No `dangerouslySetInnerHTML` = no XSS risk for demo
- **Zod validation critical:** Prevents malformed requests from crashing deterministic engines
- **Environment variables for secrets:** API key never in code, never in git
- **No rate limiting (MVP):** Demo scope doesn't require DoS protection (production would add Hono middleware)

**Key Security Decisions:**

- **Why no auth:** Broker tool for internal use, not end-user facing (PEAK6 spec doesn't require it)
- **Why CORS matters:** Prevents unauthorized frontends from calling API
- **Why Zod validation:** Insurance routing/discount engines assume valid input structure (crash without validation)

## 15.2 Performance Strategy

**What We Target:**

- **Frontend:** < 200KB gzipped initial bundle, code splitting for pages
- **Backend:** < 5s total response time (includes LLM API calls)
- **Knowledge Pack:** Loaded at startup (async, non-blocking), O(1) lookups after load

**Why These Targets:**

- **< 200KB bundle:** Fast load on typical broadband (< 1s at 10 Mbps)
- **< 5s with LLM:** GPT-4o-mini averages 1-2s, leaves buffer for routing/discounts/compliance
- **Startup loading (async):** Non-blocking load ensures data is available immediately when first query arrives
- **In-memory Maps:** O(1) lookups after initial load, sufficient for demo scale (20 JSON files)

**LLM Cost Optimization:**

- **GPT-4o-mini for extraction:** 10x cheaper than GPT-4o, 2x faster, sufficient for structured data extraction
- **GPT-4o for pitch:** Quality matters for client-facing text, worth premium cost
- **No streaming (MVP):** Simplifies implementation (pitch must pass compliance filter before sending)

---
