# Phase 4: Page Filtering

Extract clean, domain-specific content from HTML pages using intelligent filtering configurations.

## Overview

Phase 4 applies domain analysis results to intelligently filter pages, removing boilerplate content (headers, footers, navigation, ads) while preserving the core insurance information. Each page is processed through CSS selectors and tag exclusion rules generated during Phase 3 domain analysis.

### What This Phase Does

1. **Loads domain-specific filtering configurations** from Phase 3 analysis reports
2. **Applies CSS selectors** to extract main content areas (e.g., `main`, `article`)
3. **Removes non-content tags** (headers, footers, navigation, sidebars)
4. **Removes ad/marketing elements** based on class/ID patterns
5. **Generates quality metrics** for each filtered page (confidence scores, word count reduction)
6. **Produces three outputs per page:**
   - `{page_id}_filtered.md` - Clean extracted content in Markdown
   - `{page_id}_filtered_negative.md` - Removed content (for validation/auditing)
   - `{page_id}_quality.json` - Quality metrics and filtering metadata

## Scripts

### filter-pages.py

**Autonomous page content filtering with concurrent processing.**

Processes all pages through domain-specific or generic fallback configurations, generating clean filtered content and quality metrics.

#### Basic Usage

```bash
cd phase4-page-filtering

# Filter all pages (uses all available domain configs)
uv run filter-pages.py

# Filter pages from a specific domain only
uv run filter-pages.py --domain progressive.com

# Test with limited pages (useful for validation)
uv run filter-pages.py --limit 100

# Use 10 concurrent workers (default is 20)
uv run filter-pages.py --workers 10

# Combine options
uv run filter-pages.py --domain geico.com --limit 50 --workers 5

# Specify custom output directory
uv run filter-pages.py --output /path/to/output
```

#### How It Works

1. **Loads Configurations**
   - Reads all domain-specific reports from `../analysis/domain-reports/`
   - Falls back to generic configuration from `../analysis/generic-fallback.json` for unconfigured domains
   - Logs how many domain-specific configs were loaded

2. **Discovers Pages**
   - Scans page tracker for all pages with status `completed`
   - Verifies both HTML and Markdown files exist in `../raw/pages/`
   - Optionally filters by domain or limits to first N pages

3. **Filters Content**
   - For each page, selects appropriate configuration (domain-specific or generic)
   - Applies CSS selector to select main content area
   - Removes excluded tags entirely
   - Removes elements matching excluded selectors (ads, sidebars, etc.)
   - Converts filtered HTML to clean Markdown
   - Deduplicates content for quality metrics

4. **Generates Outputs**
   - Saves filtered content as Markdown with cleaned whitespace
   - Captures removed content in separate file for validation
   - Calculates and records quality metrics

5. **Concurrent Processing**
   - Processes pages in configurable batches (default 20 concurrent)
   - Reports progress after each batch
   - Shows word count, reduction ratio, and confidence score for each page

#### Command-Line Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--domain DOMAIN` | string | (none) | Filter only pages from specific domain (e.g., `progressive.com`) |
| `--limit N` | integer | (none) | Limit to first N pages (useful for testing/validation) |
| `--batch-size N` | integer | 20 | Number of concurrent page filters (higher = faster but more memory usage) |
| `--output DIR` | path | `../raw/pages` | Output directory for filtered pages |

#### Performance Tuning

**For slower systems, reduce batch size:**
```bash
uv run filter-pages.py --batch-size 5
```

**For faster processing, increase batch size (requires adequate memory):**
```bash
uv run filter-pages.py --batch-size 50
```

**Monitor a single domain while testing:**
```bash
uv run filter-pages.py --domain yourdomain.com --limit 10
```

## Output Format

### {page_id}_filtered.md

Clean, extracted content in Markdown format. All boilerplate removed, content ready for data extraction phase.

**Example:**
```markdown
# How to Get Car Insurance

When looking for car insurance, consider these key factors:

1. **Coverage Options**
   - Liability protection
   - Collision coverage
   - Comprehensive coverage

2. **How to Apply**
   - Visit our website
   - Fill out the quote form
   - Receive instant quote
```

### {page_id}_filtered_negative.md

Removed content captured during filtering. Used for validation to ensure no critical content was accidentally removed.

**Example:**
```
Follow us on social media
Subscribe to our newsletter
[Advertisement]
Related products
Footer navigation links
```

### {page_id}_quality.json

Structured quality metrics for each filtered page.

**Example:**
```json
{
  "page_id": "page_abc123",
  "raw_word_count": 5234,
  "filtered_word_count": 2847,
  "removed_word_count": 2387,
  "reduction_ratio": 0.456,
  "config": {
    "css_selector": "main",
    "excluded_tags": ["header", "nav", "footer", "aside"],
    "excluded_selector": "[class*=\"ad\"], [class*=\"menu\"], [class*=\"social\"]",
    "confidence": "high"
  },
  "filtered_at": "2025-11-07T15:30:22.123456"
}
```

#### Quality Metrics Explained

- **raw_word_count**: Total words in original markdown before filtering
- **filtered_word_count**: Total words in filtered markdown after filtering
- **removed_word_count**: Words removed during filtering (`raw_word_count - filtered_word_count`)
- **reduction_ratio**: Fraction of content removed (0.0 = no change, 1.0 = everything removed)
  - Typical range: 0.3-0.6 (30-60% of pages are boilerplate)
  - Low ratio (<0.2) may indicate fallback to generic config
  - High ratio (>0.8) may indicate overly aggressive filtering
- **config**: Filtering configuration used (domain-specific or generic)
  - `css_selector`: Main content CSS selector (e.g., `main`, `article`)
  - `excluded_tags`: HTML tags removed entirely
  - `excluded_selector`: CSS patterns for ads/sidebars
  - `confidence`: How reliable this config is (from Phase 3 analysis)
- **filtered_at**: ISO timestamp of when filtering occurred

## Configuration Sources

### Domain-Specific Configurations

Generated during Phase 3 (`analyze-domain-structure.py`). Located in `../analysis/domain-reports/{domain}.json`.

**Example domain config:**
```json
{
  "css_selector": "main",
  "excluded_tags": ["header", "nav", "footer", "aside"],
  "excluded_selector": "[class*=\"ad\"], [class*=\"banner\"], [class*=\"social\"]",
  "confidence_score": "high"
}
```

### Generic Fallback Configuration

Used for domains without domain-specific reports. Located in `../analysis/generic-fallback.json`.

**Generic config (analyzed from all unconfigured domains):**
```json
{
  "css_selector": "main",
  "excluded_tags": ["header", "nav", "footer"],
  "excluded_selector": "[class*=\"ad\"], [class*=\"menu\"], [class*=\"social\"]",
  "confidence": "low"
}
```

**Fallback priority (if generic-fallback.json doesn't exist):**
```python
{
    'css_selector': 'main',
    'excluded_tags': ['header', 'nav', 'footer'],
    'excluded_selector': '[class*="ad"], [class*="menu"], [class*="social"]',
    'word_count_threshold': 10,
    'confidence': 'low',
}
```

## Example Workflows

### Validate Filtering on a Single Domain

```bash
# Test on first 5 Progressive pages
uv run filter-pages.py --domain progressive.com --limit 5

# Check output (pages are sharded in subdirectories)
find ../raw/pages -name "*_filtered.md" -type f | head -10
```

### Batch Process with Custom Workers

```bash
# Process all pages with 30 concurrent workers (for powerful machines)
uv run filter-pages.py --batch-size 30
```

### Monitor Quality During Phase 4

```bash
# After filtering, analyze quality metrics (search across sharded subdirs)
find ../raw/pages -name "*_quality.json" -type f -exec grep -H '"reduction_ratio"' {} \; | sort -t: -k3 -n
```

### Debug Content Removal

```bash
# Look at what was filtered out from a specific page
# (replace xy with actual prefix from page ID, e.g., a0, tk, etc.)
cat ../raw/pages/xy/page_xyz123_filtered_negative.md
```

## Troubleshooting

### No pages to filter

**Problem:** Script outputs "No pages to filter" and exits.

**Causes:**
- Phase 2 (page fetching) has not completed yet
- HTML/Markdown files don't exist in expected locations
- Wrong domain filter specified

**Solutions:**
```bash
# Verify pages exist (pages are sharded in subdirectories)
find ../raw/pages -name "*.html" -type f | wc -l

# Check if domain name is correct
uv run filter-pages.py --domain example.com --limit 1
```

### Very high or very low reduction ratios

**Problem:** Some pages show 80%+ reduction (possibly over-aggressive) or <10% (possibly under-filtering).

**Causes:**
- Domain-specific config may be too strict/lenient
- Generic fallback for new domains may not match actual structure
- Page structure very different from other pages in domain

**Solutions:**
```bash
# Check which config was used (replace xy with shard prefix like a0, tk, etc.)
grep '"confidence"' ../raw/pages/xy/page_xyz123_quality.json

# Manually review filtered vs. negative content
cat ../raw/pages/xy/page_xyz123_filtered.md
cat ../raw/pages/xy/page_xyz123_filtered_negative.md
```

### Missing output files

**Problem:** Some pages don't generate quality metrics or filtered files.

**Causes:**
- HTML/Markdown files corrupted or truncated
- BeautifulSoup parsing errors
- File I/O permission issues

**Solutions:**
```bash
# Check for error messages
uv run filter-pages.py --limit 10  # Small batch to catch errors

# Verify input files exist and aren't empty (find small HTML files < 1000 bytes)
find ../raw/pages -name "*.html" -type f -size -1000c -exec ls -lh {} \;
```

### Memory usage too high

**Problem:** Script slows down or crashes with "out of memory".

**Causes:**
- Batch size too large for available RAM
- Very large pages (>1MB HTML)

**Solutions:**
```bash
# Reduce batch size
uv run filter-pages.py --batch-size 5

# Process domains separately
for domain in progressive.com geico.com state-farm.com; do
  uv run filter-pages.py --domain $domain --batch-size 10
done
```

### Configuration issues

**Problem:** Pages show `confidence: "unknown"` or configurations not loading.

**Causes:**
- Domain reports not generated by Phase 3
- Wrong domain normalization (www prefix, protocol, etc.)
- generic-fallback.json missing

**Solutions:**
```bash
# Verify domain reports exist
ls ../analysis/domain-reports/ | wc -l

# Check specific domain config
ls ../analysis/domain-reports/yourdomain.com.json

# Verify generic fallback
cat ../analysis/generic-fallback.json
```

## Key Concepts

### Domain Normalization

The script normalizes domains for consistent configuration matching:

```python
# All of these map to the same config:
"https://www.progressive.com"
"progressive.com"
"www.progressive.com"
```

### CSS Selector Strategy

- **Include selectors** (`css_selector`) are applied first - they narrow the content
- **Exclude selectors** are applied second - they remove specific elements
- **Exclude tags** are the most aggressive (removes entire tag + children)

Order of operations:
1. Apply `css_selector` to select only main content area
2. Remove all `excluded_tags`
3. Remove all elements matching `excluded_selector`
4. Convert remaining HTML to clean Markdown

### Quality Metrics and Confidence Scores

Confidence levels from Phase 3:
- **high**: Found in >80% of domain pages, statistically significant
- **medium**: Found in 40-80% of domain pages
- **low**: Found in <40% of pages or generic fallback

Use confidence scores when deciding whether to manually review filtered content.

## Integration Points

### Receives from Phase 3
- Domain-specific filtering configurations (`../analysis/domain-reports/`)
- Generic fallback configuration (`../analysis/generic-fallback.json`)

### Provides to Phase 5
- Filtered Markdown content (`{page_id}_filtered.md`)
- Quality metrics for tracking (`{page_id}_quality.json`)
- (Removed content files for quality assurance)

### Uses from Phase 2
- Raw HTML pages (`../raw/pages/{page_id}.html`)
- Raw Markdown conversions (`../raw/pages/{page_id}.md`)
- Page tracker metadata (`../../trackers/page-tracker.json`)

## Performance Characteristics

### Typical Processing Times

- **Modern machine (2024):** ~50-100ms per page (20 concurrent)
- **Low-end machine:** ~200-500ms per page (5 concurrent)
- **Full run (2,900 pages):** 1-5 minutes depending on batch size

### Memory Usage

- **Per-page baseline:** ~2-5MB (HTML parsing + Markdown conversion)
- **Total baseline (20 batch):** ~40-100MB
- **Scaling:** Linear with batch size

### Optimization Tips

**For speed:**
```bash
uv run filter-pages.py --batch-size 50
```

**For memory efficiency:**
```bash
uv run filter-pages.py --batch-size 5
```

**For development/testing:**
```bash
uv run filter-pages.py --limit 20 --batch-size 10
```

## See Also

- **Phase 3:** [Domain Analysis](../phase3-domain-analysis/README.md) - Generates filtering configurations
- **Phase 2:** Page Fetching - Produces HTML/Markdown input
- **Phase 5:** Data Extraction - Consumes filtered content
- **Main README:** [Knowledge Pack Scraper](../README.md)
