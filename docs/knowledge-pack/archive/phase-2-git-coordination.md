# Phase 2: Git Coordination Guide

**Version**: 1.0
**Date**: 2025-11-06
**Purpose**: How master agents coordinate via GitHub without file locking

---

## Overview

Multiple Phase 2 master agents run in parallel across separate processes/machines. They coordinate entirely via **GitHub** as the single source of truth.

**Key Principles:**

- ❌ No file locking (agents can't see each other's file system)
- ✅ Git push conflicts are the coordination mechanism
- ✅ Random selection reduces collision probability
- ✅ Automatic rebase and retry on conflicts
- ✅ Ownership verification after conflict resolution

---

## Why No File Locking?

**Problem:** Traditional file locking requires shared file system:

```
❌ Agent A creates `.locks/search-tracker.lock`
❌ Agent B (different terminal/container) can't see the lock file
❌ Both agents claim same work
```

**Solution:** Use git push conflicts as lock mechanism:

```
✅ Agent A: git pull → claim → commit → push (SUCCESS)
✅ Agent B: git pull → claim → commit → push (CONFLICT)
✅ Agent B: rebase → check ownership → abandon if lost race
```

---

## Git Workflow

### Step 1: Pull Latest

Before claiming work, always pull:

```python
git_pull()  # git pull --rebase
```

This ensures agent sees the latest tracker state.

### Step 2: Claim Work

Update tracker and commit:

```python
tm.update_status('search', search_id, 'claimed', {
    'assignedTo': AGENT_ID,
    'claimedAt': datetime.now().isoformat()
})

git commit -m "chore(kb): claim search_abc"
```

### Step 3: Push with Retry

Attempt to push claim:

```python
def git_push_with_retry(max_retries=3):
    for attempt in range(max_retries):
        result = subprocess.run(['git', 'push'])

        if result.returncode == 0:
            return True  # SUCCESS - we own the work

        # Push failed (someone else pushed first)
        git_pull()  # Automatic rebase
        time.sleep(1)

    return False  # Failed after retries
```

### Step 4: Verify Ownership

After rebase, check if we still own the work:

```python
tracker = tm.load('search')
search = find_item_by_id(tracker, 'search', search_id)

if search.get('assignedTo') != AGENT_ID:
    print("Lost race, abandoning work")
    return  # Pick different work
```

**If we own it:** Continue with work
**If we lost race:** Abandon and pick different item

---

## Race Condition Scenarios

### Scenario 1: Clean Claim (No Collision)

```
T=0: Agent A pulls (sees search_123 pending)
T=1: Agent A claims search_123 locally
T=2: Agent A commits claim
T=3: Agent A pushes → SUCCESS
T=4: Agent B pulls (sees search_123 claimed by Agent A)
T=5: Agent B skips search_123, picks search_456
```

**Result:** Agent A owns search_123, Agent B picks different work

### Scenario 2: Simultaneous Claim (Collision)

```
T=0: Agent A pulls (sees search_123 pending)
T=0: Agent B pulls (sees search_123 pending)
T=1: Agent A claims search_123 locally
T=1: Agent B claims search_123 locally
T=2: Agent A commits claim
T=2: Agent B commits claim
T=3: Agent A pushes → SUCCESS
T=4: Agent B pushes → CONFLICT!
T=5: Agent B rebases
T=6: Agent B's commit rebased on top of Agent A's
T=7: Agent B checks ownership: assignedTo === Agent A
T=8: Agent B abandons search_123, picks search_456
```

**Result:** Agent A owns search_123, Agent B abandons and picks different work

### Scenario 3: Three-Way Collision

```
T=0: Agent A, B, C all pull (see search_123 pending)
T=1: Agent A, B, C all claim locally
T=2: Agent A, B, C all commit
T=3: Agent A pushes → SUCCESS
T=4: Agent B pushes → CONFLICT → rebases
T=5: Agent B checks: lost race, abandons
T=6: Agent C pushes → CONFLICT → rebases
T=7: Agent C checks: lost race, abandons
T=8: Agent B picks search_456
T=9: Agent C picks search_789
```

**Result:** Agent A owns search_123, B and C pick different work

---

## Collision Probability

### Random Selection Impact

With N agents and M pending work items:

**Collision probability per iteration:**

```
P(collision) = 1 - ((M-1) / M)^(N-1)
```

**Examples:**

| Agents | Pending Items | Collision % |
| ------ | ------------- | ----------- |
| 3      | 338           | 0.6%        |
| 5      | 338           | 1.2%        |
| 10     | 338           | 2.6%        |
| 5      | 50            | 8.0%        |
| 10     | 10            | 65.0%       |

**Insight:** Collisions are rare when pending work >> agents

---

## Commit Strategy

### Claim Commits

```bash
chore(kb): claim search_abc123 - "GEICO" auto insurance discounts
```

**Purpose:** Establish ownership in git history

### URL Fetch Commits

```bash
feat(kb): fetch page_xyz789 from https://www.geico.com/discounts/
```

**Purpose:** Save progress after every URL (maximum safety)

### Data Extraction Commits

```bash
feat(kb): extract 15 data points from page_xyz789
```

**Purpose:** Save extracted data with metadata

### Completion Commits

```bash
feat(kb): complete search_abc123 - found 42 data points
```

**Purpose:** Mark search as fully complete

---

## Conflict Resolution

### Tracker JSON Merge

**Scenario:** Two agents update different searches simultaneously

```json
# Agent A commits:
{
  "searches": [
    {"id": "search_123", "status": "claimed", "assignedTo": "agnt_A"},
    {"id": "search_456", "status": "pending"}
  ]
}

# Agent B commits (before seeing A's):
{
  "searches": [
    {"id": "search_123", "status": "pending"},
    {"id": "search_456", "status": "claimed", "assignedTo": "agnt_B"}
  ]
}
```

**After rebase:** Git automatically merges:

```json
{
  "searches": [
    { "id": "search_123", "status": "claimed", "assignedTo": "agnt_A" },
    { "id": "search_456", "status": "claimed", "assignedTo": "agnt_B" }
  ]
}
```

**Both changes preserved** - no manual intervention needed

### Real Conflict (Same Field)

**Rare scenario:** Two agents update same search's status

```json
# Agent A: search_123 claimed
# Agent B: search_123 completed (Agent B is ahead)
```

**After rebase:** Git detects conflict

**Resolution:**

1. Agent checks ownership
2. If Agent doesn't own it: Abandon (discard local changes)
3. If Agent owns it: Keep local changes (rare case)

---

## Best Practices

### DO:

- ✅ Always `git pull` before claiming work
- ✅ Commit immediately after claiming
- ✅ Push with automatic retry (up to 3 attempts)
- ✅ Verify ownership after rebase
- ✅ Abandon work if lost race
- ✅ Use random selection to reduce collisions
- ✅ Commit after every URL fetch
- ✅ Include descriptive commit messages

### DON'T:

- ❌ Skip `git pull` before claiming
- ❌ Assume claim succeeded without pushing
- ❌ Continue work after losing race
- ❌ Batch multiple claims before pushing
- ❌ Skip ownership verification after rebase
- ❌ Use sequential selection (always use random)
- ❌ Commit large batches (commit after each URL)

---

## Debugging Git Issues

### Check Uncommitted Changes

```bash
git status
```

If uncommitted changes exist:

```bash
git reset --hard  # Discard local changes
git pull          # Get latest
```

### Check Push History

```bash
git log --oneline --graph -20
```

See recent commits and who pushed what.

### Check Tracker State

```bash
cd knowledge-pack-scraper
cat search-tracker.json | grep claimed
```

See which agent owns which work.

### Reset Stuck Tracker

If tracker is corrupted:

```bash
git checkout origin/main -- knowledge-pack-scraper/search-tracker.json
```

Restore tracker from remote.

---

## Performance Tuning

### Reduce Collision Rate

1. **Increase pending work pool** - populate more searches initially
2. **Reduce concurrent agents** - use 3 instead of 5
3. **Faster claims** - minimize time between pull and push

### Optimize Push Retry

Current: 3 retries with 1-second delay

```python
# Good for most scenarios
max_retries = 3
sleep_between = 1 second
```

If many collisions:

```python
# More retries for high-collision scenarios
max_retries = 5
sleep_between = 0.5 seconds  # Faster retry
```

---

## Monitoring

### Check Agent Activity

```bash
# See recent commits
git log --oneline --since="10 minutes ago"
```

### Check Collision Rate

```bash
# Count "Lost race" messages in agent output
grep "Lost race" agent_output.log | wc -l
```

### Check Tracker Updates

```bash
# See tracker changes
git log --oneline --follow knowledge-pack-scraper/search-tracker.json
```

---

## Summary

**Git coordination works because:**

1. GitHub is single source of truth (all agents see same state after pull)
2. Git push is atomic (only one agent succeeds per push)
3. Automatic rebase merges non-conflicting changes
4. Ownership verification ensures clean handoff
5. Random selection minimizes collision probability

**No file locking needed** - git provides all coordination primitives.

---

**See Also:**

- 📦 [Agent Instructions](phase-2-agent-instructions.md) - Complete agent workflow
- 🔧 [git_utils.py](../../knowledge-pack-scraper/scripts/git_utils.py) - Implementation details
- 📊 [Tracker Schemas](sot-schemas.md) - Tracker file structures

---

**Last Updated**: 2025-11-06
**Status**: Production Ready
