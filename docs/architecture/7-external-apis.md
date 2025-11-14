# 7. External APIs

## 7.1 Google Gemini API

**Purpose:** LLM inference for natural language understanding (extraction) and generation (pitch writing).

**What We Use:**

- **Conversational Extractor Agent:** Gemini 1.5 Flash with native structured outputs (JSON schema)
- **Pitch Generator Agent:** Gemini 1.5 Flash for narrative generation (unified model)
- **Endpoint:** `generateContent` with JSON schema response specification

**Why Gemini:**

- **Native structured outputs:** Built-in JSON schema enforcement with `responseMimeType: "application/json"` and `responseSchema`
- **Cost efficiency:** Gemini 1.5 Flash is significantly cheaper than OpenAI GPT-4o-mini ($0.075/1M input tokens vs $0.15/1M)
- **Speed:** Faster inference than GPT-4o-mini for similar quality
- **Unified model:** Single model for both extraction and pitch generation (simpler API integration)
- **No API key rotation issues:** Stable authentication with Google Cloud project

**Critical Integration Requirements:**

- **Token usage logging:** Every API call must log token counts for cost tracking (non-standard for demo, required for PEAK6 evaluation)
- **Structured outputs for extraction:** Use JSON schema with `responseSchema` parameter (prevents hallucinated field names)
- **No streaming (MVP):** Synchronous responses simplify implementation for 5-day timeline
- **Error handling:** Gemini API has different error formats than OpenAI (wrapped in `candidates[0].content`)

**Cost Estimation (15 PEAK6 Test Cases):**

- Extraction: 15 × ~500 tokens × $0.075/1M = $0.0006
- Pitch generation: 15 × ~1000 tokens × $0.30/1M = $0.0045
- **Total: ~$0.005 per evaluation run** (10x cheaper than OpenAI)

**Rate Limits (Informational):**

- Free tier: 15 RPM (requests per minute), 1M TPM (tokens per minute)
- Paid tier: 1000 RPM, 4M TPM
- Demo will not approach limits with 15 test cases

**SDK:** `@google/generative-ai` (^0.21.0)

---
