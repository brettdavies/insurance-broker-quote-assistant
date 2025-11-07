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

**Status**: ✅ Complete
**Note**: Completed 2025-11-05. Created 4 schema files (342 lines) in knowledge_pack/schemas/. Git commit: 82b1198.

#### 1.1 Source Metadata Structure

Every field in the knowledge pack uses a metadata envelope for source tracking. See [sot-schemas.md#field-metadata-envelope](sot-schemas.md#field-metadata-envelope) for complete specification.

**Core concept:**
```json
{
  "_id": "fld_ckm9x7whp2",
  "value": 15,
  "_sources": [...],      // Direct source citations (≥1 required if not inherited)
  "_inheritedFrom": null, // OR parent field ID
  "_resolution": {...}    // Conflict resolution metadata (if applicable)
}
```

**See also:** [Complete schemas →](sot-schemas.md#core-concepts)

#### 1.2 Source Inheritance Rules

When a child data point has no direct sources, it inherits from its parent. See [sot-schemas.md#8-source-inheritance-rules](sot-schemas.md#8-source-inheritance-rules) for complete specification and examples.

#### 1.3 cuid2 Generation Conventions

All entity IDs use **cuid2** format with type prefixes for global uniqueness. See [sot-id-conventions.md](sot-id-conventions.md) for complete specification.

**Quick reference:**
- Carriers: `carr_{cuid2}` (e.g., `carr_ckm9x7w8k0`)
- Discounts: `disc_{cuid2}`
- Fields: `fld_{cuid2}`
- [See all prefixes →](sot-id-conventions.md#complete-id-prefix-reference)

All IDs tracked in `audit-trail.json` for cross-reference.

#### 1.4 Schema Files to Create

| File | Purpose |
|------|---------|
| `schemas/carrier-schema.json` | Carrier data structure with source tracking |
| `schemas/state-schema.json` | State data structure with source tracking |
| `schemas/source-metadata.json` | Source object definition |
| `schemas/resolution-metadata.json` | Conflict resolution tracking |

**Complete schema specifications**: See [sot-schemas.md](sot-schemas.md) for all JSON schema definitions.

**Deliverable**: 4 schema files in `knowledge_pack/schemas/`

**See Also:**
- 📖 [Complete Schemas](sot-schemas.md) - Full JSON schema specifications
- 🔗 [ID Conventions](sot-id-conventions.md) - cuid2 usage for all entities

---

### Phase 2: Automated Data Discovery via Brave API (4-6 hours)

**Objective**: Execute all search queries via Brave Search API, discover and enrich URLs, fetch page content for extraction.

**Status**: ✅ Complete (Brave API integration implemented 2025-11-07)
**Architecture**: Single-threaded deterministic execution with Brave Search API and crawl4ai

**Critical Rule**: DO NOT RESOLVE CONFLICTS YET - Just capture everything!

#### 2.1 Three-Step Automated Workflow

**Step 1: Search Execution** (`brave-search.py`)
1. **Load search queries** from search-tracker.json (476 queries from sot-search-queries.md)
2. **Execute Brave API searches** with 1.1s rate limiting between requests
3. **Extract URLs from results** (web.results array in Brave API response)
4. **Enrich with Brave metadata**: title, description, page_age, language, type, subtype, hostname, source_name
5. **Generate websearch ID** (websearch_{cuid2}) for each search execution
6. **Save raw request/response** to `knowledge_pack/raw/websearches/websearch_{cuid2}.json`
7. **Deduplicate URLs** via SHA256 hash and save to url-tracker.json
8. **Update search status** to 'completed' with lastrunAt timestamp

**Step 2: URL Fetching** (`fetch-url.py`)
1. **Load pending URLs** from url-tracker.json
2. **Fetch page content** using crawl4ai (both HTML and markdown)
3. **Generate page ID** (page_{cuid2})
4. **Save raw files** to `knowledge_pack/raw/pages/{page_id}.{html|md}`
5. **Register page** in page-tracker.json with metadata (size, status, etc.)
6. **Update URL status** to 'completed' with fetchedAt timestamp

**Step 3: Data Extraction** (Phase 3)
1. **Load pages** from page-tracker.json
2. **Extract data points** using LLM or pattern matching
3. **Generate unique IDs** for each extracted field (fld_{cuid2})
4. **Track element references** (CSS selectors, line numbers)
5. **Save to raw data files** organized by category

#### 2.2 Raw Data Entry Format

```json
{
  "id": "raw_cm8r2s4b6g",
  "dataPoint": "geico_multi_policy_discount_percentage",
  "rawValue": "up to 15%",
  "normalizedValue": 15,
  "source": {
    "uri": "https://www.geico.com/auto/discounts/",
    "elementRef": "div.discount-card[data-discount='multi-policy'] > p.percentage",
    "accessedDate": "2025-11-05T10:30:00Z",
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
├── websearches/                    # Brave API request/response logs
│   ├── websearch_{cuid2}.json     # Complete API call with metadata
│   ├── websearch_{cuid2}.json     # (468 files from Step 1)
│   └── ...
├── pages/                          # Fetched HTML/markdown page content
│   ├── page_{cuid2}.html          # Raw HTML from crawl4ai
│   ├── page_{cuid2}.md            # Converted markdown
│   └── ...                        # (2,950 files from Step 2)
├── carriers/                       # Extracted data organized by carrier
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
├── states/                         # Extracted state-specific data
│   ├── CA_minimums.raw.json
│   ├── CA_requirements.raw.json
│   ├── CA_special.raw.json
│   └── [same for TX, FL, NY, IL]
└── industry/                       # Industry benchmarking data
    ├── average_pricing_iii.raw.json
    ├── average_pricing_bankrate.raw.json
    └── discount_benchmarks.raw.json
```

#### 2.5 Implementation Details

**Key Implementation Concepts:**
- **Brave API Client**: Rate-limited (1.1s delay) with dual token management (FREE → PAID fallback)
- **Search Tracker**: `search-tracker.json` tracks 476 searches with status, lastrunAt, and metadata
- **URL Tracker**: `url-tracker.json` tracks 2,950 unique URLs with enrichment from Brave API (title, description, etc.)
- **Page Tracker**: `page-tracker.json` tracks fetched pages (HTML + markdown) with size metadata
- **Websearch Entity**: Separate from search entity - tracks individual Brave API execution instances
- **URL Deduplication**: SHA256 hash (urlHash) prevents duplicate fetches across multi-search discovery
- **Multi-Search Provenance**: URLs track both search_ids (originating queries) and websearch_ids (API executions)
- **Audit Trail**: Complete Brave API request/response saved to `websearches/` for compliance verification
- **Markdown Conversion**: Post-Phase 2 bulk conversion of HTML/PDF to markdown for easier review
- **Quality Signals**: Capture specificity, freshness, geographic scope, qualifiers for later conflict resolution

**Deliverable**: 30-50 `*.raw.json` files with all scraped data

**See Also:**
- 📖 [Agent Workflow](phase-2-agent-instructions.md) - Step-by-step autonomous execution
- 🔗 [Search Queries](sot-search-queries.md) - 200+ queries for data gathering
- 📊 [Raw Data Examples](knowledge-pack-examples.md#example-1-multi-policy-discount) - See raw scraping in action

---

### Phase 3: Conflict Detection (2-3 hours)

**Objective**: Systematically identify all conflicts where multiple sources provide different values for the same data point.

**Status**: ⏳ Pending
**Note**: Requires Phase 2 completion. Automated script will detect conflicts in raw data.

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
      "id": "conf_cm2b6c8l0q",
      "dataPoint": "geico_multi_policy_discount_percentage",
      "detectedDate": "2025-11-05T14:00:00Z",
      "conflictType": "numeric_difference",
      "severity": "low",
      "sources": [
        {
          "id": "raw_cm8r2s4b6g",
          "uri": "https://www.geico.com/auto/discounts/",
          "value": 15,
          "confidence": "high",
          "sourceAuthority": 5
        },
        {
          "id": "raw_cm0t4u6d8i",
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

**See Also:**
- 📖 [Conflict Detection Examples](knowledge-pack-examples.md#example-2-california-auto-minimums) - Real conflict scenarios
- 🔗 [Resolution Schema](sot-schemas.md#4-resolution-object) - Data structure for conflicts

---

### Phase 4: Conflict Resolution (2-3 hours)

**Objective**: Resolve all conflicts using documented decision-making strategies, creating a transparent audit trail.

**Status**: ⏳ Pending
**Note**: Requires Phase 3 completion. Interactive resolution workflow using 7-step decision tree.

#### 4.1 Resolution Strategies (Priority Order)

See [sot-source-hierarchy.md](sot-source-hierarchy.md) for complete conflict resolution decision tree and source authority levels.

See [sot-source-hierarchy.md#conflict-resolution-decision-tree](sot-source-hierarchy.md#conflict-resolution-decision-tree) for the complete 7-step conflict resolution decision tree and priority ordering.

#### 4.2 Resolution Decision Format

```json
{
  "conflictId": "conf_cm2b6c8l0q",
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
        "id": "raw_cm8r2s4b6g",
        "uri": "https://www.geico.com/auto/discounts/",
        "elementRef": "div.discount-card > p.percentage",
        "primary": true,
        "note": "Official carrier source"
      },
      {
        "id": "raw_cm0t4u6d8i",
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
      "conflictId": "conf_cm2b6c8l0q",
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

**See Also:**
- 📖 [Source Hierarchy](sot-source-hierarchy.md) - Complete decision tree and authority levels
- 📊 [Resolution Examples](knowledge-pack-examples.md#example-4-three-way-conflict-with-majority-consensus) - Real conflict resolutions

---

### Phase 5: Knowledge Pack Assembly (1-2 hours)

**Objective**: Transform clean, resolved data into production-ready JSON files for the RAG system.

**Status**: ⏳ Pending
**Note**: Requires Phase 4 completion. Transform clean data into production format with citation compression.

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
    "_id": "carr_jiia4ewjg2",
    "_sources": [
      {
        "uri": "https://www.geico.com/",
        "elementRef": "header > h1",
        "accessedDate": "2025-11-05T12:00:00Z"
      }
    ],
    "name": "GEICO",
    "operatesIn": {
      "_id": "fld_cm6f0g2p4u",
      "_sources": [
        {
          "uri": "https://www.geico.com/information/states/",
          "elementRef": "section#state-list",
          "accessedDate": "2025-11-05T12:00:00Z"
        }
      ],
      "value": ["CA", "TX", "FL", "NY", "IL"]
    },
    "discounts": [
      {
        "_id": "disc_cm5e9f1o3t",
        "name": {
          "_id": "fld_cm7g1h3q5v",
          "_sources": [{"uri": "...", "elementRef": "..."}],
          "value": "Multi-Policy Bundle"
        },
        "percentage": {
          "_id": "fld_cm8h2i4r6w",
          "_sources": [
            {"uri": "https://www.geico.com/auto/discounts/", "primary": true},
            {"uri": "https://www.nerdwallet.com/...", "primary": false}
          ],
          "_resolution": {
            "conflictId": "conf_cm2b6c8l0q",
            "method": "authoritative_source"
          },
          "value": 15
        },
        "states": {
          "_id": "fld_cm9i3j5s7x",
          "_sources": [],
          "_inheritedFrom": "fld_cm6f0g2p4u",
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
    "accessedDate": "2025-11-05T12:00:00Z",
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
"_sources": ["src_cm6z0a2j4o"]
// With separate sources lookup table in audit-trail.json
```

**Deliverable**: 10 production JSON files ready for RAG consumption

**See Also:**
- 📖 [Production Schemas](sot-schemas.md#1-carrier-schema) - Complete schema specifications
- 📊 [Complete Carrier Example](knowledge-pack-examples.md#example-5-complete-carrier-file-production-format) - Production format sample

---

### Phase 6: Validation & Quality Assurance (1-2 hours)

**Objective**: Verify data integrity, completeness, and compliance with requirements.

**Status**: ⏳ Pending
**Note**: Requires Phase 5 completion. Automated validation checks against schema and business rules.

#### 6.1 Automated Validation Checks

Create `scripts/validate-kb.ts`:

```typescript
// Validation Rules
const validationChecks = [
  {
    name: 'ID Uniqueness',
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
      "check": "ID Uniqueness",
      "status": "PASS",
      "message": "All 670 IDs are unique"
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

**See Also:**
- 📖 [Validation Rules](sot-schemas.md#validation-rules) - Schema validation specifications
- 🔗 [Quality Metrics](sot-schemas.md#required-validations) - Required validation checks

---

### Phase 7: Documentation (1 hour)

**Objective**: Create comprehensive documentation for methodology, sources, and audit trail.

**Status**: ⏳ Pending
**Note**: Requires Phase 6 completion. Generate README.md and audit-trail.json with complete data lineage.

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
  "_id": "fld_cm8h2i4r6w",
  "_sources": [
    {"uri": "https://www.geico.com/auto/discounts/", "primary": true},
    {"uri": "https://www.nerdwallet.com/...", "primary": false}
  ],
  "_resolution": {"conflictId": "conf_cm2b6c8l0q", "method": "authoritative_source"},
  "value": 15
}
```

### Inherited Source
```json
"states": {
  "_id": "fld_cm9i3j5s7x",
  "_sources": [],
  "_inheritedFrom": "fld_cm6f0g2p4u",
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
    "src_cm6z0a2j4o": {
      "uri": "https://www.geico.com/auto/discounts/",
      "elementRef": "div.discount-card > p.percentage",
      "accessedDate": "2025-11-05T10:30:00Z",
      "authority": 5,
      "confidence": "high",
      "usedBy": ["fld_cm8h2i4r6w", "fld_cm2l6m8v0a", "fld_cm6p0q2z4e"]
    }
  },
  "dataPoints": {
    "fld_cm8h2i4r6w": {
      "path": "carriers/geico.json > discounts[0] > percentage",
      "value": 15,
      "sources": ["src_cm6z0a2j4o", "src_cm7a1b3k5p"],
      "resolution": "conf_cm2b6c8l0q",
      "confidence": "high"
    }
  },
  "conflicts": {
    "conf_cm2b6c8l0q": {
      "dataPoint": "fld_cm8h2i4r6w",
      "sources": ["src_cm6z0a2j4o", "src_cm7a1b3k5p"],
      "resolution": "authoritative_source",
      "resolvedDate": "2025-11-05T15:30:00Z"
    }
  },
  "lineage": [
    {
      "dataPoint": "fld_cm8h2i4r6w",
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

**See Also:**
- 📖 [Complete Examples](knowledge-pack-examples.md) - See full audit trail examples
- 🔗 [All Documentation Files](README.md) - Index of all knowledge pack docs

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
├── 06-generate-ids.ts          # Assign cuid2 IDs to all data points
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
├── id-generator.ts             # Generate consistent cuid2 IDs
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
