# 15. Security and Performance

**Purpose:** Define security measures and performance targets appropriate for a 5-day demo.

## 15.1 Current Security Measures

**Authentication:** None (development only)

**Authorization:** None (development only)

**Data Protection:**
- No encryption at rest (in-memory data only)
- No encryption in transit (HTTP only in dev)
- No PII storage (transient data only)

**Security Tools:**
- No security scanning configured
- No dependency vulnerability scanning
- No OWASP ZAP or similar tools

**Frontend Security:**
- React's built-in XSS protection
- CSP headers (if configured)
- No localStorage for sensitive data

**Backend Security:**
- Zod validation on all inputs
- CORS policy (localhost:3000 and localhost:5173)
- Gemini API key in environment only (never in code)

## 15.2 Compliance Measures

**Regulatory Compliance:**
- **100% Compliance Filter Enforcement** - All outputs validated
- **Prohibited Phrase Detection** - Blocks unauthorized practice statements
- **State-Specific Disclaimers** - Required disclaimers added automatically
- **Licensed Agent Handoff** - Compliance violations trigger handoff message

**Audit Trail:**
- **Decision Traces** - All decisions logged with citations
- **Token Usage Tracking** - LLM costs tracked per request
- **Compliance Logging** - Separate log for compliance events (`logs/compliance.log`)

**Citation System:**
- **cuid2-based IDs** - Cryptographically secure unique identifiers
- **Knowledge Pack Sources** - Every data point has ≥1 citation
- **Opportunity Citations** - Every discount includes source reference

## 15.3 Input Validation

**API Boundaries:**
- **Zod Schema Validation** - All requests validated with `schema.safeParse()`
- **File Upload Validation** - MIME type, extension, size checks (5MB max)
- **Field-Level Validation** - Min/max constraints, enum validation

**LLM Output Validation:**
- **Structured Output Schemas** - LLM responses validated against Zod schemas
- **Post-LLM Validation Loop** - Re-runs deterministic extraction on LLM output (up to 3 iterations)
- **Confidence Thresholds** - Low confidence values flagged as inferred

**Frontend Validation:**
- **Field Modal Validation** - Numeric ranges, enum options enforced
- **Pill Parsing Validation** - Malformed pills ignored
- **Suppression List** - User-dismissed fields never re-inferred

## 15.4 Security Recommendations (Production)

**Before Production Deployment:**

1. **Authentication & Authorization:**
   - Implement JWT-based authentication
   - Add role-based access control (broker vs admin)
   - Secure API keys in environment variables (never in code)

2. **Data Protection:**
   - Enable HTTPS (TLS 1.3) for all traffic
   - Encrypt sensitive data at rest (if database added)
   - Implement CORS policies for production domains
   - Add rate limiting to prevent abuse

3. **Security Scanning:**
   - Enable Dependabot for dependency vulnerabilities
   - Add OWASP dependency check to CI pipeline
   - Implement security headers (CSP, X-Frame-Options, etc.)
   - Run penetration testing before launch

4. **Compliance:**
   - Legal review of all disclaimers
   - Privacy policy for data collection
   - GDPR compliance if EU users
   - Insurance regulatory compliance verification

5. **Monitoring:**
   - Integrate Sentry for error tracking
   - Set up alerting for compliance violations
   - Monitor LLM usage for cost anomalies
   - Log all security events (authentication, authorization failures)

## 15.5 Performance Strategy

**What We Target:**

- **Frontend:** < 200KB gzipped initial bundle, code splitting for pages
- **Backend:** < 5s total response time (includes LLM API calls)
- **Knowledge Pack:** Loaded at startup (async, non-blocking), O(1) lookups after load

**Why These Targets:**

- **< 200KB bundle:** Fast load on typical broadband (< 1s at 10 Mbps)
- **< 5s with LLM:** Gemini 1.5 Flash averages 1-2s, leaves buffer for routing/discounts/compliance
- **Startup loading (async):** Non-blocking load ensures data is available immediately when first query arrives
- **In-memory Maps:** O(1) lookups after initial load, sufficient for demo scale (20 JSON files)

**LLM Cost Optimization:**

- **Gemini 2.5 Flash Lite for extraction:** Free tier available, cost-efficient, sufficient for structured data extraction
- **Gemini 2.5 Flash Lite for pitch:** Unified model for both extraction and pitch generation (simpler integration, cost-efficient)
- **Hybrid extraction architecture:** Reduces LLM costs by 40-60% through deterministic pre-processing
- **No streaming (MVP):** Simplifies implementation (pitch must pass compliance filter before sending)

---
