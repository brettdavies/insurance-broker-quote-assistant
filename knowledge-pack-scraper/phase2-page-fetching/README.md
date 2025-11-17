# Phase 2: Page Fetching

Concurrent HTML and Markdown fetching from URLs discovered in Phase 1 using crawl4ai's streaming architecture.

## Overview

Phase 2 retrieves full page content (HTML and Markdown) from the URLs discovered in Phase 1 URL Discovery. This phase uses **crawl4ai's asynchronous streaming API** with intelligent concurrency management to efficiently fetch thousands of pages while respecting rate limits and system resources.

**Key Characteristics:**
- Concurrent fetching with auto-scaled worker management via `MemoryAdaptiveDispatcher`
- Dual-format output (HTML + Markdown) for maximum compatibility with downstream processing
- Content-aware sharding: pages stored in `pages/{first_2_chars}/page_{id}.{html|md}` for efficient filesystem operations
- Built-in rate limiting with configurable mean delay and variance
- Streaming results processing for memory efficiency
- Atomic tracker updates with detailed fetch metadata

## Architecture

### Processing Flow

```
URL Tracker (2,950 URLs)
        ↓
  fetch-url.py
        ↓
    crawl4ai arun_many()
    - MemoryAdaptiveDispatcher (auto-scales workers)
    - Streaming result iteration
    - Built-in rate limiting
        ↓
    Save HTML + Markdown
        ↓
Update Trackers:
  - url-tracker.json (add pageId, htmlFile, markdownFile)
  - page-tracker.json (register new page for Phase 3)
```

### Concurrency Strategy

The script uses **MemoryAdaptiveDispatcher** for intelligent worker management:

```python
dispatcher = MemoryAdaptiveDispatcher(
    memory_threshold_percent=70.0,     # Keep memory usage below 70%
    max_session_permit=args.workers    # Cap concurrent sessions
)
```

This ensures that:
- Worker count automatically adjusts based on system memory availability
- Never exceeds `--workers` parameter limit
- Gracefully degrades under memory pressure
- No manual session management required

### File Storage Structure

Pages are stored in a sharded directory structure for efficient filesystem operations:

```
raw/pages/
├── a0/
│   ├── page_a0i1trhdd43qn9vxswno89hr.html   (2.0 MB)
│   ├── page_a0i1trhdd43qn9vxswno89hr.md     (51 KB)
│   ├── page_a0vtga8jmzcxa0hvgwkrehb2.html   (1.8 MB)
│   └── page_a0vtga8jmzcxa0hvgwkrehb2.md     (47 KB)
├── a1/
│   ├── page_a1xyz...html
│   ├── page_a1xyz...md
│   └── ...
├── ...
└── zz/
    └── page_zz...
```

**Sharding Logic:** First 2 characters after the `page_` prefix determine directory.
- Example: `page_a0i1trhdd43qn9vxswno89hr` → stored in `a0/`
- Distributes ~900 URLs per shard (~32 shards total)
- Reduces filesystem inode contention for large directories

## Script: fetch-url.py

### Purpose

Autonomous concurrent fetching of pending URLs from the url-tracker. Saves both HTML and Markdown, registers pages in page-tracker for Phase 3 data extraction.

### Usage

```bash
cd knowledge-pack-scraper/phase2-page-fetching

# Standard fetch: 3 concurrent workers, 1 second mean delay
uv run fetch-url.py

# Custom concurrency: 5 workers, aggressive fetching (0.5s delay)
uv run fetch-url.py --workers 5 --delay 0.5

# Conservative mode: 2 workers, 2 second delay + variance
uv run fetch-url.py --workers 2 --delay 2.0 --delay-variance 0.5

# Test with limit: fetch only first 10 pending URLs
uv run fetch-url.py --limit 10

# Combined: test with custom settings
uv run fetch-url.py --workers 2 --delay 1.5 --delay-variance 0.3 --limit 25
```

### Command-Line Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--workers N` | int | 3 | Maximum concurrent worker sessions (auto-scaled by memory) |
| `--delay SECONDS` | float | 1.0 | Mean delay between requests (baseline for random distribution) |
| `--delay-variance SECS` | float | 0.2 | Random variance added to delay ±SECS (exponential distribution) |
| `--limit N` | int | None | Limit to first N pending URLs (disabled if not specified) |

### Implementation Details

#### Crawl4ai Configuration

```python
config = CrawlerRunConfig(
    stream=True,                    # Enable streaming for memory efficiency
    mean_delay=args.delay,          # Seconds between requests (baseline)
    max_range=args.delay_variance,  # Random variance (±range)
    cache_mode=CacheMode.BYPASS     # Always fetch fresh, no caching
)
```

**Configuration Notes:**
- `stream=True` processes results as they arrive, not buffered in memory
- `mean_delay` + random variance ensures respectful rate limiting
- `CacheMode.BYPASS` ensures Phase 2 always fetches fresh content
- Single config instance reused for all URLs (more efficient)

#### Result Processing

For each successful fetch:

1. **Generate Page ID:** Create unique `page_` ID using cuid2
2. **Extract Shard Prefix:** Take first 2 chars of page ID (e.g., `a0i1t...` → `a0/`)
3. **Create Shard Directory:** Ensure `raw/pages/{prefix}/` exists
4. **Save Files:**
   - HTML: `raw/pages/{prefix}/page_{id}.html`
   - Markdown: `raw/pages/{prefix}/page_{id}.md`
5. **Update Trackers:**
   - **url-tracker.json:** Add pageId, htmlFile, markdownFile, fetchedAt
   - **page-tracker.json:** Register new page with metadata for Phase 3

#### Failure Handling

Failed fetches are tracked without deletion:

```python
if not result.success:
    tm.update_status('url', url_id, 'failed', {
        'fetchError': result.error_message,
        'retryCount': url_entry.get('retryCount', 0) + 1
    })
```

**Retry Strategy:** URL remains in tracker with incremented retryCount for manual intervention or retry logic in orchestration layer.

### Input Format

#### url-tracker.json (Relevant Fields)

```json
{
  "urls": [
    {
      "id": "url_bfbzqxx3idlbpn96xa3uvsx9",
      "url": "https://www.example.com/article",
      "status": "pending",
      "search_ids": ["search_q5vm..."],
      "hostname": "www.example.com",
      "source_name": "Example Site",
      "retryCount": 0
    }
  ],
  "statusCounts": {
    "pending": 2950,
    "fetching": 0,
    "completed": 0,
    "failed": 0
  }
}
```

**Query Filter:** Script processes only URLs with `status: "pending"`

### Output Format

#### Updated url-tracker.json

Each successfully fetched URL is updated:

```json
{
  "id": "url_bfbzqxx3idlbpn96xa3uvsx9",
  "status": "completed",
  "pageId": "page_a0i1trhdd43qn9vxswno89hr",
  "htmlFile": "../raw/pages/a0/page_a0i1trhdd43qn9vxswno89hr.html",
  "markdownFile": "../raw/pages/a0/page_a0i1trhdd43qn9vxswno89hr.md",
  "fetchedAt": "2025-11-07T13:25:59.705445"
}
```

#### page-tracker.json Registration

New page entry for Phase 3 data extraction:

```json
{
  "id": "page_a0i1trhdd43qn9vxswno89hr",
  "urlId": "url_bfbzqxx3idlbpn96xa3uvsx9",
  "searchIds": ["search_q5vm...", "search_dehg..."],
  "htmlFile": "../raw/pages/a0/page_a0i1trhdd43qn9vxswno89hr.html",
  "markdownFile": "../raw/pages/a0/page_a0i1trhdd43qn9vxswno89hr.md",
  "htmlSize": 2085823,
  "markdownSize": 52737,
  "status": "pending",
  "dataPointsExtracted": 0,
  "rawDataFile": null,
  "extractedAt": null
}
```

#### Saved HTML/Markdown Files

**HTML File:** Raw HTML from crawl4ai (2-4 MB typical)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <!-- Full page HTML -->
</head>
<body>
    <!-- Complete page content -->
</body>
</html>
```

**Markdown File:** Cleaned, semantic Markdown (50-100 KB typical)
```markdown
# Page Title

## Main Content

Paragraph text with **bold** and *italic*.

### Subsections

- Bullet points
- Extracted structure
```

### Progress Output

The script prints real-time progress to stderr in JSON format:

```json
{
  "message": "Starting concurrent URL fetching",
  "total_urls": 2950,
  "workers": 3,
  "mean_delay": 1.0,
  "delay_variance": 0.2
}
```

Progress reports every 50 fetches:

```
Progress: 50/2950 (1.7%)
  ✓ Completed: 48
  ✗ Failed: 2
```

Final summary (stdout, JSON format):

```json
{
  "total_urls": 2950,
  "completed": 2925,
  "failed": 25,
  "remaining": 0,
  "success_rate": 99.15,
  "duration_seconds": 3247.5,
  "urls_per_second": 0.9
}
```

## Performance Tuning

### Concurrency Settings

| Use Case | Workers | Delay | Variance | Est. Duration |
|----------|---------|-------|----------|----------------|
| **Conservative** (shared server) | 2 | 2.0s | 0.3 | ~2 hours |
| **Standard** (dedicated machine) | 3 | 1.0s | 0.2 | ~55 min |
| **Aggressive** (optimized setup) | 5 | 0.5s | 0.2 | ~35 min |
| **Testing** (quick validation) | 3 | 0.5s | 0.1 | ~15 min (100 URLs) |

### Memory Management

Monitor system memory during execution:

```bash
# In another terminal, watch memory/worker behavior
watch -n 5 'ps aux | grep fetch-url.py'
```

If memory usage exceeds 80%:
1. Reduce `--workers` by 1
2. Increase `--delay` by 0.5 seconds
3. Add `--delay-variance` to spread load

The MemoryAdaptiveDispatcher will also automatically reduce active sessions if memory threshold (70%) is exceeded.

### Rate Limiting

crawl4ai calculates actual delay as:
```
actual_delay = mean_delay + random(-max_range, +max_range)
```

For `--delay 1.0 --delay-variance 0.2`:
- Min delay: 0.8 seconds
- Max delay: 1.2 seconds
- Average: 1.0 seconds

**Recommendations:**
- Use variance 20-30% of mean delay for natural distribution
- Respect robots.txt and site rate limit policies
- Conservative delay (1.5-2.0s) for high-traffic sites
- Can reduce to 0.5s for content delivery networks (CDNs)

### Bandwidth Considerations

**Typical page sizes:**
- HTML: 1.5-3.0 MB
- Markdown: 40-60 KB

**Total bandwidth estimate (2,950 URLs):**
- HTML download: ~7-9 GB
- Markdown generation: 0 GB (generated client-side from HTML)
- **Total download: ~7-9 GB**

**Storage requirement:**
- HTML: ~7-9 GB
- Markdown: ~170 MB (generated locally)
- **Total storage: ~7.2-9.2 GB**

With 3 workers @ 1.0s delay:
- ~55 minutes runtime
- ~130-160 KB/s sustained bandwidth

## Troubleshooting

### Issue: "crawl4ai not installed"

```bash
cd knowledge-pack-scraper
uv sync && uv run crawl4ai-setup
```

Ensure Playwright browsers are installed for headless browsing.

### Issue: "Memory exceeded threshold"

Symptom: Workers automatically scale down, slow progress

**Solution:**
1. Reduce concurrent workers: `--workers 2`
2. Increase delay: `--delay 2.0`
3. Check for other memory-intensive processes
4. Consider running on machine with more RAM

### Issue: High failure rate (>5% failed)

Check stderr for error patterns:

```bash
# Run and capture errors
uv run fetch-url.py 2>&1 | grep -A 3 '"status": "failed"'
```

**Common causes:**
- Network timeouts (increase delay between retries)
- Invalid/stale URLs (expected for some percentage)
- Site blocks based on user-agent (crawl4ai handles this)
- Certificate/TLS errors (environmental issue)

**Manual retry:**
1. Update failed URL status to "pending" in url-tracker.json
2. Re-run fetch-url.py with higher `--delay`

### Issue: Mixed line endings or encoding issues

crawl4ai handles encoding detection automatically. If issues occur:

```bash
# Verify saved file encoding
file raw/pages/a0/page_*.html | grep -i utf
```

All files should be saved as UTF-8.

### Issue: Interrupted by Ctrl+C

The script catches `KeyboardInterrupt` and saves progress:

```
^C
Interrupted by user. Saving progress...

Progress: 1523/2950 (51.6%)
  ✓ Completed: 1500
  ✗ Failed: 23
```

Resume by running the script again—already completed URLs are skipped.

### Issue: Slow performance (< 0.5 URLs/second)

**Diagnostics:**

```bash
# Check network connectivity
ping -c 5 8.8.8.8

# Monitor open connections
lsof -i -P -n | grep python | wc -l

# Check disk I/O
iostat -x 1 5
```

**Solutions:**
- Increase `--workers` if CPU/memory available
- Decrease `--delay` for faster sites
- Check internet connection and DNS resolution
- Verify no local rate limiting (firewall rules)

## Dependencies

- **crawl4ai >= 0.4.0** - Web crawling with Markdown conversion
- **python >= 3.10** - Async support
- **Playwright** - Browser automation (installed via `uv run crawl4ai-setup`)

## Next Steps

After Phase 2 completion (all URLs fetched):

1. **Phase 3: Domain Analysis** - Analyze page content structure and extract domain-specific patterns
2. **Phase 4: Page Filtering** - Filter and validate pages for data relevance
3. **Phase 5: Data Extraction** - Extract insurance-specific data points using LLM + structured schemas

## See Also

- [Phase 1: URL Discovery](../phase1-url-discovery/README.md) - Generate search queries and discover URLs
- [Phase 3: Domain Analysis](../phase3-domain-analysis/README.md) - Analyze page structure
- [Phase 4: Page Filtering](../phase4-page-filtering/README.md) - Filter relevant pages
- [Phase 5: Data Extraction](../phase5-data-extraction/README.md) - Extract insurance data
- [Main Knowledge Pack README](../README.md) - Project overview
