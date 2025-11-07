# Phase 2: Master Agent Orchestration

**Version**: 2.0
**Date**: 2025-11-06
**Purpose**: Python master agent workflow for autonomous Phase 2 data gathering

---

## Overview

Phase 2 uses **autonomous Python agents** that run independently and coordinate via GitHub. Multiple agents (3-5) run in parallel, each executing the same master agent script.

**Key Changes from v1.0:**
- ❌ No Claude Code subagents
- ✅ Standalone Python processes using `uv`
- ✅ 4 separate tracker files (waterfall selection)
- ✅ Git-based coordination (no file locking)
- ✅ Dual format storage (HTML + Markdown)
- ✅ Commit after each URL fetch

**Location:** `/knowledge-pack-scraper/` (separate from final output)

---

## Quick Start

### Installation

```bash
cd knowledge-pack-scraper

# Install dependencies
uv sync

# Install Playwright browsers
uv run crawl4ai-setup
```

### Running Agents

Launch 3-5 agents in separate terminals:

```bash
# Terminal 1
cd knowledge-pack-scraper
uv run scripts/phase2_master_agent.py

# Terminal 2
cd knowledge-pack-scraper
uv run scripts/phase2_master_agent.py

# Terminal 3
cd knowledge-pack-scraper
uv run scripts/phase2_master_agent.py
```

Each agent will:
1. Generate unique agent ID (`agnt_xxxxxxxxxx`)
2. Check trackers in waterfall order
3. Randomly select available work
4. Claim work and commit to git
5. Execute work (search/fetch/extract/validate)
6. Commit results and push
7. Repeat until no work remains

---

## Architecture

### Directory Structure

```
/knowledge-pack-scraper/          # Scraping tooling
├── pyproject.toml               # uv project config
├── search-tracker.json          # Searches to execute
├── url-tracker.json             # URLs to fetch
├── page-tracker.json            # Pages to extract from
├── extraction-tracker.json      # Extractions to validate
└── scripts/
    ├── phase2_master_agent.py   # Main autonomous script
    ├── tracker_manager.py       # Tracker read/write
    ├── git_utils.py             # Git operations
    ├── select_random_work.py    # Waterfall selection
    └── id_generator.py          # cuid2 generation

/knowledge_pack/raw/              # Final output data
├── _pages/
│   ├── page_{id}.html           # Raw HTML
│   └── page_{id}.md             # Markdown conversion
├── carriers/
└── states/
```

### Multi-Tracker System

**Waterfall Priority:**
1. **search-tracker.json** - Execute searches, discover URLs
2. **url-tracker.json** - Fetch URLs with crawl4ai
3. **page-tracker.json** - Extract data from pages
4. **extraction-tracker.json** - Validate and commit final data

Agents check trackers in order, pick first available work from highest priority tracker.

### Git Coordination

**No file locking** - agents coordinate via git push conflicts:

1. Agent pulls latest: `git pull --rebase`
2. Agent claims work: Updates tracker, commits
3. Agent pushes: `git push`
   - **Success:** Agent owns the work
   - **Conflict:** Automatic rebase, re-check ownership
4. If agent lost race: Abandon work, pick different item
5. If agent won race: Continue with work

**Random selection** reduces collision probability (~20% with 5 agents, 338 searches)

---

## Master Agent Workflow

### Main Loop

```python
while True:
    await asyncio.sleep(5)  # Rate limiting

    git_pull()

    work = select_random_work()  # Waterfall check

    if work is None:
        break  # Phase 2 complete

    tracker_type, work_item = work

    # Route to handler
    if tracker_type == 'search':
        await execute_search(work_item)
    elif tracker_type == 'url':
        await fetch_url(work_item)
    elif tracker_type == 'page':
        await extract_data(work_item)
    elif tracker_type == 'extraction':
        await validate_and_commit(work_item)
```

### Step 1: Execute Search

```
1. Claim search (git pull, update tracker, commit, push)
2. If claim conflict: Rebase, re-check ownership, abandon if lost
3. Perform WebSearch to find 4-6 URLs
4. Register each URL in url-tracker
5. Update search status to "urls_discovered"
6. Commit and push
```

**Output:** 4-6 URLs registered in url-tracker

### Step 2: Fetch URL

```
1. Claim URL (git pull, update tracker, commit, push)
2. If claim conflict: Rebase, re-check ownership, abandon if lost
3. Generate page ID (e.g., page_abc123xyz)
4. Fetch with crawl4ai:
   - result.html → save as page_{id}.html
   - result.markdown → save as page_{id}.md
5. Update url-tracker (status: completed, pageId, files)
6. Register page in page-tracker
7. Commit and push (after EACH URL)
```

**Output:** 2 files with same page ID:
- `knowledge_pack/raw/_pages/page_abc123xyz.html`
- `knowledge_pack/raw/_pages/page_abc123xyz.md`

### Step 3: Extract Data

```
1. Claim page (git pull, update tracker, commit, push)
2. If claim conflict: Rebase, re-check ownership, abandon if lost
3. Load page content:
   - Try HTML first (preferred)
   - Fall back to MD if confidence is medium/low
4. Extract data points (TODO: implement extraction logic)
5. Save raw.json file
6. Update page-tracker (status: completed, data count)
7. Commit and push
```

**Output:** `knowledge_pack/raw/carriers/{carrier}/data_{search_id}.raw.json`

### Step 4: Validate and Commit

```
1. Claim extraction (git pull, update tracker, commit, push)
2. If claim conflict: Rebase, re-check ownership, abandon if lost
3. Run validation:
   - All page files exist (HTML + MD)
   - No cross-contamination
   - Schema compliance
4. If passed: Update search-tracker (status: completed)
5. If failed: Update search-tracker (status: failed)
6. Commit and push
```

---

## Race Condition Handling

### Claim Collision

**Scenario:** 2 agents claim same search simultaneously

```
Agent A: git pull → claim search_123 → commit → push ✓
Agent B: git pull → claim search_123 → commit → push ✗ (conflict)
Agent B: git pull --rebase → sees search_123 claimed by Agent A
Agent B: Abandons search_123, picks different work
```

**Result:** Agent A owns search_123, Agent B moves on

### Push Retry Logic

All git pushes use automatic retry:

```python
def git_push_with_retry(max_retries=3):
    for attempt in range(max_retries):
        result = subprocess.run(['git', 'push'])
        if result.returncode == 0:
            return True  # Success

        # Push failed, rebase
        git_pull()  # Automatic rebase
        time.sleep(1)

    return False
```

**Retries:** Up to 3 attempts with automatic rebase

### Ownership Verification

After push conflict, agent re-checks ownership:

```python
def check_ownership(tm, tracker_type, item_id, agent_id):
    tracker = tm.load(tracker_type)
    item = find_item_by_id(tracker, tracker_type, item_id)
    return item.get('assignedTo') == agent_id
```

**If lost race:** Abandon work, pick new item

---

## Performance Expectations

### Per-Step Timing

| Step | Average | Fast | Slow |
|------|---------|------|------|
| Execute Search | 30s | 10s | 2min |
| Fetch URL | 20s | 5s | 1min |
| Extract Data | 2min | 30s | 5min |
| Validate | 30s | 10s | 1min |

### Total Phase 2 Timing

| Total Searches | Concurrent Agents | Estimated Time |
|----------------|-------------------|----------------|
| 338 | 3 | **8-10 hours** |
| 338 | 5 | **6-8 hours** |
| 338 | 10 | 4-5 hours (not recommended - may hit rate limits) |

**Recommended:** 3-5 concurrent agents

### Rate Limiting

- **5-second sleep** at start of each loop iteration
- **crawl4ai built-in** adaptive rate limiting
- **Exponential backoff** on failures

---

## Monitoring Progress

### Check Status Counts

```bash
cd knowledge-pack-scraper

# Show work summary
uv run scripts/select_random_work.py
```

Output:
```
=== Work Summary ===
Searches pending:    250
URLs pending:        45
Pages pending:       12
Extractions pending: 3
Total pending:       310
===================
```

### Track Individual Agent

Each agent prints progress:
```
╔═══════════════════════════════════════════╗
║   Phase 2 Master Agent                    ║
║   ID: agnt_clmjrdxg4000008l2g9qhbq5d     ║
╚═══════════════════════════════════════════╝

==================================================
Iteration 1
==================================================
Pulling latest changes from git...

=== Work Summary ===
Searches pending:    338
URLs pending:        0
Pages pending:       0
Extractions pending: 0
Total pending:       338
===================

→ Selected: search - search_clmjrdxg4000008l2g9qhbq5d

📋 Executing search: search_clmjrdxg4000008l2g9qhbq5d
   Query: "GEICO" auto insurance discounts
   Committing claim...
   Searching web...
   ⚠️  WebSearch not yet implemented, returning empty list
   ✗ No URLs found for search_clmjrdxg4000008l2g9qhbq5d
```

---

## Troubleshooting

### Agent Hangs

**Symptoms:** Agent stops responding, no output

**Detection:** Check last commit timestamp in git

**Resolution:**
1. Kill hung agent: `Ctrl+C`
2. Check git status: `git status`
3. If uncommitted changes: `git reset --hard`
4. Check trackers for stuck work items (status: claimed, old timestamp)
5. Manually update tracker to mark as pending again
6. Restart agent

### All Agents Claim Same Work

**Symptoms:** Multiple agents report claim collision on every iteration

**Cause:** Random selection not working properly

**Resolution:**
1. Check that `random.choice()` is seeded differently per agent (automatic with Python)
2. Verify trackers have pending work: `cat search-tracker.json | grep pending`
3. Check for tracker file corruption

### WebSearch Not Working

**Symptoms:** Agent reports "WebSearch not yet implemented"

**Status:** WebSearch integration is TODO - placeholder returns empty list

**Resolution:**
1. Implement WebSearch integration in `phase2_master_agent.py`
2. Or manually populate url-tracker.json with URLs for testing

### Data Extraction Not Working

**Symptoms:** Agent reports "Data extraction not yet implemented"

**Status:** Extraction logic is TODO - placeholder returns empty list

**Resolution:**
1. Implement extraction logic in `phase2_master_agent.py`
2. Or manually create raw.json files for testing

---

## Success Criteria

Phase 2 is complete when:

- ✅ All trackers show `pending === 0`
- ✅ All agents report "No work available"
- ✅ All searches have status `"completed"` or `"failed"`
- ✅ All page files exist in `knowledge_pack/raw/_pages/`
- ✅ All raw data files exist in `knowledge_pack/raw/{category}/`
- ✅ Git history shows commits for every URL fetch

---

## Next Steps

After Phase 2 completion:

1. **Phase 3:** Conflict Detection and Resolution
2. **Phase 4:** Data Consolidation
3. **Phase 5:** Final Knowledge Pack Generation

---

**See Also:**
- 📦 [knowledge-pack-scraper/README.md](../../knowledge-pack-scraper/README.md) - Installation and usage
- 🔧 [Git Coordination Guide](phase-2-git-coordination.md) - How agents coordinate via GitHub
- 📊 [Tracker Schemas](sot-schemas.md) - Complete schema definitions
- 📋 [Complete Methodology](knowledge-pack-methodology.md) - Where Phase 2 fits in overall workflow

---

**Last Updated**: 2025-11-06
**Status**: Ready for Phase 2 Execution
**Version**: 2.0 (Python master agents)
