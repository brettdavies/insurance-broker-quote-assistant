# Knowledge Pack Data Gathering Methodology

**Version**: 1.0
**Date**: 2025-11-05
**Project**: Insurance Broker Quote Assistant (IQuote Pro)
**Purpose**: Document the complete methodology for creating an auditable, source-tracked knowledge pack with cuid2-based data lineage and conflict resolution

---

## Overview

This document defines the comprehensive methodology for gathering, validating, and assembling the knowledge pack that powers the Insurance Broker Quote Assistant. The methodology ensures every data point is traceable to its source, conflicts are resolved transparently, and a complete audit trail exists for compliance purposes.

### Key Requirements

✅ **Every data point has ≥1 source** (URI + line/element reference)  
✅ **Multiple sources allowed** per data point (captures conflicts)  
✅ **Child data points inherit** parent sources if no direct source  
✅ **Every data point has unique ID (cuid2)** for audit trail
✅ **Track ALL sources during scraping** (duplicates/conflicts included)
✅ **Separate data cleaning phase** to resolve conflicts transparently

---

## Seven-Phase Methodology

### Phase 1: Enhanced JSON Schema Design (1 hour)

**Objective**: Define data structures that support granular source tracking and audit trails.

#### 1.1 Source Metadata Structure

Every field in the knowledge pack uses a metadata envelope:

```json
{
  "id": "field-uuid-001",
  "value": 15,
  "sources": [
    {
      "uri": "https://www.geico.com/auto/discounts/",
      "elementRef": "section#multi-policy > p:nth-child(2)",
      "lineRef": null,
      "accessedDate": "2025-11-05",
      "extractedValue": "Save up to 15%",
      "confidence": "high",
      "primary": true
    },
    {
      "uri": "https://www.nerdwallet.com/article/insurance/geico-discounts",
      "elementRef": "table.discounts > tr:nth-child(3) > td:nth-child(2)",
      "lineRef": null,
      "accessedDate": "2025-11-05",
      "extractedValue": "12%",
      "confidence": "medium",
      "primary": false
    }
  ],
  "resolution": {
    "conflictId": "conflict-001",
    "selectedValue": 15,
    "method": "authoritative_source",
    "rationale": "Official GEICO source (primary) preferred over third-party aggregator",
    "resolvedBy": "data_curator",
    "resolvedDate": "2025-11-05"
  },
  "inheritedFrom": null
}
```

#### 1.2 Source Inheritance Rules

When a child data point has no direct sources, it inherits from its parent:

```json
{
  "carrier": {
    "id": "carrier-geico-001",
    "value": "GEICO",
    "sources": [{"uri": "https://www.geico.com/", "...": "..."}]
  },
  "discounts": [
    {
      "id": "discount-geico-multi-001",
      "states": {
        "id": "field-states-001",
        "value": ["CA", "TX", "FL", "NY", "IL"],
        "sources": [],
        "inheritedFrom": "carrier-geico-001",
        "note": "Inherits from carrier operating states since no discount-specific state restrictions found"
      }
    }
  ]
}
```

#### 1.3 cuid2 Generation Conventions

All entity IDs use **cuid2** format with type prefixes for global uniqueness:

- **Carriers**: `carr_{cuid2}` (e.g., `carr_ckm9x7w8k0`)
- **Discounts**: `disc_{cuid2}` (e.g., `disc_ckm9x7wdx1`)
- **Fields**: `fld_{cuid2}` (e.g., `fld_ckm9x7whp2`)
- **Conflicts**: `conf_{cuid2}` (e.g., `conf_ckm9x7wkm3`)
- **Raw Data**: `raw_{cuid2}` (e.g., `raw_ckm9x7wnp4`)
- **Pages**: `page_{cuid2}` (e.g., `page_ckm9x7wqr5`)

See [id-conventions.md](id-conventions.md) for complete ID prefix reference and usage examples.

All IDs tracked in `audit-trail.json` for cross-reference.

#### 1.4 Schema Files to Create

| File | Purpose |
|------|---------|
| `schemas/carrier-schema.json` | Carrier data structure with source tracking |
| `schemas/state-schema.json` | State data structure with source tracking |
| `schemas/source-metadata.json` | Source object definition |
| `schemas/resolution-metadata.json` | Conflict resolution tracking |

**Complete schema specifications**: See [knowledge-pack-schemas.md](knowledge-pack-schemas.md) for all JSON schema definitions.

**Deliverable**: 4 schema files in `knowledge_pack/schemas/`

---

### Phase 2: Raw Data Scraping (4-6 hours)

**Objective**: Capture ALL available data from public sources, preserving duplicates and conflicts for later resolution.

**Critical Rule**: DO NOT RESOLVE CONFLICTS YET - Just capture everything!

#### 2.1 Scraping Methodology

For each source URL:

1. **Access the page** (browser or automated scraper)
2. **Identify data elements** using CSS selectors or XPath
3. **Extract raw values** exactly as displayed
4. **Record element reference** (precise location on page)
5. **Generate UUID** for this raw data entry
6. **Capture metadata** (access date, confidence level)
7. **Save to raw file** (organized by category)

#### 2.2 Raw Data Entry Format

```json
{
  "id": "raw-001",
  "dataPoint": "geico_multi_policy_discount_percentage",
  "rawValue": "up to 15%",
  "normalizedValue": 15,
  "source": {
    "uri": "https://www.geico.com/auto/discounts/",
    "elementRef": "div.discount-card[data-discount='multi-policy'] > p.percentage",
    "accessedDate": "2025-11-05T10:30:00Z",
    "extractionMethod": "manual",
    "screenshot": "screenshots/geico-discounts-001.png",
    "confidence": "high"
  },
  "context": {
    "surroundingText": "Save money when you bundle auto and home insurance",
    "pageTitle": "GEICO Auto Insurance Discounts",
    "qualifier": "up to"
  }
}
```

#### 2.3 Source Categories

**Carrier Official Sites** (Primary Sources):
- GEICO: geico.com/auto/discounts/, geico.com/information/states/
- Progressive: progressive.com/auto/discounts/
- State Farm: statefarm.com/insurance/auto/discounts

**State Regulatory Sites** (Authoritative):
- CA: insurance.ca.gov/01-consumers/
- TX: tdi.texas.gov/consumer/
- FL: floir.com/
- NY: dfs.ny.gov/
- IL: illinois.gov/sites/Insurance/

**Industry Organizations** (Reference):
- Insurance Information Institute: iii.org
- NAIC: naic.org

**Financial Sites** (Secondary):
- Bankrate: bankrate.com/insurance/
- NerdWallet: nerdwallet.com/insurance/

#### 2.4 Raw Data File Organization

```
knowledge_pack/raw/
├── carriers/
│   ├── geico/
│   │   ├── discounts_auto.raw.json
│   │   ├── discounts_home.raw.json
│   │   ├── states_operating.raw.json
│   │   ├── eligibility_auto.raw.json
│   │   ├── eligibility_home.raw.json
│   │   └── pricing_estimates.raw.json
│   ├── progressive/
│   │   └── [same structure]
│   └── state-farm/
│       └── [same structure]
├── states/
│   ├── CA_minimums.raw.json
│   ├── CA_requirements.raw.json
│   ├── CA_special.raw.json
│   └── [same for TX, FL, NY, IL]
└── industry/
    ├── average_pricing_iii.raw.json
    ├── average_pricing_bankrate.raw.json
    └── discount_benchmarks.raw.json
```

#### 2.5 Page File Storage with cuid2 IDs

**Objective**: Store complete page content with globally unique identifiers for audit trail and verification.

**Page Filename Format**: `page_{cuid2}.{ext}`

**Why cuid2?**
- Globally unique (no collisions across distributed agents)
- Compact (10 characters, URL-safe)
- Sortable by creation time
- No central coordination required
- Cryptographically secure randomness

**Examples**:
```
knowledge_pack/raw/_pages/page_ckm9x7w8k0.html
knowledge_pack/raw/_pages/page_ckm9x7wdx1.pdf
knowledge_pack/raw/_pages/page_ckm9x7whp2.html
```

**Storage Rules**:
- Save full HTML/PDF as retrieved (no modifications)
- Preserve original encoding
- Generate new page ID for each fetch (even if same URL)
- Extension reflects original format (.html, .pdf)
- Reference via `pageId` and `pageFile` fields in raw data

**Why Save Complete Pages?**
- Enables verification of extracted values
- Provides context for conflict resolution
- Creates audit trail for compliance
- Allows re-extraction if parsing logic improves
- No screenshots needed (full source preserved)

#### 2.6 Agent Workflow and Memory Refresh Protocol

**Objective**: Ensure consistent, repeatable execution across 200+ autonomous search cycles.

**Core Principle**: One search per cycle, refresh memory after every push.

**Workflow**:
1. Read `search-tracker.json` to find next pending search
2. Claim search (update tracker, commit, push)
3. Execute search (WebSearch, WebFetch, save pages)
4. Extract data points (parse, generate IDs, record metadata)
5. Save raw data (append to category files)
6. Update tracker (mark complete, record metrics)
7. Commit completion (push all changes)
8. **Memory refresh** (re-read instructions, start next search)

**Why Memory Refresh?**
- Prevents instruction drift across long-running sessions
- Ensures latest instructions are always followed
- Catches document updates immediately
- Maintains strict adherence to process
- Enables agent restart/resume without context loss

**Agent Instructions**: See [phase-2-agent-instructions.md](phase-2-agent-instructions.md) for complete step-by-step autonomous workflow.

#### 2.7 Search Tracker Structure

**Objective**: Single source of truth for Phase 2 progress and coordination.

**File**: `knowledge_pack/search-tracker.json`

**Structure**:
```json
{
  "version": "1.0",
  "lastUpdated": "2025-11-05T14:42:00Z",
  "totalSearches": 200,
  "completedSearches": 1,
  "failedSearches": 0,
  "categories": [
    {
      "id": "cat_ckm9x7w8k0",
      "name": "Carrier Operating States",
      "priority": "high",
      "searches": [
        {
          "id": "search_ckm9x7wdx1",
          "query": "\"GEICO\" \"available in\" states",
          "category": "carrier-states",
          "carrier": "GEICO",
          "status": "completed",
          "assignedTo": "agent_ckm9x7wkm3",
          "startedAt": "2025-11-05T14:30:00Z",
          "completedAt": "2025-11-05T14:42:00Z",
          "durationSeconds": 720,
          "rawDataFiles": ["carriers/geico/states_operating.raw.json"],
          "pageFiles": ["page_ckm9x7w8k0"],
          "commitHash": "a1b2c3d4e5f6",
          "notes": "Found 50 states from official GEICO site"
        }
      ]
    }
  ],
  "statusCounts": {
    "pending": 199,
    "in_progress": 0,
    "completed": 1,
    "failed": 0
  }
}
```

**Status Values**:
- `pending`: Not yet started
- `in_progress`: Currently being processed by an agent
- `completed`: Successfully finished with data saved
- `failed`: Failed after retries (recorded for manual review)

**Tracker Benefits**:
- Machine-readable progress tracking
- Enables restart/resume (failed in_progress searches detected)
- Supports parallel agents (via assignedTo field)
- Complete audit trail (timing, files, commits)
- Prevents duplicate work

#### 2.8 Git Automation Workflow

**Objective**: Commit progress frequently for visibility, auditability, and crash recovery.

**Two-Commit Pattern**: Each search generates two commits.

**Commit 1: Claim Search**
```bash
git add knowledge_pack/search-tracker.json
git commit -m "chore(kb): claim search_abc123 - GEICO available states"
git push
```

**Purpose**: Reserve search, prevent duplicate work by other agents, create checkpoint.

**Commit 2: Complete Search**
```bash
git add knowledge_pack/
git commit -m "feat(kb): complete search_abc123 - found 50 states from geico.com"
git push
```

**Purpose**: Save all data, update tracker, create verifiable audit trail.

**Commit Message Format** (Conventional Commits):
- Claim: `chore(kb): claim {search-id} - {brief-description}`
- Complete: `feat(kb): complete {search-id} - found N points from {domain}`
- Failure: `chore(kb): fail search_abc123 - {error-summary}`

**Benefits**:
- Immediate visibility into progress
- Crash recovery (stale in_progress detected on restart)
- Complete git history for audit
- Enables rollback if needed
- Supports distributed agents

#### 2.9 Markdown Conversion (Post-Phase 2)

**Objective**: Convert HTML/PDF pages to markdown for easier reading and version control (AFTER Phase 2).

**Timing**: NOT during Phase 2 scraping. Bulk conversion after all searches complete.

**Tools**:
- `pandoc` for HTML → Markdown
- `pdftotext` + `pandoc` for PDF → Markdown
- Custom script: `scripts/kb-convert-pages-to-md.sh`

**Conversion Format**:
```
Input:  knowledge_pack/raw/_pages/page_ckm9x7w8k0.html
Output: knowledge_pack/raw/_pages/page_ckm9x7w8k0.md
```

**Why Post-Phase 2?**
- Keeps scraping phase simple and focused
- Markdown conversion can fail or need tuning
- Doesn't block data gathering progress
- Can be re-run if conversion logic improves

**Markdown Benefits**:
- Easier to read/review in git diffs
- Searchable with standard text tools
- Lighter weight than HTML/PDF
- Preserves structure (headings, lists, tables)

#### 2.10 Quality Signals to Capture

For each extracted value, note:
- **Specificity**: Exact number vs. range vs. vague ("up to")
- **Freshness**: "As of" date, "Updated" timestamp
- **Geographic scope**: National, state-specific, regional
- **Product applicability**: Which products this applies to
- **Effective date**: When this information becomes valid
- **Qualifiers**: "Average", "typical", "may vary", etc.

**Deliverable**: 30-50 `*.raw.json` files with all scraped data

---

### Phase 3: Conflict Detection (2-3 hours)

**Objective**: Systematically identify all conflicts where multiple sources provide different values for the same data point.

#### 3.1 Conflict Detection Script

Create `scripts/detect-conflicts.ts`:

**Pseudo-code**:
```typescript
for each dataPoint:
  sources = getAllSourcesForDataPoint(dataPoint)

  if sources.length > 1:
    values = sources.map(s => s.normalizedValue)
    uniqueValues = [...new Set(values)]

    if uniqueValues.length > 1:
      severity = calculateSeverity(uniqueValues, dataPoint)

      logConflict({
        id: generateConflictId(),
        dataPoint: dataPoint,
        conflictType: classifyConflict(values),
        severity: severity,
        sources: sources,
        detectedDate: now(),
        status: 'pending'
      })
```

#### 3.2 Conflict Types

| Type | Example | Detection Logic |
|------|---------|-----------------|
| **Range vs Specific** | "10-15%" vs "12%" | One value is range, other is specific number |
| **Numeric Difference** | "$1200" vs "$1400" | Both numbers, differ by >5% |
| **State Availability** | "All 50 states" vs "List of 47" | Array length differs |
| **Boolean Difference** | `true` vs `false` | Direct contradiction |
| **Missing Data** | Source A has value, B doesn't | One source missing data point |
| **Date Mismatch** | Different effective dates | Temporal conflict |

#### 3.3 Severity Classification

```typescript
function calculateSeverity(values, dataPoint) {
  // Critical: Affects routing or compliance
  if (dataPoint.affects === 'routing' || dataPoint.affects === 'compliance') {
    return 'critical'
  }

  // High: Numeric difference >20%
  if (numericDifference(values) > 0.20) {
    return 'high'
  }

  // Medium: Numeric difference 10-20%
  if (numericDifference(values) > 0.10) {
    return 'medium'
  }

  // Low: Minor differences, doesn't affect logic
  return 'low'
}
```

#### 3.4 Conflict Log Format

```json
{
  "conflicts": [
    {
      "id": "conflict-001",
      "dataPoint": "geico_multi_policy_discount_percentage",
      "detectedDate": "2025-11-05T14:00:00Z",
      "conflictType": "numeric_difference",
      "severity": "low",
      "sources": [
        {
          "id": "raw-001",
          "uri": "https://www.geico.com/auto/discounts/",
          "value": 15,
          "confidence": "high",
          "sourceAuthority": 5
        },
        {
          "id": "raw-045",
          "uri": "https://www.nerdwallet.com/article/insurance/geico-discounts",
          "value": 12,
          "confidence": "medium",
          "sourceAuthority": 3
        }
      ],
      "analysis": {
        "percentageDifference": 20,
        "affectsRouting": false,
        "affectsCompliance": false,
        "recommendedAction": "Use primary source (higher authority)"
      },
      "resolution": null,
      "status": "pending"
    }
  ]
}
```

**Deliverable**: `knowledge_pack/conflicts.json` with all detected conflicts

---

### Phase 4: Conflict Resolution (2-3 hours)

**Objective**: Resolve all conflicts using documented decision-making strategies, creating a transparent audit trail.

#### 4.1 Resolution Strategies (Priority Order)

See [knowledge-pack-source-hierarchy.md](knowledge-pack-source-hierarchy.md) for complete conflict resolution decision tree and source authority levels.

1. **Authoritative Source Hierarchy**
   - State regulatory > Carrier official > Industry org > Financial site
   - Use higher authority source when in conflict
   - **Details**: [source-hierarchy.md#authority-levels](knowledge-pack-source-hierarchy.md#source-authority-levels)

2. **Specificity Preference**
   - "15%" > "10-15%" > "up to 20%"
   - Explicit list > "All states" > "Nationwide"

3. **Temporal Preference**
   - More recent data preferred (check "Updated" dates)
   - Effective dates considered for time-sensitive data

4. **Conservative Estimate**
   - For discounts: Use lower/safer value
   - For minimums: Use higher/safer value

5. **Majority Consensus**
   - If 3+ sources, use majority value (if >50% agree)

6. **Context-Aware Decision**
   - Consider qualifiers ("up to", "average", "typical")
   - Apply domain knowledge (e.g., CA typically higher premiums)

7. **Expert Judgment**
   - Document manual decision when automated rules don't apply
   - Requires written rationale

#### 4.2 Resolution Decision Format

```json
{
  "conflictId": "conflict-001",
  "dataPoint": "geico_multi_policy_discount_percentage",
  "resolution": {
    "selectedValue": 15,
    "method": "authoritative_source",
    "strategyRank": 1,
    "rationale": "GEICO's official website (authority=5) takes precedence over NerdWallet (authority=3). Primary source is carrier's own site.",
    "resolvedBy": "data_curator",
    "resolvedDate": "2025-11-05T15:30:00Z",
    "confidence": "high",
    "reviewRequired": false,
    "retainedSources": [
      {
        "id": "raw-001",
        "uri": "https://www.geico.com/auto/discounts/",
        "elementRef": "div.discount-card > p.percentage",
        "primary": true,
        "note": "Official carrier source"
      },
      {
        "id": "raw-045",
        "uri": "https://www.nerdwallet.com/article/insurance/geico-discounts",
        "elementRef": "table > tr:nth-child(3) > td:nth-child(2)",
        "primary": false,
        "note": "Secondary source shows 12%, potentially outdated (no date visible)"
      }
    ]
  }
}
```

#### 4.3 Interactive Resolution Workflow

For conflicts requiring manual review:

```bash
$ bun run resolve-conflicts

Conflict 001/008 (severity: low)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data Point: geico_multi_policy_discount_percentage

Source 1 (authority: 5, confidence: high)
  URI: https://www.geico.com/auto/discounts/
  Value: 15%

Source 2 (authority: 3, confidence: medium)
  URI: https://www.nerdwallet.com/...
  Value: 12%

Recommended Strategy: authoritative_source
Recommended Value: 15

Actions:
  [1] Accept recommended (15)
  [2] Use alternative (12)
  [3] Enter custom value
  [4] Mark for expert review
  [5] Skip (resolve later)

Your choice: 1

Rationale (required): [Enter reason]
> Official GEICO source is authoritative

✓ Resolution saved. Next conflict...
```

#### 4.4 Resolution Log

Create `knowledge_pack/resolutions.json`:

```json
{
  "meta": {
    "totalConflicts": 8,
    "resolvedConflicts": 8,
    "pendingConflicts": 0,
    "resolutionDate": "2025-11-05",
    "curator": "data_curator"
  },
  "resolutions": [
    {
      "conflictId": "conflict-001",
      "resolution": { /* See format above */ }
    }
  ],
  "statistics": {
    "byStrategy": {
      "authoritative_source": 5,
      "specificity_preference": 2,
      "conservative_estimate": 1
    },
    "bySeverity": {
      "critical": 0,
      "high": 1,
      "medium": 3,
      "low": 4
    }
  }
}
```

**Deliverable**:
- `knowledge_pack/clean/` directory with resolved data
- `knowledge_pack/resolutions.json` with all decisions
- `knowledge_pack/audit-trail.json` with complete lineage

---

### Phase 5: Knowledge Pack Assembly (1-2 hours)

**Objective**: Transform clean, resolved data into production-ready JSON files for the RAG system.

#### 5.1 Production Format Design

```json
{
  "meta": {
    "schemaVersion": "1.0",
    "generatedDate": "2025-11-05T16:00:00Z",
    "carrier": "GEICO",
    "totalDataPoints": 157,
    "totalSources": 42,
    "conflictsResolved": 3
  },
  "carrier": {
    "_id": "carrier-geico-001",
    "_sources": [
      {
        "uri": "https://www.geico.com/",
        "elementRef": "header > h1",
        "accessedDate": "2025-11-05"
      }
    ],
    "name": "GEICO",
    "operatesIn": {
      "_id": "field-001",
      "_sources": [
        {
          "uri": "https://www.geico.com/information/states/",
          "elementRef": "section#state-list",
          "accessedDate": "2025-11-05"
        }
      ],
      "value": ["CA", "TX", "FL", "NY", "IL"]
    },
    "discounts": [
      {
        "_id": "discount-geico-multi-001",
        "name": {
          "_id": "field-002",
          "_sources": [{"uri": "...", "elementRef": "..."}],
          "value": "Multi-Policy Bundle"
        },
        "percentage": {
          "_id": "field-003",
          "_sources": [
            {"uri": "https://www.geico.com/auto/discounts/", "primary": true},
            {"uri": "https://www.nerdwallet.com/...", "primary": false}
          ],
          "_resolution": {
            "conflictId": "conflict-001",
            "method": "authoritative_source"
          },
          "value": 15
        },
        "states": {
          "_id": "field-004",
          "_sources": [],
          "_inheritedFrom": "field-001",
          "value": ["CA", "TX", "FL", "NY", "IL"]
        }
      }
    ]
  }
}
```

#### 5.2 Field Naming Convention

- **Data fields**: `camelCase` (e.g., `operatesIn`, `percentage`)
- **Metadata fields**: Prefixed with `_` (e.g., `_id`, `_sources`, `_resolution`)
- **Special fields**: `_inheritedFrom` for source inheritance

#### 5.3 Directory Structure

```
knowledge_pack/
├── carriers/
│   ├── geico.json         # Production file
│   ├── progressive.json   # Production file
│   └── state-farm.json    # Production file
├── states/
│   ├── CA.json           # Production file
│   ├── TX.json           # Production file
│   ├── FL.json           # Production file
│   ├── NY.json           # Production file
│   └── IL.json           # Production file
├── products.json         # Production file
├── compliance.json       # Production file
├── schemas/              # JSON schemas
├── raw/                  # Raw scraped data (preserved)
├── clean/                # Cleaned data (intermediate)
├── conflicts.json        # Conflict log
├── resolutions.json      # Resolution decisions
├── audit-trail.json      # Complete lineage
├── validation-report.json # QA results
└── README.md             # Documentation
```

#### 5.4 Citation Compression

For production files, compress source references:

```json
// Full format (in clean/)
"_sources": [
  {
    "uri": "https://www.geico.com/auto/discounts/",
    "elementRef": "div.discount-card > p.percentage",
    "accessedDate": "2025-11-05",
    "primary": true
  }
]

// Compressed format (in production)
"_sources": [
  {
    "uri": "https://www.geico.com/auto/discounts/",
    "ref": "div.discount-card > p.percentage",
    "date": "2025-11-05"
  }
]

// Or reference by ID (most compact)
"_sources": ["src-001"]
// With separate sources lookup table in audit-trail.json
```

**Deliverable**: 10 production JSON files ready for RAG consumption

---

### Phase 6: Validation & Quality Assurance (1-2 hours)

**Objective**: Verify data integrity, completeness, and compliance with requirements.

#### 6.1 Automated Validation Checks

Create `scripts/validate-kb.ts`:

```typescript
// Validation Rules
const validationChecks = [
  {
    name: 'UUID Uniqueness',
    check: () => allIdsAreUnique(),
    critical: true
  },
  {
    name: 'Every field has _id',
    check: () => everyFieldHasId(),
    critical: true
  },
  {
    name: 'Every field has source OR inheritedFrom',
    check: () => everyFieldHasSourceOrInheritance(),
    critical: true
  },
  {
    name: 'No orphaned inheritedFrom references',
    check: () => allInheritedFromReferencesValid(),
    critical: true
  },
  {
    name: 'All source URIs are valid',
    check: () => allSourceUrisValid(),
    critical: false
  },
  {
    name: 'All conflicts have resolutions',
    check: () => allConflictsResolved(),
    critical: true
  },
  {
    name: 'Cross-references valid',
    check: () => carrierStatesExistInStatesFolder(),
    critical: true
  },
  {
    name: 'Schema validation',
    check: () => validateAgainstJsonSchema(),
    critical: true
  },
  {
    name: 'No zero-source data points',
    check: () => noZeroSourceDataPoints(),
    critical: true
  }
]
```

#### 6.2 Coverage Metrics

```json
{
  "coverage": {
    "carriers": 3,
    "states": 5,
    "products": 4,
    "totalDataPoints": 670,
    "sourcedDataPoints": 670,
    "unsourcedDataPoints": 0,
    "inheritedDataPoints": 45,
    "multiSourceDataPoints": 23,
    "zeroSourceDataPoints": 0
  }
}
```

#### 6.3 Quality Metrics

```json
{
  "quality": {
    "averageSourcesPerDataPoint": 1.34,
    "averageConfidenceScore": 4.2,
    "highConfidenceDataPoints": 589,
    "mediumConfidenceDataPoints": 73,
    "lowConfidenceDataPoints": 8,
    "primarySourceCoverage": 0.96
  }
}
```

#### 6.4 Validation Report Format

```json
{
  "validationDate": "2025-11-05T17:00:00Z",
  "validator": "validate-kb.ts v1.0",
  "status": "PASS",
  "criticalChecks": {
    "passed": 7,
    "failed": 0,
    "total": 7
  },
  "nonCriticalChecks": {
    "passed": 1,
    "failed": 0,
    "warnings": 0,
    "total": 1
  },
  "details": [
    {
      "check": "UUID Uniqueness",
      "status": "PASS",
      "message": "All 670 UUIDs are unique"
    },
    {
      "check": "Every field has source OR inheritedFrom",
      "status": "PASS",
      "message": "625 fields have direct sources, 45 fields inherit (100% coverage)"
    }
  ],
  "coverage": { /* See 6.2 */ },
  "quality": { /* See 6.3 */ },
  "recommendations": []
}
```

**Deliverable**: `knowledge_pack/validation-report.json` with QA results

---

### Phase 7: Documentation (1 hour)

**Objective**: Create comprehensive documentation for methodology, sources, and audit trail.

#### 7.1 README.md Structure

```markdown
# Knowledge Pack - Insurance Broker Quote Assistant

## Overview
This knowledge pack contains insurance carrier, state requirement, and compliance data for the IQuote Pro assistant. All data is sourced from publicly available information with complete audit trails.

## Data Collection Methodology

### Collection Period
November 5-6, 2025

### Source Hierarchy
1. State Regulatory Sites (Highest Authority)
2. Carrier Official Sites (Primary Sources)
3. Industry Organizations (Reference)
4. Financial Sites (Secondary/Benchmarking)

### Process
1. Raw data scraping (42 sources, 670 data points)
2. Conflict detection (8 conflicts identified)
3. Conflict resolution (8/8 resolved via documented strategies)
4. Source tracking (100% coverage with citations)
5. Validation (all checks passed)

## Data Quality Metrics
- Total Data Points: 670
- Fully Sourced: 670 (100%)
- Multi-Source: 23 (3.4%)
- Inherited Sources: 45 (6.7%)
- Conflicts Detected: 8
- Conflicts Resolved: 8 (100%)
- Average Confidence Score: 4.2/5.0

## Source Summary

### Carrier Sources (3 carriers × ~14 URLs = 42 primary sources)

#### GEICO
- Main: https://www.geico.com/ (accessed 2025-11-05)
- Discounts: https://www.geico.com/auto/discounts/ (accessed 2025-11-05)
- States: https://www.geico.com/information/states/ (accessed 2025-11-05)
- [See audit-trail.json for 14 total GEICO sources]

#### Progressive
- [Similar structure]

#### State Farm
- [Similar structure]

### State Regulatory Sources (5 states)
- CA: https://www.insurance.ca.gov/ (accessed 2025-11-05)
- TX: https://www.tdi.texas.gov/ (accessed 2025-11-05)
- FL: https://www.floir.com/ (accessed 2025-11-05)
- NY: https://www.dfs.ny.gov/ (accessed 2025-11-05)
- IL: https://www2.illinois.gov/sites/Insurance/ (accessed 2025-11-05)

### Industry Sources
- Insurance Information Institute: https://www.iii.org/
- NAIC: https://content.naic.org/

## Files Structure

### Production Files (Used by RAG)
- `carriers/*.json` - 3 carrier files with embedded sources
- `states/*.json` - 5 state files with embedded sources
- `products.json` - Product definitions
- `compliance.json` - Compliance rules

### Audit & Quality Files
- `raw/*.json` - Original scraped data (preserved)
- `clean/*.json` - Cleaned data with resolutions
- `conflicts.json` - All detected conflicts
- `resolutions.json` - Resolution decisions
- `audit-trail.json` - Complete data lineage
- `validation-report.json` - QA results

### Schema Files
- `schemas/*.json` - JSON schemas for validation

## Data Point Examples

### Multi-Source Data Point
```json
"percentage": {
  "_id": "field-003",
  "_sources": [
    {"uri": "https://www.geico.com/auto/discounts/", "primary": true},
    {"uri": "https://www.nerdwallet.com/...", "primary": false}
  ],
  "_resolution": {"conflictId": "conflict-001", "method": "authoritative_source"},
  "value": 15
}
```

### Inherited Source
```json
"states": {
  "_id": "field-004",
  "_sources": [],
  "_inheritedFrom": "field-001",
  "value": ["CA", "TX", "FL", "NY", "IL"]
}
```

## Compliance Notes
- All data from publicly available sources
- Pricing is approximate for demonstration purposes
- Actual insurance rates require underwriting
- See `compliance.json` for required disclaimers

## Audit Trail
For complete data lineage, see `audit-trail.json`. Every data point can be traced back to its original source(s).

## Updates
To update data:
1. Scrape new sources → raw/
2. Detect conflicts → conflicts.json
3. Resolve conflicts → resolutions.json
4. Regenerate production files
5. Re-run validation

Last Updated: 2025-11-05
```

#### 7.2 Audit Trail Format

`knowledge_pack/audit-trail.json`:

```json
{
  "meta": {
    "generated": "2025-11-05T18:00:00Z",
    "totalDataPoints": 670,
    "totalSources": 42,
    "totalConflicts": 8
  },
  "sources": {
    "src-001": {
      "uri": "https://www.geico.com/auto/discounts/",
      "elementRef": "div.discount-card > p.percentage",
      "accessedDate": "2025-11-05T10:30:00Z",
      "authority": 5,
      "confidence": "high",
      "usedBy": ["field-003", "field-007", "field-012"]
    }
  },
  "dataPoints": {
    "field-003": {
      "path": "carriers/geico.json > discounts[0] > percentage",
      "value": 15,
      "sources": ["src-001", "src-045"],
      "resolution": "conflict-001",
      "confidence": "high"
    }
  },
  "conflicts": {
    "conflict-001": {
      "dataPoint": "field-003",
      "sources": ["src-001", "src-045"],
      "resolution": "authoritative_source",
      "resolvedDate": "2025-11-05T15:30:00Z"
    }
  },
  "lineage": [
    {
      "dataPoint": "field-003",
      "trace": [
        "Raw scrape: src-001 → raw-001 (value: '15%')",
        "Raw scrape: src-045 → raw-045 (value: '12%')",
        "Conflict detected: conflict-001 (2 values)",
        "Resolution: authoritative_source → 15%",
        "Clean data: clean/carriers/geico.json",
        "Production: carriers/geico.json"
      ]
    }
  ]
}
```

**Deliverable**: Complete README.md + audit-trail.json

---

## Implementation Timeline

| Phase | Duration | Effort | Deliverable |
|-------|----------|--------|-------------|
| 1. Schema Design | 1 hour | Light | 4 schema files |
| 2. Raw Scraping | 4-6 hours | Heavy | 30-50 raw files |
| 3. Conflict Detection | 2-3 hours | Medium | conflicts.json |
| 4. Conflict Resolution | 2-3 hours | Medium | resolutions.json, clean/ |
| 5. KB Assembly | 1-2 hours | Light | 10 production files |
| 6. Validation | 1-2 hours | Light | validation-report.json |
| 7. Documentation | 1 hour | Light | README.md, audit-trail.json |
| **TOTAL** | **12-18 hours** | **Med-Heavy** | **Complete auditable KB** |

---

## Tools & Scripts

### Required Scripts
```
scripts/
├── 01-scrape-carriers.ts       # Web scraping with element refs
├── 02-scrape-states.ts         # Scrape state regulatory sites
├── 03-scrape-industry.ts       # Scrape industry/comparison sites
├── 04-detect-conflicts.ts      # Find conflicts in raw data
├── 05-resolve-conflicts.ts     # Interactive conflict resolution
├── 06-generate-uuids.ts        # Assign UUIDs to all data points
├── 07-build-audit-trail.ts     # Create complete lineage
├── 08-assemble-kb.ts           # Transform clean → production
├── 09-validate-kb.ts           # Run validation checks
└── 10-generate-docs.ts         # Create README and reports
```

### Utility Modules
```
scripts/utils/
├── source-tracker.ts           # Track sources with element refs
├── conflict-detector.ts        # Detect value conflicts
├── uuid-generator.ts           # Generate consistent UUIDs
├── schema-validator.ts         # Validate against schemas
├── citation-formatter.ts       # Format citations consistently
└── quality-scorer.ts           # Calculate confidence scores
```

---

## Success Criteria

✅ **Data Coverage**: 3 carriers × 5 states × 4 products = 670 data points  
✅ **Source Coverage**: Every data point has ≥1 source (100%)  
✅ **Conflict Resolution**: All conflicts detected and resolved (8/8)  
✅ **Audit Trail**: Complete lineage from raw → production  
✅ **Validation**: All critical checks pass  
✅ **Documentation**: README.md with methodology and sources  
✅ **Compliance**: Zero unsourced data points  

---

## Benefits for PEAK6 Demo

This methodology provides:

1. **Full Auditability**: Trace any recommendation to original source
2. **Conflict Transparency**: All disagreements documented with resolutions
3. **Source Diversity**: Multiple sources strengthen data reliability
4. **Change Tracking**: Can update individual sources without rebuilding
5. **Regulatory Defense**: "Where did this number come from?" → audit-trail.json
6. **Quality Assurance**: Automated validation catches errors
7. **Maintainability**: Clear process for updates and expansions

---

## Next Steps

1. Review and approve this methodology
2. Create JSON schemas (Phase 1)
3. Begin raw data scraping (Phase 2)
4. Execute remaining phases sequentially
5. Validate and document results

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-05  
**Status**: Ready for Implementation
