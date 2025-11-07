# Brave Search API POC

**Purpose**: Replace Phase 2 WebSearch tool with Brave Search API for automated URL discovery

## Overview

This POC demonstrates using Brave Search API to discover URLs for the 476 pending searches in `search-tracker.json`. It's designed for one-time batch processing of ~500 queries.

**What it does:**
1. Reads pending searches from `search-tracker.json`
2. Executes each search using Brave Search API
3. Filters for authoritative sources (insurance companies, state regulators)
4. Saves results with progress tracking (resumable)
5. Provides integration tools to feed URLs into Phase 2 pipeline

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Test with mock data (no API key needed)
python test_mock.py

# 3. Analyze mock results
python analyze_results.py

# 4. Set your Brave API key for production run
cp .env.example .env
# Edit .env and add your API key

# 5. Run with real API (fully automated)
python brave_search.py --max-queries 10

# 6. Run all 476 searches
python brave_search.py
```

## Setup

### Prerequisites

- Python 3.8+
- Brave Search API key ([Get one here](https://brave.com/search/api/))
- Access to `knowledge-pack-scraper/trackers/search-tracker.json`

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Set API key (choose one method)
# Method 1: Environment variable
export BRAVE_API_KEY="your_api_key_here"

# Method 2: .env file (recommended)
cp .env.example .env
# Edit .env and add: BRAVE_API_KEY=your_key_here
```

## Usage Guide

### 1. Discover URLs with Brave Search

```bash
# Test with mock data (no API key needed)
python brave_search.py --mock --max-queries 5

# Or use the test script
python test_mock.py

# Run with real API (auto-integrates into Phase 2)
python brave_search.py --max-queries 10

# Run all searches (476 queries, ~8-10 minutes with 1.1s delay)
python brave_search.py

# Disable auto-integration (save results only)
python brave_search.py --no-auto-integrate

# Adjust rate limiting (default: 1.1 seconds)
python brave_search.py --delay 2.0

# Custom output directory
python brave_search.py --output-dir ./my-results

# Specify custom tracker location
python brave_search.py --tracker /path/to/search-tracker.json
```

**Features:**
- **Mock mode**: Test without API key using `--mock` flag
- **Auto-integration**: Automatically calls `save-urls.py` after each search (disable with `--no-auto-integrate`)
- **Progress tracking**: If interrupted (Ctrl+C), saves progress and can resume
- **Configurable delay**: Default 1.1s between requests (use `--delay` to change)

### 2. Analyze Results

```bash
# Show statistics
python analyze_results.py

# Show more top URLs
python analyze_results.py --show-top-urls 50

# Custom results directory
python analyze_results.py --results-dir ./my-results
```

**Output includes:**
- Total searches/URLs discovered
- Authoritative vs. non-authoritative URL breakdown
- Category and carrier distribution
- Top domains and duplicate URLs
- Searches with no results

### 3. Integrate with Phase 2 Pipeline

**Note**: By default, `brave_search.py` auto-integrates URLs into Phase 2. Use this script only if you ran with `--no-auto-integrate`.

```bash
# Dry run (preview without executing)
python integrate_results.py --dry-run

# Integrate all results
python integrate_results.py

# Integrate specific search
python integrate_results.py --search-id search_abc123

# Custom paths
python integrate_results.py \
  --results-dir ./my-results \
  --scraper-dir /path/to/knowledge-pack-scraper
```

**What it does:**
- Calls `save-urls.py` for each search result
- Registers URLs in `url-tracker.json`
- Marks searches as completed in `search-tracker.json`
- Commits changes to git automatically

## Features

### URL Discovery (`brave_search.py`)

- ✅ Reads searches from `search-tracker.json`
- ✅ Uses Brave Search API with configurable result count
- ✅ Prioritizes authoritative sources (star-marked in output)
- ✅ Progress tracking with resume capability
- ✅ Rate limiting to respect API limits
- ✅ JSON output compatible with Phase 2 pipeline

### Authoritative Source Detection

The POC prioritizes URLs from:

**Insurance Carriers:**
- geico.com, progressive.com, statefarm.com, allstate.com
- libertymutual.com, farmers.com, nationwide.com, usaa.com
- travelers.com, thehartford.com, amfam.com, erie.com

**State Insurance Departments:**
- insurance.ca.gov, tdi.texas.gov, floir.com, dfs.ny.gov
- insurance.illinois.gov, insurance.ohio.gov, insurance.pa.gov

**Industry Associations:**
- iii.org, naic.org, ambest.com

### Results Analysis (`analyze_results.py`)

- 📊 Overall statistics (total searches, URLs, averages)
- 📁 Category and carrier breakdowns
- 🌐 Top domains by frequency
- 🔗 Duplicate URL detection
- ⚠️ Searches with no results
- 📈 Coverage analysis by carrier

### Phase 2 Integration (`integrate_results.py`)

- 🔄 Automatic `save-urls.py` execution
- 🧪 Dry-run mode for testing
- ✅ Success/failure reporting
- 🎯 Batch or single-search processing

## Output Format

Each search result is saved as `results/search_{id}.json`:

```json
{
  "search_id": "search_abc123xyz",
  "query": "\"GEICO\" \"available in\" states",
  "category": "carrier-states",
  "subcategory": "primary-queries",
  "carrier": "GEICO",
  "priority": "high",
  "searched_at": "2025-11-07T12:00:00Z",
  "urls_found": 15,
  "urls": [
    {
      "url": "https://www.geico.com/information/states/",
      "title": "GEICO State Availability",
      "description": "Find out where GEICO insurance is available...",
      "rank": 1,
      "authoritative": true
    }
  ]
}
```

Progress tracking in `results/progress.json`:

```json
{
  "completed_searches": ["search_abc123", "search_def456"],
  "last_updated": "2025-11-07T12:30:00Z",
  "total_completed": 2
}
```

## Integration with Phase 2 Workflow

### Current Phase 2 Flow (WebSearch-based)

```
select-work.py → claim-search.py → [Agent uses WebSearch tool] → save-urls.py
```

### POC Replacement Flow

```
brave_search.py → analyze_results.py → integrate_results.py → [Phase 2 continues]
```

After integration:
1. URLs are registered in `url-tracker.json` (ready for fetching)
2. Searches are marked as completed in `search-tracker.json`
3. Changes are committed to git
4. Phase 2 pipeline continues with URL fetching and page extraction

## API Rate Limits

Brave Search API limits (Free tier):
- **2,000 queries/month** (sufficient for 476 searches)
- **20 results per query** (POC default)
- **No explicit rate limit**, but `--delay 1.1` is used by default

For production use, consider:
- Brave Data for AI plan: 50,000 queries/month
- Enterprise plan: Custom limits

## Mock Mode

The POC includes a mock mode for testing without an API key:

```bash
# Run with mock data
python brave_search.py --mock

# Or use the test script
python test_mock.py
```

Mock mode:
- ✅ No API key required
- ✅ Generates realistic test data
- ✅ Tests integration with save-urls.py
- ✅ Validates workflow end-to-end
- ⚠️ Uses hardcoded mock results (not real search data)

## Troubleshooting

### API Key Issues

```bash
# Verify API key is set
echo $BRAVE_API_KEY

# Test API key manually
curl -H "X-Subscription-Token: $BRAVE_API_KEY" \
  "https://api.search.brave.com/res/v1/web/search?q=test"
```

### Resume After Interruption

The POC automatically tracks progress. Simply re-run:

```bash
python brave_search.py
# Outputs: "Already completed: 50"
# Continues from search 51
```

### Integration Errors

```bash
# Check if save-urls.py exists
ls ../knowledge-pack-scraper/scripts/save-urls.py

# Test save-urls.py manually
cd ../knowledge-pack-scraper
uv run scripts/save-urls.py --search-id search_test --urls "https://example.com"
```

## Comparison: WebSearch vs. Brave Search API

| Feature | WebSearch (Current) | Brave API (POC) |
|---------|---------------------|-----------------|
| Source | Multiple search engines | Brave Search |
| Speed | Agent-dependent (~30s/search) | Automated (~2s/search) |
| Consistency | Varies by agent | Deterministic API |
| Rate Limits | None (tool-based) | 2,000/month (free tier) |
| Results Quality | High (agent filters) | High (authoritative filtering) |
| Automation | Requires agent interaction | Fully automated |
| Cost | Free (Claude API usage) | Free tier: 2,000 queries/month |

## Limitations (POC Scope)

This is a **proof of concept** for one-time use, not production code:

- ❌ No retry logic for API failures (will skip failed searches)
- ❌ No advanced deduplication (URL hash only)
- ❌ Minimal error handling
- ❌ No logging to file (stdout only)
- ❌ No parallelization (sequential requests)
- ⚠️ Simple authoritative domain detection (hardcoded list)
- ⚠️ Fixed search parameters (20 results, past year freshness)

For production use, consider adding:
- Retry logic with exponential backoff
- Advanced result filtering (content quality, relevance scoring)
- Parallel request processing
- Comprehensive logging and monitoring
- Dynamic authoritative domain discovery

## Files

```
brave-search-poc/
├── README.md                 # This file
├── requirements.txt          # Python dependencies
├── .env.example              # API key template
├── brave_search.py           # Main POC script (auto-integrates with Phase 2)
├── analyze_results.py        # Results analysis tool
├── integrate_results.py      # Manual Phase 2 integration (if needed)
├── test_mock.py              # Mock mode test script
└── results/                  # Output directory (created on first run)
    ├── search_{id}.json      # Individual search results
    └── progress.json         # Progress tracking
```

## Next Steps

After completing the POC:

1. **Review results**: `python analyze_results.py`
2. **Dry-run integration**: `python integrate_results.py --dry-run`
3. **Integrate**: `python integrate_results.py`
4. **Continue Phase 2**: Phase 2 pipeline will fetch and process URLs
5. **Clean up**: Archive `brave-search-poc/` folder (no longer needed)

## Support

For issues specific to:
- **Brave Search API**: https://brave.com/search/api/docs
- **Phase 2 pipeline**: See `docs/knowledge-pack/phase-2-agent-instructions.md`
- **POC bugs**: Check script output and error messages
