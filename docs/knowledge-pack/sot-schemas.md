# Knowledge Pack JSON Schemas

> **📌 Single Source of Truth**: This document is the authoritative source for all JSON schema definitions and data structure specifications used throughout the knowledge pack system.

**Version**: 1.0
**Date**: 2025-11-05
**Project**: Insurance Broker Quote Assistant (IQuote Pro)
**Purpose**: Define JSON schemas for knowledge pack data with granular source tracking and cuid2-based audit trails

---

## Overview

This document defines the JSON schemas used throughout the knowledge pack, from raw scraped data to production-ready files. Every schema includes source tracking metadata to support complete audit trails and regulatory compliance.

---

## Schema Files

| Schema File                | Purpose                                            | Location                           |
| -------------------------- | -------------------------------------------------- | ---------------------------------- |
| `carrier-schema.json`      | Carrier data with products, discounts, eligibility | `knowledge_pack/schemas/`          |
| `state-schema.json`        | State requirements and minimums                    | `knowledge_pack/schemas/`          |
| `product-schema.json`      | Product definitions                                | `knowledge_pack/schemas/`          |
| `compliance-schema.json`   | Compliance rules and disclaimers                   | `knowledge_pack/schemas/`          |
| `source-metadata.json`     | Source citation format                             | `knowledge_pack/schemas/`          |
| `resolution-metadata.json` | Conflict resolution format                         | `knowledge_pack/schemas/`          |
| `raw-data-schema.json`     | Raw scraped data format                            | `knowledge_pack/schemas/`          |
| `search-tracker.json`      | Phase 2 search query tracking (476 queries)        | `knowledge-pack-scraper/trackers/` |
| `url-tracker.json`         | Phase 2 discovered URL tracking (2,950 URLs)       | `knowledge-pack-scraper/trackers/` |
| `page-tracker.json`        | Phase 2 fetched page tracking                      | `knowledge-pack-scraper/trackers/` |
| `websearch-schema.json`    | Brave API execution instance format                | `knowledge_pack/raw/websearches/`  |

---

## Core Concepts

### Field Metadata Envelope

Every field in the knowledge pack uses this structure:

```typescript
interface FieldWithMetadata<T> {
  _id: string // Unique ID (cuid2) for this field
  value: T // The actual data value
  _sources: Source[] // Direct source citations (≥1 required if not inherited)
  _inheritedFrom?: string // Parent field ID (if sources inherited)
  _resolution?: Resolution // Conflict resolution metadata (if applicable)
}
```

### Source Object

```typescript
interface Source {
  uri: string // Full URL
  pageId?: string // Optional in interface; Phase 2 MUST populate for raw data. Unique page ID (page_{cuid2})
  pageFile?: string // Optional in interface; Phase 2 MUST populate for raw data. Path relative to knowledge_pack/raw/ (e.g., "_pages/page_ckm9x7w8k0.html")
  elementRef?: string // CSS selector or XPath
  lineRef?: number // Line number (for text files)
  accessedDate: string // ISO 8601 date-time with timezone (YYYY-MM-DDTHH:mm:ssZ)
  extractedValue?: string // Raw value from source (before normalization)
  confidence: 'high' | 'medium' | 'low' // Classification (required). See sot-source-hierarchy.md#confidence-classifications
  confidenceScore?: number // Calculated numeric score 1.0-5.0 (optional). See sot-source-hierarchy.md#confidence-scoring-formula
  primary?: boolean // Is this the primary source (for multi-source)
}
```

### Field Lifecycle Notes: pageId and pageFile

The optional `pageId` and `pageFile` fields have a lifecycle that depends on data processing phase:

**Phase 2 - Raw Data Collection (Required)**

- `pageId`: REQUIRED. Generated as `page_{cuid2}` when fetching source (e.g., `page_ckm9x7w8k0`)
- `pageFile`: REQUIRED. Generated as `_pages/${pageId}.{ext}` pointing to saved page content
- Both fields enable audit trail and reverify capability for raw scraped data
- Example: `{ pageId: "page_ckm9x7w8k0", pageFile: "_pages/page_ckm9x7w8k0.html", ... }`

**Phase 3+ - Standardization and Cleanup (Optional)**

- `pageId`: OPTIONAL. May be removed if page archive is deleted or consolidated
- `pageFile`: OPTIONAL. May be removed after data extraction is complete and verified
- Removal is safe because other fields (uri, elementRef) still provide source identity
- Useful to retain if you need to reverify extracted data against original page

**Recommendation**: Retain pageId/pageFile through Phase 3 for traceability, then decide on cleanup based on storage constraints and audit requirements.

### Resolution Object

```typescript
interface Resolution {
  conflictId: string // Reference to conflict in conflicts.json
  selectedValue: any // The chosen value
  method: string // Resolution strategy used
  rationale: string // Human-readable explanation
  resolvedBy: string // Curator identifier
  resolvedDate: string // ISO 8601 date
}
```

---

## 1. Carrier Schema

**File**: `knowledge_pack/schemas/carrier-schema.json`

### Full Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://iquote-pro.dev/schemas/carrier.json",
  "title": "Insurance Carrier",
  "description": "Complete carrier data including eligibility, discounts, and pricing",
  "type": "object",
  "required": ["meta", "carrier"],
  "properties": {
    "meta": {
      "type": "object",
      "properties": {
        "schemaVersion": { "type": "string" },
        "generatedDate": { "type": "string", "format": "date-time" },
        "carrier": { "type": "string" },
        "totalDataPoints": { "type": "integer" },
        "totalSources": { "type": "integer" },
        "conflictsResolved": { "type": "integer" }
      }
    },
    "carrier": {
      "type": "object",
      "required": ["_id", "_sources", "name", "operatesIn", "products", "eligibility", "discounts"],
      "properties": {
        "_id": { "type": "string", "pattern": "^carr_[a-z0-9]{10}$" },
        "_sources": { "$ref": "#/definitions/sources" },
        "name": { "type": "string" },
        "operatesIn": { "$ref": "#/definitions/fieldWithMetadata" },
        "products": { "$ref": "#/definitions/fieldWithMetadata" },
        "eligibility": {
          "type": "object",
          "properties": {
            "_id": { "type": "string" },
            "_sources": { "$ref": "#/definitions/sources" },
            "auto": { "$ref": "#/definitions/productEligibility" },
            "home": { "$ref": "#/definitions/productEligibility" },
            "renters": { "$ref": "#/definitions/productEligibility" },
            "umbrella": { "$ref": "#/definitions/productEligibility" }
          }
        },
        "discounts": {
          "type": "array",
          "items": { "$ref": "#/definitions/discount" }
        },
        "compensation": { "$ref": "#/definitions/compensation" },
        "averagePricing": { "$ref": "#/definitions/averagePricing" }
      }
    }
  },
  "definitions": {
    "sources": {
      "type": "array",
      "minItems": 0,
      "items": {
        "type": "object",
        "required": ["uri", "accessedDate"],
        "properties": {
          "uri": { "type": "string", "format": "uri" },
          "pageId": {
            "type": "string",
            "pattern": "^page_[a-z0-9]{10}$",
            "description": "Optional in interface; Phase 2 MUST populate for raw data. Unique page ID (page_{cuid2})"
          },
          "pageFile": {
            "type": "string",
            "description": "Optional in interface; Phase 2 MUST populate for raw data. Path relative to knowledge_pack/raw/ (e.g., '_pages/page_ckm9x7w8k0.html')"
          },
          "elementRef": { "type": "string" },
          "lineRef": { "type": "integer" },
          "accessedDate": { "type": "string", "format": "date-time" },
          "extractedValue": { "type": "string" },
          "confidence": { "enum": ["high", "medium", "low"] },
          "confidenceScore": { "type": "number", "minimum": 1.0, "maximum": 5.0 },
          "primary": { "type": "boolean" }
        }
      }
    },
    "fieldWithMetadata": {
      "type": "object",
      "required": ["_id", "value"],
      "properties": {
        "_id": { "type": "string" },
        "value": {},
        "_sources": { "$ref": "#/definitions/sources" },
        "_inheritedFrom": { "type": "string" },
        "_resolution": { "$ref": "#/definitions/resolution" }
      }
    },
    "resolution": {
      "type": "object",
      "required": [
        "conflictId",
        "selectedValue",
        "method",
        "rationale",
        "resolvedBy",
        "resolvedDate"
      ],
      "properties": {
        "conflictId": { "type": "string" },
        "selectedValue": {},
        "method": { "type": "string" },
        "rationale": { "type": "string" },
        "resolvedBy": { "type": "string" },
        "resolvedDate": { "type": "string", "format": "date-time" }
      }
    },
    "productEligibility": {
      "type": "object",
      "properties": {
        "_id": { "type": "string" },
        "_sources": { "$ref": "#/definitions/sources" },
        "minAge": { "$ref": "#/definitions/fieldWithMetadata" },
        "maxAge": { "$ref": "#/definitions/fieldWithMetadata" },
        "maxVehicles": { "$ref": "#/definitions/fieldWithMetadata" },
        "stateSpecific": {
          "type": "object",
          "patternProperties": {
            "^[A-Z]{2}$": { "type": "object" }
          }
        }
      }
    },
    "discount": {
      "type": "object",
      "required": ["_id", "name", "percentage", "products", "states", "requirements"],
      "properties": {
        "_id": { "type": "string", "pattern": "^disc_[a-z0-9]{10}$" },
        "name": { "$ref": "#/definitions/fieldWithMetadata" },
        "percentage": { "$ref": "#/definitions/fieldWithMetadata" },
        "products": { "$ref": "#/definitions/fieldWithMetadata" },
        "states": { "$ref": "#/definitions/fieldWithMetadata" },
        "requirements": { "$ref": "#/definitions/fieldWithMetadata" },
        "stackable": { "$ref": "#/definitions/fieldWithMetadata" },
        "description": { "$ref": "#/definitions/fieldWithMetadata" }
      }
    },
    "compensation": {
      "type": "object",
      "properties": {
        "_id": { "type": "string" },
        "commissionRate": { "$ref": "#/definitions/fieldWithMetadata" },
        "commissionType": { "$ref": "#/definitions/fieldWithMetadata" }
      }
    },
    "averagePricing": {
      "type": "object",
      "properties": {
        "_id": { "type": "string" },
        "auto": { "type": "object" },
        "home": { "type": "object" },
        "renters": { "type": "object" },
        "umbrella": { "type": "object" }
      }
    }
  }
}
```

### Example Carrier Data

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
    "_id": "carr_ckm9x7w8k0",
    "_sources": [
      {
        "uri": "https://www.geico.com/",
        "elementRef": "header > h1.logo",
        "accessedDate": "2025-11-05T12:00:00Z",
        "confidence": "high"
      }
    ],
    "name": "GEICO",
    "operatesIn": {
      "_id": "fld_ckm9x7wdx1",
      "value": ["CA", "TX", "FL", "NY", "IL"],
      "_sources": [
        {
          "uri": "https://www.geico.com/information/states/",
          "elementRef": "section#state-list > ul > li",
          "accessedDate": "2025-11-05T12:05:00Z",
          "extractedValue": "50 states listed",
          "confidence": "high"
        }
      ]
    },
    "products": {
      "_id": "fld_ckm9x7whp2",
      "value": ["auto", "home", "renters", "umbrella"],
      "_sources": [
        {
          "uri": "https://www.geico.com/",
          "elementRef": "nav.products > ul > li",
          "accessedDate": "2025-11-05T12:00:00Z",
          "confidence": "high"
        }
      ]
    },
    "eligibility": {
      "_id": "elig_ckm9x7wwx7",
      "_sources": [],
      "auto": {
        "_id": "elig_ckm9x7wza8",
        "minAge": {
          "_id": "fld_ckm9x7wkm3",
          "value": 16,
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/eligibility/",
              "elementRef": "section#age-requirements > p",
              "accessedDate": "2025-11-05T12:10:00Z",
              "extractedValue": "Minimum age: 16 years old",
              "confidence": "high"
            }
          ]
        },
        "maxVehicles": {
          "_id": "fld_ckm9x7wnp4",
          "value": 4,
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/eligibility/",
              "elementRef": "section#vehicle-limits > p",
              "accessedDate": "2025-11-05T12:10:00Z",
              "extractedValue": "Up to 4 vehicles per policy",
              "confidence": "high"
            }
          ]
        }
      }
    },
    "discounts": [
      {
        "_id": "disc_ckm9x7wqr5",
        "name": {
          "_id": "fld_ckm9x7wtu6",
          "value": "Multi-Policy Bundle",
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/discounts/",
              "elementRef": "div#multi-policy > h3",
              "accessedDate": "2025-11-05T12:15:00Z",
              "confidence": "high"
            }
          ]
        },
        "percentage": {
          "_id": "fld_ckm9x7x2c9",
          "value": 15,
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/discounts/",
              "elementRef": "div#multi-policy > p.percentage",
              "accessedDate": "2025-11-05T12:15:00Z",
              "extractedValue": "Save up to 15%",
              "confidence": "high",
              "primary": true
            },
            {
              "uri": "https://www.nerdwallet.com/article/insurance/geico-discounts",
              "elementRef": "table > tr:nth-child(3) > td:nth-child(2)",
              "accessedDate": "2025-11-05T12:20:00Z",
              "extractedValue": "12%",
              "confidence": "medium",
              "primary": false
            }
          ],
          "_resolution": {
            "conflictId": "conf_ckm9x7x5ea",
            "selectedValue": 15,
            "method": "authoritative_source",
            "rationale": "GEICO official site is authoritative; NerdWallet may show conservative estimate",
            "resolvedBy": "data_curator",
            "resolvedDate": "2025-11-05T15:30:00Z"
          }
        },
        "products": {
          "_id": "fld_ckm9x7x7fb",
          "value": ["auto", "home"],
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/discounts/",
              "elementRef": "div#multi-policy > p.applies-to",
              "accessedDate": "2025-11-05T12:15:00Z",
              "extractedValue": "Bundle auto and home insurance",
              "confidence": "high"
            }
          ]
        },
        "states": {
          "_id": "fld_ckm9x7xagc",
          "value": ["CA", "TX", "FL", "NY", "IL"],
          "_sources": [],
          "_inheritedFrom": "fld_ckm9x7wdx1"
        },
        "requirements": {
          "_id": "fld_ckm9x7xchd",
          "value": {
            "mustHaveProducts": ["auto", "home"],
            "minProducts": 2
          },
          "_sources": [
            {
              "uri": "https://www.geico.com/auto/discounts/",
              "elementRef": "div#multi-policy > ul.requirements",
              "accessedDate": "2025-11-05T12:15:00Z",
              "confidence": "high"
            }
          ]
        },
        "stackable": {
          "_id": "fld_ckm9x7xfje",
          "value": true,
          "_sources": [],
          "_inheritedFrom": "disc_ckm9x7wqr5",
          "_note": "No explicit statement; assume true unless noted otherwise"
        }
      }
    ]
  }
}
```

---

## 2. State Schema

**File**: `knowledge_pack/schemas/state-schema.json`

### Full Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://iquote-pro.dev/schemas/state.json",
  "title": "State Insurance Requirements",
  "description": "State-specific insurance requirements, minimums, and special rules",
  "type": "object",
  "required": ["meta", "state"],
  "properties": {
    "meta": {
      "type": "object",
      "properties": {
        "schemaVersion": { "type": "string" },
        "generatedDate": { "type": "string", "format": "date-time" },
        "state": { "type": "string", "pattern": "^[A-Z]{2}$" }
      }
    },
    "state": {
      "type": "object",
      "required": ["_id", "_sources", "code", "name", "minimumCoverages"],
      "properties": {
        "_id": { "type": "string", "pattern": "^state_[a-z0-9]{10}$" },
        "_sources": { "$ref": "#/definitions/sources" },
        "code": { "type": "string", "pattern": "^[A-Z]{2}$" },
        "name": { "type": "string" },
        "minimumCoverages": {
          "type": "object",
          "properties": {
            "_id": { "type": "string" },
            "auto": { "$ref": "#/definitions/autoMinimums" },
            "home": { "$ref": "#/definitions/homeMinimums" },
            "renters": { "$ref": "#/definitions/rentersMinimums" }
          }
        },
        "specialRequirements": { "$ref": "#/definitions/fieldWithMetadata" },
        "averagePremiums": { "$ref": "#/definitions/fieldWithMetadata" }
      }
    }
  },
  "definitions": {
    "sources": { "$ref": "carrier-schema.json#/definitions/sources" },
    "fieldWithMetadata": { "$ref": "carrier-schema.json#/definitions/fieldWithMetadata" },
    "autoMinimums": {
      "type": "object",
      "properties": {
        "_id": { "type": "string" },
        "bodilyInjuryPerPerson": { "$ref": "#/definitions/fieldWithMetadata" },
        "bodilyInjuryPerAccident": { "$ref": "#/definitions/fieldWithMetadata" },
        "propertyDamage": { "$ref": "#/definitions/fieldWithMetadata" },
        "uninsuredMotorist": { "$ref": "#/definitions/fieldWithMetadata" },
        "personalInjuryProtection": { "$ref": "#/definitions/fieldWithMetadata" }
      }
    },
    "homeMinimums": {
      "type": "object",
      "properties": {
        "_id": { "type": "string" },
        "dwellingCoverage": { "$ref": "#/definitions/fieldWithMetadata" },
        "liabilityCoverage": { "$ref": "#/definitions/fieldWithMetadata" }
      }
    },
    "rentersMinimums": {
      "type": "object",
      "properties": {
        "_id": { "type": "string" },
        "personalProperty": { "$ref": "#/definitions/fieldWithMetadata" },
        "liabilityCoverage": { "$ref": "#/definitions/fieldWithMetadata" }
      }
    }
  }
}
```

### Example State Data

```json
{
  "meta": {
    "schemaVersion": "1.0",
    "generatedDate": "2025-11-05T16:00:00Z",
    "state": "CA"
  },
  "state": {
    "_id": "state_ckm9x7xhkf",
    "_sources": [
      {
        "uri": "https://www.insurance.ca.gov/01-consumers/",
        "accessedDate": "2025-11-05T13:00:00Z",
        "confidence": "high"
      }
    ],
    "code": "CA",
    "name": "California",
    "minimumCoverages": {
      "_id": "fld_ckm9x7xjlg",
      "auto": {
        "_id": "fld_ckm9x7xmnh",
        "bodilyInjuryPerPerson": {
          "_id": "fld_ckm9x7xpoi",
          "value": 15000,
          "_sources": [
            {
              "uri": "https://www.insurance.ca.gov/01-consumers/105-type/95-guides/03-auto/lw-lic-1.cfm",
              "elementRef": "section#minimums > table > tr:nth-child(1) > td:nth-child(2)",
              "accessedDate": "2025-11-05T13:05:00Z",
              "extractedValue": "$15,000 per person",
              "confidence": "high"
            }
          ]
        },
        "bodilyInjuryPerAccident": {
          "_id": "fld_ckm9x7xrpj",
          "value": 30000,
          "_sources": [
            {
              "uri": "https://www.insurance.ca.gov/01-consumers/105-type/95-guides/03-auto/lw-lic-1.cfm",
              "elementRef": "section#minimums > table > tr:nth-child(2) > td:nth-child(2)",
              "accessedDate": "2025-11-05T13:05:00Z",
              "extractedValue": "$30,000 per accident",
              "confidence": "high"
            }
          ]
        },
        "propertyDamage": {
          "_id": "fld_ckm9x7xtqk",
          "value": 5000,
          "_sources": [
            {
              "uri": "https://www.insurance.ca.gov/01-consumers/105-type/95-guides/03-auto/lw-lic-1.cfm",
              "elementRef": "section#minimums > table > tr:nth-child(3) > td:nth-child(2)",
              "accessedDate": "2025-11-05T13:05:00Z",
              "extractedValue": "$5,000 property damage",
              "confidence": "high"
            }
          ]
        }
      }
    },
    "specialRequirements": {
      "_id": "fld_ckm9x7xwrl",
      "value": {
        "requiresProposition103Notice": true,
        "goodDriverDiscount": {
          "available": true,
          "criteria": "No at-fault accidents in 3 years"
        }
      },
      "_sources": [
        {
          "uri": "https://www.insurance.ca.gov/01-consumers/105-type/95-guides/03-auto/good-driver.cfm",
          "accessedDate": "2025-11-05T13:10:00Z",
          "confidence": "high"
        }
      ]
    }
  }
}
```

---

## 3. Raw Data Schema

**File**: `knowledge_pack/schemas/raw-data-schema.json`

### Purpose

Captures data during initial scraping phase, before conflict resolution.

### Full Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://iquote-pro.dev/schemas/raw-data.json",
  "title": "Raw Scraped Data",
  "description": "Raw data entry from web scraping, preserved for audit trail",
  "type": "object",
  "required": ["id", "dataPoint", "rawValue", "source"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^raw_[a-z0-9]{10}$",
      "description": "Unique ID for this raw data entry"
    },
    "dataPoint": {
      "type": "string",
      "description": "Semantic identifier (e.g., 'geico_multi_policy_discount_percentage')"
    },
    "rawValue": {
      "type": "string",
      "description": "Exact value as extracted from source"
    },
    "normalizedValue": {
      "description": "Parsed/normalized value (number, boolean, array, etc.)"
    },
    "source": {
      "type": "object",
      "required": ["uri", "accessedDate"],
      "properties": {
        "uri": { "type": "string", "format": "uri", "description": "Source URL" },
        "pageId": {
          "type": "string",
          "pattern": "^page_[a-z0-9]{10}$",
          "description": "Optional in interface; Phase 2 MUST populate for raw data. Unique page ID (page_{cuid2})"
        },
        "pageFile": {
          "type": "string",
          "description": "Optional in interface; Phase 2 MUST populate for raw data. Path relative to knowledge_pack/raw/ (e.g., '_pages/page_ckm9x7w8k0.html')"
        },
        "elementRef": { "type": "string", "description": "CSS selector or XPath to element" },
        "extractedValue": { "type": "string", "description": "Exact text extracted from element" },
        "accessedDate": {
          "type": "string",
          "format": "date-time",
          "description": "ISO 8601 with timezone (YYYY-MM-DDTHH:mm:ssZ)"
        },
        "extractionMethod": { "enum": ["manual", "automated", "api"] },
        "confidence": {
          "enum": ["high", "medium", "low"],
          "description": "See sot-source-hierarchy.md#confidence-scoring-formula for scoring details"
        }
      }
    },
    "context": {
      "type": "object",
      "properties": {
        "surroundingText": { "type": "string" },
        "pageTitle": { "type": "string" },
        "qualifier": { "type": "string", "description": "'up to', 'average', 'typical', etc." }
      }
    }
  }
}
```

---

## 4. Conflict Schema

**File**: `knowledge_pack/schemas/conflict-schema.json`

### Full Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://iquote-pro.dev/schemas/conflict.json",
  "title": "Data Conflict",
  "description": "Detected conflict between multiple sources for same data point",
  "type": "object",
  "required": ["conflicts"],
  "properties": {
    "meta": {
      "type": "object",
      "properties": {
        "totalConflicts": { "type": "integer" },
        "pendingConflicts": { "type": "integer" },
        "resolvedConflicts": { "type": "integer" }
      }
    },
    "conflicts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "dataPoint", "conflictType", "severity", "sources", "status"],
        "properties": {
          "id": { "type": "string", "pattern": "^conf_[a-z0-9]{10}$" },
          "dataPoint": { "type": "string" },
          "detectedDate": { "type": "string", "format": "date-time" },
          "conflictType": {
            "enum": [
              "range_vs_specific",
              "numeric_difference",
              "state_availability",
              "boolean_difference",
              "missing_data",
              "date_mismatch"
            ]
          },
          "severity": { "enum": ["critical", "high", "medium", "low"] },
          "sources": {
            "type": "array",
            "minItems": 2,
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "uri": { "type": "string" },
                "value": {},
                "confidence": { "enum": ["high", "medium", "low"] },
                "sourceAuthority": { "type": "integer", "minimum": 1, "maximum": 5 }
              }
            }
          },
          "analysis": {
            "type": "object",
            "properties": {
              "percentageDifference": { "type": "number" },
              "affectsRouting": { "type": "boolean" },
              "affectsCompliance": { "type": "boolean" },
              "recommendedAction": { "type": "string" }
            }
          },
          "resolution": {
            "oneOf": [{ "type": "null" }, { "$ref": "carrier-schema.json#/definitions/resolution" }]
          },
          "status": { "enum": ["pending", "resolved", "escalated"] }
        }
      }
    }
  }
}
```

---

## 5. Search Tracker Schema

### Purpose

Track Phase 2 data gathering progress across distributed agent workflows.

### JSON Schema

```typescript
interface SearchTracker {
  searches: SearchEntry[]
  status: StatusCounts
  categories: string[]
}

interface SearchEntry {
  id: string // cuid2 with "search_" prefix
  query: string // Search query string
  category: string // Category: "carriers", "states", "discounts", etc.
  carrier?: string // Optional: specific carrier (e.g., "GEICO", "Progressive")
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  assignedTo?: string // Agent ID (cuid2 with "agnt_" prefix)
  startedAt?: string // ISO 8601 timestamp
  completedAt?: string // ISO 8601 timestamp
  pagesCollected?: number // Count of pages saved
  notes?: string // Optional notes or error messages
}

interface StatusCounts {
  total: number
  pending: number
  in_progress: number
  completed: number
  failed: number
}
```

### Example

```json
{
  "searches": [
    {
      "id": "search_ckm9x7wdx1",
      "query": "\"GEICO\" \"available in\" states",
      "category": "carriers",
      "carrier": "GEICO",
      "priority": "high",
      "status": "completed",
      "assignedTo": "agnt_cm1a5b7k9p",
      "startedAt": "2025-11-05T14:30:00Z",
      "completedAt": "2025-11-05T14:45:00Z",
      "pagesCollected": 3,
      "notes": "Collected carrier coverage maps"
    },
    {
      "id": "search_ckm9x7wtu6",
      "query": "California minimum auto insurance requirements",
      "category": "states",
      "priority": "high",
      "status": "in_progress",
      "assignedTo": "agnt_cm2b6c8l0q",
      "startedAt": "2025-11-05T15:00:00Z",
      "pagesCollected": 1
    }
  ],
  "status": {
    "total": 200,
    "pending": 150,
    "in_progress": 2,
    "completed": 45,
    "failed": 3
  },
  "categories": ["carriers", "states", "discounts", "requirements", "regulations"]
}
```

### Field Notes

- **id**: Must use `search_` prefix with cuid2
- **assignedTo**: Must use `agnt_` prefix with cuid2
- **Timestamps**: All timestamps use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
- **pagesCollected**: Incremented as pages are saved to `knowledge_pack/pages/`

---

## 5.1. URL Tracker Schema

### Purpose

Track URLs discovered during Phase 2 searches, with deduplication support and multi-search provenance tracking.

### JSON Schema

```typescript
interface URLTracker {
  meta: {
    version: string
    schemaVersion: string
    createdDate: string
    lastUpdated: string
    totalUrls: number
    description: string
  }
  statusCounts: {
    pending: number
    claimed: number
    completed: number
    failed: number
  }
  urls: URLEntry[]
}

interface URLEntry {
  id: string // cuid2 with "url_" prefix
  search_ids: string[] // Array of search IDs that discovered this URL
  websearch_ids: string[] // Array of websearch IDs that discovered this URL
  url: string // Full URL
  urlHash: string // SHA256 hash (first 16 chars) for deduplication
  priority?: number // Optional priority for fetch ordering

  // Brave API enrichment fields (from websearch response)
  title: string // Page title from Brave API
  description: string // Page description from Brave API
  page_age: string // Page age (e.g., "2023-08-15T00:00:00")
  language: string // Language code (e.g., "en")
  type: string // Result type (e.g., "search_result")
  subtype: string // Result subtype (e.g., "generic")
  hostname: string // Domain hostname (e.g., "www.geico.com")
  source_name: string // Source name from profile (e.g., "GEICO")

  // Fetch status and results
  status: 'pending' | 'completed' | 'failed'
  assignedTo?: string // Deprecated (no longer used)
  pageId?: string // Generated page ID after fetch (page_{cuid2})
  htmlFile?: string // Path to HTML file (relative to knowledge_pack/)
  markdownFile?: string // Path to markdown file (relative to knowledge_pack/)
  fetchedAt?: string // ISO 8601 timestamp
  fetchError?: string // Error details if failed
  retryCount: number // Number of fetch retries (defaults to 0)
}
```

### Example

```json
{
  "meta": {
    "version": "1.0",
    "schemaVersion": "multi-step-v1",
    "createdDate": "2025-11-06",
    "lastUpdated": "2025-11-07T12:35:10Z",
    "totalUrls": 2950,
    "description": "Phase 2 URL tracker - URLs discovered via Brave API"
  },
  "statusCounts": {
    "pending": 2950,
    "completed": 0,
    "failed": 0
  },
  "urls": [
    {
      "id": "url_ckm9x7wdx1",
      "search_ids": ["search_abc123", "search_def456"],
      "websearch_ids": ["websearch_rjkpy2qz8juh0frtp8jqebis", "websearch_dgju3b0n4z6jq9if95t31m9m"],
      "url": "https://www.geico.com/auto/discounts/",
      "urlHash": "a1b2c3d4e5f6g7h8",
      "priority": null,
      "title": "Auto Insurance Discounts - GEICO",
      "description": "Save money on your auto insurance with GEICO's discounts. Multi-policy, safe driver, good student, and more.",
      "page_age": "2023-08-15T00:00:00",
      "language": "en",
      "type": "search_result",
      "subtype": "generic",
      "hostname": "www.geico.com",
      "source_name": "GEICO",
      "status": "completed",
      "assignedTo": null,
      "pageId": "page_xyz789",
      "htmlFile": "../knowledge_pack/raw/pages/page_xyz789.html",
      "markdownFile": "../knowledge_pack/raw/pages/page_xyz789.md",
      "fetchedAt": "2025-11-07T13:00:00Z",
      "fetchError": null,
      "retryCount": 0
    },
    {
      "id": "url_ckm9x7wtu6",
      "search_ids": ["search_ghi789"],
      "websearch_ids": ["websearch_loynibu0sv1yy4to6tsrcs99"],
      "url": "https://www.statefarm.com/insurance/home/discounts",
      "urlHash": "i9j0k1l2m3n4o5p6",
      "priority": null,
      "title": "Home Insurance Discounts - State Farm",
      "description": "Discover ways to save on home insurance with State Farm. Bundle, security system, and loyalty discounts available.",
      "page_age": "2024-01-10T00:00:00",
      "language": "en",
      "type": "search_result",
      "subtype": "generic",
      "hostname": "www.statefarm.com",
      "source_name": "State Farm",
      "status": "pending",
      "assignedTo": null,
      "pageId": null,
      "htmlFile": null,
      "markdownFile": null,
      "fetchedAt": null,
      "fetchError": null,
      "retryCount": 0
    }
  ]
}
```

### Field Notes

- **search_ids**: Array of all search IDs that discovered this URL (supports multi-search provenance)
- **websearch_ids**: Array of all websearch IDs (Brave API executions) that discovered this URL
- **urlHash**: Calculated via `sha256(normalize_url(url))[:16]` for deduplication
- **Brave enrichment**: 8 fields (title, description, page_age, language, type, subtype, hostname, source_name) extracted from Brave API response
- **URL Deduplication**: Multiple searches can discover the same URL - all search_ids and websearch_ids are tracked
- **Provenance chain**: URL → websearch_ids → search_ids → category/carrier metadata
- **status**: Tracks fetch lifecycle (pending → completed/failed)

---

## 5.2. Page Tracker Schema

### Purpose

Track pages fetched via crawl4ai, ready for data extraction.

### JSON Schema

```typescript
interface PageTracker {
  meta: {
    version: string
    schemaVersion: string
    createdDate: string
    lastUpdated: string
    totalPages: number
    description: string
  }
  statusCounts: {
    pending: number
    claimed: number
    completed: number
    failed: number
  }
  pages: PageEntry[]
}

interface PageEntry {
  id: string // cuid2 with "page_" prefix
  url_id: string // References URL tracker entry
  status: 'pending' | 'claimed' | 'completed' | 'failed'
  assignedTo?: string // Agent ID (cuid2 with "agnt_" prefix)
  claimedAt?: string // ISO 8601 timestamp
  completedAt?: string // ISO 8601 timestamp
  dataPointsExtracted?: number // Count of raw data points extracted
  rawDataFile?: string // Path to raw.json file (relative to knowledge_pack/)
  errorMessage?: string // Error details if failed
}
```

### Example

```json
{
  "meta": {
    "version": "1.0",
    "schemaVersion": "multi-step-v1",
    "createdDate": "2025-11-06",
    "lastUpdated": "2025-11-06T16:45:00Z",
    "totalPages": 120,
    "description": "Phase 2 page tracker - pages pending extraction"
  },
  "statusCounts": {
    "pending": 80,
    "claimed": 3,
    "completed": 35,
    "failed": 2
  },
  "pages": [
    {
      "id": "page_xyz789",
      "url_id": "url_ckm9x7wdx1",
      "status": "completed",
      "assignedTo": "agnt_cm1a5b7k9p",
      "claimedAt": "2025-11-06T16:00:00Z",
      "completedAt": "2025-11-06T16:05:00Z",
      "dataPointsExtracted": 15,
      "rawDataFile": "carriers/uncategorized/data_page_xyz789.raw.json"
    },
    {
      "id": "page_abc123",
      "url_id": "url_ckm9x7wtu6",
      "status": "pending"
    }
  ]
}
```

### Field Notes

- **url_id**: References URL tracker (provenance chain: page → url → search_ids)
- **rawDataFile**: Filename pattern is `data_{page_id}.raw.json` (one file per page)
- **dataPointsExtracted**: Can be 0 if page has no relevant insurance data
- **Provenance lookup**: page → url_id → URL.search_ids → original searches

---

## 5.3. Websearch Schema

### Purpose

Store complete Brave API request/response for each search execution. Provides audit trail and enables reprocessing of search results without re-executing API calls.

### JSON Schema

```typescript
interface WebsearchRecord {
  websearch_id: string // cuid2 with "websearch_" prefix
  search_id: string // References search tracker entry (search_{cuid2})
  timestamp: string // ISO 8601 timestamp
  startedAt: string // ISO 8601 timestamp
  completedAt: string // ISO 8601 timestamp
  durationSeconds: number // Execution duration
  urlsDiscoveredCount: number // Total URLs found in response
  errorMessage?: string // Error details if failed
  request: {
    endpoint: string // Brave API endpoint URL
    query: string // Search query string
    params: {
      safesearch: string // "strict" | "moderate" | "off"
      freshness: string // "py" (past year) | "pm" (past month) | etc.
      text_decorations: boolean
      result_filter: string // "web,query"
      extra_snippets: boolean
      summary: boolean
      count: number // Results per page
      offset: number // Pagination offset
    }
  }
  response: {
    // Complete Brave API response
    type: string // "search"
    query: {
      original: string
      show_strict_warning: boolean
      is_navigational: boolean
      is_news_breaking: boolean
      spellcheck_off: boolean
      country: string
      bad_results: boolean
      should_fallback: boolean
      postal_code: string
      city: string
      header_country: string
      more_results_available: boolean
      state: string
    }
    mixed: {
      type: string
      main: Array<{ type: string; index: number; all: boolean }>
      top: any[]
      side: any[]
    }
    web: {
      type: string
      results: Array<{
        title: string
        url: string
        is_source_local: boolean
        is_source_both: boolean
        description: string
        page_age: string
        page_fetched: string
        profile: {
          name: string
          long_name: string
          url: string
          img: string
        }
        language: string
        family_friendly: boolean
        type: string
        subtype: string
        meta_url: {
          scheme: string
          netloc: string
          hostname: string
          favicon: string
          path: string
        }
        thumbnail: {
          src: string
          original: string
          logo: boolean
        }
        age: string
      }>
      family_friendly: boolean
    }
  }
}
```

### Example

```json
{
  "websearch_id": "websearch_rjkpy2qz8juh0frtp8jqebis",
  "search_id": "search_q5vmceqgcjyaobydy6q2xpuc",
  "timestamp": "2025-11-07T12:20:15.560234",
  "startedAt": "2025-11-07T12:20:15.560234",
  "completedAt": "2025-11-07T12:20:16.823456",
  "durationSeconds": 1.26,
  "urlsDiscoveredCount": 21,
  "errorMessage": null,
  "request": {
    "endpoint": "https://api.search.brave.com/res/v1/web/search",
    "query": "\"GEICO\" \"available in\" states",
    "params": {
      "safesearch": "strict",
      "freshness": "py",
      "text_decorations": false,
      "result_filter": "web,query",
      "extra_snippets": false,
      "summary": false,
      "count": 20,
      "offset": 0
    }
  },
  "response": {
    "type": "search",
    "query": {
      "original": "\"GEICO\" \"available in\" states",
      "show_strict_warning": false,
      "is_navigational": false,
      "is_news_breaking": false,
      "spellcheck_off": true,
      "country": "us",
      "bad_results": false,
      "should_fallback": false,
      "postal_code": "",
      "city": "",
      "header_country": "us",
      "more_results_available": true,
      "state": ""
    },
    "mixed": {
      "type": "mixed",
      "main": [{ "type": "web", "index": 0, "all": true }],
      "top": [],
      "side": []
    },
    "web": {
      "type": "search",
      "results": [
        {
          "title": "GEICO Coverage Areas - States Where GEICO Operates",
          "url": "https://www.geico.com/information/states/",
          "is_source_local": false,
          "is_source_both": false,
          "description": "GEICO is available in all 50 states and the District of Columbia.",
          "page_age": "2023-08-15T00:00:00",
          "page_fetched": "2025-11-07T12:20:00",
          "profile": {
            "name": "GEICO",
            "long_name": "Government Employees Insurance Company",
            "url": "https://www.geico.com",
            "img": "https://imgs.search.brave.com/..."
          },
          "language": "en",
          "family_friendly": true,
          "type": "search_result",
          "subtype": "generic",
          "meta_url": {
            "scheme": "https",
            "netloc": "www.geico.com",
            "hostname": "www.geico.com",
            "favicon": "https://imgs.search.brave.com/favicon.ico",
            "path": "/information/states/"
          },
          "thumbnail": {
            "src": "https://imgs.search.brave.com/...",
            "original": "https://imgs.search.brave.com/...",
            "logo": false
          },
          "age": "2023-08-15T00:00:00"
        }
      ],
      "family_friendly": true
    }
  }
}
```

### Field Notes

- **websearch_id**: Unique execution instance (separate from search_id to track multiple API runs)
- **search_id**: Links back to the originating query in search-tracker.json
- **urlsDiscoveredCount**: Total URLs in response.web.results array
- **Complete response**: Full Brave API JSON for audit trail and reprocessing
- **Enrichment fields**: title, description, page_age, language, type, subtype, hostname, source_name extracted from response
- **Provenance chain**: websearch → search → category/carrier metadata
- **Compliance**: Stored for regulatory audit trail and citation verification

---

## 6. cuid2 ID Conventions

All entity IDs use **cuid2** format with type prefixes. See [sot-id-conventions.md#complete-id-prefix-reference](sot-id-conventions.md#complete-id-prefix-reference) for the complete prefix specification and examples.

### ID Generation

```typescript
import { createId } from '@paralleldrive/cuid2'

const fieldId = `fld_${createId()}` // "fld_ckm9x7whp2"
const carrierId = `carr_${createId()}` // "carr_ckm9x7w8k0"
```

---

## 7. Date and Timestamp Standards

### Overview

All date and timestamp values in the knowledge pack follow strict ISO 8601 standards to ensure consistency, interoperability, and compliance with regulatory requirements.

### Timestamp Format (with Timezone)

**Use Case**: All temporal audit fields (data access times, creation/modification times, conflict resolution times)

**Format**: `YYYY-MM-DDTHH:mm:ssZ`

**Pattern Description**:

- `YYYY`: 4-digit year (e.g., `2025`)
- `MM`: 2-digit month (01-12)
- `DD`: 2-digit day (01-31)
- `T`: ISO 8601 separator (literal character)
- `HH`: 2-digit hour in 24-hour format (00-23)
- `mm`: 2-digit minute (00-59)
- `ss`: 2-digit second (00-59)
- `Z`: UTC timezone indicator (literal character)

**Examples**:

```
2025-11-05T12:00:00Z    (noon UTC on Nov 5, 2025)
2025-11-05T15:30:45Z    (3:30:45 PM UTC)
2025-01-01T00:00:00Z    (midnight UTC on Jan 1, 2025)
```

**Fields Using Timestamp Format**:

- `source.accessedDate` - When data was accessed from source
- `meta.generatedDate` - When file was generated
- `resolution.resolvedDate` - When conflict was resolved
- Any audit field tracking when an action occurred

### Date Format (without Time)

**Use Case**: Reference dates where time precision is not needed (e.g., document headers, metadata date fields)

**Format**: `YYYY-MM-DD`

**Pattern Description**:

- `YYYY`: 4-digit year
- `MM`: 2-digit month (01-12)
- `DD`: 2-digit day (01-31)

**Examples**:

```
2025-11-05    (November 5, 2025)
2025-01-01    (January 1, 2025)
2025-12-25    (December 25, 2025)
```

**Fields Using Date-Only Format**:

- Document header dates (e.g., `**Date**: 2025-11-05`)
- Reference dates in documentation
- Simple date metadata

### Validation Rules

1. **Timestamps MUST always include timezone (`Z` suffix)**
   - Valid: `2025-11-05T12:00:00Z`
   - Invalid: `2025-11-05T12:00:00` (missing Z)

2. **No alternative timezones accepted**
   - Only UTC (Z) is allowed in canonical data
   - Conversion happens in application layer, not in knowledge pack

3. **Precision consistency**
   - Timestamps: Always include seconds (not just hours/minutes)
   - Use `:00` if exact time not available

4. **JSON Schema validation**
   - Timestamp fields use `"format": "date-time"` in JSON Schema
   - Date fields use `"format": "date"` in JSON Schema

### Examples in Context

**Timestamp in Source Object** (from carrier schema):

```json
{
  "uri": "https://www.geico.com/auto/discounts/",
  "elementRef": "div#multi-policy > h3",
  "accessedDate": "2025-11-05T12:15:00Z",
  "confidence": "high"
}
```

**Timestamp in Resolution Object** (from conflict resolution):

```json
{
  "conflictId": "conf_ckm9x7x5ea",
  "selectedValue": 15,
  "method": "authoritative_source",
  "rationale": "GEICO official site is authoritative",
  "resolvedBy": "data_curator",
  "resolvedDate": "2025-11-05T15:30:00Z"
}
```

**Date in Document Header**:

```markdown
**Date**: 2025-11-05
**Last Updated**: 2025-11-05
```

### Standardization Checklist

Before committing knowledge pack files:

- [ ] All `accessedDate` fields follow `YYYY-MM-DDTHH:mm:ssZ` format
- [ ] All `resolvedDate` fields follow `YYYY-MM-DDTHH:mm:ssZ` format
- [ ] All `generatedDate` fields follow `YYYY-MM-DDTHH:mm:ssZ` format
- [ ] All timestamps end with `Z` (no exceptions)
- [ ] Document header dates use `YYYY-MM-DD` format only
- [ ] No alternative formats used (e.g., Unix timestamps, unpadded months)

### Tools for Validation

**Find inconsistent timestamps** (missing Z suffix):

```bash
rg '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' docs/knowledge-pack/*.md | rg -v 'Z"'
```

**Verify all timestamps include seconds**:

```bash
rg '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' docs/knowledge-pack/*.md | rg -v ':[0-9]{2}Z'
```

**Check for ISO 8601 documentation**:

```bash
rg -n "ISO 8601" docs/knowledge-pack/*.md
```

---

## 8. Source Inheritance Rules

### When to Inherit

Inherit parent source when:

1. Child field has **no conflicting information** from direct sources
2. Child field is **implied by parent** (e.g., discount states = carrier states)
3. **No specific citation found** during scraping

### How to Mark Inheritance

```json
{
  "_id": "fld_cm3m7n9w1b",
  "value": ["CA", "TX", "FL", "NY", "IL"],
  "_sources": [], // Empty array
  "_inheritedFrom": "fld_cm6f0g2p4u", // Parent field ID
  "_note": "Inherits from carrier operating states"
}
```

### Inheritance Chain

Can inherit from grandparent if parent also inherits:

```json
// Carrier level
"operatesIn": {
  "_id": "fld_cm6f0g2p4u",
  "value": ["CA", "TX", "FL"],
  "_sources": [...]
}

// Discount level (child)
"discounts": [{
  "_id": "disc_cm5e9f1o3t",
  "states": {
    "_id": "fld_cm7g1h3q5v",
    "_sources": [],
    "_inheritedFrom": "fld_cm6f0g2p4u"
  }
}]

// Requirement level (grandchild)
"requirements": {
  "states": {
    "_id": "fld_cm8h2i4r6w",
    "_sources": [],
    "_inheritedFrom": "fld_cm7g1h3q5v"  // Always the direct parent
  }
}
```

---

## 9. Validation Rules

### Required Validations

1. **Every \_id is unique** across entire knowledge pack
2. **Every field has \_sources OR \_inheritedFrom** (never both empty)
3. **\_inheritedFrom references valid \_id** in parent/ancestor
4. **Source URIs are valid** (proper format, accessible)
5. **Conflict IDs in \_resolution exist** in conflicts.json
6. **Primary source exists** for multi-source fields (at least one primary=true)
7. **Metadata envelopes consistent** (all required fields present)

### JSON Schema Validation Command

```bash
bun run validate-schema -- knowledge_pack/carriers/geico.json
```

---

## Summary

These schemas ensure:

✅ **Complete audit trail**: Every value traceable to source  
✅ **Conflict transparency**: Disagreements documented  
✅ **Source diversity**: Multiple sources supported  
✅ **Inheritance clarity**: Parent→child relationships explicit  
✅ **Validation support**: Machine-checkable compliance

Use these schemas to validate all knowledge pack files before deployment.

---

**See Also:**

- 📖 [ID Conventions](sot-id-conventions.md) - Complete cuid2 ID specification and usage
- 🔗 [Source Authority Levels](sot-source-hierarchy.md#source-authority-levels) - Understanding confidence scores
- 📊 [Complete Examples](knowledge-pack-examples.md) - See schemas in real data transformations
- 🛠️ [Methodology Phases](knowledge-pack-methodology.md) - How schemas are used throughout data gathering
- 🤖 [Phase 2 Agent Workflow](phase-2-agent-instructions.md#step-5-extract-data-points) - Applying schemas during scraping

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Status**: Ready for Implementation

---

## Referenced By

- **[sot-source-hierarchy.md](sot-source-hierarchy.md)** - Uses schema structure to define how sources integrate into field metadata and source authority levels
- **[sot-search-queries.md](sot-search-queries.md)** - References schema fields when specifying what data points to extract during searches
- **[phase-2-agent-instructions.md](phase-2-agent-instructions.md)** - Step 5 applies schemas to extract data points and validate field structure during scraping
- **[sot-id-conventions.md](sot-id-conventions.md)** - Shows how cuid2-based field IDs and source IDs integrate into schema structures
- **[knowledge-pack-methodology.md](knowledge-pack-methodology.md)** - Documents how schemas are designed in Phase 1 and applied throughout data gathering phases
- **[knowledge-pack-examples.md](knowledge-pack-examples.md)** - Demonstrates full schema compliance in real-world carrier data transformations
- **[README.md](README.md)** - Overview links to schemas as core data structure specification
