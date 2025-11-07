# Knowledge Pack Phase 2: Agent Instructions

**Version**: 3.0  
**Date**: 2025-11-06  
**Purpose**: Autonomous agent workflow for Phase 2 data gathering

---

## Overview

Phase 2 uses **autonomous Python scripts** that output JSON with `next_steps` instructions. Agents simply:
1. Run `select-work.py` (auto-chains to next script)
2. Follow `next_steps` from JSON output
3. Repeat until no work available

**Workflow**: 3-step parallel queue (search → url → page)

**Key Features**:
- Scripts handle git operations automatically
- Race condition detection built-in
- Random work selection reduces collisions
- JSON output with explicit next steps

---

## Prerequisites

**Prerequisites check:**
1. Verify you're in the repository root directory
2. Confirm uv is installed (minimum v0.9.7): `uv --version`
   - If older than 0.9.7: `pip install --upgrade uv` (uv cannot self-update)
   - Check for multiple installations: `which -a uv`
   - Remove old binaries if found: `rm ~/.local/bin/uv` or `rm /root/.local/bin/uv`
3. Confirm git is configured: `git config user.name && git config user.email`

**Environment requirements:**
- ✅ Trackers populated: `search-tracker.json`, `url-tracker.json`, `page-tracker.json`
- ✅ WebSearch tool available (for claim-search.py)
- ✅ Working directory: `knowledge-pack-scraper/`

---

## Core Workflow

```bash
cd knowledge-pack-scraper

# Run select-work.py - it automatically chains to the next script
uv run scripts/select-work.py

# Script outputs JSON with next_steps - follow the instructions
# Examples:
# - "Perform WebSearch with query: ..." → Use WebSearch tool
# - "Extract data from content..." → Use LLM to extract
# - "Continue with next work item" → Run select-work.py again

# Repeat until output shows:
# "No work available - Phase 2 complete!"
```

**That's it.** The scripts handle everything else automatically.

---

## Script Responsibilities

### select-work.py
**What it does**: Finds next work item (waterfall priority: search → url → page), auto-chains to appropriate script

**Agent action**: Run this to start workflow

---

### claim-search.py
**What it does**: Claims search, commits claim to git

**Output**: Search query to execute

**Agent action required**:
1. Use WebSearch tool with provided query
2. Collect all relevant URLs from results (prefer authoritative sources - see [sot-source-hierarchy.md](sot-source-hierarchy.md))
3. Run `save-urls.py` with discovered URLs (quote each URL to handle special characters)

**Race condition**: If claim fails (another agent claimed it), script tells you to run select-work.py again

---

### save-urls.py
**What it does**: Saves URLs to url-tracker, commits to git

**Output**: Success confirmation

**Agent action**: Run select-work.py to continue

---

### fetch-url.py
**What it does**: **Fully autonomous** - claims URL, fetches with crawl4ai, saves HTML + markdown, registers page-tracker entry, commits, pushes

**Output**: Success confirmation

**Agent action**: Run select-work.py to continue

---

### claim-page.py
**What it does**: Claims page, loads HTML/markdown content, commits claim to git

**Output**: File paths for page content

**Agent action required**:
1. Read page content from provided file paths (html_file, markdown_file)
2. Use LLM to extract structured data following [Raw Data Schema](sot-schemas.md#raw-data-schema)
3. Extract: discounts, eligibility rules, carrier info, state requirements
4. Save extracted data: `echo '<json>' | uv run scripts/save-extraction.py --page-id {page_id}`

**Note**: Use markdown file for extraction (cleaner than HTML). Generate unique `raw_*` IDs for each data point extracted. Raw data file is named by page_id.

---

### save-extraction.py
**What it does**: Saves extracted data to raw JSON file, updates page status, commits to git

**Output**: Success confirmation with data points saved

**Agent action**: Run select-work.py to continue

---

## Raw Data Schema (Quick Reference)

```json
{
  "id": "raw_{cuid2}",
  "dataPoint": "semantic_identifier",
  "rawValue": "exact value as extracted",
  "source": {
    "pageId": "page_{cuid2}",
    "uri": "https://...",
    "accessedDate": "ISO 8601 timestamp",
    "extractionMethod": "automated",
    "confidence": "high|medium|low"
  }
}
```

**Full schema**: See [sot-schemas.md#raw-data-schema](sot-schemas.md#raw-data-schema)

**Important**:
- Generate unique `raw_*` ID for each data point (use cuid2)
- Reference pageId from claim-page.py output
- Set confidence based on source authority ([sot-source-hierarchy.md](sot-source-hierarchy.md))

---

## Error Handling

### Race Condition (Lost Claim)
**Output**: `"success": false, "message": "Lost race on ..."`

**Action**: Script automatically tells you to run select-work.py for different work

### WebSearch Failed
**Action**:
1. Retry 3 times
2. If still fails: Mark search as failed (scripts handle this), continue with select-work.py

### Git Push Conflict
**Handling**: Scripts automatically pull --rebase and retry push

**Auto-Resolution**: JSON array append conflicts (multiple agents appending to same tracker) are automatically resolved by merging both agents' additions and deduplicating by ID.

**What gets auto-resolved**:
- Concurrent URL registrations (save-urls.py)
- Concurrent page registrations (fetch-url.py)
- Concurrent extraction saves (save-extraction.py)
- Any pure array append to tracker files

**What requires manual intervention** (rare):
- Non-array conflicts (e.g., two agents modify same item's fields)
- Conflicts in non-tracker files
- Auto-resolve failures will output error message with instructions

### Script Error
**Output**: `"success": false` with error message and next_steps

**Action**: Follow next_steps instructions

---

## File Naming Conventions

### Page Files
- **Location**: `knowledge_pack/raw/_pages/`
- **Format**: `page_{cuid2}.{ext}` (e.g., `page_abc123xyz.html`, `page_def456.md`)
- **Content**: Full HTML and markdown from crawl4ai

### Raw Data Files
- **Location**: `knowledge_pack/raw/{category}/{subcategory}/`
- **Format**: `data_search_{search_id}.raw.json`
- **Content**: Array of raw data entries

**Examples**:
```
carriers/geico/data_search_abc123.raw.json
carriers/uncategorized/data_search_def456.raw.json
states/CA/data_search_ghi789.raw.json
```

---

## Git Commit Messages

Scripts automatically format commit messages:

```bash
# Claim
chore(kb): claim {id} - {description}

# Complete
feat(kb): complete {id} - found N data points from {source}

# Fail
chore(kb): fail {id} - {error}
```

**No manual git operations needed** - scripts handle everything.

---

## Success Criteria

Phase 2 is complete when `select-work.py` outputs:

```json
{
  "success": true,
  "tracker_type": null,
  "work_item": null,
  "summary": {
    "search": 0,
    "url": 0,
    "page": 0
  },
  "next_steps": "No work available - Phase 2 complete! ..."
}
```

**All trackers show 0 pending items** → Ready for Phase 3

---

## Troubleshooting

### "No work available" but searches still pending?
Check tracker manually:
```bash
cd knowledge-pack-scraper
cat search-tracker.json | grep '"status": "pending"' | wc -l
```

If count > 0, regenerate tracker or investigate stuck items.

### Scripts not found?
Ensure you're in `knowledge-pack-scraper/` directory:
```bash
cd knowledge-pack-scraper
uv run scripts/select-work.py
```

### Push rejected (automatic retry failed)?
Manual recovery (rare):
```bash
git pull --rebase
# Resolve conflicts in tracker JSON (keep both changes)
git add .
git rebase --continue
git push
```

---

## Related Documentation

- [Raw Data Schema](sot-schemas.md#raw-data-schema) - Complete schema specification
- [Source Hierarchy](sot-source-hierarchy.md) - Authority levels and confidence scores
- [Search Queries](sot-search-queries.md) - List of all search queries
- [ID Conventions](sot-id-conventions.md) - cuid2 ID generation
