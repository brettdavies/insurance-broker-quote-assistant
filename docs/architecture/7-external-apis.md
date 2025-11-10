# 7. External APIs

## 7.1 OpenAI API

**Purpose:** LLM inference for natural language understanding (extraction) and generation (pitch writing).

**What We Use:**
- **Conversational Extractor Agent:** GPT-4o-mini with structured outputs (JSON mode)
- **Pitch Generator Agent:** GPT-4o for higher-quality narrative generation
- **Endpoint:** `POST /chat/completions` only (no embeddings, no fine-tuning)

**Why OpenAI:**
- **Structured outputs:** Native JSON schema enforcement eliminates parsing errors
- **Cost efficiency:** GPT-4o-mini is 10x cheaper than GPT-4o for extraction task
- **Quality for client-facing text:** GPT-4o produces broker-ready prose worth the premium
- **Reliability:** Production-grade API with 99.9% uptime SLA

**Critical Integration Requirements:**
- **Token usage logging:** Every API call must log token counts for cost tracking (non-standard for demo, required for evaluation)
- **Structured outputs for extraction:** Use JSON mode with Zod schema validation (prevents hallucinated field names)
- **No streaming (MVP):** Synchronous responses simplify implementation for 5-day timeline

**Cost Estimation (15 Test Cases):**
- Extraction: 15 × ~500 tokens × $0.15/1M = $0.001
- Pitch generation: 15 × ~1000 tokens × $2.50/1M = $0.038
- **Total: ~$0.04 per evaluation run**

**Rate Limits (Informational):**
- Tier 1: 10,000 TPM (tokens per minute)
- Tier 2: 90,000 TPM
- Demo will not approach limits with 15 test cases

---
