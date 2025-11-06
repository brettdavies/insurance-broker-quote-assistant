# Knowledge Pack Complete Examples

**Version**: 1.0  
**Date**: 2025-11-05  
**Project**: Insurance Broker Quote Assistant (IQuote Pro)  
**Purpose**: Provide end-to-end examples of data transformation from raw scraping to production

---

## Overview

This document provides complete, realistic examples showing the transformation of insurance data through all phases:

1. Raw Data Scraping
2. Conflict Detection
3. Conflict Resolution
4. Clean Data with Sources
5. Production Format

Each example includes:
- Multiple source citations
- Conflict scenarios
- Resolution decisions
- Complete audit trail

---

## How to Use This Document

This document shows complete data transformations from raw scraping to production. Each example demonstrates:
- Multi-source data gathering
- Conflict detection and resolution
- Source tracking and audit trails

**Before diving in, review:**
- 📖 [Schemas](sot-schemas.md) - Understand data structures
- 🔗 [Source Hierarchy](sot-source-hierarchy.md) - Understand conflict resolution
- 📖 [Methodology](knowledge-pack-methodology.md) - Understand the 7-phase process
- 🔑 [ID Conventions](sot-id-conventions.md) - All IDs follow cuid2 format specifications

**Navigation tips:**
- Examples progress from simple (2 sources) to complex (3+ sources)
- Each example is self-contained
- Look for "Key Lessons" sections for important takeaways

---

## Example 1: Multi-Policy Discount (Simple - 2 Sources, Low Conflict)

### Phase 1: Raw Data Scraping

#### Raw Entry 1 - GEICO Official Site

```json
{
  "id": "raw-001",
  "dataPoint": "geico_multi_policy_discount_percentage",
  "rawValue": "Save up to 15% when you bundle auto and home insurance",
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
    "surroundingText": "Multi-Policy Discount: Save money when you bundle auto and home insurance. Save up to 15% on both policies.",
    "pageTitle": "GEICO Auto Insurance Discounts | Car Insurance Discounts",
    "qualifier": "up to"
  }
}
```

#### Raw Entry 2 - NerdWallet Article

```json
{
  "id": "raw-045",
  "dataPoint": "geico_multi_policy_discount_percentage",
  "rawValue": "12%",
  "normalizedValue": 12,
  "source": {
    "uri": "https://www.nerdwallet.com/article/insurance/geico-insurance-discounts",
    "elementRef": "table.insurance-discounts > tbody > tr:nth-child(3) > td:nth-child(2)",
    "accessedDate": "2025-11-05T11:15:00Z",
    "extractionMethod": "manual",
    "screenshot": "screenshots/nerdwallet-geico-001.png",
    "confidence": "medium"
  },
  "context": {
    "surroundingText": "GEICO offers several discounts including a 12% multi-policy discount when you bundle auto and home coverage.",
    "pageTitle": "GEICO Insurance Review 2025: Discounts, Coverage & Rates",
    "qualifier": null
  }
}
```

### Phase 2: Conflict Detection

```json
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
      "sourceAuthority": 4
    },
    {
      "id": "raw-045",
      "uri": "https://www.nerdwallet.com/article/insurance/geico-insurance-discounts",
      "value": 12,
      "confidence": "medium",
      "sourceAuthority": 2
    }
  ],
  "analysis": {
    "percentageDifference": 20,
    "affectsRouting": false,
    "affectsCompliance": false,
    "recommendedAction": "Use primary source (higher authority)",
    "recommendedMethod": "authoritative_source"
  },
  "resolution": null,
  "status": "pending"
}
```

### Phase 3: Conflict Resolution

```json
{
  "conflictId": "conflict-001",
  "dataPoint": "geico_multi_policy_discount_percentage",
  "resolution": {
    "selectedValue": 15,
    "method": "authoritative_source",
    "strategyRank": 1,
    "rationale": "GEICO's official website (authority=4) takes precedence over NerdWallet article (authority=2). Primary source is carrier's own discount page. NerdWallet may show conservative estimate or average savings rather than maximum.",
    "resolvedBy": "data_curator",
    "resolvedDate": "2025-11-05T15:30:00Z",
    "confidence": "high",
    "reviewRequired": false,
    "retainedSources": [
      {
        "id": "raw-001",
        "uri": "https://www.geico.com/auto/discounts/",
        "elementRef": "div.discount-card[data-discount='multi-policy'] > p.percentage",
        "value": 15,
        "authority": 4,
        "freshness": 5,
        "specificity": 5,
        "confidenceScore": 4.5,
        "primary": true,
        "note": "Official GEICO source; exact percentage with 'up to' qualifier"
      },
      {
        "id": "raw-045",
        "uri": "https://www.nerdwallet.com/article/insurance/geico-insurance-discounts",
        "elementRef": "table.insurance-discounts > tbody > tr:nth-child(3) > td:nth-child(2)",
        "value": 12,
        "authority": 2,
        "freshness": 5,
        "specificity": 5,
        "confidenceScore": 3.0,
        "primary": false,
        "note": "Third-party source; may represent typical/average savings rather than maximum"
      }
    ]
  }
}
```

### Phase 4: Clean Data Format

```json
{
  "_id": "discount-geico-multipolicy-001",
  "name": {
    "_id": "field-005",
    "value": "Multi-Policy Bundle",
    "_sources": [
      {
        "uri": "https://www.geico.com/auto/discounts/",
        "elementRef": "div.discount-card[data-discount='multi-policy'] > h3",
        "accessedDate": "2025-11-05",
        "confidence": "high"
      }
    ]
  },
  "percentage": {
    "_id": "field-006",
    "value": 15,
    "_sources": [
      {
        "uri": "https://www.geico.com/auto/discounts/",
        "elementRef": "div.discount-card[data-discount='multi-policy'] > p.percentage",
        "accessedDate": "2025-11-05",
        "extractedValue": "Save up to 15%",
        "confidence": "high",
        "primary": true
      },
      {
        "uri": "https://www.nerdwallet.com/article/insurance/geico-insurance-discounts",
        "elementRef": "table > tr:nth-child(3) > td:nth-child(2)",
        "accessedDate": "2025-11-05",
        "extractedValue": "12%",
        "confidence": "medium",
        "primary": false
      }
    ],
    "_resolution": {
      "conflictId": "conflict-001",
      "selectedValue": 15,
      "method": "authoritative_source",
      "rationale": "GEICO official source preferred over NerdWallet",
      "resolvedDate": "2025-11-05T15:30:00Z"
    }
  },
  "products": {
    "_id": "field-007",
    "value": ["auto", "home"],
    "_sources": [
      {
        "uri": "https://www.geico.com/auto/discounts/",
        "elementRef": "div.discount-card[data-discount='multi-policy'] > p.applies-to",
        "accessedDate": "2025-11-05",
        "extractedValue": "Bundle auto and home insurance",
        "confidence": "high"
      }
    ]
  }
}
```

### Phase 5: Production Format (Compressed)

```json
{
  "_id": "discount-geico-multipolicy-001",
  "name": {
    "_id": "field-005",
    "_sources": [{"uri": "https://www.geico.com/auto/discounts/", "ref": "div.discount-card h3", "date": "2025-11-05"}],
    "value": "Multi-Policy Bundle"
  },
  "percentage": {
    "_id": "field-006",
    "_sources": [
      {"uri": "https://www.geico.com/auto/discounts/", "ref": "div.discount-card p.percentage", "date": "2025-11-05", "primary": true},
      {"uri": "https://www.nerdwallet.com/article/insurance/geico-insurance-discounts", "ref": "table tr:nth-child(3) td:nth-child(2)", "date": "2025-11-05"}
    ],
    "_resolution": {"conflictId": "conflict-001", "method": "authoritative_source"},
    "value": 15
  },
  "products": {
    "_id": "field-007",
    "_sources": [{"uri": "https://www.geico.com/auto/discounts/", "ref": "div.discount-card p.applies-to", "date": "2025-11-05"}],
    "value": ["auto", "home"]
  }
}
```

---

## Example 2: California Auto Minimums (Regulatory - Multiple Sources)

### Phase 1: Raw Data Scraping

#### Raw Entry 1 - CA Dept of Insurance

```json
{
  "id": "raw-012",
  "dataPoint": "california_auto_bodily_injury_per_person_minimum",
  "rawValue": "$15,000 per person for bodily injury liability",
  "normalizedValue": 15000,
  "source": {
    "uri": "https://www.insurance.ca.gov/01-consumers/105-type/95-guides/03-auto/lw-lic-1.cfm",
    "elementRef": "section#minimum-coverage > table.requirements > tbody > tr:nth-child(1) > td:nth-child(2)",
    "accessedDate": "2025-11-05T09:00:00Z",
    "extractionMethod": "manual",
    "screenshot": "screenshots/ca-insurance-gov-001.png",
    "confidence": "high"
  },
  "context": {
    "surroundingText": "California's minimum automobile liability insurance requirements are: $15,000 for injury/death to one person.",
    "pageTitle": "Automobile Insurance - California Department of Insurance",
    "qualifier": null
  }
}
```

#### Raw Entry 2 - Bankrate Article

```json
{
  "id": "raw-076",
  "dataPoint": "california_auto_bodily_injury_per_person_minimum",
  "rawValue": "$25,000 per person (recommended minimum)",
  "normalizedValue": 25000,
  "source": {
    "uri": "https://www.bankrate.com/insurance/car/california/",
    "elementRef": "section.coverage-requirements > div.minimum-coverage > p:nth-child(2)",
    "accessedDate": "2025-11-05T09:30:00Z",
    "extractionMethod": "manual",
    "screenshot": "screenshots/bankrate-ca-001.png",
    "confidence": "medium"
  },
  "context": {
    "surroundingText": "While California requires $15,000 per person, we recommend at least $25,000 per person for better protection.",
    "pageTitle": "Car Insurance in California: Rates, Requirements & More - Bankrate",
    "qualifier": "recommended minimum"
  }
}
```

### Phase 2: Conflict Detection

```json
{
  "id": "conflict-002",
  "dataPoint": "california_auto_bodily_injury_per_person_minimum",
  "detectedDate": "2025-11-05T14:05:00Z",
  "conflictType": "numeric_difference",
  "severity": "high",
  "sources": [
    {
      "id": "raw-012",
      "uri": "https://www.insurance.ca.gov/01-consumers/105-type/95-guides/03-auto/lw-lic-1.cfm",
      "value": 15000,
      "confidence": "high",
      "sourceAuthority": 5
    },
    {
      "id": "raw-076",
      "uri": "https://www.bankrate.com/insurance/car/california/",
      "value": 25000,
      "confidence": "medium",
      "sourceAuthority": 2
    }
  ],
  "analysis": {
    "percentageDifference": 67,
    "affectsRouting": false,
    "affectsCompliance": true,
    "recommendedAction": "Use regulatory source - Bankrate shows recommendation, not legal minimum",
    "recommendedMethod": "authoritative_source"
  },
  "resolution": null,
  "status": "pending"
}
```

### Phase 3: Conflict Resolution

```json
{
  "conflictId": "conflict-002",
  "dataPoint": "california_auto_bodily_injury_per_person_minimum",
  "resolution": {
    "selectedValue": 15000,
    "method": "authoritative_source",
    "strategyRank": 1,
    "rationale": "California Department of Insurance (authority=5) is the authoritative source for state minimum requirements. Bankrate's $25,000 is their RECOMMENDED minimum (best practice), not the legal minimum. For compliance purposes, we use the legal minimum ($15,000). We could store the recommended amount separately if needed for user guidance.",
    "resolvedBy": "data_curator",
    "resolvedDate": "2025-11-05T15:35:00Z",
    "confidence": "high",
    "reviewRequired": false,
    "retainedSources": [
      {
        "id": "raw-012",
        "uri": "https://www.insurance.ca.gov/01-consumers/105-type/95-guides/03-auto/lw-lic-1.cfm",
        "value": 15000,
        "authority": 5,
        "freshness": 5,
        "specificity": 5,
        "confidenceScore": 5.0,
        "primary": true,
        "note": "Official CA state regulatory source; legal minimum requirement"
      },
      {
        "id": "raw-076",
        "uri": "https://www.bankrate.com/insurance/car/california/",
        "value": 25000,
        "authority": 2,
        "freshness": 5,
        "specificity": 5,
        "confidenceScore": 3.0,
        "primary": false,
        "note": "Financial site recommendation, not legal requirement; shows best practice coverage level"
      }
    ],
    "metadata": {
      "legalMinimum": 15000,
      "recommendedMinimum": 25000,
      "note": "Store both values: legal for compliance, recommended for user guidance"
    }
  }
}
```

### Phase 5: Production Format

```json
{
  "_id": "state-CA-001",
  "code": "CA",
  "name": "California",
  "minimumCoverages": {
    "_id": "minimums-CA-auto-001",
    "auto": {
      "bodilyInjuryPerPerson": {
        "_id": "field-CA-001",
        "value": 15000,
        "_sources": [
          {
            "uri": "https://www.insurance.ca.gov/01-consumers/105-type/95-guides/03-auto/lw-lic-1.cfm",
            "ref": "section#minimum-coverage table tr:nth-child(1) td:nth-child(2)",
            "date": "2025-11-05",
            "primary": true
          },
          {
            "uri": "https://www.bankrate.com/insurance/car/california/",
            "ref": "section.coverage-requirements div.minimum-coverage p:nth-child(2)",
            "date": "2025-11-05",
            "note": "Shows recommended ($25k), not legal minimum"
          }
        ],
        "_resolution": {"conflictId": "conflict-002", "method": "authoritative_source"}
      }
    }
  }
}
```

---

## Example 3: Source Inheritance (Discount States)

### Scenario

GEICO Multi-Policy discount doesn't specify which states it's available in. We inherit from carrier-level "operatesIn" field.

### Parent Data

```json
{
  "carrier": {
    "_id": "carrier-geico-001",
    "operatesIn": {
      "_id": "field-001",
      "value": ["CA", "TX", "FL", "NY", "IL"],
      "_sources": [
        {
          "uri": "https://www.geico.com/information/states/",
          "elementRef": "section#state-list > ul.state-grid > li",
          "accessedDate": "2025-11-05",
          "extractedValue": "All 50 states listed",
          "confidence": "high"
        }
      ]
    }
  }
}
```

### Child Data (Inherits)

```json
{
  "discounts": [
    {
      "_id": "discount-geico-multipolicy-001",
      "states": {
        "_id": "field-008",
        "value": ["CA", "TX", "FL", "NY", "IL"],
        "_sources": [],
        "_inheritedFrom": "field-001",
        "_note": "No state restrictions found on discount page; inheriting from carrier operating states"
      }
    }
  ]
}
```

### Audit Trail Entry

```json
{
  "dataPoint": "field-008",
  "path": "carriers/geico.json > discounts[0] > states",
  "value": ["CA", "TX", "FL", "NY", "IL"],
  "sources": [],
  "inheritedFrom": "field-001",
  "inheritanceChain": [
    {
      "field": "field-001",
      "path": "carriers/geico.json > carrier > operatesIn",
      "rationale": "Discount page shows no state restrictions; default to carrier availability"
    }
  ],
  "confidence": "medium",
  "note": "Inherited source; could be refined if state-specific discount info found"
}
```

---

## Example 4: Three-Way Conflict with Majority Consensus

### Phase 1: Raw Data Scraping

#### Raw Entry 1 - Insurance Information Institute

```json
{
  "id": "raw-089",
  "dataPoint": "california_average_auto_insurance_annual",
  "rawValue": "$1,200 per year average",
  "normalizedValue": 1200,
  "source": {
    "uri": "https://www.iii.org/fact-statistic/facts-statistics-auto-insurance",
    "elementRef": "table#state-averages > tbody > tr[data-state='CA'] > td.average",
    "accessedDate": "2025-11-05T13:00:00Z",
    "extractionMethod": "manual",
    "confidence": "high"
  },
  "context": {
    "surroundingText": "Average annual auto insurance premium in California: $1,200",
    "pageTitle": "Facts + Statistics: Auto insurance | III",
    "qualifier": "average"
  }
}
```

#### Raw Entry 2 - Bankrate

```json
{
  "id": "raw-090",
  "dataPoint": "california_average_auto_insurance_annual",
  "rawValue": "$1,150/year",
  "normalizedValue": 1150,
  "source": {
    "uri": "https://www.bankrate.com/insurance/car/california/",
    "elementRef": "section.pricing > div.state-average > span.amount",
    "accessedDate": "2025-11-05T13:15:00Z",
    "extractionMethod": "manual",
    "confidence": "medium"
  },
  "context": {
    "surroundingText": "The average cost of car insurance in California is $1,150 per year for full coverage.",
    "pageTitle": "Car Insurance in California 2025 | Bankrate",
    "qualifier": "average"
  }
}
```

#### Raw Entry 3 - NerdWallet

```json
{
  "id": "raw-091",
  "dataPoint": "california_average_auto_insurance_annual",
  "rawValue": "around $1,200 annually",
  "normalizedValue": 1200,
  "source": {
    "uri": "https://www.nerdwallet.com/article/insurance/california-car-insurance",
    "elementRef": "section.cost-analysis > p.average-cost",
    "accessedDate": "2025-11-05T13:30:00Z",
    "extractionMethod": "manual",
    "confidence": "medium"
  },
  "context": {
    "surroundingText": "California drivers pay around $1,200 annually for car insurance on average.",
    "pageTitle": "California Car Insurance: Rates, Coverage & More - NerdWallet",
    "qualifier": "around"
  }
}
```

#### Raw Entry 4 - ValuePenguin

```json
{
  "id": "raw-092",
  "dataPoint": "california_average_auto_insurance_annual",
  "rawValue": "$1,250/year",
  "normalizedValue": 1250,
  "source": {
    "uri": "https://www.valuepenguin.com/california-car-insurance",
    "elementRef": "div.state-stats > div.avg-premium > span.value",
    "accessedDate": "2025-11-05T13:45:00Z",
    "extractionMethod": "manual",
    "confidence": "medium"
  },
  "context": {
    "surroundingText": "The average annual car insurance premium in California is $1,250.",
    "pageTitle": "California Car Insurance Rates & Coverage Guide | ValuePenguin",
    "qualifier": "average"
  }
}
```

### Phase 2: Conflict Detection

```json
{
  "id": "conflict-003",
  "dataPoint": "california_average_auto_insurance_annual",
  "detectedDate": "2025-11-05T14:10:00Z",
  "conflictType": "numeric_difference",
  "severity": "low",
  "sources": [
    {"id": "raw-089", "uri": "iii.org", "value": 1200, "authority": 3},
    {"id": "raw-090", "uri": "bankrate.com", "value": 1150, "authority": 2},
    {"id": "raw-091", "uri": "nerdwallet.com", "value": 1200, "authority": 2},
    {"id": "raw-092", "uri": "valuepenguin.com", "value": 1250, "authority": 2}
  ],
  "analysis": {
    "values": [1150, 1200, 1200, 1250],
    "mean": 1200,
    "median": 1200,
    "mode": 1200,
    "range": 100,
    "percentageDifference": 8.7,
    "affectsRouting": false,
    "affectsCompliance": false,
    "recommendedAction": "Use majority consensus (1200 appears 2x) and highest authority source",
    "recommendedMethod": "majority_consensus"
  },
  "resolution": null,
  "status": "pending"
}
```

### Phase 3: Conflict Resolution

```json
{
  "conflictId": "conflict-003",
  "dataPoint": "california_average_auto_insurance_annual",
  "resolution": {
    "selectedValue": 1200,
    "method": "majority_consensus",
    "strategyRank": 5,
    "rationale": "Three out of four sources cluster around $1,200 (III and NerdWallet both state $1,200 exactly). Bankrate's $1,150 and ValuePenguin's $1,250 are within ±5% margin. Using $1,200 as consensus value, supported by highest-authority source (III, authority=3). Note: Average pricing inherently has variability based on methodology and data collection period.",
    "resolvedBy": "data_curator",
    "resolvedDate": "2025-11-05T15:40:00Z",
    "confidence": "medium",
    "reviewRequired": false,
    "retainedSources": [
      {
        "id": "raw-089",
        "uri": "https://www.iii.org/fact-statistic/facts-statistics-auto-insurance",
        "value": 1200,
        "authority": 3,
        "freshness": 5,
        "specificity": 5,
        "confidenceScore": 4.0,
        "primary": true,
        "note": "Highest authority source; matches consensus value"
      },
      {
        "id": "raw-090",
        "uri": "https://www.bankrate.com/insurance/car/california/",
        "value": 1150,
        "authority": 2,
        "confidenceScore": 3.0,
        "primary": false,
        "note": "4% below consensus; within acceptable variance"
      },
      {
        "id": "raw-091",
        "uri": "https://www.nerdwallet.com/article/insurance/california-car-insurance",
        "value": 1200,
        "authority": 2,
        "confidenceScore": 3.0,
        "primary": false,
        "note": "Matches consensus value"
      },
      {
        "id": "raw-092",
        "uri": "https://www.valuepenguin.com/california-car-insurance",
        "value": 1250,
        "authority": 2,
        "confidenceScore": 3.0,
        "primary": false,
        "note": "4% above consensus; within acceptable variance"
      }
    ],
    "metadata": {
      "statisticalAnalysis": {
        "mean": 1200,
        "median": 1200,
        "mode": 1200,
        "standardDeviation": 40.8,
        "coefficientOfVariation": 0.034
      },
      "note": "All values within 8.7% range; low variance indicates good consensus"
    }
  }
}
```

---

## Example 5: Complete Carrier File (Production)

### Full GEICO Production File (Abbreviated)

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
        "ref": "header h1.logo",
        "date": "2025-11-05"
      }
    ],
    "name": "GEICO",
    "operatesIn": {
      "_id": "field-001",
      "value": ["CA", "TX", "FL", "NY", "IL"],
      "_sources": [
        {
          "uri": "https://www.geico.com/information/states/",
          "ref": "section#state-list ul li",
          "date": "2025-11-05"
        }
      ]
    },
    "products": {
      "_id": "field-002",
      "value": ["auto", "home", "renters", "umbrella"],
      "_sources": [
        {
          "uri": "https://www.geico.com/",
          "ref": "nav.products ul li",
          "date": "2025-11-05"
        }
      ]
    },
    "eligibility": {
      "_id": "eligibility-geico-001",
      "auto": {
        "_id": "eligibility-geico-auto-001",
        "minAge": {
          "_id": "field-003",
          "value": 16,
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/eligibility/",
              "ref": "section#age-requirements p",
              "date": "2025-11-05"
            }
          ]
        },
        "maxVehicles": {
          "_id": "field-004",
          "value": 4,
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/eligibility/",
              "ref": "section#vehicle-limits p",
              "date": "2025-11-05"
            }
          ]
        }
      }
    },
    "discounts": [
      {
        "_id": "discount-geico-multipolicy-001",
        "name": {
          "_id": "field-005",
          "value": "Multi-Policy Bundle",
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/discounts/",
              "ref": "div#multi-policy h3",
              "date": "2025-11-05"
            }
          ]
        },
        "percentage": {
          "_id": "field-006",
          "value": 15,
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/discounts/",
              "ref": "div#multi-policy p.percentage",
              "date": "2025-11-05",
              "primary": true
            },
            {
              "uri": "https://www.nerdwallet.com/article/insurance/geico-insurance-discounts",
              "ref": "table tr:nth-child(3) td:nth-child(2)",
              "date": "2025-11-05"
            }
          ],
          "_resolution": {
            "conflictId": "conflict-001",
            "method": "authoritative_source"
          }
        },
        "products": {
          "_id": "field-007",
          "value": ["auto", "home"],
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/discounts/",
              "ref": "div#multi-policy p.applies-to",
              "date": "2025-11-05"
            }
          ]
        },
        "states": {
          "_id": "field-008",
          "value": ["CA", "TX", "FL", "NY", "IL"],
          "_sources": [],
          "_inheritedFrom": "field-001"
        },
        "requirements": {
          "_id": "field-009",
          "value": {
            "mustHaveProducts": ["auto", "home"],
            "minProducts": 2
          },
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/discounts/",
              "ref": "div#multi-policy ul.requirements",
              "date": "2025-11-05"
            }
          ]
        },
        "stackable": {
          "_id": "field-010",
          "value": true,
          "_sources": [],
          "_inheritedFrom": "discount-geico-multipolicy-001",
          "_note": "No explicit prohibition found; assuming stackable"
        }
      }
    ],
    "averagePricing": {
      "_id": "pricing-geico-001",
      "auto": {
        "baseMonthly": {
          "CA": {
            "_id": "field-020",
            "value": {
              "liability": 85,
              "fullCoverage": 165
            },
            "_sources": [
              {
                "uri": "https://www.iii.org/fact-statistic/facts-statistics-auto-insurance",
                "ref": "table#carrier-averages",
                "date": "2025-11-05",
                "primary": true
              },
              {
                "uri": "https://www.bankrate.com/insurance/car/geico-rates/",
                "ref": "section.pricing table",
                "date": "2025-11-05"
              }
            ]
          }
        }
      }
    }
  }
}
```

---

## Audit Trail Examples

### Complete Lineage for field-006 (Multi-Policy Discount Percentage)

```json
{
  "dataPoint": "field-006",
  "path": "carriers/geico.json > discounts[0] > percentage",
  "value": 15,
  "sources": ["src-001", "src-045"],
  "resolution": "conflict-001",
  "confidence": "high",
  "lineage": [
    {
      "step": 1,
      "phase": "raw_scraping",
      "action": "Scraped GEICO official site",
      "file": "raw/carriers/geico/discounts_auto.raw.json",
      "entry": "raw-001",
      "timestamp": "2025-11-05T10:30:00Z",
      "value": "Save up to 15%"
    },
    {
      "step": 2,
      "phase": "raw_scraping",
      "action": "Scraped NerdWallet article",
      "file": "raw/carriers/geico/discounts_secondary.raw.json",
      "entry": "raw-045",
      "timestamp": "2025-11-05T11:15:00Z",
      "value": "12%"
    },
    {
      "step": 3,
      "phase": "conflict_detection",
      "action": "Detected numeric conflict",
      "file": "conflicts.json",
      "entry": "conflict-001",
      "timestamp": "2025-11-05T14:00:00Z",
      "values": [15, 12]
    },
    {
      "step": 4,
      "phase": "conflict_resolution",
      "action": "Resolved via authoritative_source strategy",
      "file": "resolutions.json",
      "entry": "conflict-001",
      "timestamp": "2025-11-05T15:30:00Z",
      "selectedValue": 15,
      "rationale": "GEICO official source preferred"
    },
    {
      "step": 5,
      "phase": "clean_data",
      "action": "Created clean data with metadata",
      "file": "clean/carriers/geico.json",
      "field": "field-006",
      "timestamp": "2025-11-05T16:00:00Z"
    },
    {
      "step": 6,
      "phase": "production",
      "action": "Compressed for production",
      "file": "carriers/geico.json",
      "field": "field-006",
      "timestamp": "2025-11-05T16:30:00Z"
    }
  ],
  "auditSummary": {
    "sourcesConsulted": 2,
    "conflictsResolved": 1,
    "authorityLevel": 4,
    "confidenceScore": 4.5,
    "lastModified": "2025-11-05T16:30:00Z"
  }
}
```

---

## Summary

These examples demonstrate:

✅ **Complete audit trail**: Every value traceable from raw scrape → production  
✅ **Conflict transparency**: All disagreements documented with resolutions  
✅ **Source diversity**: Multiple sources preserved, even non-selected ones  
✅ **Inheritance clarity**: Parent→child relationships explicit  
✅ **Resolution rationale**: Every decision explained in human-readable form  
✅ **Metadata preservation**: Qualifiers, context, confidence scores retained

Use these patterns as templates for knowledge pack data assembly.

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-05  
**Status**: Ready for Reference
