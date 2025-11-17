# Development Guide

This document contains setup and development instructions for the Insurance Broker Quote Assistant project.

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your Google Gemini API key:

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

Required environment variables:

- `GEMINI_API_KEY` - Your Google Gemini API key (required)

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

