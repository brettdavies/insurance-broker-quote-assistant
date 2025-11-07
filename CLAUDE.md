# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CLI Tool Usage Guidance

- **Prefer CLI tools** over direct in-memory manipulation when possible, especially for editing or searching within larger files or across the codebase.
    - Examples: Use `sed`, `awk`, or in-place editing CLI utilities for modifying files; use code-aware tools (`ast-grep`) for refactoring.
- **For file deletion,** do NOT use `rm` or `git rm`.  
    - Instead, use [`trash`](https://github.com/sindresorhus/trash) to safely move files to the system trash, preserving the ability to recover accidentally deleted files.
- **For code search:**
    - Always use [`rg` (ripgrep)](https://github.com/BurntSushi/ripgrep) instead of `grep` for fast recursive search.
    - [`ast-grep`](https://ast-grep.github.io/) is also available for powerful, syntax-aware, high-performance codebase traversal.
- When uncertain what CLI tools are available on the system, first run:
    ```bash
    brew list
    ```
    to enumerate all installed Homebrew tools. If your desired CLI tool is not listed, or you encounter a "command not found" error, ask the user to install the necessary tool before continuing.
- 
- **Summary:** Use CLI-oriented, scriptable approaches for repetitive or large-scale file/codebase operations. Prefer code-aware tools for search/replace and avoid destructive deletions. If a needed tool is missing, request that the user install it before attempting the operation.




## Project Overview

**IQuote Pro** is a 5-day PEAK6 interview project demonstrating a multi-agent AI assistant for insurance brokers. The system uses a **hybrid LLM + deterministic rules architecture**:

- **2 LLM Agents:** Conversational Extractor (field extraction) + Pitch Generator (recommendations)
- **3 Rules Engines:** Routing (carrier eligibility) + Discount (savings) + Compliance (regulatory guardrails)
- **Offline Knowledge Pack:** All insurance data in local JSON files (no runtime web scraping)

**Current Status:** Planning phase complete, no implementation code exists yet.

**Architecture Docs:** See [docs/architecture/](./docs/architecture/) for complete technical specifications.

## Quick Start (Once Implemented)

```bash
# Install dependencies
bun install

# Start both frontend (port 3000) and backend (port 7070)
bun run dev

# Run tests
bun test

# Type check
bun run type-check

# Lint
bun run lint
```

## Key Architecture References

**Essential Reading:**
- **[Architecture Index](./docs/architecture/index.md)** - Complete table of contents
- **[High-Level Architecture](./docs/architecture/2-high-level-architecture.md#21-technical-summary)** - Hybrid LLM+rules system overview
- **[Repository Structure](./docs/architecture/2-high-level-architecture.md#23-repository-structure)** - Monorepo layout (apps/web, apps/api, packages/shared)
- **[Tech Stack](./docs/architecture/3-tech-stack.md#31-technology-stack-table)** - React + TanStack + Hono + TypeScript + Bun
- **[Development Workflow](./docs/architecture/13-development-workflow.md#131-development-tools)** - Commands and environment setup
- **[Coding Standards](./docs/architecture/17-coding-standards.md#171-critical-architectural-rules)** - Critical rules for development
- **[Success Criteria](./docs/architecture/20-success-criteria-and-evaluation.md#201-peak6-requirements-mapping)** - PEAK6 evaluation metrics

**Core Workflows:**
- **[Conversational Intake Flow](./docs/architecture/8-core-workflows.md#81-conversational-intake-flow)** - Extract → Route → Discounts → Pitch → Compliance
- **[Policy Analysis Flow](./docs/architecture/8-core-workflows.md#82-policy-analysis-flow)** - Parse → Route → Discounts → Bundles → Pitch → Compliance

**Critical Implementation Details:**
- **[Data Models](./docs/architecture/4-data-models.md)** - UserProfile, Carrier, Opportunity, IntakeResult, PolicyAnalysisResult
- **[API Specification](./docs/architecture/5-api-specification.md#51-core-endpoints)** - POST /api/intake, POST /api/policy/analyze
- **[Components](./docs/architecture/6-components.md)** - LLM agents, rules engines, knowledge pack RAG, orchestrator
- **[Error Handling](./docs/architecture/18-error-handling-strategy.md#181-error-flow-architecture)** - Non-standard error format, shared error codes

## Critical Development Rules

**Must read before coding:** [Section 17.1 - Critical Architectural Rules](./docs/architecture/17-coding-standards.md#171-critical-architectural-rules)

**Top 5 Rules:**
1. **Type Sharing:** Always define types in `packages/shared/src/types`, import via `@repo/shared`
2. **Compliance Filter:** Run on ALL user-facing outputs (100% enforcement, no exceptions)
3. **Citations Required:** Every discount/opportunity must include cuid2-based citation
4. **Knowledge Pack:** Load at startup (async), query via RAG layer only (never direct file access)
5. **LLM Usage:** Always log token usage, use structured outputs (JSON mode) for extraction

**See also:**
- [Naming Conventions](./docs/architecture/17-coding-standards.md#172-naming-conventions)
- [Implementation Guidance](./docs/architecture/17-coding-standards.md#173-implementation-guidance)

---

## Hono Framework Development

**Trigger**: when working with Hono framework or using the hono CLI

### Overview

Use the `hono` CLI for efficient development. View all commands with `hono --help`.

The Hono CLI is designed for both humans and AI. It provides five subcommands:

### Core Commands

- **`hono docs [path]`** - Browse Hono documentation (outputs Markdown to stdout, AI-friendly)
- **`hono search <query>`** - Search documentation (outputs JSON with URLs and paths)
- **`hono request [file]`** - Test app requests without starting a server (default: `src/index.ts`)
- **`hono serve [file]`** - Start Hono app at `http://localhost:7070` with optional middleware via `--use`
- **`hono optimize [entry]`** - Optimize Hono for your app using PreparedRegExpRouter (outputs to `dist/index.js`)

### Quick Examples

```bash
# Search for topics
hono search middleware
hono search "getting started"

# View documentation
hono docs /docs/api/routing
hono docs /docs/api/context
hono docs /docs/guides/middleware

# Test your app (no server needed!)
hono request -P /api/users src/index.ts
hono request -P /api/users -X POST -d '{"name":"Alice"}' src/index.ts

# Start a development server
hono serve src/index.ts

# Apply middleware without changing code
hono serve --use 'logger()' src/index.ts
hono serve --use "logger()" --use "basicAuth({username:'foo',password:'bar'})" src/index.ts

# Serve static files or create reverse proxy
hono serve --use "serveStatic({root:'./'})"

# Optimize your app for production
hono optimize src/index.ts
# Then deploy: wrangler deploy dist/index.js
```

### AI-Oriented Workflow

1. Search documentation: `hono search <query>`
2. Read relevant docs: `hono docs [path]`
3. Test implementation: `hono request [file]`

This workflow allows AI to autonomously search and read documentation, then test implementations without starting servers.

### Human-Oriented Commands

- **`hono serve`**: Start development server with optional middleware via `--use` flag
  - Apply middleware without modifying code: `hono serve --use 'logger()' src/index.ts`
  - Start with empty app by omitting file path
  - Default port: `http://localhost:7070`

- **`hono optimize`**: Optimize your app for production
  - Uses PreparedRegExpRouter for faster initialization and smaller bundle size
  - Outputs optimized code to `dist/index.js`
  - Can reduce bundle size by ~38% compared to standard builds

---

## TanStack Query DevTools for Troubleshooting

**Trigger**: when debugging TanStack Query issues, inspecting cache state, or troubleshooting API calls during development

### Overview

TanStack Query DevTools provides real-time visualization of queries, mutations, cache state, and network activity. This tool is for **development troubleshooting only** (not E2E testing) and pairs well with Chrome DevTools MCP for automated browser inspection.

### Installation

```bash
bun add -d @tanstack/react-query-devtools
```

### Setup (Floating Mode - Recommended)

Add to your main app component (as high as possible in the component tree):

```typescript
// apps/web/src/main.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app components */}
      <ReactQueryDevtools
        initialIsOpen={false}
        buttonPosition="bottom-right"
        position="bottom"
      />
    </QueryClientProvider>
  )
}
```

**Note:** DevTools are automatically excluded from production builds when `process.env.NODE_ENV === 'production'`.

### What You Can Inspect

1. **Query State**
   - Query keys, data, status (loading/success/error)
   - Timestamps (created, updated, last fetch)
   - Stale/fresh status

2. **Cache Inspection**
   - Cached data for all queries
   - Cache keys and their values
   - `staleTime` and `cacheTime` configuration

3. **Mutations**
   - Mutation state, variables, results
   - Retry counts and error details
   - Timeline of mutation lifecycle

4. **Network Activity**
   - Active fetches and refetches
   - Query invalidation events
   - Background refetch behavior

5. **Manual Actions**
   - Manually refetch queries
   - Invalidate specific queries
   - Clear cache for testing

### Common Troubleshooting Workflows

**1. API Call Not Triggering**
```bash
# Steps to debug:
# 1. Open TanStack Query DevTools (click button in bottom-right)
# 2. Find your query in the list (search by query key)
# 3. Check query status and enabled state
# 4. Look for stale cache data being served instead of fresh fetch
```

**2. Stale Data Displayed**
```bash
# Steps to debug:
# 1. Open DevTools and find the query
# 2. Check staleTime and cacheTime settings
# 3. Manually click "Invalidate" to force refetch
# 4. Verify query key includes all dependencies (params, filters, etc.)
```

**3. Mutation Not Updating UI**
```bash
# Steps to debug:
# 1. Open DevTools mutations panel
# 2. Check if onSuccess callback is firing
# 3. Verify query invalidation is happening after mutation
# 4. Look for optimistic update logic in mutation details
```

**4. Infinite Refetch Loop**
```bash
# Steps to debug:
# 1. Open DevTools and monitor query timeline
# 2. Check if query key is changing on every render
# 3. Verify refetchOnWindowFocus and refetchInterval settings
# 4. Look for dependencies causing unnecessary invalidations
```

### MCP Integration (Chrome DevTools)

When using the Chrome DevTools MCP server, AI agents can:

1. **Inspect DevTools state** via browser automation
2. **Take screenshots** of DevTools panel for context
3. **Trigger manual refetches** to test stale data behavior
4. **Invalidate queries programmatically** for cache testing
5. **Monitor network requests** alongside query state

**Example AI Agent Workflow:**
```bash
# AI agent can automate this troubleshooting flow:
# 1. Navigate to page with issue
# 2. Open TanStack Query DevTools
# 3. Take screenshot of DevTools panel
# 4. Analyze query state (keys, status, data)
# 5. Manually trigger refetch to test behavior
# 6. Compare before/after screenshots
# 7. Report findings with context
```

### DevTools Options

- **`initialIsOpen`**: Set to `true` to start with DevTools panel open
- **`buttonPosition`**: Position of toggle button (`"top-left"`, `"top-right"`, `"bottom-left"`, `"bottom-right"`, `"relative"`)
- **`position`**: Position of DevTools panel (`"top"`, `"bottom"`, `"left"`, `"right"`)
- **`styleNonce`**: CSP nonce for inline styles
- **`errorTypes`**: Predefine error triggers for testing error states

### Embedded Mode (Optional)

For custom development tools integration:

```typescript
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'

function CustomDevTools() {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Close' : 'Open'} DevTools
      </button>
      {isOpen && (
        <ReactQueryDevtoolsPanel
          onClose={() => setIsOpen(false)}
          style={{ height: '500px' }}
        />
      )}
    </>
  )
}
```

### Key Reminders

- **Not for E2E testing**: Use DevTools for manual troubleshooting during development, not automated testing
- **Automatic exclusion**: DevTools are excluded from production builds by default
- **Chrome DevTools MCP**: Pairs well with MCP server for AI-driven troubleshooting
- **Real-time inspection**: See exactly what TanStack Query is doing without adding console.log statements

### Related Documentation

- Architecture Section 13.3: Frontend Troubleshooting with TanStack Query DevTools
- Architecture Section 19.1: Monitoring Strategy (includes DevTools)

---

## Git Commit Message Format

**Trigger**: when creating commits

### Conventional Commits Specification

Use the Conventional Commit Messages specification to generate commit messages

The commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

The commit contains the following structural elements, to communicate intent to the consumers of your library:

- **fix**: a commit of the type fix patches a bug in your codebase (this correlates with PATCH in Semantic Versioning).
- **feat**: a commit of the type feat introduces a new feature to the codebase (this correlates with MINOR in Semantic Versioning).
- **BREAKING CHANGE**: a commit that has a footer BREAKING CHANGE:, or appends a ! after the type/scope, introduces a breaking API change (correlating with MAJOR in Semantic Versioning). A BREAKING CHANGE can be part of commits of any type.
- **types other than fix: and feat:** are allowed, for example @commitlint/config-conventional (based on the Angular convention) recommends build:, chore:, ci:, docs:, style:, refactor:, perf:, test:, and others.
- **footers other than BREAKING CHANGE:** <description> may be provided and follow a convention similar to git trailer format.
- Additional types are not mandated by the Conventional Commits specification, and have no implicit effect in Semantic Versioning (unless they include a BREAKING CHANGE). A scope may be provided to a commit's type, to provide additional contextual information and is contained within parenthesis, e.g., feat(parser): add ability to parse arrays.

### Specification Details

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

- Commits MUST be prefixed with a type, which consists of a noun, feat, fix, etc., followed by the OPTIONAL scope, OPTIONAL !, and REQUIRED terminal colon and space.
- The type feat MUST be used when a commit adds a new feature to your application or library.
- The type fix MUST be used when a commit represents a bug fix for your application.
- A scope MAY be provided after a type. A scope MUST consist of a noun describing a section of the codebase surrounded by parenthesis, e.g., fix(parser):
- A description MUST immediately follow the colon and space after the type/scope prefix. The description is a short summary of the code changes, e.g., fix: array parsing issue when multiple spaces were contained in string.
- A longer commit body MAY be provided after the short description, providing additional contextual information about the code changes. The body MUST begin one blank line after the description.
- A commit body is free-form and MAY consist of any number of newline separated paragraphs.
- One or more footers MAY be provided one blank line after the body. Each footer MUST consist of a word token, followed by either a :<space> or <space># separator, followed by a string value (this is inspired by the git trailer convention).
- A footer's token MUST use - in place of whitespace characters, e.g., Acked-by (this helps differentiate the footer section from a multi-paragraph body). An exception is made for BREAKING CHANGE, which MAY also be used as a token.
- A footer's value MAY contain spaces and newlines, and parsing MUST terminate when the next valid footer token/separator pair is observed.
- Breaking changes MUST be indicated in the type/scope prefix of a commit, or as an entry in the footer.
- If included as a footer, a breaking change MUST consist of the uppercase text BREAKING CHANGE, followed by a colon, space, and description, e.g., BREAKING CHANGE: environment variables now take precedence over config files.
- If included in the type/scope prefix, breaking changes MUST be indicated by a ! immediately before the :. If ! is used, BREAKING CHANGE: MAY be omitted from the footer section, and the commit description SHALL be used to describe the breaking change.
- Types other than feat and fix MAY be used in your commit messages, e.g., docs: update ref docs.
- The units of information that make up Conventional Commits MUST NOT be treated as case sensitive by implementors, with the exception of BREAKING CHANGE which MUST be uppercase.
- BREAKING-CHANGE MUST be synonymous with BREAKING CHANGE, when used as a token in a footer.

---

**Last Updated**: 2025-11-05
