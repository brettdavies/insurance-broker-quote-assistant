# Knowledge Pack Phase 2: Agent Instructions

**Version**: 1.0  
**Date**: 2025-11-05  
**Project**: Insurance Broker Quote Assistant (IQuote Pro)  
**Purpose**: Autonomous agent workflow for Phase 2 raw data gathering

---

## ⚠️ CRITICAL: Memory Refresh Protocol

**AFTER EVERY GIT PUSH**, you MUST:

1. ✅ **Clear working memory** of the previous search
2. ✅ **Re-read this ENTIRE document** from the beginning
3. ✅ **Start fresh** at "Single Search Workflow" section

**Why this matters:**
- Prevents instruction drift across 200+ searches
- Ensures consistent execution every time
- Catches any document updates immediately
- Maintains strict adherence to process

**DO NOT skip this step.** This is not optional.

---

## Prerequisites

Before starting Phase 2, verify:

- ✅ Git is configured and authenticated (`git config user.name`, `git config user.email`)
- ✅ Bun is installed (`bun --version`)
- ✅ ID generation setup complete - see [sot-id-conventions.md](sot-id-conventions.md) for installation
- ✅ WebSearch and WebFetch tools are accessible
- ✅ Write access to `knowledge_pack/` directory exists
- ✅ `knowledge_pack/search-tracker.json` exists and is populated

---

## Single Search Workflow

This is the core loop. Execute these steps **exactly** for every search.

### Step 1: Read Tracker

```bash
# Read the current tracker state
cat knowledge_pack/search-tracker.json
```

**Find next pending search:**
- Look for first entry with `"status": "pending"`
- If none found: **Phase 2 is complete** → STOP
- Record the search ID and query string

### Step 2: Claim Search

**Update search record in tracker:**

```json
{
  "id": "search_ckm9x7wdx1",
  "query": "\"GEICO\" \"available in\" states",
  "status": "in_progress",           // Changed from "pending"
  "assignedTo": "<your-agent-id>",   // Add your agent ID
  "startedAt": "2025-11-05T14:30:00Z", // Current ISO timestamp
  // ... other fields unchanged
}
```

**Agent ID format:** Use a consistent identifier (e.g., `"agnt_cm1a5b7k9p"`, `"claude-web-1"`, or generate once with `agent_${createId()}`)

**Save the updated tracker.**

### Step 3: Commit Claim

```bash
git add knowledge_pack/search-tracker.json
git commit -m "chore(kb): claim search_ckm9x7wdx1 - GEICO available states"
git push
```

**Commit message format:**
```
chore(kb): claim {search-id} - {brief-query-description}
```

### Step 4: Execute Search

**4.1 Perform web search:**

Use WebSearch with the **exact query string** from the tracker:

```
Query: "GEICO" "available in" states
```

**4.2 Identify relevant URLs:**

From search results, select 1-3 most relevant URLs:
- Prefer official carrier sites (geico.com)
- Then state regulatory sites (.gov)
- Then industry organizations (iii.org, naic.org)
- Finally financial/comparison sites (nerdwallet.com, bankrate.com)

**4.3 Fetch page content:**

For each selected URL:

```typescript
// Generate unique page ID using page_ prefix (see sot-id-conventions.md for setup)
const pageId = `page_${createId()}`;  // e.g., "page_ckm9x7w8k0"

// Fetch page content and save with metadata
const content = await WebFetch(url);
const ext = url.endsWith('.pdf') ? 'pdf' : 'html';
const pageFile = `_pages/${pageId}.${ext}`;
await saveFile(`knowledge_pack/raw/${pageFile}`, content);
```

For complete ID generation specifications and installation instructions, see [sot-id-conventions.md](sot-id-conventions.md).

**4.4 Save page files:**

```
knowledge_pack/raw/_pages/page_ckm9x7w8k0.html
knowledge_pack/raw/_pages/page_ckm9x7wdx1.pdf
knowledge_pack/raw/_pages/page_ckm9x7whp2.html
```

### Step 5: Extract Data Points

**5.1 Parse page content:**

- For HTML: Parse DOM, identify data elements
- For PDF: Extract text content
- Look for data points relevant to the search query

**5.2 For each data point found:**

Create a raw data entry with structure shown in [sot-schemas.md#raw-data-schema](sot-schemas.md#raw-data-schema). Use the `raw_` prefix for IDs:

```typescript
const rawDataEntry = {
  id: `raw_${createId()}`,  // e.g., "raw_ckm9x7wkm3" - see sot-id-conventions.md
  dataPoint: "geico_multi_policy_discount_percentage",
  rawValue: "up to 15%",
  // ... see sot-schemas.md for complete structure
};
```

For complete ID generation specifications, see [sot-id-conventions.md](sot-id-conventions.md).

**Element Reference Guidelines:**
- Use CSS selectors when possible (e.g., `div.class > p:nth-child(2)`)
- Use XPath for complex structures (e.g., `//div[@id='discounts']/p[2]`)
- Be as specific as possible to enable future verification

**Confidence Levels:**
- `"high"`: Official carrier site, clear statement, exact value
- `"medium"`: Third-party site, range given, general statement
- `"low"`: Unofficial source, outdated info, unclear context

### Step 6: Save Raw Data

**6.1 Determine file path:**

```
knowledge_pack/raw/{category}/{subcategory}.raw.json
```

**Examples:**
- Carrier discounts: `knowledge_pack/raw/carriers/geico/discounts_auto.raw.json`
- State minimums: `knowledge_pack/raw/states/CA_minimums.raw.json`
- Industry data: `knowledge_pack/raw/industry/average_pricing_iii.raw.json`

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

**Update search record:**

```json
{
  "id": "search_ckm9x7wdx1",
  "query": "\"GEICO\" \"available in\" states",
  "status": "completed",              // Changed from "in_progress"
  "assignedTo": "agnt_cm1a5b7k9p",
  "startedAt": "2025-11-05T14:30:00Z",
  "completedAt": "2025-11-05T14:42:00Z", // Current ISO timestamp
  "durationSeconds": 720,                 // completedAt - startedAt
  "rawDataFiles": [
    "carriers/geico/states_operating.raw.json"
  ],
  "pageFiles": [
    "page_ckm9x7w8k0",
    "page_ckm9x7wdx1"
  ],
  "commitHash": null,                     // Will be filled by git
  "errorMessage": null,
  "retryCount": 0,
  "notes": "Found 50 state listings from official GEICO site"
}
```

**Also update `statusCounts`:**

```json
{
  "statusCounts": {
    "pending": 199,      // Decreased by 1
    "in_progress": 0,    // Back to 0
    "completed": 1,      // Increased by 1
    "failed": 0
  }
}
```

**Save the updated tracker.**

### Step 8: Commit Completion

```bash
git add knowledge_pack/
git commit -m "feat(kb): complete search_ckm9x7wdx1 - found 50 states from geico.com"
git push
```

**Commit message format:**
```
feat(kb): complete {search-id} - found N data points from {domain}
```

**Examples:**
- `feat(kb): complete search_abc123 - found 8 discounts from progressive.com`
- `feat(kb): complete search_def456 - found CA minimums from insurance.ca.gov`
- `feat(kb): complete search_ghi789 - found pricing data from nerdwallet.com`

### Step 9: Memory Refresh ⚠️

**CRITICAL STEP - DO NOT SKIP:**

1. ✅ **STOP processing** immediately
2. ✅ **Clear your working memory** of this search
3. ✅ **Return to the top** of this document
4. ✅ **Re-read from "Single Search Workflow"**
5. ✅ **Begin next search** at Step 1

**This refresh is MANDATORY after every push.**

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
2. Commit and push
3. Continue to next search (after memory refresh)

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
3. Commit and push
4. Continue to next search (after memory refresh)

### Agent Crashes

If the agent crashes mid-search:

**On restart:**

1. Read tracker
2. Find searches with `status: "in_progress"` AND `startedAt` >30 minutes ago
3. Update each:
   ```json
   {
     "status": "failed",
     "errorMessage": "Agent timeout/crash - exceeded 30 minute limit",
     "retryCount": 0
   }
   ```
4. Commit and push
5. Resume normal workflow at Step 1

### Invalid Data Extracted

If extracted data seems wrong:

1. Add note to raw data entry:
   ```json
   {
     "source": {
       "confidence": "low",
       "notes": "Value seems unusually high - needs manual verification"
     }
   }
   ```
2. Continue with workflow
3. Let Phase 3 (Conflict Detection) flag it

---

## File Format Specifications

### Page Files

**Location:** `knowledge_pack/raw/_pages/`

**Filename format:** `page_{cuid2}.{ext}`

**Examples:**
```
page_ckm9x7w8k0.html
page_ckm9x7wdx1.pdf
page_ckm9x7whp2.html
```

**Content:**
- Full HTML/PDF as retrieved from WebFetch
- No modifications, cleanup, or parsing
- Preserve original encoding
- Include all resources (if HTML)

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
    "pageFile": "_pages/page_ckm9x7w8k0.html",
    "elementRef": "div.discount-card[data-discount='multi-policy'] > p.percentage",
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
    "carriers/geico/states_operating.raw.json"
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

**File:** `knowledge_pack/raw/carriers/geico/discounts_auto.raw.json`

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
      "pageFile": "_pages/page_ckm9x7w8k0.html",
      "elementRef": "div.discount-card > p.percentage",
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
      "pageFile": "_pages/page_ckm9x7w8k0.html",
      "elementRef": "div.discount-card[data-discount='good-student'] > p.percentage",
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

### Check Time Remaining

```typescript
const tracker = JSON.parse(fs.readFileSync('knowledge_pack/search-tracker.json'));
const avgDuration = tracker.categories
  .flatMap(c => c.searches)
  .filter(s => s.status === 'completed')
  .map(s => s.durationSeconds)
  .reduce((sum, d, _, arr) => sum + d / arr.length, 0);

const remaining = tracker.statusCounts.pending;
const estimatedMinutes = (remaining * avgDuration) / 60;

console.log(`Estimated time remaining: ${estimatedMinutes} minutes`);
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

Someone else pushed changes:
```bash
git pull --rebase
git push
```

### "WebFetch timeout"

Increase timeout or retry:
- Retry 3 times with 30-second delay
- If still fails, mark search as failed
- Move to next search

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

**Last Updated**: 2025-11-05
**Status**: Ready for Phase 2 Execution
