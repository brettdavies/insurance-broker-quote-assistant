# Knowledge Pack Scraper (Phase 2)

Autonomous Python agents for scraping insurance data using crawl4ai.

## Overview

This package contains the Phase 2 data gathering infrastructure for the Insurance Broker Quote Assistant knowledge pack. It runs multiple independent Python agents that coordinate via GitHub to scrape, fetch, and extract insurance data from web sources.

## Architecture

- **Language**: Python 3.10+ with `uv` package manager
- **Agent Model**: Multiple independent processes (3-5 parallel)
- **Coordination**: GitHub as single source of truth
- **Trackers**: 3 separate JSON files (waterfall selection)
- **Output**: Dual format storage (HTML + Markdown) in `../knowledge_pack/raw/`

## Installation

```bash
cd knowledge-pack-scraper

# Install dependencies
uv sync

# Install Playwright browsers (required by crawl4ai)
uv run crawl4ai-setup
```

## Usage

### Agent-Driven Model

Phase 2 uses **individual scripts** that agents call in sequence. Each script outputs JSON with explicit `next_steps` instructions.

**Claude Code agents should:**
1. Start with `select-work.py` to find work
2. Read `next_steps` from output
3. Follow instructions exactly
4. Repeat until Phase 2 complete

### Script Reference

#### 1. select-work.py - Find Next Work Item

```bash
cd knowledge-pack-scraper
uv run scripts/select-work.py
```

Returns work item with waterfall priority (search → url → page).

#### 2. claim-search.py - Claim Search for Execution

```bash
uv run scripts/claim-search.py --id search_abc123
```

Claims search, outputs query for agent to perform WebSearch.

#### 3. save-urls.py - Save Discovered URLs

```bash
uv run scripts/save-urls.py --search-id search_abc123 --urls https://url1.com https://url2.com
```

Saves 4-6 URLs after agent performs WebSearch.

#### 4. fetch-url.py - Autonomous URL Fetching

```bash
uv run scripts/fetch-url.py --id url_xyz789
```

Fully autonomous: claims URL, fetches with crawl4ai, saves HTML+MD, commits.

#### 5. claim-page.py - Claim Page for Extraction

```bash
uv run scripts/claim-page.py --id page_def456
```

Claims page, outputs content for agent to perform LLM extraction.

#### 6. save-extraction.py - Save Extracted Data

```bash
echo '[{...data...}]' | uv run scripts/save-extraction.py --page-id page_def456
```

Saves extraction results from agent's LLM extraction. Raw data file named by page_id.

#### 7. git-commit.py - Centralized Git Operations

```bash
uv run scripts/git-commit.py --type claim --id search_abc123 --message "GEICO discounts"
```

Called internally by other scripts (agents typically don't call directly).

### Complete Workflow Example

```bash
# 1. Agent selects work
$ uv run scripts/select-work.py
# Output: "Run: uv run scripts/claim-search.py --id search_abc123"

# 2. Agent claims search
$ uv run scripts/claim-search.py --id search_abc123
# Output: "Perform WebSearch with query: 'GEICO discounts'"

# 3. Agent performs WebSearch (Claude tool)
# (Agent finds 4-6 URLs)

# 4. Agent saves URLs
$ uv run scripts/save-urls.py --search-id search_abc123 --urls <url1> <url2>
# Output: "Continue with: uv run scripts/select-work.py"

# 5. Repeat...
```

See [docs/knowledge-pack/phase-2-agent-instructions.md](../docs/knowledge-pack/phase-2-agent-instructions.md) for complete documentation.

## Output

All scraped data is saved to `../knowledge_pack/raw/`:
- `_pages/page_{id}.html` - Raw HTML from crawl4ai
- `_pages/page_{id}.md` - Markdown conversion from crawl4ai
- `carriers/`, `states/`, etc. - Extracted data points

## Trackers

The system uses 4 tracker files located in `trackers/`:

1. **trackers/search-tracker.json** - Searches to execute
2. **trackers/url-tracker.json** - URLs to fetch
3. **trackers/page-tracker.json** - Pages to extract data from
4. **trackers/extraction-tracker.json** - Extractions to validate and commit

Agents check these in waterfall order, picking the first available work from the highest priority tracker.

## Git Coordination

Agents coordinate via GitHub:
- Pull before claiming work
- Commit claim immediately
- Push with automatic retry on conflict
- Re-check ownership after rebase
- Abandon work if lost race condition

## Rate Limiting

- 5-second sleep at start of each loop iteration
- crawl4ai's built-in adaptive rate limiting
- Exponential backoff on failures

## Monitoring Progress

Check work summary:

```bash
cd knowledge-pack-scraper
uv run scripts/select-work.py
```

Shows pending counts for all trackers.

Check recent git commits:

```bash
git log --oneline --since="10 minutes ago"
```

Shows activity from all agents.

## Troubleshooting

### Playwright browser not found
```bash
uv run crawl4ai-setup
```

### Git conflicts
Agents handle conflicts automatically. If manual resolution needed:
```bash
git pull --rebase
# Resolve conflicts
git rebase --continue
git push
```

### Check for stuck work
Look for items claimed >30 minutes ago - may need manual intervention.
