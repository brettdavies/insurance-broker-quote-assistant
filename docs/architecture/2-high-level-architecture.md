# 2. High Level Architecture

## 2.1 Technical Summary

This application uses a **hybrid architecture** combining LLM agents for natural language processing with deterministic rules engines for compliance-critical business logic. The system is deployed as a monorepo containing a Hono-based API backend and a React frontend with TanStack tooling.

The architecture satisfies PEAK6's "multi-agent preferred" requirement through 2 LLM Agents (Conversational Extractor + Pitch Generator) working in concert with 3 Deterministic Rules Engines (Routing + Discount + Compliance). All insurance knowledge is served from a local JSON-based knowledge pack loaded at startup (async, non-blocking), with structured RAG queries for retrieval and cuid2-based citation tracking for auditability.

The frontend provides two distinct user flows: "Get Quote" (conversational intake) and "Analyze Policy" (savings identification), both feeding into the same backend orchestration layer. The system achieves insurance compliance through hard-coded prohibited statement filters and mandatory disclaimer injection, ensuring 100% regulatory adherence.

## 2.2 Platform and Infrastructure Choice

**Platform:** Local Development / Cloud Agnostic (Deployment TBD based on PEAK6 feedback)

**Key Services:**

- **Compute:** Node.js runtime for Hono API server
- **LLM API:** Google Gemini 1.5 Flash (extraction and pitch generation)
- **Storage:** Local filesystem for knowledge pack JSON files
- **Frontend Hosting:** Static deployment (Vercel/Netlify/Cloudflare Pages candidates)

**Deployment Host and Regions:**

- Development: Local (http://localhost:3000 frontend, http://localhost:7070 API)
- Production: TBD - architecture supports serverless (Vercel/Cloudflare Workers) or containerized (Docker/Railway) deployment

**Rationale:** Cloud-agnostic design allows PEAK6 to deploy on their preferred infrastructure. The knowledge pack architecture (local files) means zero external dependencies at runtime except LLM API calls for text processing.

## 2.3 Repository Structure

**Structure:** Monorepo with Bun workspaces

**Monorepo Tool:** Bun workspaces (native Bun, zero additional tooling)

**Package Organization:**

```
apps/
  web/          - Frontend React application
  api/          - Backend Hono API server
packages/
  shared/       - Shared TypeScript types, constants, utilities
  ui/           - Shared UI components (shadcn)
knowledge_pack/ - Offline insurance rules and data (JSON)
```

**Rationale:** Bun workspaces provides native monorepo support with 10-20x faster installs than npm. Shared types package ensures frontend/backend consistency via Zod schemas. The knowledge pack is at the root for easy access during knowledge curation phase (Day 1), loaded at startup (async, non-blocking) by RAG system.

## 2.4 High Level Architecture Diagram

```mermaid
graph TB
    User[Insurance Broker]

    subgraph Frontend["Frontend (React + TanStack)"]
        Landing[Landing Page<br/>2 Options]
        TextInput[Conversational Input<br/>Text Box]
        FileUpload[Policy Upload<br/>File Drop]
        Router[TanStack Router<br/>/intake | /policy]
        Query[TanStack Query<br/>API Client]
        Toast[Toast Notifications<br/>Error Display]
        ErrorBoundary[React Error Boundary]
    end

    subgraph Shared["packages/shared"]
        Types[Shared Types<br/>Zod Schemas]
    end

    subgraph Backend["Backend API (Hono)"]
        ErrorHandler[Global Error Handler]
        Routes[API Routes<br/>/api/intake | /api/policy]
        Logger[Centralized Logger]
        Orchestrator[Flow Orchestrator]

        subgraph LLM["LLM Agents (2)"]
            Extractor[Conversational<br/>Extractor Agent]
            Pitch[Pitch Generator<br/>Agent]
        end

        subgraph Rules["Rules Engines (3)"]
            Routing[Routing Engine]
            Discount[Discount Engine]
            Compliance[Compliance Filter]
        end

        RAG[Knowledge Pack RAG<br/>Structured Queries]
    end

    KP[(Knowledge Pack<br/>JSON Files<br/>Loaded at Startup)]
    LLM_API[Google Gemini API<br/>Gemini 1.5 Flash]
    ProgramLog[logs/program.log]
    ComplianceLog[logs/compliance.log]

    User --> Landing
    Landing --> TextInput
    Landing --> FileUpload
    TextInput --> Router
    FileUpload --> Router
    Router --> Query
    Query --> Routes
    Routes --> ErrorHandler
    ErrorHandler --> Orchestrator
    ErrorHandler --> Logger

    Orchestrator --> Extractor
    Orchestrator --> Pitch
    Orchestrator --> Routing
    Orchestrator --> Discount
    Orchestrator --> Compliance

    Extractor --> LLM_API
    Pitch --> LLM_API

    Routing --> RAG
    Discount --> RAG
    RAG -.->|Query| KP

    Compliance --> Orchestrator
    Orchestrator --> ErrorHandler
    ErrorHandler --> Routes
    Routes --> Query
    Query --> Toast
    Query --> ErrorBoundary

    Logger --> ProgramLog
    Logger --> ComplianceLog

    Frontend -.->|Import Types| Types
    Backend -.->|Import Types| Types
```

## 2.5 Architectural Patterns

- **Hybrid LLM + Rules Architecture:** LLMs for NLP tasks (extraction, generation), deterministic rules for business logic (routing, discounts, compliance) - _Rationale:_ Insurance compliance requires auditable, deterministic decisions for critical operations while benefiting from LLM flexibility for natural language understanding

- **Structured RAG (No Vector Store):** Exact key-based queries on structured JSON knowledge pack loaded at startup (async, non-blocking) - _Rationale:_ Knowledge pack has known keys (carrier, state, product), making exact queries more accurate and faster than semantic search. Startup loading ensures data is immediately available for all queries.

- **Dual Logging Streams:** Separate program logs (debug/performance) and compliance logs (audit trail with decision traces) - _Rationale:_ Insurance compliance requires complete audit trail of routing/discount decisions with citations, separate from operational logs. Compliance logs written to file only for regulatory review.

- **Centralized Error Handling:** Global error handler middleware + React error boundaries + toast notifications - _Rationale:_ Single place for error logging, user-friendly error messages via toast, prevents app crashes with error boundaries

- **Zod as Single Source of Truth:** All types defined as Zod schemas, TypeScript types inferred - _Rationale:_ Runtime validation + compile-time types from one definition, no type drift, faster than OpenAPI generation for 5-day project

- **Repository Pattern:** Abstract knowledge pack access through RAG layer - _Rationale:_ Enables easy testing, mock data, and future migration to database if needed

- **API Gateway Pattern:** Single Hono server as entry point for all API calls - _Rationale:_ Centralized error handling, logging, and future rate limiting

- **Component-Based UI:** Reusable React components with TypeScript + shadcn - _Rationale:_ Maintainability and consistent design system

- **Monorepo with Shared Types:** Common types package used by frontend and backend - _Rationale:_ Type safety across API boundaries, no runtime surprises

---
