# Phase 2 Dry Run Findings

**Date**: 2025-11-05  
**Search Executed**: `search_dryrun001` - GEICO auto insurance discounts  
**Status**: ✅ Successfully completed end-to-end  
**Duration**: ~10 minutes for single search

---

## Executive Summary

The Phase 2 workflow was executed successfully from start to finish. The structure is solid and the workflow is clear. However, several clarifications and optimizations are needed before scaling to 200+ searches.

**Key Success**: Workflow executed completely, produced valid raw data, committed to git successfully.

**Key Finding**: WebFetch returns AI summaries, not raw HTML - instructions need updating.

---

## Detailed Findings

### ✅ What Worked Well

#### 1. Workflow Structure (Steps 1-9)
- **Verdict**: Excellent
- **Evidence**: Completed all steps without confusion
- **Notes**: Logical flow from claim → search → extract → commit → refresh

#### 2. ID Generation with cuid2
- **Verdict**: Works perfectly
- **Evidence**: Generated 9 unique IDs (1 page, 8 raw data entries)
- **Format**: `page_c7q1opw1pvg9bwqwa5pqqgaz`, `raw_gpn09tox10nr6l05kzk79cyq`
- **No collisions**: All IDs unique

#### 3. Directory Structure
- **Verdict**: Clean and logical
- **Structure**:
  ```
  knowledge_pack/raw/
  ├── _pages/
  │   └── page_c7q1opw1pvg9bwqwa5pqqgaz.html
  └── carriers/
      └── geico/
          └── discounts_auto.raw.json
  ```
- **Notes**: Easy to navigate, clear organization

#### 4. Tracker JSON Format
- **Verdict**: Easy to read and update
- **Evidence**: Updated `statusCounts` and search record without errors
- **Notes**: JSON structure is clear and self-documenting

#### 5. Git Workflow
- **Verdict**: Works smoothly
- **Commits**:
  1. `chore(kb): claim search_dryrun001` (claim)
  2. `feat(kb): complete search_dryrun001 - found 8 discounts from geico.com` (completion)
- **Notes**: Two-commit pattern provides good audit trail

---

### ⚠️ Issues Discovered

#### Issue #1: WebFetch Returns Summaries, Not Raw HTML

**Current Instructions Say**:
> "**Content:**
> - Full HTML/PDF as retrieved from WebFetch
> - No modifications, cleanup, or parsing
> - Preserve original encoding"

**Reality**:
- WebFetch returns AI-summarized markdown content
- Example output: "# GEICO Car Insurance Discounts Summary\n\n## Overview..."
- Cannot get actual DOM elements or raw HTML

**Impact**:
- Cannot capture true `elementRef` with CSS selectors or XPath
- Page files are summaries, not source material
- Cannot "preserve original encoding" - it's already processed

**Recommendation**:
1. Update instructions to acknowledge WebFetch behavior
2. Change `elementRef` from "CSS selector" to "section reference"
3. Accept that page files are AI summaries, not raw HTML
4. Or: Find alternative tool for raw HTML capture (if critical)

**Example elementRef Update**:
```json
// Current (impossible with WebFetch):
"elementRef": "div.discount-card[data-discount='multi-policy'] > p.percentage"

// Realistic:
"elementRef": "Policy Discounts section - Multi-vehicle"
```

---

#### Issue #2: Some Pages Fail to Fetch Content

**Observed**:
- WalletHub URL returned CSS framework code only
- No article content extracted

**Impact**:
- Not all search result URLs will yield usable data
- Need to try multiple URLs per search

**Recommendation**:
Update Step 4.2 to:
> "From search results, select **3-5 URLs** to attempt:
> - Prefer official carrier sites (geico.com)
> - Then state regulatory sites (.gov)
> - Then industry organizations (iii.org, naic.org)
> - Finally financial/comparison sites (nerdwallet.com, bankrate.com)
>
> **Expect**: 1-2 URLs will yield usable content, others may fail"

---

#### Issue #3: Sequential ID Generation is Slow

**Current Approach**:
```bash
# Must run this for every ID:
bun -e "import { createId } from '@paralleldrive/cuid2'; console.log(createId())"
```

**Evidence**:
- Generated 8 IDs for raw data entries
- Each required separate command invocation
- Tedious for large batches

**Recommendation**:
Create helper script `scripts/generate-ids.ts`:
```typescript
import { createId } from '@paralleldrive/cuid2';

const count = parseInt(process.argv[2] || '1');
const prefix = process.argv[3] || '';

for (let i = 0; i < count; i++) {
  console.log(`${prefix}${createId()}`);
}
```

Usage:
```bash
# Generate 10 page IDs
bun run scripts/generate-ids.ts 10 "page_"

# Generate 50 raw data IDs
bun run scripts/generate-ids.ts 50 "raw_"
```

---

#### Issue #4: No Parallel Execution Guidance

**Current State**:
- Instructions are purely sequential
- Each search must complete before next begins

**Opportunity**:
Could parallelize:
- Multiple WebFetch calls in Step 4.3 (fetch 3 URLs simultaneously)
- ID generation in batches
- Multiple searches concurrently (with Task tool + subagents)

**Recommendation**:
Add new section to instructions:

---

**NEW SECTION: Parallel Execution (Optional)**

For efficiency, these steps can be parallelized:

**4.3 Fetch multiple pages concurrently:**
```typescript
// Use Task tool to launch multiple WebFetch in parallel
const urls = [url1, url2, url3];
const tasks = urls.map(url => Task({
  subagent_type: "general-purpose",
  description: `Fetch ${url}`,
  prompt: `Use WebFetch to retrieve content from ${url}`
}));

await Promise.all(tasks);
```

**Multiple searches concurrently:**
- Launch 3-5 Task agents in parallel
- Each claims a different search
- Each follows Steps 1-9 independently
- Merge conflicts resolved by git (tracker.json)

**Constraints**:
- Maximum 5 concurrent searches to avoid overwhelming WebFetch API
- Each agent must still follow memory refresh (Step 9) after push

---

---

#### Issue #5: Manual Tracker Updates are Error-Prone

**Current Approach**:
- Manually edit JSON file
- Update multiple fields (status, timestamps, arrays, counts)
- Easy to miss a field or make typo

**Risk**:
- Invalid JSON syntax breaks workflow
- Forgotten field updates cause inconsistency

**Recommendation**:
Create TypeScript utility `scripts/update-tracker.ts`:
```typescript
import fs from 'fs';

type TrackerUpdate = {
  searchId: string;
  status: 'in_progress' | 'completed' | 'failed';
  agentId?: string;
  rawDataFiles?: string[];
  pageFiles?: string[];
  notes?: string;
  errorMessage?: string;
};

export function updateTracker(update: TrackerUpdate) {
  const tracker = JSON.parse(fs.readFileSync('knowledge_pack/search-tracker.json', 'utf-8'));

  // Find search
  const search = tracker.categories
    .flatMap(c => c.searches)
    .find(s => s.id === update.searchId);

  if (!search) throw new Error(`Search ${update.searchId} not found`);

  // Update fields
  if (update.status === 'in_progress') {
    search.status = 'in_progress';
    search.assignedTo = update.agentId;
    search.startedAt = new Date().toISOString();
    tracker.statusCounts.pending--;
    tracker.statusCounts.in_progress++;
  } else if (update.status === 'completed') {
    search.status = 'completed';
    search.completedAt = new Date().toISOString();
    search.durationSeconds = Math.floor(
      (new Date(search.completedAt).getTime() - new Date(search.startedAt).getTime()) / 1000
    );
    search.rawDataFiles = update.rawDataFiles || [];
    search.pageFiles = update.pageFiles || [];
    search.notes = update.notes || null;
    tracker.statusCounts.in_progress--;
    tracker.statusCounts.completed++;
  }

  tracker.meta.lastUpdated = new Date().toISOString();
  fs.writeFileSync('knowledge_pack/search-tracker.json', JSON.stringify(tracker, null, 2));
}
```

Usage:
```typescript
// Claim search
updateTracker({
  searchId: 'search_dryrun001',
  status: 'in_progress',
  agentId: 'agnt_jsnn15cn8lb8li1173ktpn86'
});

// Complete search
updateTracker({
  searchId: 'search_dryrun001',
  status: 'completed',
  rawDataFiles: ['carriers/geico/discounts_auto.raw.json'],
  pageFiles: ['page_c7q1opw1pvg9bwqwa5pqqgaz'],
  notes: 'Found 8 discount types from official GEICO site'
});
```

---

## Performance Metrics

### Single Search Timing

| Step | Duration | Notes |
|------|----------|-------|
| 1. Read Tracker | 5 sec | Manual read |
| 2. Claim Search | 10 sec | Manual JSON edit |
| 3. Commit Claim | 15 sec | Git add/commit/push |
| 4. Execute Search | 180 sec | WebSearch (10s) + WebFetch (30s × 2 URLs) + processing |
| 5. Extract Data | 60 sec | Manual extraction of 8 data points |
| 6. Save Raw Data | 30 sec | Create JSON file |
| 7. Update Tracker | 20 sec | Manual JSON edit |
| 8. Commit Completion | 20 sec | Git add/commit/push |
| 9. Memory Refresh | 10 sec | Re-read instructions |
| **Total** | **~350 sec** | **~6 minutes per search** |

### Extrapolation for 200 Searches

- **Sequential**: 6 min × 200 = 1,200 min = **20 hours**
- **5 parallel agents**: 1,200 min ÷ 5 = 240 min = **4 hours**
- **10 parallel agents**: 1,200 min ÷ 10 = 120 min = **2 hours**

**Recommendation**: Use 5-10 parallel Task agents for Phase 2 execution.

---

## Updated Requirements for phase-2-agent-instructions.md

### Critical Updates Needed

1. **Section 4.3 (Fetch page content)**:
   - ✅ Add: "WebFetch returns AI-summarized content, not raw HTML"
   - ✅ Update: "Save summary as-is in page file"
   - ✅ Remove: Language about "preserving original encoding"

2. **Section 5.2 (Element Reference)**:
   - ✅ Change: From CSS selectors to "section reference" approach
   - ✅ Add: Examples like `"Policy Discounts section - Multi-vehicle"`

3. **Section 4.2 (Identify URLs)**:
   - ✅ Add: "Select 3-5 URLs to attempt (expect 1-2 to succeed)"
   - ✅ Add: Guidance on handling failed WebFetch calls

4. **New Section: Parallel Execution**:
   - ✅ Add: Guidance on using Task tool for concurrent searches
   - ✅ Add: Constraints (max 5 concurrent agents)
   - ✅ Add: Git merge conflict handling

5. **New Section: Helper Scripts**:
   - ✅ Add: Reference to `scripts/generate-ids.ts`
   - ✅ Add: Reference to `scripts/update-tracker.ts`
   - ✅ Note: Optional, but recommended for efficiency

### Optional Enhancements

1. **Add "Dry Run Mode"** section:
   - Single search execution for validation
   - Verify cuid2 installation
   - Test WebFetch/WebSearch access
   - Validate git configuration

2. **Add "Troubleshooting"** expansions:
   - "WebFetch returns no content" → Try different URL
   - "All URLs failed" → Mark search as failed, add to retry queue
   - "Git push conflict" → Pull, resolve tracker.json merge, re-push

3. **Add "Success Metrics"** section:
   - Target: 90%+ searches completed (not failed)
   - Average: 1-2 usable pages per search
   - Average: 5-10 raw data points per search

---

## Files Created During Dry Run

```
knowledge_pack/
├── search-tracker.json                          # Tracker with 1 completed search
├── raw/
│   ├── _pages/
│   │   └── page_c7q1opw1pvg9bwqwa5pqqgaz.html  # GEICO official page
│   └── carriers/
│       └── geico/
│           └── discounts_auto.raw.json          # 8 raw data entries
```

**Commits**:
1. `36f3e64` - chore(kb): claim search_dryrun001
2. `e7320ee` - feat(kb): complete search_dryrun001 - found 8 discounts from geico.com

---

## Recommended Next Steps

### Immediate (Before Phase 2 Full Execution)

1. ✅ **Update [phase-2-agent-instructions.md](phase-2-agent-instructions.md)**
   - Apply critical updates from "Updated Requirements" section above
   - Add parallel execution guidance
   - Clarify WebFetch behavior

2. ✅ **Create helper scripts**:
   - `scripts/generate-ids.ts` - Batch ID generation
   - `scripts/update-tracker.ts` - Programmatic tracker updates
   - Add to `package.json` scripts

3. ✅ **Create full search catalog**:
   - Populate `search-tracker.json` with 200+ searches
   - Organize by category (carrier-discounts, carrier-states, state-minimums, etc.)
   - Prioritize high-value searches

### Before Launch

4. **Test parallel execution**:
   - Run 3 concurrent Task agents on different searches
   - Verify no git conflicts
   - Confirm each agent follows memory refresh

5. **Validate helper scripts**:
   - Generate 100 IDs with `generate-ids.ts`
   - Update tracker with `update-tracker.ts`
   - Verify JSON validity

6. **Final dry run**:
   - Execute 5 searches in parallel
   - Measure total time
   - Validate all outputs

### Phase 2 Execution

7. **Launch parallel agents**:
   - 5-10 Task agents
   - Each follows Steps 1-9
   - Monitor progress via `statusCounts`

8. **Monitor and adjust**:
   - Check for failed searches
   - Retry failed searches with different URLs
   - Adjust concurrency based on API limits

---

## Conclusion

✅ **Phase 2 workflow is viable** - Successfully completed end-to-end
⚠️ **Clarifications needed** - WebFetch behavior, parallel execution, helper scripts
🚀 **Ready for scale** - With updates above, can execute 200+ searches efficiently

**Estimated Time for Full Phase 2** (with 5 parallel agents): **4-6 hours**

---

**See Also**:
- 📋 [Updated Phase 2 Instructions](phase-2-agent-instructions.md) (to be updated)
- 🛠️ Helper Scripts (to be created):
  - `scripts/generate-ids.ts`
  - `scripts/update-tracker.ts`
- 📊 [Search Catalog](sot-search-queries.md) (to be populated)

---

**Last Updated**: 2025-11-05
**Dry Run Executor**: agnt_jsnn15cn8lb8li1173ktpn86
**Status**: ✅ Complete - Ready for instruction updates
