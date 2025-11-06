# Knowledge Pack Phase 2: Subagent Instructions

**Version**: 2.3
**Date**: 2025-11-06
**Project**: Insurance Broker Quote Assistant (IQuote Pro)
**Purpose**: Subagent workflow for executing ONE complete Phase 2 search

---

## ⚠️ CRITICAL: Execution Instructions

You will execute Steps 1-8 for **ONE search only**, then ⚠️ STOP IMMEDIATELY.

**Your task:**
- Execute ONE complete search workflow (Steps 1-8)
- Generate your own unique `agent_id` in Step 2
- Claim a search, fetch data, extract, save, commit, push
- **STOP immediately** after Step 8 (git push)

**DO NOT:**
- ❌ Execute multiple searches
- ❌ Continue after Step 8 git push
- ❌ Re-read this document after completing

**DO:**
- ✅ Execute Steps 1-8 exactly once
- ✅ Generate your own agent_id at Step 2
- ✅ STOP immediately after Step 8 push

---

## Prerequisites

Before starting Phase 2, verify:

- ✅ Git is configured and authenticated (`git config user.name`, `git config user.email`)
- ✅ Bun is installed (`bun --version`)
- ✅ ID generation setup complete - see [sot-id-conventions.md](sot-id-conventions.md) for installation
- ✅ Helper scripts exist:
  - `scripts/select-random-search.ts` (selects random pending search)
  - `scripts/generate-ids.ts` (generates cuid2 IDs)
  - `scripts/update-tracker.ts` (updates tracker status)
- ✅ WebSearch and WebFetch tools are accessible
- ✅ Write access to `knowledge_pack/` directory exists
- ✅ `knowledge_pack/search-tracker.json` exists and is populated (run `bun run scripts/populate-tracker.ts` if needed)

---

## Single Search Workflow

This is the core loop. Execute these steps **exactly** for every search.

### Step 1: Read Tracker and Select Random Pending Search

```bash
# Select a random pending search and set environment variables
eval "$(bun run scripts/select-random-search.ts)"

# Verify variables are set
echo "Selected search: $SEARCH_ID"
echo "Query: $SEARCH_QUERY"
```

**What this does:**
- Collects ALL pending searches from all categories
- If none found: **Phase 2 is complete** → ⚠️ STOP IMMEDIATELY
- Selects ONE at random (reduces race conditions)
- Sets `$SEARCH_ID` and `$SEARCH_QUERY` environment variables for subsequent steps

**Output example:**
```
✓ Selected: search_ghaxk1v0xqangv8kfakrazv2
✓ Query: "Progressive" state availability
✓ Category: carrier-states
✓ Carrier: Progressive
✓ Priority: high
Selected search: search_ghaxk1v0xqangv8kfakrazv2
Query: "Progressive" state availability
```

**Why random selection?**
- Multiple subagents run concurrently
- Random selection distributes work evenly across all 14 categories
- Reduces chance of multiple agents claiming the same search simultaneously

### Step 2: Claim Search

Generate your unique agent ID and claim the search selected in Step 1:

```bash
# Generate YOUR agent ID (unique for this subagent)
AGENT_ID=$(bun run scripts/generate-ids.ts 1 "agnt_")

# Claim the search (use $SEARCH_ID from Step 1)
bun run scripts/update-tracker.ts claim $SEARCH_ID $AGENT_ID
```

**What this does automatically:**
- Sets `status` → `"in_progress"`
- Sets `assignedTo` → your generated agent ID
- Sets `startedAt` → current ISO timestamp
- Decrements `statusCounts.pending`
- Increments `statusCounts.in_progress`
- Updates `meta.lastUpdated`

**Example output:**
```bash
# Agent ID: agnt_abc123xyz
# Search ID: search_u7gauzcnv1bdza75kmux57hi
# Query: "GEICO" "available in" states
```

### Step 3: Commit Claim

```bash
git add knowledge_pack/search-tracker.json
git commit -m "chore(kb): claim $SEARCH_ID - ${SEARCH_QUERY:0:50}"
git push || (git pull --rebase && git push)
```

**Commit message format:**
```
chore(kb): claim {search-id} - {first-50-chars-of-query}
```

**Example:**
```
chore(kb): claim search_u7gauzcnv1bdza75kmux57hi - "GEICO" "available in" states
```

**Push conflict handling:**
- If another subagent pushed while you were claiming, the push will fail
- The retry logic automatically rebases your commit on top of the remote changes
- The tracker JSON merge will succeed (different searches being claimed)
- If the second push also fails, ⚠️ STOP IMMEDIATELY (rare)

### Step 4: Execute Search

**4.1 Perform web search:**

Use WebSearch with the **exact query string** from Step 1 (`$SEARCH_QUERY` variable):

```bash
# Use the query from Step 1
echo "Executing search: $SEARCH_QUERY"
# Use WebSearch tool with this exact query
```

**4.2 Identify relevant URLs:**

From search results, select **4-6 URLs** to attempt (expect 2-3 to succeed), following this strict authority ranking ([see sot-source-hierarchy.md](sot-source-hierarchy.md)):

- First, prefer state regulatory sites and official government pages (.gov, eg: insurance.ca.gov) — **Level 5: Authoritative**
- Then, official carrier sites (e.g., geico.com, statefarm.com) — **Level 4: Primary**
- Next, established industry organizations (e.g., iii.org, naic.org) — **Level 3: Reference**
- Finally, reputable financial/comparison sites (e.g., nerdwallet.com, bankrate.com, valuepenguin.com) — **Level 2: Secondary**

**Tip:** Always document the authority level for each source you choose.

**Expected outcomes:**
- Attempt Fetching on all 4-6 URLs
- 2-3 URLs will yield usable content
- Some URLs may return incomplete content (CSS only, JavaScript-heavy pages, paywalls)
- If all 4-6 of your original URLs fail to produce a successful fetch, ⚠️ STOP IMMEDIATELY

**4.3 Fetch page content:**

For each selected URL, generate a unique page ID and fetch content:

```bash
# Generate unique page ID
PAGE_ID=$(bun run scripts/generate-ids.ts 1 "page_")

# Use WebFetch tool to retrieve page content (returns AI-summarized markdown)
# Save to knowledge_pack/raw/_pages/${PAGE_ID}.md (or .pdf if URL ends with .pdf)
```

**Instructions:**
- Use WebFetch tool with the URL
- Save returned content to `knowledge_pack/raw/_pages/${PAGE_ID}.md`
- If URL ends with `.pdf`, use `.pdf` extension instead of `.md`

**⚠️ Important: WebFetch Behavior**
- WebFetch returns **AI-summarized content** in markdown format, not raw HTML
- The returned content is a condensed version of the page optimized for data extraction
- Page files will contain summaries, not source HTML - this is expected and acceptable
- If WebFetch returns no usable content (e.g., "CSS only", "JavaScript framework"), try the next URL

For complete ID generation specifications and installation instructions, see [sot-id-conventions.md](sot-id-conventions.md).

**4.4 Save page files:**

```
knowledge_pack/raw/_pages/page_ckm9x7w8k0.md
knowledge_pack/raw/_pages/page_ckm9x7wdx1.pdf
knowledge_pack/raw/_pages/page_ckm9x7whp2.md
```

### Step 5: Extract Data Points

**5.1 Parse page content:**

- WebFetch provides AI-summarized content in markdown format
- Identify data points from the summary (percentages, dollar amounts, eligibility criteria)
- Look for data points relevant to the search query

**5.2 For each data point found:**

Generate a unique raw data ID and create entry:

```bash
# Generate unique raw data ID
RAW_ID=$(bun run scripts/generate-ids.ts 1 "raw_")
```

Then create a raw data entry with structure shown in [sot-schemas.md#raw-data-schema](sot-schemas.md#raw-data-schema):

```json
{
  "id": "raw_ckm9x7wkm3",
  "dataPoint": "geico_multi_policy_discount_percentage",
  "rawValue": "up to 15%",
  // ... see sot-schemas.md for complete structure
}
```

**Instructions:**
- Generate a new RAW_ID for each data point found
- Use the ID in the raw data entry's `id` field
- Follow the complete schema structure from [sot-schemas.md](sot-schemas.md)

**Element Reference Guidelines:**

Since WebFetch returns AI summaries (not raw HTML), use **section references** instead of CSS/XPath:
- Reference the section or heading where data was found (e.g., `"Policy Discounts section - Multi-vehicle"`)
- Include context about the data's location in the summary (e.g., `"Driver Education section - Good student discount"`)
- Be descriptive enough to relocate the data if the page is re-fetched

**Examples:**
```json
// ✅ Good section reference
"elementRef": "Policy Discounts section - Multi-vehicle"

// ✅ Good section reference with context
"elementRef": "Affiliations section - Military/National Guard"

// ❌ Not possible with WebFetch summaries
"elementRef": "div.discount-card[data-discount='multi-policy'] > p.percentage"
```

**Confidence Levels:**
- `"high"`: Official carrier site, clear statement, exact value
- `"medium"`: Third-party site, range given, general statement
- `"low"`: Unofficial source, outdated info, unclear context

**If extracted data seems questionable:**
- Set confidence to `"low"`
- Add detailed notes explaining the concern (e.g., `"Value seems unusually high - needs manual verification"`)
- Continue with the workflow

### Step 6: Save Raw Data

**6.1 Determine file path:**

Use the search_id to ensure unique filenames (prevents conflicts when multiple searches target same category):

```
knowledge_pack/raw/{category}/{subcategory}_{search-id}.raw.json
```

**Examples:**
- Carrier discounts: `knowledge_pack/raw/carriers/geico/discounts_auto_search_abc123.raw.json`
- State minimums: `knowledge_pack/raw/states/CA_minimums_search_def456.raw.json`
- Industry data: `knowledge_pack/raw/industry/average_pricing_search_ghi789.raw.json`

**Format:**
- `{category}` = Top-level category (carriers, states, industry)
- `{subcategory}` = Descriptive name (geico/discounts_auto, CA_minimums, average_pricing)
- `{search-id}` = The search ID from Step 1 (e.g., search_abc123)

**6.2 File format:**

```json
[
  {
    "id": "raw_ckm9x7wkm3",
    "dataPoint": "...",
    "rawValue": "...",
    // ... full entry as shown in Step 5
  },
  {
    "id": "raw_ckm9x7wnp4",
    // ... next entry
  }
]
```

**6.3 Append or create:**

- If file exists: Read, append new entries, save
- If file doesn't exist: Create with array containing new entries

### Step 7: Update Tracker

Update the tracker with completion data using the helper script:

```bash
# Use $SEARCH_ID from Step 1
bun run scripts/update-tracker.ts complete $SEARCH_ID \
  {raw-data-file-path} \
  --pages {page-id-1} {page-id-2} {page-id-3} \
  --notes "Found N data points from M sources"
```

**What this does automatically:**
- Sets `status` → `"completed"`
- Sets `completedAt` → current ISO timestamp
- Calculates `durationSeconds` (completedAt - startedAt)
- Sets `rawDataFiles` array
- Sets `pageFiles` array
- Decrements `statusCounts.in_progress`
- Increments `statusCounts.completed`
- Updates `meta.lastUpdated`

**Example:**
```bash
# Using variables from previous steps
# $SEARCH_ID = search_u7gauzcnv1bdza75kmux57hi
# Raw data file: carriers/geico/states_search_u7gauzcnv1bdza75kmux57hi.raw.json
# Page IDs: page_abc123 page_def456 page_ghi789

bun run scripts/update-tracker.ts complete $SEARCH_ID \
  carriers/geico/states_search_${SEARCH_ID}.raw.json \
  --pages page_abc123 page_def456 page_ghi789 \
  --notes "Found 50 states from geico.com"
```

### Step 8: Commit Completion and STOP

Commit all changes and push to git:

```bash
git add knowledge_pack/
git commit -m "feat(kb): complete $SEARCH_ID - found N data points from {domain}"
git push || (git pull --rebase && git push)
```

**Commit message format:**
```
feat(kb): complete {search-id} - found N data points from {domain}
```

**Example:**
```bash
# Using $SEARCH_ID from Step 1
git commit -m "feat(kb): complete $SEARCH_ID - found 50 states from geico.com"
```

**Push conflict handling:**
- If another subagent pushed while you were working, the push will fail
- The retry logic automatically rebases your commit on top of the remote changes
- Git will merge non-conflicting changes automatically (different searches)
- If the second push also fails, manual intervention is needed (rare)

---

## ⚠️ AFTER GIT PUSH: STOP IMMEDIATELY

**After `git push` succeeds:**

1. ✅ **STOP processing** immediately
2. ✅ **Do NOT** read the tracker again
3. ✅ **Do NOT** execute another search
4. ✅ **Do NOT** re-read this document

**Your work is done. STOP.**

---

## Error Handling

### Search Fails (No Results)

If a search returns no useful results:

1. Update tracker:
   ```json
   {
     "status": "failed",
     "errorMessage": "No relevant results found after checking 10 URLs",
     "retryCount": 0
   }
   ```
2. Commit and push (proceed to Steps 7-8)
3. ⚠️ STOP IMMEDIATELY

### Search Fails (Network Error)

If WebSearch or WebFetch fails:

1. Retry up to 3 times with 30-second delay
2. If all retries fail:
   ```json
   {
     "status": "failed",
     "errorMessage": "WebFetch timeout after 3 retries for geico.com",
     "retryCount": 3
   }
   ```
3. Commit and push (proceed to Steps 7-8)
4. ⚠️ STOP IMMEDIATELY

---

## File Format Specifications

### Page Files

**Location:** `knowledge_pack/raw/_pages/`

**Filename format:** `page_{cuid2}.{ext}`

**Examples:**
```
page_ckm9x7w8k0.md
page_ckm9x7wdx1.pdf
page_ckm9x7whp2.md
```

**Content:**
- AI-summarized content from WebFetch in markdown format
- Save the summary exactly as returned (no additional modifications)
- For URLs ending in `.pdf`, extension will be `.pdf`; otherwise use `.md`
- Content is pre-processed by WebFetch for data extraction (this is expected)

**Metadata:** Stored in raw data entries, not separate files

### Raw Data Files

**Location:** `knowledge_pack/raw/{category}/`

**Filename format:** `{subcategory}.raw.json`

**Examples:**
```
carriers/geico/discounts_auto.raw.json
carriers/progressive/states_operating.raw.json
states/CA_minimums.raw.json
industry/average_pricing_iii.raw.json
```

**Content:**
- JSON array of raw data entries
- Each entry has unique `id` (raw_{cuid2})
- Each entry references page via `pageId` and `pageFile`
- Preserve all duplicates and conflicts

**DO NOT:**
- Deduplicate entries
- Resolve conflicts
- Merge similar values
- Clean or normalize beyond basic parsing

---

## Example Files

### Example 1: Raw Data Entry

```json
{
  "id": "raw_ckm9x7wdx1",
  "dataPoint": "geico_multi_policy_discount_percentage",
  "rawValue": "up to 15%",
  "normalizedValue": 15,
  "source": {
    "uri": "https://www.geico.com/auto/discounts/",
    "pageId": "page_ckm9x7w8k0",
    "pageFile": "_pages/page_ckm9x7w8k0.md",
    "elementRef": "Policy Discounts section - Multi-policy bundling",
    "extractedValue": "up to 15%",
    "accessedDate": "2025-11-05T14:35:00Z",
    "confidence": "high"
  },
  "context": {
    "surroundingText": "Save money when you bundle auto and home insurance and get up to 15% off your premium. Available in all 50 states for qualifying policyholders.",
    "pageTitle": "GEICO Auto Insurance Discounts",
    "qualifier": "up to"
  }
}
```

### Example 2: Search Tracker Entry

```json
{
  "id": "search_ckm9x7wdx1",
  "query": "\"GEICO\" \"available in\" states",
  "category": "carrier-states",
  "carrier": "GEICO",
  "priority": "high",
  "status": "completed",
  "assignedTo": "agent_ckm9x7wkm3",
  "startedAt": "2025-11-05T14:30:00Z",
  "completedAt": "2025-11-05T14:42:00Z",
  "durationSeconds": 720,
  "rawDataFiles": [
    "carriers/geico/states_operating_search_ckm9x7wdx1.raw.json"
  ],
  "pageFiles": [
    "page_ckm9x7w8k0",
    "page_ckm9x7wdx1"
  ],
  "commitHash": "a1b2c3d4e5f6",
  "errorMessage": null,
  "retryCount": 0,
  "notes": "Found 50 state listings from official GEICO site and CA insurance dept"
}
```

### Example 3: Raw Data File

**File:** `knowledge_pack/raw/carriers/geico/discounts_auto_search_ckm9x7wdx1.raw.json`

```json
[
  {
    "id": "raw_ckm9x7wdx1",
    "dataPoint": "geico_multi_policy_discount_percentage",
    "rawValue": "up to 15%",
    "normalizedValue": 15,
    "source": {
      "uri": "https://www.geico.com/auto/discounts/",
      "pageId": "page_ckm9x7w8k0",
      "pageFile": "_pages/page_ckm9x7w8k0.md",
      "elementRef": "Policy Discounts section - Multi-policy bundling",
      "extractedValue": "up to 15%",
      "accessedDate": "2025-11-05T14:35:00Z",
      "confidence": "high"
    },
    "context": {
      "surroundingText": "Save money when you bundle...",
      "pageTitle": "GEICO Auto Insurance Discounts"
    }
  },
  {
    "id": "raw_ckm9x7whp2",
    "dataPoint": "geico_good_student_discount_percentage",
    "rawValue": "up to 15%",
    "normalizedValue": 15,
    "source": {
      "uri": "https://www.geico.com/auto/discounts/",
      "pageId": "page_ckm9x7w8k0",
      "pageFile": "_pages/page_ckm9x7w8k0.md",
      "elementRef": "Driver Education section - Good student discount",
      "extractedValue": "up to 15%",
      "accessedDate": "2025-11-05T14:35:00Z",
      "confidence": "high"
    },
    "context": {
      "surroundingText": "Full-time students with good grades...",
      "pageTitle": "GEICO Auto Insurance Discounts"
    }
  }
]
```

---

## Progress Tracking

### Check Overall Progress

```bash
# Read tracker and count statuses
cat knowledge_pack/search-tracker.json | grep '"status"' | sort | uniq -c
```

---

## Success Criteria

Phase 2 is complete when:

- ✅ All searches have status `"completed"` or `"failed"`
- ✅ `statusCounts.pending === 0`
- ✅ All raw data files are committed and pushed
- ✅ All page files are saved in `_pages/` directory
- ✅ Tracker shows `completedSearches + failedSearches === totalSearches`

**Next step:** Phase 3 - Conflict Detection

---

## Troubleshooting

### "Cannot find next pending search"

Check tracker:
```bash
cat knowledge_pack/search-tracker.json | grep '"status": "pending"' | wc -l
```

If 0: Phase 2 is complete
If >0: Read tracker carefully, search might be nested in categories

### "Git push rejected"

**This should not happen** - Steps 3 and 8 include automatic retry logic:
```bash
git push || (git pull --rebase && git push)
```

If you see this error, the automatic retry failed. Manual resolution:
```bash
git pull --rebase
# Resolve any conflicts in search-tracker.json (keep both changes)
git add knowledge_pack/search-tracker.json
git rebase --continue
git push
```

### "WebFetch timeout"

Retry:
- Retry 3 times with 30-second delay within Step 4
- If still fails, mark search as failed in tracker
- Commit and push (proceed to Steps 7-8)
- ⚠️ STOP IMMEDIATELY

### "Duplicate page ID"

This should never happen with cuid2. If it does:
- Regenerate ID
- Verify cuid2 is installed correctly
- Check for clock skew

---

**See Also:**
- 📖 [Raw Data Schema](sot-schemas.md#raw-data-schema) - Complete specification for data structure
- 🔗 [Source Authority Levels](sot-source-hierarchy.md#source-authority-levels) - How to assess confidence scores
- 📊 [Extraction Examples](knowledge-pack-examples.md#phase-1-raw-data-scraping) - Real extraction samples
- 🔍 [Search Queries Catalog](sot-search-queries.md) - Complete list of 200+ search queries
- 🛠️ [ID Conventions](sot-id-conventions.md) - cuid2 ID generation and validation
- 📋 [Complete Methodology](knowledge-pack-methodology.md#phase-2-raw-data-scraping) - Where Phase 2 fits in overall workflow

---

**Last Updated**: 2025-11-06 (Added TypeScript helper for random search selection)
**Status**: Ready for Phase 2 Execution
**Changes**:
- v2.0: Restructured for master/subagent execution model
- Integrated helper scripts directly into Steps 2 and 7
- Removed Step 9 (subagents execute once and stop)
- Removed advisory sections (Helper Scripts, Parallel Execution)
- Added prescriptive execution with zero decision-making required
- v2.1: Added automatic git push retry logic to Steps 3 and 8 for concurrent conflict handling
- v2.2: Updated raw data file naming to include search_id (prevents concurrent write conflicts)
- v2.3: Replaced bash jq commands with TypeScript helper script (select-random-search.ts) for consistency and reduced terminal complexity
