# OpenAI vs Gemini: Structured Outputs Model Comparison

## Executive Summary

This document compares OpenAI and Google Gemini models that support structured outputs (JSON Schema) for use in the conversational extractor service. Both providers offer cost-effective options, with Gemini providing a free tier and OpenAI offering lower-cost nano models.

**Recommendation**: Start with **Gemini 2.5 Flash-Lite** (free tier) or **Gemini 2.0 Flash-Lite** (free tier) for initial development and testing. For production, use **OpenAI gpt-5-nano** ($0.05/$0.40 per 1M tokens) as the primary model with **Gemini 2.5 Flash-Lite** ($0.10/$0.40 paid tier) as a cost-effective fallback.

---

## Model Support Overview

### OpenAI Models Supporting Structured Outputs

OpenAI's Structured Outputs feature (using `response_format: {type: "json_schema", ...}`) is supported with:
- `gpt-4o-mini` and later model snapshots
- `gpt-4o-2024-08-06` and later
- **Newer models**: `gpt-5-nano`, `gpt-5-mini`, `gpt-4.1-nano`, `gpt-4.1-mini` (assumed supported as "later" models)

**Note**: Older models like `gpt-4-turbo` and earlier may only support JSON mode (not structured outputs with schema adherence).

### Gemini Models Supporting Structured Outputs

| Model | Structured Outputs | Notes |
|-------|---------------------|-------|
| Gemini 2.5 Pro | ✔️ | Full support |
| Gemini 2.5 Flash | ✔️ | Full support |
| Gemini 2.5 Flash-Lite | ✔️ | Full support |
| Gemini 2.0 Flash | ✔️* | Requires explicit `propertyOrdering` list |
| Gemini 2.0 Flash-Lite | ✔️* | Requires explicit `propertyOrdering` list |

*Gemini 2.0 models require an explicit `propertyOrdering` list within the JSON input to define the preferred structure.

---

## Pricing Comparison (Standard Tier, per 1M tokens)

### OpenAI Models (Standard Tier)

| Model | Input | Output | Cost per Request* | Free Tier |
|-------|-------|--------|-------------------|-----------|
| **gpt-5-nano** | $0.05 | $0.40 | $0.000105 | ❌ |
| **gpt-4.1-nano** | $0.10 | $0.40 | $0.00013 | ❌ |
| **gpt-4o-mini** | $0.15 | $0.60 | $0.000195 | ❌ |
| **gpt-5-mini** | $0.25 | $2.00 | $0.000525 | ❌ |
| **gpt-4.1-mini** | $0.40 | $1.60 | $0.00052 | ❌ |

*Cost per request assumes ~500 input tokens and ~200 output tokens (typical extraction task)

### Gemini Models (Standard Tier)

| Model | Input | Output | Cost per Request* | Free Tier |
|-------|-------|--------|-------------------|-----------|
| **Gemini 2.5 Flash-Lite** | $0.10 | $0.40 | $0.00013 | ✅ **Free** |
| **Gemini 2.0 Flash-Lite** | $0.075 | $0.30 | $0.0000975 | ✅ **Free** |
| **Gemini 2.5 Flash** | $0.30 | $2.50 | $0.00065 | ✅ **Free** |
| **Gemini 2.0 Flash** | $0.10 | $0.40 | $0.00013 | ✅ **Free** |
| **Gemini 2.5 Pro** | $1.25 | $10.00 | $0.002625 | ✅ **Free** |

*Cost per request assumes ~500 input tokens and ~200 output tokens (typical extraction task)

**Note**: Gemini models have a free tier that includes free input and output tokens, making them ideal for development and testing.

---

## Cost Analysis for Typical Extraction Task

Assuming a typical extraction task with:
- **Input**: ~500 tokens (conversation history + prompt)
- **Output**: ~200 tokens (extracted structured data)

### Cost per Request (Standard Tier)

| Model | Input Cost | Output Cost | **Total** |
|-------|------------|-------------|-----------|
| **OpenAI gpt-5-nano** | $0.000025 | $0.00008 | **$0.000105** |
| **Gemini 2.0 Flash-Lite** | $0.0000375 | $0.00006 | **$0.0000975** |
| **OpenAI gpt-4.1-nano** | $0.00005 | $0.00008 | **$0.00013** |
| **Gemini 2.5 Flash-Lite** | $0.00005 | $0.00008 | **$0.00013** |
| **Gemini 2.0 Flash** | $0.00005 | $0.00008 | **$0.00013** |
| **OpenAI gpt-4o-mini** | $0.000075 | $0.00012 | **$0.000195** |
| **Gemini 2.5 Flash** | $0.00015 | $0.0005 | **$0.00065** |
| **OpenAI gpt-5-mini** | $0.000125 | $0.0004 | **$0.000525** |
| **OpenAI gpt-4.1-mini** | $0.0002 | $0.00032 | **$0.00052** |
| **Gemini 2.5 Pro** | $0.000625 | $0.002 | **$0.002625** |

### Cost per 1,000 Requests

| Model | Cost per 1K Requests |
|-------|----------------------|
| **Gemini 2.0 Flash-Lite** (free tier) | **$0.00** |
| **Gemini 2.5 Flash-Lite** (free tier) | **$0.00** |
| **OpenAI gpt-5-nano** | $0.105 |
| **Gemini 2.0 Flash-Lite** (paid) | $0.0975 |
| **OpenAI gpt-4.1-nano** | $0.13 |
| **Gemini 2.5 Flash-Lite** (paid) | $0.13 |
| **Gemini 2.0 Flash** (paid) | $0.13 |
| **OpenAI gpt-4o-mini** | $0.195 |
| **Gemini 2.5 Flash** (paid) | $0.65 |
| **OpenAI gpt-5-mini** | $0.525 |
| **OpenAI gpt-4.1-mini** | $0.52 |
| **Gemini 2.5 Pro** (paid) | $2.625 |

---

## Feature Comparison

### Structured Outputs Implementation

| Feature | OpenAI | Gemini |
|---------|--------|--------|
| **Schema Support** | JSON Schema subset | JSON Schema subset |
| **Zod Integration** | Via `openai/helpers/zod` | Via `zod-to-json-schema` |
| **Strict Mode** | Yes (`strict: true`) | Yes (via schema) |
| **Streaming** | Supported | Supported |
| **Property Ordering** | Automatic (schema order) | Automatic (2.5) or explicit (2.0) |
| **Refusal Detection** | Yes (`refusal` field) | Yes (via response structure) |

### API Integration

**OpenAI**:
```typescript
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

const response = await openai.chat.completions.create({
  model: "gpt-5-nano",
  messages: [...],
  response_format: zodTextFormat(userProfileSchema, "strict"),
});
```

**Gemini**:
```typescript
import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-lite",
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(userProfileSchema),
  },
});
```

### Free Tier Availability

| Provider | Free Tier | Limits |
|----------|-----------|--------|
| **Gemini** | ✅ Yes | Free input/output tokens for all models |
| **OpenAI** | ❌ No | No free tier for structured outputs models |

---

## Recommendations

### Development & Testing Phase

1. **Primary**: **Gemini 2.5 Flash-Lite** (free tier)
   - Zero cost for development
   - Full structured outputs support
   - Good performance for extraction tasks

2. **Alternative**: **Gemini 2.0 Flash-Lite** (free tier)
   - Lowest cost option (if paid tier needed)
   - Requires `propertyOrdering` configuration
   - Slightly more complex setup

### Production Phase (Cost-Optimized Strategy)

**Tier 1 - Primary (Cheapest)**:
1. **OpenAI gpt-5-nano** ($0.105 per 1K requests)
   - Lowest cost paid option
   - Excellent for high-volume extraction
   - Requires OpenAI API key

2. **Gemini 2.0 Flash-Lite** ($0.0975 per 1K requests, paid tier)
   - Slightly cheaper than gpt-5-nano
   - Requires `propertyOrdering` configuration
   - Good fallback option

**Tier 2 - Fallback (If Quality Insufficient)**:
3. **OpenAI gpt-4.1-nano** ($0.13 per 1K requests)
   - Next cheapest OpenAI option
   - Better quality than gpt-5-nano

4. **Gemini 2.5 Flash-Lite** ($0.13 per 1K requests, paid tier)
   - Same cost as gpt-4.1-nano
   - No `propertyOrdering` requirement
   - Good alternative provider

**Tier 3 - Higher Quality (If Needed)**:
5. **OpenAI gpt-4o-mini** ($0.195 per 1K requests)
   - Better quality than nano models
   - Still cost-effective

6. **OpenAI gpt-5-mini** ($0.525 per 1K requests)
   - Higher quality option
   - Use only if extraction quality is insufficient

### Multi-Provider Strategy

**Recommended Approach**:
1. **Primary**: OpenAI gpt-5-nano (lowest cost, reliable)
2. **Fallback 1**: Gemini 2.5 Flash-Lite (cost parity, different provider)
3. **Fallback 2**: OpenAI gpt-4.1-nano (if OpenAI primary fails)
4. **Fallback 3**: OpenAI gpt-4o-mini (if quality insufficient)

This provides:
- **Cost optimization**: Start with cheapest options
- **Resilience**: Multiple providers reduce single point of failure
- **Quality escalation**: Clear path to better models if needed

---

## Implementation Considerations

### Gemini 2.0 Models Special Requirement

Gemini 2.0 Flash and Flash-Lite require an explicit `propertyOrdering` list:

```typescript
const schema = {
  type: "object",
  properties: {
    field1: { type: "string" },
    field2: { type: "number" },
  },
  required: ["field1", "field2"],
  propertyOrdering: ["field1", "field2"], // Required for Gemini 2.0
};
```

**Recommendation**: Prefer Gemini 2.5 models to avoid this complexity, unless cost is critical.

### Token Usage Logging

Both providers support token usage tracking:
- **OpenAI**: `usage.prompt_tokens`, `usage.completion_tokens`, `usage.total_tokens`
- **Gemini**: Token counts available in response metadata

### Error Handling

Both providers handle errors similarly:
- **OpenAI**: Throws exceptions, includes `refusal` field for safety refusals
- **Gemini**: Returns error responses, includes refusal information in response structure

### Timeout Configuration

- **OpenAI**: Configurable via `timeout` option (default: 10 seconds recommended)
- **Gemini**: Configurable via API client timeout settings

---

## Conclusion

For the conversational extractor service:

1. **Use Gemini free tier** for development and testing
2. **Use OpenAI gpt-5-nano** as primary production model (lowest cost)
3. **Use Gemini 2.5 Flash-Lite** as cost-effective fallback (same cost as gpt-4.1-nano)
4. **Escalate to gpt-4.1-nano or gpt-4o-mini** if extraction quality is insufficient

This strategy balances cost, quality, and resilience while maintaining structured outputs support across all models.

