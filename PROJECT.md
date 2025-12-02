# Insurance Broker Quote Assistant (IQuote Pro)

> **Note:** This is a project overview card. For technical documentation and setup instructions, see [README.md](README.md).

## Overview

A compliance-first hybrid multi-agent AI platform for insurance brokers that combines 2 LLM agents (conversational extractor, pitch generator) with 3 deterministic rules engines (routing, discount, compliance) to achieve 100% routing accuracy and 95% intake completeness. Demonstrates production-quality architecture through enterprise-grade 7-phase data extraction pipeline (2,950+ URLs scraped), entity-level source tracking with cuid2 citations for regulatory auditability, and hybrid deterministic pre-processing that reduces LLM costs by 40-60% while maintaining complete compliance.

## Quick Reference

| Field | Value |
|-------|-------|
| **Status** | Portfolio Project (Demo) |
| **Deployed URL** | Not publicly deployed (local demo) |
| **Build Time** | 7 days (Nov 5-11, 2025) - active development period |

## Technical Stack

| Category | Technologies |
|----------|--------------|
| **Languages** | TypeScript 5.6+, Python 3.x (data pipeline) |
| **Frontend** | React 18.2, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui |
| **Backend** | Hono 4.0, Bun 1.3+ runtime |
| **AI/ML** | Google Gemini 2.5 Flash Lite, Structured Outputs, Entity-level RAG |
| **Data Pipeline** | Python (crawl4ai, Brave API, 7-phase extraction pipeline) |
| **Testing** | Bun test, Playwright, Custom evaluation harness (10 E2E test cases) |
| **Key Patterns** | Hybrid multi-agent architecture, Deterministic rules engines, Configuration-driven design, Entity-level source tracking with cuid2 |

## Key Achievements

- **100% Routing Accuracy** - Perfect carrier/state/product routing across all 10 evaluation test cases spanning 3 carriers, 5 states, and 4 product types
- **95% Intake Completeness** - Comprehensive field extraction with known/inferred separation enabling transparent broker curation
- **40-60% LLM Cost Reduction** - Hybrid deterministic pre-processing (key-value parser, pattern extraction, inference engine) minimizes API calls before LLM extraction
- **Enterprise-Grade Data Pipeline** - 7-phase knowledge pack scraper processing 2,950+ unique URLs with domain-specific filtering and entity-level source tracking
- **Complete Auditability** - Every data point tracked with cuid2-based entity IDs, source URLs, accessed dates, and file path citations for regulatory compliance
- **Configuration-Driven Architecture** - All carrier/state/product rules, inference patterns, compliance requirements, and field metadata defined in JSON/TypeScript config files (no code changes required)
- **Keyboard-First Power User Design** - Complete system operation without mouse interaction optimized for high-velocity broker workflows

## Technical Highlights

- **Hybrid Multi-Agent Architecture:** Strategically combines 2 LLM agents for natural language tasks with 3 deterministic engines for compliance-critical operations (routing, discounts, compliance filtering) - ensures 100% auditability for financial calculations and regulatory decisions while leveraging LLM flexibility for extraction and narrative generation

- **Entity-Level Source Tracking with cuid2:** Every carrier, discount, eligibility rule, and state regulation includes collision-resistant unique identifiers (cuid2) with source URLs, accessed dates, and file citations - enables complete regulatory audit trail and data provenance tracking across system updates

- **7-Phase Data Extraction Pipeline:** Sophisticated knowledge curation system (URL discovery via Brave API → page fetching with crawl4ai → domain analysis → intelligent filtering → LLM-powered structured extraction → aggregation → assembly) - transforms 2,950+ public web sources into structured offline knowledge pack with quality metrics

## Code Metrics

| Metric | Value |
|--------|-------|
| **Lines of Code** | 61,010 (TypeScript/JavaScript) |
| **Primary Language** | TypeScript 5.6+ (strict mode) |
| **Test Coverage** | 83 unit/integration tests + 10 E2E evaluation test cases |
| **Key Dependencies** | Hono 4.0, React 18.2, TanStack Router/Query, Zod 3.23, @google/generative-ai 1.29, @paralleldrive/cuid2 3.0.4, es-toolkit |
| **Knowledge Pack** | 491 JSON files with entity-level citations |
| **Data Pipeline** | 2,950+ URLs scraped, 7 phases, Python (crawl4ai, Brave API) |

---

*For detailed technical documentation, setup instructions, and contribution guidelines, please see [README.md](README.md).*
