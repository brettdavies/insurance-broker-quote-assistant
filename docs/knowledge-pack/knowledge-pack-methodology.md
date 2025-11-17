# Knowledge Pack Data Gathering Methodology

**Version**: 2.0 (Simplified Demo)  
**Date**: 2025-11-09  
**Project**: Insurance Broker Quote Assistant (IQuote Pro)  
**Purpose**: Document the streamlined 7-phase methodology for creating the PEAK6 5-day demo knowledge pack with entity-level source tracking

---

## Overview

This document defines the simplified methodology for gathering, validating, and assembling the knowledge pack that powers the Insurance Broker Quote Assistant. The approach balances demo constraints (5-day timeline) with production patterns (entity-level sources, footnote citations, offline operation).

### Key Requirements (PEAK6 Spec)

- ✅ **Offline operation** - No runtime web access required
- ✅ **Entity-level sources** - Each carrier/discount/state tracks source URL + accessed date
- ✅ **Footnote-style citations** - Industry standard format for broker outputs
- ✅ **Compliance filters** - Prohibited statements + required disclosures
- ✅ **Docker-mountable** - Knowledge pack loaded at `/knowledge_pack` (read-only)
- ✅ **Source-authority deduplication** - Carrier official > State regulatory > 3rd party

### Simplified Approach (vs v1.0 Production)

**What Changed:**
- ✂️ No granular field-level source tracking (entity-level sources instead)
- ✂️ No complex conflict resolution workflows (source-authority deduplication)
- ✂️ No per-field cuid2 IDs (only entity-level IDs: carriers, discounts, states)
- ➕ LLM-based extraction with structured prompts (Claude Sonnet 4.5 or GPT-4o-mini)
- ➕ Normalization during extraction (lowercase carriers/products, uppercase states)
- ➕ Generic storage in `raw/extractions/` for mixed carrier/state data

---

## Seven-Phase Scraper Pipeline

### Phase 1: URL Discovery (4-6 hours)

**Objective**: Execute search queries via Brave Search API to discover relevant insurance pages.

**Status**: ✅ Complete (2025-11-07)  
**Output**: 2,950 unique URLs discovered and tracked

#### 1.1 Search Execution

**Script**: `phase1-url-discovery/brave-search.py`

1. Load search queries from `search-tracker.json` (476 queries)
2. Execute Brave API searches with 1.1s rate limiting
3. Extract URLs from results (web.results array)
4. Enrich with Brave metadata: title, description, page_age, hostname
5. Generate websearch ID (websearch_{cuid2}) for each API execution
6. Save raw request/response to `raw/websearches/websearch_{cuid2}.json`
7. Deduplicate URLs via SHA256 hash
8. Update search status to 'completed' with lastrunAt timestamp

#### 1.2 Source Categories

**Carrier Official Sites** (Authority: 5):
- GEICO: geico.com/auto/discounts/, geico.com/information/states/
- Progressive: progressive.com/auto/discounts/
- State Farm: statefarm.com/insurance/auto/discounts

**State Regulatory Sites** (Authority: 4):
- CA: insurance.ca.gov
- TX: tdi.texas.gov
- FL: floir.com
- NY: dfs.ny.gov
- IL: illinois.gov

**Industry Organizations** (Authority: 3):
- Insurance Information Institute: iii.org, NAIC: naic.org

**Financial Sites** (Authority: 2):
- Bankrate: bankrate.com/insurance/, NerdWallet: nerdwallet.com/insurance/

**Deliverable**:
- `url-tracker.json` with 2,950 URLs
- `raw/websearches/` with 468 Brave API responses

---

### Phase 2: Page Fetching (6-8 hours)

**Objective**: Fetch HTML and markdown content for all discovered URLs using crawl4ai.

**Status**: ✅ Complete (2025-11-08)  
**Output**: 2,925 pages fetched (HTML + markdown)

#### 2.1 Fetching Workflow

**Script**: `phase2-page-fetching/fetch-all-urls.py`

1. Load pending URLs from `url-tracker.json`
2. Fetch page content using crawl4ai (async, concurrent workers)
3. Generate page ID (page_{cuid2}) for each URL
4. Save raw files to `raw/pages/{page_id}.{html|md}`
5. Register page in `page-tracker.json` with metadata (size, status, fetchedAt)
6. Update URL status to 'completed' in `url-tracker.json`

#### 2.2 File Organization

```
knowledge-pack-scraper/raw/
├── websearches/              # Phase 1 output
│   └── websearch_*.json      # (468 files)
└── pages/                    # Phase 2 output
    ├── page_*.html           # Raw HTML from crawl4ai
    └── page_*.md             # Converted markdown
                              # (2,925 × 2 = 5,850 files)
```

#### 2.3 Page Tracking

**Tracker**: `page-tracker.json`

```json
{
  "page_abc123": {
    "url": "https://www.geico.com/auto/discounts/",
    "url_id": "url_xyz789",
    "status": "fetched",
    "fetchedAt": "2025-11-08T14:30:00Z",
    "sizeHtml": 45231,
    "sizeMd": 12456
  }
}
```

**Deliverable**:
- 2,925 HTML files in `raw/pages/`
- 2,925 markdown files in `raw/pages/`
- Updated `page-tracker.json` with fetch metadata

---

### Phase 3: Domain Analysis (2-3 hours)

**Objective**: Analyze HTML patterns to identify boilerplate (navigation, headers, footers, ads) and content regions.

**Status**: ✅ Complete (2025-11-08)  
**Output**: Domain pattern analysis for 15 unique domains

#### 3.1 Analysis Workflow

**Script**: `phase3-domain-analysis/analyze-domains.py`

1. Group pages by domain (15 unique domains from 2,925 pages)
2. Sample 10-20 pages per domain for pattern detection
3. Identify common HTML patterns (headers, footers, navigation, ads)
4. Generate domain-specific filtering rules
5. Save domain analysis to `domain-analysis.json`

#### 3.2 Domain Patterns Identified

**Boilerplate Categories**:
- Header navigation (`<header>`, `<nav>`, `.site-header`)
- Footer content (`<footer>`, `.site-footer`, `.footer-links`)
- Sidebars (`.sidebar`, `.widget-area`, `.aside`)
- Ads/marketing (`.ad-`, `.promo-`, `.cta-`)
- Social media (`[class*="social"]`, `.share-buttons`)
- Legal disclaimers at page bottom

**Content Regions**:
- Main content (`<main>`, `<article>`, `.main-content`)
- Discount cards/tables (`.discount-`, `.savings-`, `table`)
- State information tables (`table`, `.state-list`)
- Product descriptions (`.product-`, `.coverage-`)

**Deliverable**:
- `domain-analysis.json` with filtering rules for 15 domains

---

### Phase 4: Page Filtering (8-10 hours)

**Objective**: Apply domain-specific filtering rules to remove boilerplate and extract clean content for LLM extraction.

**Status**: ✅ Complete (2025-11-09)  
**Output**: 2,925 filtered markdown files ready for extraction

#### 4.1 Filtering Workflow

**Script**: `phase4-page-filtering/filter-all-pages.py`

1. Load pages from `page-tracker.json` (2,925 pages)
2. Load domain filtering rules from `domain-analysis.json`
3. Parse HTML and apply domain-specific filters
4. Remove boilerplate (headers, footers, nav, ads, sidebars)
5. Extract main content regions
6. Convert to clean markdown
7. Save filtered content to `raw/filtered/{page_id}.filtered.md`
8. Update `page-tracker.json` with filtering status and content size

#### 4.2 Filtering Rules

**Common Removals**:
- `<header>`, `<nav>`, `<footer>` elements
- Elements matching `.ad-`, `.promo-`, `.cta-`, `.sidebar`
- Social media widgets, share buttons
- Cookie consent banners, newsletter signups
- Author bios, related articles
- Site-wide navigation, breadcrumbs

**Content Extraction**:
- `<main>`, `<article>`, `.main-content` regions
- Tables with discount/pricing/state data
- Lists of products, states, requirements
- Structured discount cards/sections

#### 4.3 File Organization

```
knowledge-pack-scraper/raw/
├── pages/                   # Phase 2 output
│   ├── page_*.html
│   └── page_*.md
└── filtered/                # Phase 4 output
    └── page_*.filtered.md   # (2,925 files)
```

**Deliverable**:
- 2,925 filtered markdown files in `raw/filtered/`
- Updated `page-tracker.json` with filtering metadata

---

### Phase 5: Data Extraction (20-30 hours)

**Objective**: Use LLM to extract structured insurance data from filtered pages (discounts, eligibility, state availability, pricing).

**Status**: ⏳ In Progress  
**Output Target**: ~2,925 extraction files in `raw/extractions/`

#### 5.1 Extraction Workflow

**Scripts**:
- `extraction-prompt.md` - System prompt with few-shot examples and normalization rules
- `extraction-schema.json` - JSON schema for LLM output validation
- `extract-all-pages.py` - Async orchestrator (10 concurrent workers)
- `save-extraction.py` - Save extracted data and update trackers

**Process**:
1. Load filtered pages from `page-tracker.json`
2. For each page:
   - Load filtered markdown content
   - Send to LLM with system prompt
   - Extract structured data points (discounts, eligibility, etc.)
   - Validate against JSON schema
   - Save to `raw/extractions/data_{page_id}.raw.json`
   - Update `page-tracker.json` with extraction status
3. Rate limiting: 10 requests/sec (Claude) or 500/day (GPT-4o-mini)
4. Progress tracking with resume support

#### 5.2 Normalization Rules (Critical)

**Applied during extraction**:

- **Carrier names**: ALWAYS lowercase ("geico", "progressive", "state farm")
- **Product names**: ALWAYS lowercase ("auto", "home", "renters", "umbrella")
- **State codes**: ALWAYS UPPERCASE ("CA", "TX", "FL", "NY", "IL")

**Why**: Enables deterministic aggregation and deduplication without additional normalization logic.

#### 5.3 Data Point Types

- **discount**: Name, percentage, requirements, products, states
- **eligibility**: Product, age limits, vehicle limits, requirements
- **state_availability**: States where carrier operates
- **product_offering**: Products offered (auto, home, renters, umbrella)
- **pricing_estimate**: Product, state, average/range pricing
- **compensation**: Agent commission rates (rare on public pages)
- **state_minimum_coverage**: State-level minimum insurance requirements (from regulatory sources)
- **state_requirement**: Special state-specific insurance requirements

#### 5.4 Extraction Output Format

```json
{
  "carrier": "geico",
  "page_id": "page_abc123",
  "source_url": "https://www.geico.com/auto/discounts/",
  "accessed_date": "2025-11-09",
  "data_points": [
    {
      "type": "discount",
      "data": {
        "name": "Multi-Policy Bundle",
        "percentage": 15,
        "description": "Save 15% when you bundle auto and home insurance",
        "products": ["auto", "home"],
        "states": ["CA", "TX", "FL", "NY", "IL"],
        "requirements": {
          "mustHaveProducts": ["auto", "home"],
          "minProducts": 2
        },
        "stackable": true
      },
      "context": "You could save up to 15% when you bundle...",
      "confidence": "high"
    }
  ]
}
```

**Deliverable**:
- ~2,925 extraction files in `raw/extractions/`
- All data normalized (lowercase carriers/products, uppercase states)

---

### Phase 6: Carrier Aggregation (2-3 hours)

**Objective**: Merge 2,925 page extractions by carrier with source-authority deduplication.

**Status**: ⏳ Pending  
**Output Target**: 3 aggregated carrier files (geico.json, progressive.json, state-farm.json)

#### 6.1 Aggregation Workflow

**Script**: `aggregate-by-carrier.py`

1. Load all `data_page_*.raw.json` files from `raw/extractions/` (2,925 files)
2. Group data points by carrier name (already normalized to lowercase)
3. Apply source-authority deduplication:
   - Carrier official site (authority: 5) > State regulatory (4) > Industry org (3) > Financial site (2)
   - First-wins if same authority level (stable sort by encounter order)
   - Includes deduplication for state data types (`state_minimum_coverage`, `state_requirement`)
4. Generate aggregated carrier files in `aggregated/` directory
5. Track multi-source data points for reference
6. State-specific data points remain in aggregated carrier files (separated in Phase 7)

#### 6.2 Source-Authority Deduplication

**Authority Levels**:
- `carrier_official` (5): geico.com, progressive.com, statefarm.com
- `state_regulatory` (4): insurance.ca.gov, tdi.texas.gov, floir.com
- `industry_org` (3): iii.org, naic.org
- `financial_site` (2): bankrate.com, nerdwallet.com
- `unknown` (1): Other sources

**Deduplication Strategy**:
1. Group identical data points (same type + key fields)
2. For each group, select highest authority source
3. Track duplicates removed for reporting

#### 6.3 Aggregated Output Format

**Note**: These are intermediate files. CUID2 IDs are added in Phase 7.

```json
{
  "carrier": "geico",
  "generated": "2025-11-09T14:00:00Z",
  "total_data_points": 157,
  "source_pages": 42,
  "data_points": [
    {
      "type": "discount",
      "data": {
        "name": "Multi-Policy Bundle",
        "percentage": 15,
        "description": "...",
        "products": ["auto", "home"],
        "states": ["CA", "TX", "FL", "NY", "IL"]
      },
      "context": "...",
      "confidence": "high",
      "source_url": "https://www.geico.com/auto/discounts/",
      "accessed_date": "2025-11-09",
      "_source_page_id": "page_abc123"
    }
  ]
}
```

**Deliverable**:
- 3 aggregated carrier files: `aggregated/geico.json`, `aggregated/progressive.json`, `aggregated/state-farm.json`
- Deduplication report with stats
- No cuid2 IDs yet (added in Phase 7 transformation)

---

### Phase 7: Knowledge Pack Assembly (3-4 hours)

**Objective**: Transform aggregated data to production runtime schema with cuid2 IDs and entity-level sources.

**Status**: ⏳ Pending  
**Output Target**: Production knowledge pack in `knowledge_pack/`

#### 7.1 Transformation Workflow

**Script**: `transform-to-kb.py`

1. Load aggregated carrier files from `aggregated/`
2. Separate carrier-specific vs state-specific data points during transformation
3. Generate cuid2 IDs for all entities:
   - Carriers: `carr_{cuid2}`
   - Discounts: `disc_{cuid2}`
   - States: `state_{cuid2}`
4. Extract entity-level sources (URL + accessed date + confidence)
5. Transform to runtime schema (packages/shared/src/types/knowledge-pack.ts)
6. Save to `knowledge_pack/carriers/{carrier}.json`
7. Generate state files for all discovered states in `knowledge_pack/states/{state}.json`
   - Collect state data points (`state_minimum_coverage`, `state_requirement`) from all carrier files
   - Group by state code and merge using source-authority deduplication
   - Populate minimum coverages with extracted regulatory data
   - Falls back to null placeholders only when data not extracted (coverage gap)
   - Select highest authority source for entity-level citation
8. Generate compliance files (prohibited-statements.json, required-disclosures.json)
9. Generate FAQs, metadata.json, README.md

#### 7.2 Entity-Level Source Tracking

**Per Entity**:

```typescript
interface Discount {
  id: string              // "disc_abc123" (cuid2)
  name: string
  percentage: number
  description: string
  products: string[]      // ["auto", "home"]
  states: string[]        // ["CA", "TX", "FL"]
  requirements: DiscountRequirements
  stackable: boolean
  source: Source          // Entity-level citation
}

interface Source {
  uri: string             // "https://www.geico.com/auto/discounts/"
  accessed: string        // "2025-11-09"
  confidence: "high" | "medium" | "low"
  elementRef?: string     // Optional CSS selector
}
```

#### 7.3 Production Output Structure

```
knowledge_pack/
├── carriers/
│   ├── geico.json           # Runtime carrier data
│   ├── progressive.json
│   └── state-farm.json
├── states/
│   ├── CA.json              # State minimums/requirements
│   ├── TX.json
│   ├── FL.json
│   ├── NY.json
│   └── IL.json
├── compliance/
│   ├── prohibited-statements.json
│   └── required-disclosures.json
├── faqs.json
├── metadata.json             # KB stats and version
└── README.md                 # Source citations documentation
```

**Deliverable**:
- Complete production knowledge pack in `knowledge_pack/`
- Carrier files (geico.json, progressive.json, state-farm.json) with full data
- State files (CA.json, TX.json, etc.) populated with extracted regulatory data
  - State minimum coverages extracted from regulatory sources (insurance.ca.gov, tdi.texas.gov, etc.)
  - Source-authority deduplication ensures regulatory sources override third-party sources
  - Falls back to `null` placeholders only when extraction coverage is missing
- TypeScript interfaces in `packages/shared/src/types/knowledge-pack.ts`
- Docker-mountable at `/knowledge_pack` (read-only)


## Implementation Timeline

| Phase | Duration | Effort | Status | Deliverable |
|-------|----------|--------|--------|-------------|
| 1. URL Discovery | 4-6 hours | Heavy | ✅ Complete | 2,950 URLs via Brave API |
| 2. Page Fetching | 6-8 hours | Heavy | ✅ Complete | 2,925 HTML/markdown files |
| 3. Domain Analysis | 2-3 hours | Medium | ✅ Complete | 15 domain filtering rules |
| 4. Page Filtering | 8-10 hours | Heavy | ✅ Complete | 2,925 filtered content files |
| 5. Data Extraction | 20-30 hours | Very Heavy | ⏳ In Progress | ~2,925 extraction files |
| 6. Carrier Aggregation | 2-3 hours | Medium | ⏳ Pending | 3 aggregated carrier files |
| 7. KB Assembly | 3-4 hours | Medium | ⏳ Pending | Production knowledge pack |
| **TOTAL** | **45-64 hours** | **Heavy** | **4/7 Complete** | **Docker-mountable KB** |

---

## Pipeline Architecture

### Phase Directories
```
knowledge-pack-scraper/
├── phase1-url-discovery/         # Brave API search execution
│   ├── brave-search.py
│   └── search-tracker.json
├── phase2-page-fetching/          # crawl4ai HTML/markdown fetching
│   ├── fetch-all-urls.py
│   └── url-tracker.json
├── phase3-domain-analysis/        # HTML pattern detection
│   ├── analyze-domains.py
│   └── domain-analysis.json
├── phase4-page-filtering/         # Boilerplate removal
│   ├── filter-all-pages.py
│   └── page-tracker.json
├── phase5-data-extraction/        # LLM-based structured extraction
│   ├── extraction-prompt.md
│   ├── extraction-schema.json
│   ├── extract-all-pages.py
│   └── save-extraction.py
├── phase6-aggregation/            # Source-authority deduplication
│   └── aggregate-by-carrier.py
├── phase7-assembly/               # Runtime schema transformation
│   └── transform-to-kb.py
└── lib/                           # Shared utilities
    └── tracker_manager.py
```

### Data Flow
```
Brave API → URLs → Pages (HTML/MD) → Filtered Content → LLM Extraction →
Aggregation by Carrier → Production KB → Docker Mount
```

---

## Success Criteria (PEAK6 Spec)

✅ **Offline Operation**: No runtime web access required
✅ **Entity-Level Sources**: Each carrier/discount/state has source tracking
✅ **Footnote Citations**: Industry standard format for broker outputs
✅ **Compliance Filters**: Prohibited statements + required disclosures included
✅ **Docker Integration**: Knowledge pack mountable at `/knowledge_pack` (read-only)
✅ **Source-Authority Deduplication**: Carrier official > State regulatory > 3rd party  
✅ **Audit Trail**: Complete lineage from raw → production  
✅ **Validation**: All critical checks pass  
✅ **Documentation**: README.md with methodology and sources  
✅ **Compliance**: Zero unsourced data points  

---

## Benefits for PEAK6 Demo

This simplified methodology provides:

1. **Realistic Scope**: 45-64 hours total (includes actual LLM extraction time, not just scripting)
2. **LLM-Powered Extraction**: Structured prompts with few-shot examples for accurate data extraction
3. **Source Tracking**: Entity-level sources (not per-field) with footnote citations
4. **Offline Guarantee**: No runtime web access required after KB generation
5. **Docker Integration**: Knowledge pack mountable at `/knowledge_pack` (read-only)
6. **Production Pattern**: Entity-level sources + source-authority deduplication scales to production
7. **Compliance Ready**: Prohibited statements + required disclosures built-in

**Simplified vs Production**:
- ✂️ No granular field-level source tracking → Entity-level sources
- ✂️ No complex conflict resolution → Source-authority deduplication
- ➕ Normalization during extraction → Deterministic aggregation
- ➕ Generic storage in `raw/extractions/` → Handles mixed carrier/state data

---

## Current Status (2025-11-09)

- ✅ Phases 1-4 Complete: 2,925 filtered pages ready for extraction
- ⏳ Phase 5 In Progress: LLM extraction with normalized data
- ⏳ Phase 6-7 Pending: Aggregation and KB assembly

**Next Immediate Steps**:
1. Test extraction on 100 pages (validate prompt quality)
2. Iterate extraction prompt based on results
3. Run full extraction on 2,925 pages (~20-30 hours)
4. Run aggregation (merge by carrier)
5. Transform to production KB with cuid2 IDs

---

**Document Version**: 2.0 (Simplified Demo)
**Last Updated**: 2025-11-09
**Status**: 4 of 7 Phases Complete
