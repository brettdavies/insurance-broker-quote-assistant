# Knowledge Pack - IQuote Pro Insurance Broker Assistant

**Version**: 1.0
**Generated**: 2025-11-09
**Purpose**: Offline knowledge pack for insurance broker quote assistance (PEAK6 5-day demo project)

---

## Overview

This knowledge pack contains insurance carrier data, state requirements, discounts, eligibility rules, and compliance information derived from publicly available sources. All data is stored locally and loaded into memory at application startup - **no runtime web access required**.

## Data Collection Methodology

### Collection Period
November 6-9, 2025

### Source Hierarchy (for conflict resolution)
1. **Carrier Official Sites** (Highest Authority) - Direct from insurance companies
2. **State Regulatory Sites** (High Authority) - Official state insurance departments
3. **Industry Organizations** (Medium Authority) - III.org, NAIC.org
4. **Financial Sites** (Lower Authority) - Bankrate, NerdWallet (for benchmarking)

### 7-Phase Scraper Pipeline

1. **Phase 1: URL Discovery** - Brave API search across 468 insurance queries → 2,925 unique URLs
2. **Phase 2: Page Fetching** - crawl4ai HTML + Markdown fetching
3. **Phase 3: Domain Analysis** - Intelligent filtering config generation for 75+ domains
4. **Phase 4: Page Filtering** - Clean content extraction (removed headers, footers, ads, navigation)
5. **Phase 5: Data Extraction** - LLM-based structured data extraction with entity-level sources
6. **Phase 6: Carrier Aggregation** - Merge by carrier, deduplicate with source-authority ranking
7. **Phase 7: Knowledge Pack Assembly** - Transform to production schema, export to this directory

---

## File Structure

```
knowledge_pack/
├── carriers/                    # Insurance carrier data
│   ├── geico.json              # GEICO discounts, eligibility, products, states
│   ├── progressive.json        # Progressive discounts, eligibility, products, states
│   └── state-farm.json         # State Farm discounts, eligibility, products, states
├── states/                      # State-specific requirements
│   ├── CA.json                 # California minimum coverages, requirements
│   ├── TX.json                 # Texas minimum coverages, requirements
│   ├── FL.json                 # Florida minimum coverages, requirements
│   ├── NY.json                 # New York minimum coverages, requirements
│   └── IL.json                 # Illinois minimum coverages, requirements
├── compliance/                  # Compliance rules
│   ├── prohibited-statements.json   # Forbidden phrases (PEAK6 spec requirement)
│   └── required-disclosures.json    # Mandatory disclaimers (PEAK6 spec requirement)
├── faqs.json                    # Synthetic FAQs for common questions
├── metadata.json                # KB version, stats, generated date
└── README.md                    # This file
```

---

## Data Sources

### Carrier Data Sources

#### GEICO
- **Official Site**: https://www.geico.com/ (accessed 2025-11-09)
- **Discounts**: https://www.geico.com/auto/discounts/ (accessed 2025-11-09)
- **State Availability**: https://www.geico.com/information/states/ (accessed 2025-11-09)
- **Eligibility**: https://www.geico.com/auto/eligibility/ (accessed 2025-11-09)
- **Total Sources**: (to be populated after extraction)

#### Progressive
- **Official Site**: https://www.progressive.com/ (accessed 2025-11-09)
- **Discounts**: https://www.progressive.com/auto/discounts/ (accessed 2025-11-09)
- **State Availability**: https://www.progressive.com/about/where-we-sell/ (accessed 2025-11-09)
- **Total Sources**: (to be populated after extraction)

#### State Farm
- **Official Site**: https://www.statefarm.com/ (accessed 2025-11-09)
- **Discounts**: https://www.statefarm.com/insurance/auto/discounts (accessed 2025-11-09)
- **State Availability**: https://www.statefarm.com/about-us/company-overview/company-profile (accessed 2025-11-09)
- **Total Sources**: (to be populated after extraction)

### State Regulatory Sources

- **California**: https://www.insurance.ca.gov/ (accessed 2025-11-09)
- **Texas**: https://www.tdi.texas.gov/ (accessed 2025-11-09)
- **Florida**: https://www.floir.com/ (accessed 2025-11-09)
- **New York**: https://www.dfs.ny.gov/ (accessed 2025-11-09)
- **Illinois**: https://insurance.illinois.gov/ (accessed 2025-11-09)

---

## Data Quality Metrics

**Note**: These metrics will be populated after Phase 5-7 complete.

- **Total Pages Scraped**: 2,925
- **Total Data Points Extracted**: (TBD after extraction)
- **Total Sources Cited**: (TBD after extraction)
- **Carriers Covered**: 3 (GEICO, Progressive, State Farm)
- **States Covered**: 5 (CA, TX, FL, NY, IL)
- **Products Covered**: 4 (Auto, Home, Renters, Umbrella)
- **Discounts Per Carrier**: (TBD after extraction)
- **Average Source Authority**: (TBD after extraction)

---

## Citation Format

All discounts, eligibility rules, and pricing information include entity-level source citations following this format:

**Application Output Example:**
```
Based on GEICO's Multi-Policy Bundle discount: 15% off when bundling
auto and home insurance(1)

Annual Savings: $450

Sources:
(1) https://www.geico.com/auto/discounts/, accessed 2025-11-09
```

**Internal Data Format** (carriers/{carrier}.json):
```json
{
  "discounts": [
    {
      "id": "disc_geico_multipolicy",
      "name": "Multi-Policy Bundle",
      "percentage": 15,
      "description": "Save 15% when you bundle auto and home insurance",
      "source": {
        "uri": "https://www.geico.com/auto/discounts/",
        "accessed": "2025-11-09",
        "confidence": "high"
      }
    }
  ]
}
```

---

## Compliance Notes

- **No Live Web Access**: All data pre-scraped during knowledge pack assembly. Application operates entirely offline at runtime (per PEAK6 spec requirement).
- **Synthetic Data Only**: No real PII. All pricing is estimated for demonstration purposes.
- **Disclaimers Required**: All outputs include mandatory disclaimers (see `compliance/required-disclosures.json`).
- **Prohibited Statements**: Compliance filter blocks forbidden phrases (see `compliance/prohibited-statements.json`).
- **Licensed Agent Handoff**: All quotes require handoff to licensed insurance agent before binding (per PEAK6 spec).

---

## Usage (Application Integration)

### Docker Mount

The webapp runs in Docker with KB mounted as external volume:

```dockerfile
# Dockerfile
FROM node:20-alpine
# ... app setup ...
VOLUME ["/knowledge_pack"]
```

```bash
# docker-compose.yml or run command
docker run -v ./knowledge_pack:/knowledge_pack myapp:latest
```

### Loading at Startup

```typescript
// apps/api/src/services/rag.ts
export class KnowledgePackRAG {
  async loadKnowledgePack(): Promise<void> {
    const kbPath = process.env.KNOWLEDGE_PACK_PATH || '/knowledge_pack'

    // Load carriers
    const carrierFiles = glob.sync(`${kbPath}/carriers/*.json`)
    for (const file of carrierFiles) {
      const carrier = JSON.parse(fs.readFileSync(file, 'utf-8'))
      this.carriers.set(carrier.id, carrier)
    }

    // Load states
    const stateFiles = glob.sync(`${kbPath}/states/*.json`)
    // ... similar loading

    console.log(`✅ Loaded ${this.carriers.size} carriers`)
  }
}
```

### Querying Data

```typescript
// Get carrier discounts for specific state
const discounts = rag.retrieveDiscounts("GEICO", "CA")

// Generate citation for output
const citation = {
  ref: 1,
  uri: discount.source.uri,
  accessed: discount.source.accessed
}
```

---

## Updates

To update knowledge pack data:

1. **Re-run scraper** (Phases 1-7)
2. **Review aggregated data** for quality
3. **Replace knowledge_pack/ files** with new versions
4. **Restart application** to reload KB into memory
5. **Test RAG queries** to verify data integrity

---

## Limitations & Disclaimers

### Demo Scope
- **3 carriers only** (GEICO, Progressive, State Farm) - production would include 20-50 carriers
- **5 states only** (CA, TX, FL, NY, IL) - production would include all 50 states
- **Estimated pricing** - actual quotes require underwriting
- **Point-in-time data** - insurance rules change frequently, KB should be updated monthly

### Data Accuracy
- **Scraped from public sources** - may not reflect current rates or rules
- **No carrier API integration** - real-time rates unavailable
- **Generic eligibility** - actual eligibility determined by underwriter
- **Discount percentages** - may vary by state, product, or customer segment

### Regulatory Compliance
- **Not a licensed insurance agent** - this tool assists brokers, does not replace them
- **No binding quotes** - all outputs are estimates requiring agent review
- **State-specific regulations** - compliance varies by jurisdiction
- **Privacy considerations** - no real PII should be stored

---

## License & Attribution

**Purpose**: PEAK6 5-day AI interview project (Nov 2025)
**Data Sources**: Publicly available information from carrier websites and state regulatory sites
**License**: For demonstration and evaluation purposes only
**Attribution**: All source URLs documented above

---

**Last Updated**: 2025-11-09
**Maintainer**: Knowledge Pack Scraper Team
**Contact**: See PEAK6 project documentation for details
