# Phase 3: Domain Analysis

Analyze HTML structure patterns across domains to generate intelligent filtering configurations for content extraction.

This phase bridges the gap between raw page downloads (Phase 2) and intelligent content extraction by discovering domain-specific extraction rules and creating fallback configurations for unconfigured domains.

## Overview

Phase 3 performs statistical analysis of HTML structure across domains to:

- **Identify content indicators**: Detect common semantic HTML patterns (`<article>`, `<main>`, `role="main"`) used for article/content containers
- **Detect boilerplate patterns**: Find CSS classes and IDs commonly used for ads, social media, navigation, comments, and other non-content elements
- **Generate domain-specific configs**: Create extraction configurations with high confidence scores for multi-page domains
- **Create fallback configs**: Build generic configurations from single-page domains or domains without specific patterns

The analysis produces JSON reports saved to `analysis/domain-reports/{domain}.json`, enabling the knowledge pack scraper to extract content intelligently without hardcoding domain-specific rules.

## Scripts

### 1. analyze-domain-structure.py

Analyze HTML structure patterns for a single domain and generate a domain-specific extraction configuration.

**Usage:**
```bash
cd phase3-domain-analysis
uv run analyze-domain-structure.py progressive.com
uv run analyze-domain-structure.py --domain www.progressive.com
uv run analyze-domain-structure.py --all  # (not yet implemented)
```

**What it does:**
- Loads all HTML pages for a given domain from Phase 2 output
- Normalizes domain names (removes `www.` prefix and protocols)
- Analyzes each page for:
  - **Content indicators**: `<article>`, `<main>`, `[role="main"]` tags
  - **Non-content indicators**: `<header>`, `<footer>`, `<nav>`, `<aside>` tags to exclude
  - **Boilerplate patterns**: CSS class/ID patterns for ads, social, forms, comments, sidebars, etc.
  - **CSS class/ID frequency**: Extracts and ranks all CSS classes and IDs
- Calculates frequency and confidence scores:
  - **Frequency**: `count / total_pages` (0.0 to 1.0)
  - **Confidence**: "high" (≥80%), "medium" (50-80%), "low" (20-50%), "none" (<20%)
- Generates recommendations for extraction configuration

**Output:**
Saves JSON report to `analysis/domain-reports/{domain}.json` with structure:
```json
{
  "domain": "progressive.com",
  "total_pages": 145,
  "analyzed_at": "2025-11-07T10:30:00",
  "content_indicators": [
    {
      "selector": "article",
      "count": 120,
      "frequency": 0.828,
      "confidence": "high"
    }
  ],
  "non_content_indicators": [
    {
      "tag": "header",
      "count": 145,
      "frequency": 1.0,
      "confidence": "high"
    }
  ],
  "boilerplate_patterns": [
    {
      "pattern": "ads",
      "count": 89,
      "frequency": 0.614,
      "confidence": "high"
    }
  ],
  "top_classes": [
    {"class": "container", "count": 234},
    {"class": "row", "count": 203}
  ],
  "top_ids": [
    {"id": "main-content", "count": 45},
    {"id": "sidebar", "count": 34}
  ],
  "recommendations": {
    "excluded_tags": ["header", "footer", "nav"],
    "css_selector": "article, main",
    "excluded_selector": "[class*=\"ads\"], [id*=\"ads\"], [class*=\"sidebar\"]",
    "pruning_threshold": 0.6,
    "min_word_threshold": 50,
    "confidence_score": "high"
  }
}
```

**Performance:**
- Analyzes ~100-200 domains per batch with 20 concurrent tasks
- Each domain takes 2-10 seconds depending on page count

---

### 2. batch-analyze-domains.py

Batch analyze all multi-page domains in parallel for efficient processing.

**Usage:**
```bash
cd phase3-domain-analysis
uv run batch-analyze-domains.py
uv run batch-analyze-domains.py --min-pages 2 --batch-size 20
uv run batch-analyze-domains.py --force  # Re-analyze all domains
uv run batch-analyze-domains.py --skip-existing  # Analyze only new domains
```

**Options:**
- `--min-pages N` (default: 2): Only analyze domains with at least N pages
- `--batch-size N` (default: 20): Run N concurrent analyses per batch
- `--force`: Re-analyze all domains, skipping existing reports
- `--skip-existing`: Skip domains that already have analysis reports

**What it does:**
- Discovers all domains with at least `--min-pages` pages
- Groups domains by page count
- Analyzes domains in parallel batches using `analyze-domain-structure.py`
- Reports progress and confidence distribution

**Output:**
Console summary with per-domain results:
```
Found 238 domains with 2+ pages
Top 10: progressive.com, allstate.com, geico.com, state-farm.com, ...

Analyzing 238 domains in batches of 20...

Batch 1/12: Processing 20 domains...
  [1/238] progressive.com                          ✓ HIGH
  [2/238] allstate.com                             ✓ MEDIUM
  [3/238] single-page-site.com                     ✓ LOW
  ...

Analysis Complete!
  Total domains: 238
  Successful: 236 (99.2%)
  Failed: 2

Confidence distribution:
  HIGH confidence: 142 (60.2%)
  MEDIUM confidence: 78 (33.1%)
  LOW confidence: 16 (6.8%)
```

**Typical workflow:**
1. Run initial batch analysis: `uv run batch-analyze-domains.py --min-pages 2`
2. Review results and confidence distribution
3. Re-run with `--skip-existing` to analyze new domains as they're added
4. Use `--force` to re-analyze specific domains after filtering configuration updates

---

### 3. aggregate-domain-analysis.py

Aggregate all domain-specific analysis reports into a single generic fallback configuration.

**Usage:**
```bash
cd phase3-domain-analysis
uv run aggregate-domain-analysis.py
uv run aggregate-domain-analysis.py --output analysis/generic-fallback.json
```

**What it does:**
- Loads all domain analysis reports from `analysis/domain-reports/`
- Aggregates statistics across domains:
  - **Content indicators**: Calculates weighted frequency and domain coverage
  - **Non-content indicators**: Identifies tags commonly used for boilerplate
  - **Boilerplate patterns**: Ranks patterns by effectiveness
  - **CSS classes/IDs**: Extracts top 30 classes and 20 IDs across all domains
- Generates data-driven generic configuration for domains without custom analysis
- Creates confidence scores based on:
  - Percentage of domains with high-confidence indicators
  - Average frequency across domains
  - Domain coverage (% of all domains where pattern appears)

**Output:**
Saves aggregated report to `analysis/generic-fallback.json`:
```json
{
  "meta": {
    "total_reports": 238,
    "total_domains": 238,
    "total_pages": 45923,
    "generated_at": "2025-11-07"
  },
  "content_indicators": [
    {
      "selector": "main",
      "domains": 142,
      "total_pages": 12450,
      "avg_frequency": 0.847,
      "confidence": "high",
      "domain_coverage": 0.597
    },
    {
      "selector": "article",
      "domains": 128,
      "total_pages": 9876,
      "avg_frequency": 0.723,
      "confidence": "high",
      "domain_coverage": 0.538
    }
  ],
  "non_content_indicators": [...],
  "boilerplate_patterns": [...],
  "top_classes": [...],
  "top_ids": [...],
  "generic_config": {
    "css_selector": "main, article, [role=\"main\"]",
    "excluded_tags": ["header", "footer", "nav"],
    "excluded_selector": "[class*=\"ads\"], [id*=\"ads\"], [class*=\"social\"]",
    "word_count_threshold": 10,
    "remove_forms": true,
    "remove_overlay_elements": true,
    "confidence": "medium",
    "description": "Data-driven generic fallback config from 238 domain analyses"
  }
}
```

**Typical workflow:**
1. After batch analysis completes, run aggregation
2. Review generic configuration recommendations
3. Use generic config as fallback for domains without custom analysis
4. Re-run aggregation after analyzing new domain cohorts

---

### 4. analyze-generic-cohort.py

Analyze all pages from domains WITHOUT custom configs to generate a specialized generic fallback.

**Usage:**
```bash
cd phase3-domain-analysis
uv run analyze-generic-cohort.py
```

**What it does:**
- Identifies all domains with custom analysis reports (those in `analysis/domain-reports/`)
- Collects all pages from domains NOT in that set
- Treats these pages as a single cohort and analyzes them collectively
- Generates statistics specific to domains without custom configurations
- Creates a generic fallback configuration optimized for "uncharted" domains

This differs from `aggregate-domain-analysis.py`:
- **aggregate-domain-analysis.py**: Creates generic config from ALL domain reports
- **analyze-generic-cohort.py**: Creates generic config from ONLY unconfigured domains

**Output:**
Saves cohort analysis to `analysis/generic-fallback.json`:
```json
{
  "meta": {
    "total_pages": 12543,
    "total_domains": 1847,
    "generated_at": "2025-11-07T10:45:00",
    "description": "Analysis of all pages from domains without custom configs"
  },
  "content_indicators": [
    {
      "selector": "main",
      "total_count": 8234,
      "avg_frequency": 0.657,
      "page_coverage": 0.623,
      "confidence": "high"
    }
  ],
  "non_content_indicators": [...],
  "boilerplate_patterns": [...],
  "top_classes": [...],
  "top_ids": [...],
  "generic_config": {
    "css_selector": "main, article",
    "excluded_tags": ["header", "footer", "nav"],
    "excluded_selector": "[class*=\"ads\"], [id*=\"banner\"]",
    "word_count_threshold": 10,
    "remove_forms": true,
    "remove_overlay_elements": true,
    "confidence": "medium",
    "description": "Generic fallback config from 12543 pages across 1847 domains without custom configs"
  }
}
```

---

## Analysis Process

### Step 1: Domain Discovery
The batch analyzer discovers domains with multiple pages:
- Queries `tracker.url.json` for completed URLs mapped to page IDs
- Groups pages by normalized domain (removes `www.`, protocols, paths)
- Filters for domains with ≥2 pages

### Step 2: HTML Analysis
For each page, the analyzer performs:
1. **Tag-based detection**: Counts semantic HTML tags
   - Content tags: `<article>`, `<main>`, `[role="main"]`
   - Boilerplate tags: `<header>`, `<footer>`, `<nav>`, `<aside>`

2. **Class/ID pattern analysis**: Searches for attribute patterns
   - Wildcard matches: `[class*="ads"]`, `[id*="sidebar"]`
   - Covers: social, share, ad, ads, banner, tracker, comment, sidebar, menu, breadcrumb, form

3. **Frequency extraction**: Collects all CSS classes and IDs for ranking

### Step 3: Confidence Scoring
Frequencies are converted to confidence levels:
- **High (≥80%)**: Very reliable indicator
- **Medium (50-80%)**: Good indicator, use with other signals
- **Low (20-50%)**: Weak signal, verify with other patterns
- **None (<20%)**: Not useful for this domain

### Step 4: Aggregation
When aggregating across domains:
- Weighted frequency = indicator frequency × domain page count / total pages
- Domain coverage = # domains with indicator / total domains
- Confidence is recalculated based on % of high-confidence domains

### Step 5: Configuration Generation
Recommendations are generated with priority:
1. **CSS Selector**: High-confidence content indicators covering ≥30% of domains
2. **Excluded Tags**: High-confidence non-content tags covering ≥50% of domains
3. **Excluded Selectors**: High-confidence boilerplate patterns covering ≥50% of domains

---

## Output Format Reference

### Domain Report (domain-reports/{domain}.json)

| Field | Type | Description |
|-------|------|-------------|
| `domain` | string | Normalized domain name |
| `total_pages` | int | Number of pages analyzed for this domain |
| `analyzed_at` | string | ISO timestamp of analysis |
| `content_indicators` | array | Semantic HTML tags indicating content |
| `non_content_indicators` | array | Tags commonly used for boilerplate (header, nav, etc.) |
| `boilerplate_patterns` | array | CSS class/ID patterns for ads, social, forms, etc. |
| `top_classes` | array | Most frequent CSS classes (top 50) |
| `top_ids` | array | Most frequent CSS IDs (top 30) |
| `recommendations.css_selector` | string | Recommended CSS selector for main content |
| `recommendations.excluded_tags` | array | Tags to remove during extraction |
| `recommendations.excluded_selector` | string | CSS selectors to remove during extraction |
| `recommendations.confidence_score` | string | Overall confidence: "high", "medium", or "low" |

### Aggregate Report (analysis/generic-fallback.json)

| Field | Type | Description |
|-------|------|-------------|
| `meta.total_reports` | int | Number of domain reports aggregated |
| `meta.total_domains` | int | Unique domains analyzed |
| `meta.total_pages` | int | Total pages across all domains |
| `content_indicators` | array | Ranked content indicators with domain coverage |
| `non_content_indicators` | array | Ranked tags to exclude with coverage stats |
| `boilerplate_patterns` | array | Ranked boilerplate patterns with effectiveness scores |
| `top_classes` | array | Most frequent CSS classes across all domains |
| `top_ids` | array | Most frequent CSS IDs across all domains |
| `generic_config` | object | Recommended fallback configuration |

---

## Configuration Tuning Guide

### Understanding Confidence Levels

**High Confidence (≥80% frequency or ≥60% domain coverage)**
- Reliable indicator for this domain or cohort
- Safe to use in extraction configuration
- Example: `<article>` present in 90%+ of pages

**Medium Confidence (50-80% frequency or 40-60% domain coverage)**
- Good indicator but not universal
- Use in combination with other signals
- Example: `<main>` present in 65% of pages

**Low Confidence (<20% frequency or <30% domain coverage)**
- Weak signal, unreliable on its own
- Use only when combined with multiple other indicators
- Example: specific custom `<div id="content">` appears in <10% of pages

### Tuning CSS Selectors

1. **For domain-specific configs**: Use high-confidence indicators
   ```
   "css_selector": "article, main, [role=\"main\"]"
   ```

2. **For generic fallback**: Prefer indicators with ≥30% domain coverage
   ```
   "css_selector": "main, article"
   ```

3. **Adding custom selectors**: If analysis shows high-frequency classes
   ```
   "css_selector": "main, article, .content, .post-content"
   ```

### Tuning Excluded Patterns

1. **Remove unwanted tags** (always safe):
   ```
   "excluded_tags": ["header", "footer", "nav", "aside"]
   ```

2. **Remove boilerplate by pattern** (high precision):
   ```
   "excluded_selector": "[class*=\"ads\"], [id*=\"sidebar\"], [class*=\"social\"]"
   ```

3. **Remove common class names** (requires more testing):
   ```
   "excluded_selector": ".advertisement, .comments, .related-posts"
   ```

### When to Re-analyze

**Run batch analysis again when:**
- New pages are added (run with `--skip-existing`)
- Filtering thresholds change (run with `--force`)
- Domain structure changes significantly (re-run aggregate analysis)

**Typical cadence:**
- Initial: Once per major crawl phase
- Maintenance: Weekly or after adding 100+ new pages
- Tuning: As needed based on extraction quality

---

## Troubleshooting

### "No pages found for domain"
**Cause**: Domain name not found in tracker or pages not downloaded
**Solution**:
1. Verify domain in `tracker.page.json` using `grep`
2. Check that pages were successfully downloaded: `find ../raw/pages -name "*.html" -type f | wc -l`
3. Ensure domain normalization matches: `www.example.com` → `example.com`

### Analysis runs but produces "low" confidence
**Cause**: Inconsistent HTML structure across pages or poor semantic HTML
**Solution**:
1. Review top CSS classes and IDs in report
2. Add custom selectors for frequently used classes: `.article`, `.post-body`
3. Consider domain for manual rule creation if extraction quality is critical
4. Run `analyze-generic-cohort.py` to see if other domains have similar patterns

### Generic fallback produces poor results
**Cause**: Coverage too broad or patterns not selective enough
**Solution**:
1. Increase `--min-pages` threshold in batch analysis
2. Review `domain_coverage` in generic config - aim for ≥40%
3. Add confidence thresholds: only use patterns with ≥60% confidence
4. Test with specific domain reports before applying generic config

### Memory usage too high with large crawls
**Cause**: Analyzing thousands of pages in single script run
**Solution**:
1. Increase `--batch-size` to 30-50 in `batch-analyze-domains.py`
2. Run in smaller batches: `--min-pages 5` to focus on multi-page sites
3. Aggregate reports separately: `aggregate-domain-analysis.py` processes reports, not HTML

### Reports not being saved
**Cause**: Missing or incorrect output directory
**Solution**:
1. Verify `analysis/domain-reports/` exists: `mkdir -p analysis/domain-reports`
2. Check write permissions: `touch analysis/domain-reports/.write-test`
3. Ensure full path in `--output` flag if using custom location

---

## Integration with Phase 2 and 4

### Input from Phase 2: URL Fetching
- HTML files: `../raw/pages/{prefix}/page_{id}.html` (sharded subdirectories)
- URL tracker: `tracker.url.json` (page_id → URL mapping)
- Page tracker: `tracker.page.json` (all page metadata)

### Output to Phase 4: Intelligent Extraction
- Domain reports: `analysis/domain-reports/{domain}.json`
- Generic fallback: `analysis/generic-fallback.json`
- Used by: Knowledge pack scraper to extract content intelligently

### Data Flow
```
Phase 2 Output (HTML files + trackers)
    ↓
Phase 3 Analysis (structure detection)
    ↓
Domain Reports (per-domain configs)
Aggregate Report (generic fallback)
    ↓
Phase 4 Input (intelligent extraction)
```

---

## Performance Benchmarks

Typical performance with modern CPU:

| Operation | Pages | Time | Notes |
|-----------|-------|------|-------|
| Single domain (50 pages) | 50 | 5-8s | includes I/O |
| Batch (238 domains) | 45,923 | 8-12 min | batch size 20, parallel |
| Aggregation (238 reports) | - | 2-3s | I/O bound |
| Generic cohort (1,847 domains) | 12,543 | 3-5 min | 100 pages/s average |

**Optimization tips:**
- Use `--batch-size 30-50` for fast systems with many cores
- Run on SSD for faster file I/O
- Pre-filter domains with `--min-pages 3+` for faster batch analysis

---

## Advanced Usage

### Custom Analysis Integration

To add custom indicators beyond the standard set:

1. Edit `analyze-domain-structure.py` to add patterns
2. Add to `boilerplate_patterns` dict (line 178)
3. Re-run domain analysis

Example: Adding custom content container detection
```python
boilerplate_patterns = {
    'social': 0,
    'my_custom_pattern': 0,  # Add here
    ...
}
```

### Combining Domain and Generic Configs

In Phase 4 extraction:
1. Check if domain has specific report: `analysis/domain-reports/{domain}.json`
2. If found, use that configuration
3. If not found, fall back to generic: `analysis/generic-fallback.json`

This two-tier approach balances precision (domain-specific) with coverage (generic fallback).

---

## Files and Directories

```
phase3-domain-analysis/
├── README.md                              # This file
├── analyze-domain-structure.py            # Single domain analysis
├── batch-analyze-domains.py               # Parallel batch analysis
├── aggregate-domain-analysis.py           # Aggregate domain reports
├── analyze-generic-cohort.py              # Generic fallback analysis
└── ../analysis/
    ├── domain-reports/                    # Per-domain analysis reports
    │   ├── progressive.com.json
    │   ├── allstate.com.json
    │   └── ... (238 domains)
    └── generic-fallback.json              # Aggregated generic config
```

---

## Related Documentation

- **Phase 2 (Page Fetching)**: See `../phase2-page-fetching/README.md`
- **Phase 4 (Page Filtering)**: See `../phase4-page-filtering/README.md`
- **Main Scraper README**: See `../README.md`
