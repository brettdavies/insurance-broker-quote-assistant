# Phase 2: Master Agent Orchestration

**Version**: 1.0  
**Date**: 2025-11-05  
**Purpose**: Master agent workflow for coordinating Phase 2 subagents

---

## Overview

This document is for the **MASTER AGENT** that orchestrates Phase 2 data gathering. The master agent launches and monitors subagents, keeping 5 running concurrently until all searches are complete.

**Master agent responsibilities:**
- Launch subagents via Task tool
- Monitor subagent completion
- Replace completed subagents with new ones
- Stop when all searches are complete

**Subagent responsibilities (see [phase-2-agent-instructions.md](phase-2-agent-instructions.md)):**
- Execute Steps 1-8 for ONE complete search
- Generate own agent_id
- Claim search, fetch data, commit, push
- Stop immediately after push

---

## Master Agent Workflow

### Step 1: Check Total Pending Searches

Read the tracker to determine how many searches need to be completed:

```bash
cat knowledge_pack/search-tracker.json | grep '"status": "pending"' | wc -l
```

If the count is **0**: Phase 2 is already complete. STOP.

If the count is **>0**: Proceed to Step 2.

---

### Step 2: Launch Initial Batch of Subagents

Launch **5 concurrent subagents** in a single message using the Task tool.

**Each subagent receives this exact prompt:**

```
Execute Phase 2 workflow for ONE search following these instructions:

1. Read docs/knowledge-pack/phase-2-agent-instructions.md in its entirety
2. Execute Steps 1-8 exactly as written for ONE complete search
3. After Step 8 (git push), STOP and report completion

Do not execute multiple searches.
Do not launch your own subagents.
STOP immediately after git push in Step 8.
```

**Task tool parameters:**
- `subagent_type`: "general-purpose"
- `description`: "Execute Phase 2 search workflow"
- `prompt`: (the prompt above)

**Launch all 5 subagents in ONE message** (5 separate Task tool calls).

---

### Step 3: Monitor Subagent Completion

When a subagent completes and reports back:

1. **Check remaining pending searches:**
   ```bash
   PENDING=$(cat knowledge_pack/search-tracker.json | grep '"status": "pending"' | wc -l)
   ```

2. **If PENDING > 0:**
   - Immediately launch 1 new subagent (same prompt as Step 2)
   - This maintains 5 concurrent subagents

3. **If PENDING === 0:**
   - Do NOT launch new subagents
   - Wait for remaining active subagents to finish
   - Proceed to Step 4 when all subagents have stopped

---

### Step 4: Verify Completion

After all subagents have stopped, verify Phase 2 is complete:

```bash
cat knowledge_pack/search-tracker.json
```

Check `statusCounts`:
```json
{
  "statusCounts": {
    "pending": 0,
    "in_progress": 0,
    "completed": N,  // Should equal totalSearches
    "failed": M      // Optional: some searches may have failed
  }
}
```

**Success criteria:**
- ✅ `pending === 0`
- ✅ `in_progress === 0`
- ✅ `completed + failed === totalSearches`

If criteria met: **Phase 2 is complete**

If not met: Investigate which searches are stuck as "in_progress" and manually resolve (see Troubleshooting section)

---

## Example Execution Flow

**Initial state:**
- Total searches: 200
- Pending: 200
- In progress: 0
- Completed: 0

**Master launches 5 subagents:**
- Pending: 195 (5 claimed by subagents)
- In progress: 5
- Completed: 0

**Subagent 1 completes (5 minutes later):**
- Master checks: Pending = 195
- Master launches new subagent 6
- Pending: 194
- In progress: 5
- Completed: 1

**Continue until:**
- Pending: 0
- In progress: 0
- Completed: 200

---

## Troubleshooting

### Subagent Fails to Start

**Symptoms:** Task tool returns error, subagent doesn't launch

**Resolution:**
1. Check error message
2. Verify phase-2-agent-instructions.md exists and is readable
3. Retry launching the subagent

### Subagent Never Completes (Timeout) or Crashes

**Symptoms:**
- Subagent runs >30 minutes without completing
- Subagent crashes mid-execution
- Searches stuck in "in_progress" status with old timestamps

**Detection:**
Check for stuck searches:
```bash
# Find searches in progress for >30 minutes
cat knowledge_pack/search-tracker.json | grep -A 5 '"status": "in_progress"'
# Manually compare startedAt timestamp to current time
```

**Resolution:**
1. Identify stuck search IDs from tracker
2. Use helper script to mark each as failed:
   ```bash
   bun run scripts/update-tracker.ts fail {search-id} "Subagent timeout/crash - exceeded 30 minute limit"
   ```
3. Commit and push the tracker update
4. Launch new subagent to replace it (if pending searches remain)

### Git Push Conflicts

**Symptoms:** Multiple subagents try to push simultaneously, one fails

**Expected behavior:** Subagent will retry with `git pull --rebase` and re-push

**Resolution:** No action needed - git will handle merge automatically for non-conflicting changes

If manual resolution needed:
1. Subagent pulls and sees conflict in search-tracker.json
2. Subagent resolves (both subagents updated different search IDs - keep both)
3. Subagent commits and pushes again

### All Searches Complete But statusCounts Wrong

**Symptoms:**
- `pending === 0` and `in_progress === 0`
- But `completed + failed !== totalSearches`

**Resolution:**
1. Manually count completed and failed searches in tracker
2. Update `statusCounts` to match actual counts
3. Investigate discrepancy (may indicate lost updates or merge conflicts)

---

## Performance Expectations

**Per search timing (from dry run):**
- Average: 6-10 minutes per search
- Fast searches: 4 minutes (official site, clear data)
- Slow searches: 15 minutes (multiple failed fetches, complex extraction)

**Total Phase 2 timing estimates:**

| Total Searches | Concurrent Subagents | Estimated Time |
|----------------|---------------------|----------------|
| 200 | 5 | **4-6 hours** |
| 200 | 10 | 2-3 hours (may hit API rate limits) |
| 50 | 5 | 1-1.5 hours |

**Recommended:** Use 5 concurrent subagents for balance between speed and stability.

---

## Success Criteria

Phase 2 is complete when:

- ✅ All searches have status `"completed"` or `"failed"`
- ✅ `statusCounts.pending === 0`
- ✅ `statusCounts.in_progress === 0`
- ✅ All raw data files exist and are committed to git
- ✅ All page files exist in `knowledge_pack/raw/_pages/`
- ✅ Tracker shows `completed + failed === totalSearches`

**After success:**
- Proceed to **Phase 3: Conflict Detection and Resolution**
- Subagents are no longer needed
- Master agent role is complete

---

**See Also:**
- 📋 [Phase 2 Subagent Instructions](phase-2-agent-instructions.md) - What each subagent executes
- 📊 [Complete Methodology](knowledge-pack-methodology.md#phase-2-raw-data-scraping) - Where Phase 2 fits in overall workflow

---

**Last Updated**: 2025-11-05  
**Status**: Ready for Phase 2 Execution
