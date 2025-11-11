# Insurance Broker Quote Assistant (IQuote Pro)

A multi-agent AI assistant for insurance brokers that uses conversational intake and policy analysis to route shoppers to appropriate carriers and identify savings opportunities.

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your OpenAI API key:

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

Required environment variables:

- `OPENAI_API_KEY` - Your OpenAI API key (required)

Optional environment variables:

- `NODE_ENV` - Environment (default: `development`)
- `API_PORT` - Backend API port (default: `7070`)
- `FRONTEND_PORT` - Frontend dev server port (default: `3000`)
- `LOG_LEVEL` - Logging level (default: `info`)
- `PROGRAM_LOG_FILE` - Program log file path (default: `./logs/program.log`)
- `COMPLIANCE_LOG_FILE` - Compliance log file path (default: `./logs/compliance.log`)

### 3. Run Development Servers

Start both frontend and backend concurrently:

```bash
bun run dev
```

This starts:

- Frontend: `http://localhost:3000` (React with Hot Module Reload)
- Backend: `http://localhost:7070` (Hono API server)

### Individual Workspace Commands

Run frontend only:

```bash
bun run --filter web dev
```

Run backend only:

```bash
bun run --filter api dev
```

## Development Commands

### Testing

Run all tests:

```bash
bun test
```

### Linting

Run Biome linter:

```bash
bun run lint
```

### Type Checking

Type check all workspaces:

```bash
bun run type-check
```

### Formatting

Format all files (Biome + Prettier):

```bash
bun run format
```

Check formatting without changes:

```bash
bun run format:check
```

## Project Structure

This is a Bun monorepo with the following structure:

```
insurance-broker-quote-assistant/
├── apps/                   # Deployable applications
│   ├── web/                # Frontend React SPA
│   └── api/                # Backend Hono API
├── packages/               # Shared packages
│   └── shared/             # Shared types, constants, utilities
├── knowledge_pack/         # Offline insurance data (JSON files)
├── evaluation/             # Test cases + evaluation harness
├── docs/                   # Architecture and decisions
└── logs/                   # Runtime-generated logs
```

## Architecture

For complete architecture documentation, see [docs/architecture/index.md](./docs/architecture/index.md).

### Key Technologies

- **Frontend:** React 18.2, TanStack Router, TanStack Query, Tailwind CSS
- **Backend:** Hono 4.0, OpenAI SDK
- **Language:** TypeScript 5.6+ (strict mode)
- **Package Manager:** Bun 1.3+
- **Linting:** Biome 1.9
- **Formatting:** Prettier 3.0 + prettier-plugin-tailwindcss

## Pre-commit Hooks

Git hooks (via Husky) automatically run before commits:

1. Type check (`bun run type-check`)
2. Lint (`bun run lint`)
3. Format check (`bun run format:check`)

## CI/CD

GitHub Actions CI pipeline runs on pull requests:

- Type checking
- Linting
- Unit tests

See `.github/workflows/ci.yml` for details.

## License

Private project - PEAK6 interview demo
