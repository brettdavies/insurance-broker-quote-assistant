# Knowledge Pack Scraper

Autonomous Python pipeline for scraping insurance data using Brave API and crawl4ai.

## Overview

This package contains the data gathering infrastructure for the Insurance Broker Quote Assistant knowledge pack. It provides a multi-phase pipeline that discovers URLs via Brave search, fetches HTML content, analyzes patterns, filters pages, and extracts structured data.

## Architecture

**Tech Stack:**
- **Language**: Python 3.10+ with `uv` package manager
- **Search API**: Brave Web Search API
- **Web Scraping**: crawl4ai (Playwright-based)
- **Coordination**: Git-based workflow
- **Storage**: Sharded file system (JSON + HTML + Markdown)

**Directory Structure:**
```
knowledge-pack-scraper/
├── lib/                      # Shared utilities
│   ├── tracker_manager.py    # Tracker file I/O
│   ├── id_generator.py       # CUID2 ID generation
│   ├── brave_api_client.py   # Brave API wrapper
│   └── git_utils.py          # Git operations
├── phase1-url-discovery/     # Brave API search execution
├── phase2-page-fetching/     # Concurrent HTML/Markdown fetching
├── phase3-domain-analysis/   # HTML pattern analysis
├── phase4-page-filtering/    # Domain-specific content extraction
├── phase5-data-extraction/   # LLM extraction result storage
├── trackers/                 # 4 JSON tracker files
├── raw/                      # All scraped data (sharded)
│   ├── websearches/          # 26 subdirs (a-z)
│   ├── pages/                # 898 subdirs (a0-zz)
│   └── carriers/             # Extracted data
├── analysis/                 # Domain analysis reports
└── tests/                    # Test suite
```

## Installation

```bash
cd knowledge-pack-scraper

# Install dependencies
uv sync

# Install Playwright browsers (required by crawl4ai)
uv run crawl4ai-setup
```

## Usage

### Pipeline Overview

The scraper follows a 5-phase sequential workflow:

1. **Phase 1: URL Discovery** - Execute Brave API searches, discover URLs
2. **Phase 2: Page Fetching** - Fetch HTML and Markdown content
3. **Phase 3: Domain Analysis** - Analyze HTML patterns for filtering
4. **Phase 4: Page Filtering** - Extract clean content using domain configs
5. **Phase 5: Data Extraction** - Store LLM extraction results

Each phase has dedicated scripts and documentation.

### Phase 1: URL Discovery

Discover insurance-related URLs through Brave API search.

```bash
cd phase1-url-discovery

# Populate search tracker from query list
uv run populate-search-tracker.py

# Execute all pending searches
uv run brave-search.py
```

**Outputs:**
- `raw/websearches/{char}/websearch_{id}.json` - Raw API responses
- `trackers/url-tracker.json` - Discovered URLs (deduplicated)

**See [phase1-url-discovery/README.md](phase1-url-discovery/README.md) for complete documentation.**

---

### Phase 2: Page Fetching

Fetch HTML and Markdown content from discovered URLs using crawl4ai.

```bash
cd phase2-page-fetching

# Fetch all pending URLs (conservative settings)
uv run fetch-url.py --workers 3 --delay 1.0

# Faster fetching (use with caution)
uv run fetch-url.py --workers 5 --delay 0.5 --delay-variance 0.3

# Test with limited URLs
uv run fetch-url.py --limit 10
```

**Outputs:**
- `raw/pages/{prefix}/page_{id}.html` - Raw HTML
- `raw/pages/{prefix}/page_{id}.md` - Markdown conversion
- `trackers/page-tracker.json` - Page metadata

**See [phase2-page-fetching/README.md](phase2-page-fetching/README.md) for complete documentation.**

---

### Phase 3: Domain Analysis

Analyze HTML structure patterns to generate intelligent filtering configurations.

```bash
cd phase3-domain-analysis

# Analyze single domain
uv run analyze-domain-structure.py progressive.com

# Batch analyze all multi-page domains
uv run batch-analyze-domains.py --min-pages 2

# Generate generic fallback config
uv run aggregate-domain-analysis.py
uv run analyze-generic-cohort.py
```

**Outputs:**
- `analysis/domain-reports/{domain}.json` - Domain-specific configs
- `analysis/generic-fallback.json` - Generic filtering config

**See [phase3-domain-analysis/README.md](phase3-domain-analysis/README.md) for complete documentation.**

---

### Phase 4: Page Filtering

Apply domain-specific or generic filtering to extract clean content.

```bash
cd phase4-page-filtering

# Filter all pages
uv run filter-pages.py

# Filter specific domain
uv run filter-pages.py --domain progressive.com --limit 100

# Concurrent filtering
uv run filter-pages.py --workers 20
```

**Outputs:**
- `raw/pages/{prefix}/page_{id}_filtered.md` - Clean content
- `raw/pages/{prefix}/page_{id}_filtered_negative.md` - Removed content
- `raw/pages/{prefix}/page_{id}_quality.json` - Quality metrics

**See [phase4-page-filtering/README.md](phase4-page-filtering/README.md) for complete documentation.**

---

### Phase 5: Data Extraction

Save LLM extraction results for structured insurance data.

```bash
cd phase5-data-extraction

# Save extraction via stdin (recommended)
echo '{"data": [...]}' | uv run save-extraction.py --page-id page_abc123

# Save extraction via argument
uv run save-extraction.py --page-id page_abc123 --data '{"data": [...]}'
```

**Outputs:**
- `raw/carriers/uncategorized/data_{page_id}.raw.json` - Extracted data
- Updated `trackers/page-tracker.json` with extraction status

**See [phase5-data-extraction/README.md](phase5-data-extraction/README.md) for complete documentation.**

---

## Trackers

The system uses 4 tracker files located in `trackers/`:

1. **search-tracker.json** - Search queries to execute (Phase 1)
2. **url-tracker.json** - URLs to fetch (Phase 2)
3. **page-tracker.json** - Pages for extraction (Phase 3-5)
4. **extraction-tracker.json** - Extractions to validate (future)

Tracker files follow a consistent schema with status tracking (`pending`, `in_progress`, `completed`) and metadata for each item.

## Data Storage

All scraped data is stored in `raw/` with sharded directory structure:

### Websearches (Single-char sharding)
```
raw/websearches/
├── a/  (17 files)
├── b/  (10 files)
...
└── z/  (15 files)
Total: 26 directories, 468 files
```

### Pages (Two-char sharding)
```
raw/pages/
├── a0/  (4 files)
├── tk/  (22 files)  ← Largest shard
...
└── zz/  (6 files)
Total: 898 directories, 5,850 files
```

**Sharding benefits:**
- Improved filesystem performance (16 files/dir avg vs 5,850 flat)
- Faster directory listings
- Better scalability for future growth

## Testing

The scraper includes a comprehensive test suite.

### Run Tests

```bash
cd tests

# URL deduplication tests
uv run test_url_deduplication.py

# JSON conflict resolver tests
uv run test_json_conflict_resolver.py
```

**See [tests/README.md](tests/README.md) for complete test documentation.**

## Git Coordination

Scripts coordinate via Git for concurrency control:
- Pull before claiming work (via `git_utils.py`)
- Commit changes immediately after updates
- Push with automatic retry on conflict
- All scripts use centralized `git_utils.py` module

## Environment Variables

Required for Phase 1 (URL Discovery):
```bash
export BRAVE_WEB_API_TOKEN_FREE="your_free_token"
export BRAVE_WEB_API_TOKEN_PAID="your_paid_token"  # Optional fallback
```

## Monitoring Progress

Check tracker status:
```bash
cd knowledge-pack-scraper
uv run python3 -c "
import json
for tracker in ['search', 'url', 'page', 'extraction']:
    with open(f'trackers/{tracker}-tracker.json') as f:
        data = json.load(f)
        print(f'{tracker}: {data[\"statusCounts\"]}')"
```

Check recent activity:
```bash
git log --oneline --since="1 hour ago"
```

## Troubleshooting

### Playwright browser not found
```bash
uv run crawl4ai-setup
```

### Import errors from phase subdirectories
Ensure you're using the correct path for lib imports:
```python
sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))
```

### Tracker file locked/corrupted
Trackers use JSON with no locks. If corrupted, restore from git history.

### Git conflicts
Scripts handle conflicts automatically via `git_utils.py`. Manual resolution rarely needed.

### Rate limiting (Brave API)
Free tier: 1 req/sec (handled automatically)
Paid tier: Automatic fallback after free exhausted

### Memory issues (Phase 2)
Reduce `--workers` or increase `--delay` to limit concurrent fetches.

## Performance Characteristics

**Phase 1 (URL Discovery):**
- ~476 searches @ 1 req/sec = 8-10 minutes
- Deduplication: 70% reduction (20,169 URLs → ~6,000 unique)

**Phase 2 (Page Fetching):**
- ~2,925 pages @ 3 workers, 1s delay = 15-20 minutes
- Bandwidth: 7-9 GB total (HTML + Markdown)

**Phase 3 (Domain Analysis):**
- ~75 multi-page domains @ 20 batch size = 2-3 minutes

**Phase 4 (Page Filtering):**
- ~2,925 pages @ 20 workers = 5-10 minutes

**Phase 5 (Data Extraction):**
- Per-page processing (LLM-dependent)

## Archived Scripts

Deprecated agent-coordination scripts are in `archive/agent-coordination/`:
- These were used for multi-agent concurrent coordination
- Replaced by sequential phase-based workflow
- Kept for reference only

## Contributing

When adding new scripts:
1. Place in appropriate phase directory
2. Use `sys.path.insert(0, str(Path(__file__).parent.parent / 'lib'))` for imports
3. Follow tracker_manager patterns for status updates
4. Include git coordination via `git_utils.py`
5. Add documentation to phase README

## Related Documentation

- [Phase 1 README](phase1-url-discovery/README.md) - URL Discovery
- [Phase 2 README](phase2-page-fetching/README.md) - Page Fetching
- [Phase 3 README](phase3-domain-analysis/README.md) - Domain Analysis
- [Phase 4 README](phase4-page-filtering/README.md) - Page Filtering
- [Phase 5 README](phase5-data-extraction/README.md) - Data Extraction
- [Test Suite README](tests/README.md) - Testing Documentation
