# Phase 2: Agent Workflow Documentation

**Version**: 1.0
**Date**: 2025-11-06
**Purpose**: Guide for Claude Code agents executing Phase 2 data gathering

---

## Overview

Phase 2 uses **individual Python scripts** that agents call in sequence. Each script outputs JSON with explicit `next_steps` telling the agent exactly what to do next.

**Key Principles:**
- ✅ Agent calls scripts via `uv run scripts/...`
- ✅ Scripts output JSON with mandatory `next_steps` field
- ✅ Agent reads `next_steps` and follows instructions exactly
- ✅ Centralized git operations via `git-commit.py`
- ✅ Random work selection reduces collisions
- ✅ Autonomous scripts (fetch-url, validate) handle complex tasks

---

## Script Reference

### 1. select-work.py

**Purpose**: Find next work item using waterfall priority

**Usage:**
```bash
cd knowledge-pack-scraper
uv run scripts/select-work.py
```

**Output:**
```json
{
  "success": true,
  "tracker_type": "search",
  "work_item": {
    "id": "search_abc123",
    "query": "GEICO auto insurance discounts"
  },
  "summary": {
    "search": 338,
    "url": 0,
    "page": 0,
    "extraction": 0
  },
  "next_steps": "Selected search: search_abc123\n..."
}
```

**Agent Action:** Read `next_steps` and follow instructions (will tell you which script to run next)

---

### 2. claim-search.py

**Purpose**: Claim a search and prepare for WebSearch

**Usage:**
```bash
uv run scripts/claim-search.py --id search_abc123
```

**Output:**
```json
{
  "success": true,
  "message": "Successfully claimed search_abc123",
  "agent_id": "agnt_xxxxxxxxxx",
  "search_id": "search_abc123",
  "query": "GEICO auto insurance discounts",
  "category": "carriers",
  "next_steps": "Claim committed successfully. You now own search_abc123.\n\nACTION REQUIRED - Perform WebSearch:\n1. Use WebSearch tool with query: \"GEICO auto insurance discounts\"\n2. Find 4-6 high-quality URLs...\n..."
}
```

**Agent Action:**
1. Perform WebSearch using the provided query
2. Collect 4-6 URLs from search results
3. Run `save-urls.py` with discovered URLs

---

### 3. save-urls.py

**Purpose**: Save discovered URLs after WebSearch

**Usage:**
```bash
uv run scripts/save-urls.py --search-id search_abc123 --urls https://url1.com https://url2.com https://url3.com
```

**Output:**
```json
{
  "success": true,
  "message": "Successfully registered 3 URLs for search_abc123",
  "search_id": "search_abc123",
  "urls_registered": 3,
  "url_details": [
    {"id": "url_xyz789", "url": "https://url1.com", "hash": "a1b2c3..."}
  ],
  "next_steps": "URLs saved and committed successfully.\n\nContinue with next work item:\nRun: uv run scripts/select-work.py"
}
```

**Agent Action:** Run `select-work.py` to get next work item

---

### 4. fetch-url.py

**Purpose**: Autonomously fetch URL with crawl4ai (NO agent interaction needed)

**Usage:**
```bash
uv run scripts/fetch-url.py --id url_xyz789
```

**Output:**
```json
{
  "success": true,
  "message": "Successfully fetched and saved page_def456",
  "agent_id": "agnt_xxxxxxxxxx",
  "url_id": "url_xyz789",
  "page_id": "page_def456",
  "url": "https://geico.com/discounts",
  "html_size": 125840,
  "markdown_size": 42560,
  "next_steps": "URL fetch completed successfully!\n\nContinue with next work item:\nRun: uv run scripts/select-work.py"
}
```

**Agent Action:** Run `select-work.py` to get next work item

**Note:** This script is fully autonomous - it handles claim, fetch, save, register, commit automatically.

---

### 5. claim-page.py

**Purpose**: Claim a page and load content for extraction

**Usage:**
```bash
uv run scripts/claim-page.py --id page_def456
```

**Output:**
```json
{
  "success": true,
  "message": "Successfully claimed page_def456 and loaded html content (125,840 chars)",
  "agent_id": "agnt_xxxxxxxxxx",
  "page_id": "page_def456",
  "search_id": "search_abc123",
  "content": "<html>...</html>",
  "content_format": "html",
  "content_length": 125840,
  "next_steps": "Claim committed successfully. You now own page_def456.\n\nACTION REQUIRED - Extract Data:\n1. Use LLM to extract insurance data points from the content\n2. Look for: discounts, eligibility rules, carrier info...\n..."
}
```

**Agent Action:**
1. Use LLM to extract data from `content` field
2. Extract structured data with citations
3. Run `save-extraction.py` with extracted data (via stdin or --data)

---

### 6. save-extraction.py

**Purpose**: Save extracted data after LLM extraction

**Usage:**
```bash
# Via stdin (recommended for large data)
echo '{"data": [...]}' | uv run scripts/save-extraction.py --page-id page_def456 --search-id search_abc123

# Via argument
uv run scripts/save-extraction.py --page-id page_def456 --search-id search_abc123 --data '[{"field": "value"}]'
```

**Output:**
```json
{
  "success": true,
  "message": "Successfully saved 15 data points from page_def456",
  "page_id": "page_def456",
  "search_id": "search_abc123",
  "data_points_extracted": 15,
  "raw_file": "/path/to/data_search_abc123.raw.json",
  "next_steps": "Extraction saved successfully!\n\nContinue with next work item:\nRun: uv run scripts/select-work.py"
}
```

**Agent Action:** Run `select-work.py` to get next work item

---

### 7. validate-extraction.py

**Purpose**: Autonomously validate extraction (NO agent interaction needed)

**Usage:**
```bash
uv run scripts/validate-extraction.py --id page_def456
```

**Output:**
```json
{
  "success": true,
  "message": "Validation passed for search_abc123",
  "agent_id": "agnt_xxxxxxxxxx",
  "search_id": "search_abc123",
  "page_id": "page_def456",
  "data_points_extracted": 15,
  "validation_passed": true,
  "next_steps": "Validation completed successfully!\n\nContinue with next work item:\nRun: uv run scripts/select-work.py"
}
```

**Agent Action:** Run `select-work.py` to get next work item

**Note:** This script is fully autonomous - it validates files, checks schema, updates search status automatically.

---

### 8. git-commit.py

**Purpose**: Centralized git operations (called by other scripts, not directly by agent)

**Usage:**
```bash
uv run scripts/git-commit.py --type claim --id search_abc123 --message "GEICO discounts"
uv run scripts/git-commit.py --type fetch --id page_def456 --message "https://geico.com/discounts"
uv run scripts/git-commit.py --type extract --id page_def456 --message "15 data points"
uv run scripts/git-commit.py --type complete --id search_abc123 --message "found 42 data points"
uv run scripts/git-commit.py --type fail --id url_xyz789 --message "timeout"
```

**Output:**
```json
{
  "success": true,
  "message": "Successfully committed and pushed: chore(kb): claim search_abc123 - GEICO discounts",
  "had_conflict": false,
  "next_steps": "Claim successfully committed. You now own search_abc123..."
}
```

**Note:** Agents typically don't call this directly - other scripts call it internally.

---

## Complete Workflow Example

### Scenario: Search Execution

```bash
# Step 1: Agent starts, selects work
$ uv run scripts/select-work.py
# Output: "Selected search: search_abc123, run claim-search.py"

# Step 2: Agent claims search
$ uv run scripts/claim-search.py --id search_abc123
# Output: "Perform WebSearch with query: 'GEICO auto insurance discounts'"

# Step 3: Agent performs WebSearch (Claude tool)
# (Agent uses WebSearch tool to find URLs)

# Step 4: Agent saves discovered URLs
$ uv run scripts/save-urls.py --search-id search_abc123 --urls https://geico.com/discounts https://geico.com/insurance/auto
# Output: "URLs saved, continue with next work item"

# Step 5: Agent gets next work (now URL fetching)
$ uv run scripts/select-work.py
# Output: "Selected URL: url_xyz789, run fetch-url.py"

# Step 6: Fetch URL (autonomous)
$ uv run scripts/fetch-url.py --id url_xyz789
# Output: "URL fetched, page saved, continue with next work item"

# Step 7: Agent gets next work (now page extraction)
$ uv run scripts/select-work.py
# Output: "Selected page: page_def456, run claim-page.py"

# Step 8: Agent claims page
$ uv run scripts/claim-page.py --id page_def456
# Output: "Extract data from content (125,840 chars)"

# Step 9: Agent performs LLM extraction
# (Agent uses LLM to extract structured data)

# Step 10: Agent saves extraction
$ echo '[{...data...}]' | uv run scripts/save-extraction.py --page-id page_def456 --search-id search_abc123
# Output: "Extraction saved, continue with next work item"

# Step 11: Validation (autonomous, happens later)
$ uv run scripts/validate-extraction.py --id page_def456
# Output: "Validation passed, search complete"
```

---

## Race Condition Handling

### What Happens on Collision?

When two agents try to claim the same work:

```bash
# Agent A
$ uv run scripts/claim-search.py --id search_123
# Output: "success": true, "next_steps": "You now own search_123"

# Agent B (simultaneously)
$ uv run scripts/claim-search.py --id search_123
# Output: "success": false, "message": "Lost race on search_123", "next_steps": "Run select-work.py"
```

**Agent B Action:** Immediately run `select-work.py` to get different work

### Push Conflict Detection

All claim commits check for push conflicts:

```json
{
  "success": true,
  "had_conflict": true,
  "next_steps": "Push succeeded after rebase. IMPORTANT: You MUST verify ownership..."
}
```

If `had_conflict: true`, agent should verify ownership and abandon if lost race.

---

## Error Handling

### Script Failures

All scripts output `success: false` with next_steps on error:

```json
{
  "success": false,
  "message": "Git pull failed",
  "next_steps": "Check git repository status and try again. Run: git status"
}
```

**Agent Action:** Follow `next_steps` instructions to resolve error

### Common Errors

**1. Git pull failed**
- Check internet connection
- Check git repository status
- Try running `git status` manually

**2. Lost race on claim**
- Normal behavior in parallel environment
- Run `select-work.py` to get different work

**3. File not found**
- Check tracker state
- May need to regenerate tracker

**4. WebSearch failed**
- Retry search with same query
- Or mark search as failed and continue

---

## Best Practices

### DO:
- ✅ Always read `next_steps` from script output
- ✅ Follow instructions exactly as written
- ✅ Run scripts via `uv run scripts/...`
- ✅ Use stdin for large data (extractions)
- ✅ Check `success` field before proceeding
- ✅ Handle `had_conflict` flag appropriately

### DON'T:
- ❌ Skip reading `next_steps`
- ❌ Assume script succeeded without checking `success`
- ❌ Run scripts directly with `python3` (always use `uv run`)
- ❌ Continue after `success: false`
- ❌ Modify tracker files manually
- ❌ Call git-commit.py directly (let other scripts handle it)

---

## Monitoring Progress

### Check Work Summary

```bash
$ uv run scripts/select-work.py
```

Shows pending work across all trackers.

### Check Git History

```bash
$ git log --oneline --since="10 minutes ago"
```

Shows recent commits from all agents.

### Check Specific Search Status

```bash
$ cd knowledge-pack-scraper
$ cat search-tracker.json | grep -A 10 'search_abc123'
```

---

## Troubleshooting

### Agent Stuck

**Symptoms:** Agent repeats same operation

**Solution:**
1. Check last commit timestamp
2. Kill agent if no progress in 5+ minutes
3. Check tracker for stuck work items
4. Manually reset if needed

### All Agents Selecting Same Work

**Symptoms:** Constant race condition failures

**Solution:**
1. Check that random selection is working
2. Verify trackers have pending work
3. Check for tracker corruption

### Scripts Not Found

**Symptoms:** `uv run scripts/...` fails

**Solution:**
```bash
$ cd knowledge-pack-scraper
$ uv run scripts/select-work.py
```

Must run from `knowledge-pack-scraper/` directory.

---

## Next Steps

After Phase 2 completion (all trackers show 0 pending):
1. **Phase 3:** Conflict Detection and Resolution
2. **Phase 4:** Data Consolidation
3. **Phase 5:** Final Knowledge Pack Generation

---

**See Also:**
- [Master Orchestration](phase-2-master-orchestration.md) - Complete architecture
- [Git Coordination](phase-2-git-coordination.md) - How agents coordinate
- [Tracker Schemas](sot-schemas.md) - Tracker file structures

---

**Last Updated**: 2025-11-06
**Status**: Production Ready
**Version**: 1.0 (Individual Scripts Model)
