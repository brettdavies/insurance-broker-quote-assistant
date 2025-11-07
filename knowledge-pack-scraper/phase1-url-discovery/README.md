# Phase 1: URL Discovery

Autonomous URL discovery for the insurance knowledge pack using Brave Web Search API.

## Overview

Phase 1 executes the first stage of the knowledge pack scraping pipeline: discovering insurance-related URLs through programmatic web searches. This phase parses a curated set of search queries from domain expertise documentation and uses Brave Search API to find relevant pages.

**Key objectives:**
- Extract search queries from authoritative sources (SOT documentation)
- Execute Brave API searches with proper rate limiting and token management
- Deduplicate discovered URLs across multiple searches
- Track search provenance (which searches found which URLs)
- Generate `search-tracker.json` and `url-tracker.json` for downstream phases

## Scripts

### 1. `populate-search-tracker.py`

Parses search queries from the SOT (source of truth) documentation and generates the search tracker.

**Usage:**
```bash
cd phase1-url-discovery
uv run populate-search-tracker.py
```

**What it does:**
1. Reads `/docs/knowledge-pack/sot-search-queries.md`
2. Parses all search queries organized by category and subcategory
3. Generates unique search IDs using `cuid2` format (`search_{cuid2}`)
4. Creates search-tracker with all required metadata fields
5. Writes output to `../trackers/search-tracker.json`

**Input:**
- **Source File:** `/docs/knowledge-pack/sot-search-queries.md`
- Format: Markdown with hierarchical headers (categories) and code blocks (queries)
- Categories: Carrier states, discounts, eligibility, pricing, compliance, etc.
- Each query is tagged with: category, subcategory, carrier (if applicable), priority

**Output:**
- **File:** `../trackers/search-tracker.json`
- **Schema:** Multi-step-v1 (version 2.0)
- **Structure:**
  ```json
  {
    "meta": {
      "version": "2.0",
      "schemaVersion": "multi-step-v1",
      "createdDate": "2025-11-06",
      "lastUpdated": "2025-11-07T12:35:10.563841",
      "totalSearches": 476,
      "description": "Phase 1 search execution tracker"
    },
    "statusCounts": {
      "pending": 476,
      "claimed": 0,
      "urls_discovered": 0,
      "completed": 0,
      "failed": 0
    },
    "searches": [
      {
        "id": "search_q5vmceqgcjyaobydy6q2xpuc",
        "query": "\"GEICO\" \"available in\" states",
        "category": "carrier-states",
        "subcategory": "primary-queries",
        "carrier": "GEICO",
        "priority": "high",
        "status": "pending",
        "lastrunAt": null,
        "notes": null
      },
      ...
    ]
  }
  ```

**Exit codes:**
- `0` - Success
- Non-zero - Error during parsing or file I/O

**Dependencies:**
- `lib/id_generator.py` - For generating unique search IDs
- Python 3.10+

---

### 2. `brave-search.py`

Executes Brave API searches for all pending queries and populates the URL tracker.

**Usage:**
```bash
cd phase1-url-discovery
uv run brave-search.py
```

**What it does:**
1. Loads search-tracker from `../trackers/search-tracker.json`
2. Finds all searches with status `pending`
3. For each search:
   - Generates unique websearch ID (`websearch_{cuid2}`)
   - Calls Brave Web Search API with rate limiting
   - Saves raw request/response to `../raw/websearches/{first_char}/websearch_{id}.json`
   - Extracts URLs with Brave API enrichment data
   - Deduplicates URLs using SHA256 hash of normalized URLs
   - Updates URL tracker with new URLs
   - Marks search as `completed` and updates timestamp
4. Saves updated trackers
5. Outputs JSON summary to stdout (progress to stderr)

**Input:**
- **Search Tracker:** `../trackers/search-tracker.json`
- All searches with status = `"pending"` are executed
- Existing URL Tracker (if present): `../trackers/url-tracker.json`

**Output:**

#### Raw Websearch Files
- **Location:** `../raw/websearches/{first_char}/` (sharded by first character of websearch ID)
- **Filename:** `websearch_{cuid2}.json`
- **Example path:** `../raw/websearches/a/websearch_axyz1234567890abc.json`
- **Schema:** Includes request params, full Brave API response, execution metadata
  ```json
  {
    "websearch_id": "websearch_axyz...",
    "search_id": "search_q5vm...",
    "timestamp": "2025-11-07T12:20:15.560234",
    "startedAt": "2025-11-07T12:20:15.560234",
    "completedAt": "2025-11-07T12:20:17.486542",
    "durationSeconds": 2.12,
    "urlsDiscoveredCount": 20,
    "errorMessage": null,
    "request": {
      "endpoint": "https://api.search.brave.com/res/v1/web/search",
      "query": "\"GEICO\" \"available in\" states",
      "params": {
        "safesearch": "strict",
        "freshness": "py",
        "count": 20,
        ...
      }
    },
    "response": { ... }  // Full Brave API response
  }
  ```

#### URL Tracker
- **File:** `../trackers/url-tracker.json`
- **Schema:** Multi-step-v1 (version 1.0)
- **Structure:**
  ```json
  {
    "meta": {
      "version": "1.0",
      "schemaVersion": "multi-step-v1",
      "createdDate": "2025-11-06",
      "lastUpdated": "2025-11-07T13:46:11.087336",
      "totalUrls": 2950,
      "description": "Phase 1 URL discovery tracker"
    },
    "statusCounts": {
      "pending": 100,
      "completed": 2850,
      "failed": 0
    },
    "urls": [
      {
        "id": "url_bfbzqxx3idlbpn96xa3uvsx9",
        "search_ids": ["search_q5vm...", "search_dehg..."],
        "websearch_ids": ["websearch_rjkp...", "websearch_dgle..."],
        "url": "https://www.cnbc.com/select/the-best-car-insurance-discounts-of-2025/",
        "urlHash": "49c5442713cc4c0a",
        "priority": null,
        "title": "The best car insurance discounts of 2025",
        "description": "Geico auto insurance is available in all 50 U.S. states...",
        "page_age": "2025-09-30T11:18:01",
        "language": "en",
        "type": "search_result",
        "subtype": "article",
        "hostname": "www.cnbc.com",
        "source_name": "CNBC",
        "status": "pending",
        "assignedTo": null,
        "pageId": null,
        "htmlFile": null,
        "markdownFile": null,
        "fetchedAt": null,
        "fetchError": null,
        "retryCount": 0
      },
      ...
    ]
  }
  ```

#### Search Tracker Updates
- Updated with completion status and timestamps
- `search-tracker.json` written back with `statusCounts` updated

#### Stdout Summary
```json
{
  "success": true,
  "message": "Brave API search execution completed",
  "searches_completed": 468,
  "total_urls_discovered": 9600,
  "new_urls_added": 2925,
  "duplicates_found": 6675,
  "total_urls_in_tracker": 2925
}
```

#### Stderr Progress
Real-time progress logged per search:
```
[1/476] (0.2%) "GEICO" "available in" states...
{
  "websearch_id": "websearch_...",
  "urls_discovered": 20,
  "new_urls": 5,
  "duplicates": 15
}
```

**API Parameters:**
```json
{
  "q": "<search_query>",
  "safesearch": "strict",
  "freshness": "py",
  "text_decorations": false,
  "result_filter": "web,query",
  "extra_snippets": false,
  "summary": false,
  "count": 20,
  "offset": 0
}
```

**Rate Limiting:**
- 1.1 second delay enforced between consecutive API requests
- Respects Brave API `Retry-After` headers
- Automatic fallback from free to paid token tier on 401/429 errors

**Exit codes:**
- `0` - Success
- `1` - Missing API tokens
- `2` - Rate limit exceeded
- `3` - HTTP error
- `4` - JSON parse error
- `5` - Request timeout
- `6` - Network error

**Dependencies:**
- `lib/brave_api_client.py` - Brave API client with rate limiting
- `lib/id_generator.py` - ID generation for websearch and URL entries
- `lib/tracker_manager.py` - Tracker file I/O
- Python 3.10+

---

## Data Files

### Input Files

#### SOT Search Queries
- **Path:** `../../docs/knowledge-pack/sot-search-queries.md`
- **Format:** Markdown with hierarchical structure
- **Content:**
  - Categories: Insurance types (auto, home), risk elements, compliance areas
  - Subcategories: Carrier-specific, state-specific, discount queries
  - Each category contains code blocks with individual search queries
- **Parser:** `populate-search-tracker.py` extracts:
  - Query text
  - Category slug (derived from heading)
  - Subcategory slug
  - Carrier (extracted from query content)
  - Priority (derived from category importance)

### Output Files

#### Search Tracker
- **Path:** `../trackers/search-tracker.json`
- **Purpose:** Single source of truth for search execution state
- **Fields:**
  - `id` - Unique search identifier (cuid2-based)
  - `query` - The search query string
  - `category` - Insurance category (carrier-states, discounts, etc.)
  - `subcategory` - Finer-grained categorization
  - `carrier` - Insurance carrier (GEICO, Progressive, State Farm, or null)
  - `priority` - Execution priority (high/medium/low)
  - `status` - Current state (pending/completed/failed)
  - `lastrunAt` - ISO timestamp of last execution
  - `notes` - Optional notes or error messages
- **Status Values:**
  - `pending` - Awaiting execution
  - `completed` - Successfully executed
  - `failed` - Execution failed with error

#### URL Tracker
- **Path:** `../trackers/url-tracker.json`
- **Purpose:** Deduplicated URL inventory for Phase 2 fetching
- **Deduplication:** URLs normalized (lowercase, remove protocol/trailing slash) and hashed with SHA256
- **Multi-search Provenance:** Each URL tracks all `search_ids` and `websearch_ids` that discovered it
- **Enrichment Fields** (from Brave API):
  - `title` - Page title from search result
  - `description` - Snippet from search result
  - `page_age` - Last modified timestamp
  - `language` - Detected page language
  - `type` - Result type (search_result)
  - `subtype` - Result subtype (article, news, etc.)
  - `hostname` - Domain of URL
  - `source_name` - Source name (CNBC, etc.)
- **Phase 2 Integration:**
  - `status` - Tracks fetching state (pending/completed/failed)
  - `pageId` - Assigned by Phase 2 after successful fetch
  - `htmlFile` - Path to saved HTML
  - `markdownFile` - Path to saved Markdown

#### Raw Websearch Files
- **Path:** `../raw/websearches/{first_char}/websearch_{cuid2}.json`
- **Sharding:** Distributes files across 26 directories (a-z) by first character after `websearch_` prefix
- **Purpose:** Audit trail for every API request/response
- **Includes:**
  - Full Brave API request parameters
  - Full Brave API response (all fields)
  - Execution metadata (timestamps, duration, counts)
  - Link back to original search via `search_id`

---

## Environment Variables

**Required:** At least one of the following must be set:

| Variable | Description | Required |
|----------|-------------|----------|
| `BRAVE_WEB_API_TOKEN_FREE` | Free tier API token (2k queries/month) | At least one |
| `BRAVE_WEB_API_TOKEN_PAID` | Paid tier API token (fallback) | At least one |

**How Tokens Are Used:**
1. Free token used first (if available)
2. On 401/429 error, automatically switches to paid token
3. Queries resume immediately with paid token
4. Both tokens can be used in a single execution

**Setup:**
```bash
# Add to ~/.zshrc, ~/.bash_profile, or your environment
export BRAVE_WEB_API_TOKEN_FREE="your-free-token-here"
export BRAVE_WEB_API_TOKEN_PAID="your-paid-token-here"

# Or set before running script
BRAVE_WEB_API_TOKEN_FREE=xxx uv run brave-search.py
```

**Obtaining Tokens:**
1. Visit [Brave Search API](https://api.search.brave.com/)
2. Sign up for free tier (includes monthly quota)
3. Generate API token from dashboard
4. For paid tier, enable billing and token will auto-upgrade

---

## Execution Flow

### Complete Workflow

```bash
# 1. Generate search tracker from SOT documentation
cd phase1-url-discovery
uv run populate-search-tracker.py

# Output:
# {
#   "success": true,
#   "message": "Generated 476 searches across 13 categories",
#   "total_searches": 476,
#   "categories": 13,
#   "tracker_file": ".../trackers/search-tracker.json",
#   "breakdown": {
#     "carrier-states": 45,
#     "carrier-discounts-auto": 67,
#     ...
#   }
# }

# 2. Execute searches via Brave API
uv run brave-search.py

# Output:
# [1/476] (0.2%) "GEICO" "available in" states...
# {
#   "websearch_id": "websearch_rjkpy2qz8juh0frtp8jqebis",
#   "urls_discovered": 20,
#   "new_urls": 5,
#   "duplicates": 15
# }
# ... [progress for each search]
#
# {
#   "success": true,
#   "message": "Brave API search execution completed",
#   "searches_completed": 468,
#   "total_urls_discovered": 9600,
#   "new_urls_added": 2925,
#   "duplicates_found": 6675,
#   "total_urls_in_tracker": 2925
# }
```

### Resumability

Both scripts are idempotent and resumable:

- **`populate-search-tracker.py`** - Overwrites tracker, safe to re-run
- **`brave-search.py`** - Only processes `pending` searches
  - If interrupted, re-run and it continues with remaining searches
  - Completed searches are skipped
  - URL deduplication prevents duplicates if re-run

---

## Troubleshooting

### Missing API Token
**Error:** `MISSING_TOKENS: Neither BRAVE_WEB_API_TOKEN_FREE nor BRAVE_WEB_API_TOKEN_PAID found`

**Fix:**
```bash
# Check environment
echo $BRAVE_WEB_API_TOKEN_FREE

# Set token and retry
export BRAVE_WEB_API_TOKEN_FREE="your-token"
uv run brave-search.py
```

### Authentication Failed
**Error:** `AUTH_FAILED: Brave API authentication failed`

**Causes:**
- Invalid token (expired, revoked, or typo)
- Token type mismatch (free token doesn't exist, paid token exhausted)

**Fix:**
1. Verify token is correct: `echo $BRAVE_WEB_API_TOKEN_FREE`
2. Test token directly:
   ```bash
   curl -H "X-Subscription-Token: $BRAVE_WEB_API_TOKEN_FREE" \
     "https://api.search.brave.com/res/v1/web/search?q=test"
   ```
3. Generate new token from Brave dashboard
4. Update environment variable and retry

### Rate Limit Exceeded
**Error:** `RATE_LIMIT: Brave API rate limit exceeded`

**Cause:** Token quota exhausted (free: 10k/month, paid: varies)

**Fix:**
1. Wait for quota reset (monthly for free tier)
2. Switch to paid token if available
3. Upgrade account at [Brave API Dashboard](https://api.search.brave.com/)

### Invalid JSON Response
**Error:** `INVALID_JSON: Failed to parse JSON response`

**Cause:** Network issue, malformed response, or API outage

**Fix:**
- Check network connectivity
- Verify Brave API status: https://status.search.brave.com/
- Retry after waiting (exponential backoff)

### File Permission Denied
**Error:** `PermissionError: [Errno 13] Permission denied: '../trackers/search-tracker.json'`

**Fix:**
```bash
# Fix permissions on trackers directory
chmod 755 ../trackers
chmod 644 ../trackers/*.json

# Or remove read-only file and retry
rm ../trackers/search-tracker.json
uv run populate-search-tracker.py
```

### Search Queries Not Found
**Error:** `FileNotFoundError: ../../docs/knowledge-pack/sot-search-queries.md`

**Fix:**
- Verify file exists: `ls ../../docs/knowledge-pack/sot-search-queries.md`
- Check working directory is `phase1-url-discovery`
- Verify path relative to script location

### No Pending Searches
**Message:** `No pending searches found` (exit code 0)

**Cause:** All searches already completed

**Fix:**
- Check tracker status: `jq '.statusCounts' ../trackers/search-tracker.json`
- To re-run all searches:
  ```bash
  # Update search statuses back to pending
  jq '.searches[] |= .status = "pending"' ../trackers/search-tracker.json | sponge ../trackers/search-tracker.json

  # Or regenerate tracker
  uv run populate-search-tracker.py
  ```

---

## Configuration & Customization

### Changing Search Parameters

Edit `brave-search.py` function `save_websearch_raw()`:
```python
"params": {
    "safesearch": "strict",      # "strict" | "moderate" | "off"
    "freshness": "py",           # "py" (past year) | "pm" (past month) | etc.
    "text_decorations": False,   # Include formatting in results
    "result_filter": "web,query", # Result types to include
    "extra_snippets": False,     # Additional snippets per result
    "summary": False,            # AI-generated summary
    "count": 20,                 # Results per query (1-20)
    "offset": 0                  # Result pagination
}
```

### Changing Rate Limit

Edit `lib/brave_api_client.py`:
```python
RATE_LIMIT_DELAY = 1.1  # seconds between requests
```

### Modifying Search Queries

Edit `../../docs/knowledge-pack/sot-search-queries.md`:
- Add new categories with `## N. Category Name`
- Add subcategories with `### Subcategory Name`
- Add queries in code blocks (` ``` `)

Then regenerate tracker:
```bash
uv run populate-search-tracker.py
```

---

## Performance

**Typical Metrics (476 searches):**
- Execution time: ~8-10 minutes (1.1s rate limit)
- URLs discovered: 9,500-10,000
- Deduplicated URLs: 2,900-3,000 unique
- Deduplication ratio: ~70% (many carriers indexed by multiple queries)
- Raw websearch files: 476 JSON files (~2.5MB total)

**Optimization Tips:**
- Use paid token to avoid rate limit interruptions
- Run during off-peak hours for better Brave API performance
- Pre-check token validity before starting long runs

---

## Integration with Other Phases

Phase 1 output feeds into **Phase 2: Page Fetching**

**Handoff:**
1. `url-tracker.json` consumed by Phase 2
2. `search-tracker.json` updated with completion timestamps
3. `raw/websearches/` preserved as audit trail
4. Phase 2 fetches URLs and populates `pageId`, `htmlFile`, `markdownFile`

**Next Steps:**
See `../phase2-page-fetching/README.md` for Phase 2 usage

---

## Reference

### ID Format Reference

All IDs use `cuid2` (collision-resistant UUIDs):

- **Search ID:** `search_{cuid2}` (25 chars, e.g., `search_q5vmceqgcjyaobydy6q2xpuc`)
- **Websearch ID:** `websearch_{cuid2}` (25 chars, e.g., `websearch_rjkpy2qz8juh0frtp8jqebis`)
- **URL ID:** `url_{cuid2}` (25 chars, e.g., `url_bfbzqxx3idlbpn96xa3uvsx9`)

### Category Reference

Populated from `sot-search-queries.md`:

| Category | Description | Priority |
|----------|-------------|----------|
| `carrier-states` | Insurance availability by state | High |
| `carrier-discounts-auto` | Auto insurance discounts | High |
| `carrier-discounts-home` | Home insurance discounts | Medium |
| `carrier-eligibility-auto` | Auto eligibility requirements | High |
| `carrier-eligibility-home` | Home eligibility requirements | Medium |
| `state-minimums-auto` | State minimum auto coverage | High |
| `industry-pricing` | Pricing benchmarks | High |
| `broker-commission` | Broker compensation | Medium |
| `product-coverage` | Coverage definitions | Medium |
| `state-specific` | State regulations | Medium |
| `compliance` | Compliance & prohibited items | High |
| `carrier-discount-stacking` | Discount combination rules | High |
| `industry-benchmarking` | Industry data sources | Medium |

---

## License & Attribution

Part of the Insurance Broker Quote Assistant knowledge pack infrastructure.

See `/CLAUDE.md` for critical development rules.
