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

| Schema File | Purpose | Location |
|------------|---------|----------|
| `carrier-schema.json` | Carrier data with products, discounts, eligibility | `knowledge_pack/schemas/` |
| `state-schema.json` | State requirements and minimums | `knowledge_pack/schemas/` |
| `product-schema.json` | Product definitions | `knowledge_pack/schemas/` |
| `compliance-schema.json` | Compliance rules and disclaimers | `knowledge_pack/schemas/` |
| `source-metadata.json` | Source citation format | `knowledge_pack/schemas/` |
| `resolution-metadata.json` | Conflict resolution format | `knowledge_pack/schemas/` |
| `raw-data-schema.json` | Raw scraped data format | `knowledge_pack/schemas/` |

---

## Core Concepts

### Field Metadata Envelope

Every field in the knowledge pack uses this structure:

```typescript
interface FieldWithMetadata<T> {
  _id: string              // Unique ID (cuid2) for this field
  value: T                 // The actual data value
  _sources: Source[]       // Direct source citations (≥1 required if not inherited)
  _inheritedFrom?: string  // Parent field ID (if sources inherited)
  _resolution?: Resolution // Conflict resolution metadata (if applicable)
}
```

### Source Object

```typescript
interface Source {
  uri: string              // Full URL
  pageId?: string          // Required for Phase 2 raw data, optional after cleanup. Unique page ID (page_{cuid2})
  pageFile?: string        // Required for Phase 2 raw data, optional after cleanup. Path to saved page (_pages/page_{cuid2}.{ext})
  elementRef?: string      // CSS selector or XPath
  lineRef?: number         // Line number (for text files)
  accessedDate: string     // ISO 8601 date-time with timezone (YYYY-MM-DDTHH:mm:ssZ)
  extractedValue?: string  // Raw value from source (before normalization)
  confidence: 'high' | 'medium' | 'low'  // Classification (required). See sot-source-hierarchy.md#confidence-classifications
  confidenceScore?: number // Calculated numeric score 1.0-5.0 (optional). See sot-source-hierarchy.md#confidence-scoring-formula
  primary?: boolean        // Is this the primary source (for multi-source)
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
  conflictId: string       // Reference to conflict in conflicts.json
  selectedValue: any       // The chosen value
  method: string           // Resolution strategy used
  rationale: string        // Human-readable explanation
  resolvedBy: string       // Curator identifier
  resolvedDate: string     // ISO 8601 date
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
        "schemaVersion": {"type": "string"},
        "generatedDate": {"type": "string", "format": "date-time"},
        "carrier": {"type": "string"},
        "totalDataPoints": {"type": "integer"},
        "totalSources": {"type": "integer"},
        "conflictsResolved": {"type": "integer"}
      }
    },
    "carrier": {
      "type": "object",
      "required": ["_id", "_sources", "name", "operatesIn", "products", "eligibility", "discounts"],
      "properties": {
        "_id": {"type": "string", "pattern": "^carr_[a-z0-9]{10}$"},
        "_sources": {"$ref": "#/definitions/sources"},
        "name": {"type": "string"},
        "operatesIn": {"$ref": "#/definitions/fieldWithMetadata"},
        "products": {"$ref": "#/definitions/fieldWithMetadata"},
        "eligibility": {
          "type": "object",
          "properties": {
            "_id": {"type": "string"},
            "_sources": {"$ref": "#/definitions/sources"},
            "auto": {"$ref": "#/definitions/productEligibility"},
            "home": {"$ref": "#/definitions/productEligibility"},
            "renters": {"$ref": "#/definitions/productEligibility"},
            "umbrella": {"$ref": "#/definitions/productEligibility"}
          }
        },
        "discounts": {
          "type": "array",
          "items": {"$ref": "#/definitions/discount"}
        },
        "compensation": {"$ref": "#/definitions/compensation"},
        "averagePricing": {"$ref": "#/definitions/averagePricing"}
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
          "uri": {"type": "string", "format": "uri"},
          "pageId": {"type": "string", "pattern": "^page_[a-z0-9]{10}$", "description": "Required for Phase 2 raw data, optional after cleanup. Unique page ID (page_{cuid2})"},
          "pageFile": {"type": "string", "description": "Required for Phase 2 raw data, optional after cleanup. Path to saved page (_pages/page_{cuid2}.{ext})"},
          "elementRef": {"type": "string"},
          "lineRef": {"type": "integer"},
          "accessedDate": {"type": "string", "format": "date-time"},
          "extractedValue": {"type": "string"},
          "confidence": {"enum": ["high", "medium", "low"]},
          "confidenceScore": {"type": "number", "minimum": 1.0, "maximum": 5.0},
          "primary": {"type": "boolean"}
        }
      }
    },
    "fieldWithMetadata": {
      "type": "object",
      "required": ["_id", "value"],
      "properties": {
        "_id": {"type": "string"},
        "value": {},
        "_sources": {"$ref": "#/definitions/sources"},
        "_inheritedFrom": {"type": "string"},
        "_resolution": {"$ref": "#/definitions/resolution"}
      }
    },
    "resolution": {
      "type": "object",
      "required": ["conflictId", "selectedValue", "method", "rationale", "resolvedBy", "resolvedDate"],
      "properties": {
        "conflictId": {"type": "string"},
        "selectedValue": {},
        "method": {"type": "string"},
        "rationale": {"type": "string"},
        "resolvedBy": {"type": "string"},
        "resolvedDate": {"type": "string", "format": "date-time"}
      }
    },
    "productEligibility": {
      "type": "object",
      "properties": {
        "_id": {"type": "string"},
        "_sources": {"$ref": "#/definitions/sources"},
        "minAge": {"$ref": "#/definitions/fieldWithMetadata"},
        "maxAge": {"$ref": "#/definitions/fieldWithMetadata"},
        "maxVehicles": {"$ref": "#/definitions/fieldWithMetadata"},
        "stateSpecific": {
          "type": "object",
          "patternProperties": {
            "^[A-Z]{2}$": {"type": "object"}
          }
        }
      }
    },
    "discount": {
      "type": "object",
      "required": ["_id", "name", "percentage", "products", "states", "requirements"],
      "properties": {
        "_id": {"type": "string", "pattern": "^disc_[a-z0-9]{10}$"},
        "name": {"$ref": "#/definitions/fieldWithMetadata"},
        "percentage": {"$ref": "#/definitions/fieldWithMetadata"},
        "products": {"$ref": "#/definitions/fieldWithMetadata"},
        "states": {"$ref": "#/definitions/fieldWithMetadata"},
        "requirements": {"$ref": "#/definitions/fieldWithMetadata"},
        "stackable": {"$ref": "#/definitions/fieldWithMetadata"},
        "description": {"$ref": "#/definitions/fieldWithMetadata"}
      }
    },
    "compensation": {
      "type": "object",
      "properties": {
        "_id": {"type": "string"},
        "commissionRate": {"$ref": "#/definitions/fieldWithMetadata"},
        "commissionType": {"$ref": "#/definitions/fieldWithMetadata"}
      }
    },
    "averagePricing": {
      "type": "object",
      "properties": {
        "_id": {"type": "string"},
        "auto": {"type": "object"},
        "home": {"type": "object"},
        "renters": {"type": "object"},
        "umbrella": {"type": "object"}
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
        "schemaVersion": {"type": "string"},
        "generatedDate": {"type": "string", "format": "date-time"},
        "state": {"type": "string", "pattern": "^[A-Z]{2}$"}
      }
    },
    "state": {
      "type": "object",
      "required": ["_id", "_sources", "code", "name", "minimumCoverages"],
      "properties": {
        "_id": {"type": "string", "pattern": "^state_[a-z0-9]{10}$"},
        "_sources": {"$ref": "#/definitions/sources"},
        "code": {"type": "string", "pattern": "^[A-Z]{2}$"},
        "name": {"type": "string"},
        "minimumCoverages": {
          "type": "object",
          "properties": {
            "_id": {"type": "string"},
            "auto": {"$ref": "#/definitions/autoMinimums"},
            "home": {"$ref": "#/definitions/homeMinimums"},
            "renters": {"$ref": "#/definitions/rentersMinimums"}
          }
        },
        "specialRequirements": {"$ref": "#/definitions/fieldWithMetadata"},
        "averagePremiums": {"$ref": "#/definitions/fieldWithMetadata"}
      }
    }
  },
  "definitions": {
    "sources": {"$ref": "carrier-schema.json#/definitions/sources"},
    "fieldWithMetadata": {"$ref": "carrier-schema.json#/definitions/fieldWithMetadata"},
    "autoMinimums": {
      "type": "object",
      "properties": {
        "_id": {"type": "string"},
        "bodilyInjuryPerPerson": {"$ref": "#/definitions/fieldWithMetadata"},
        "bodilyInjuryPerAccident": {"$ref": "#/definitions/fieldWithMetadata"},
        "propertyDamage": {"$ref": "#/definitions/fieldWithMetadata"},
        "uninsuredMotorist": {"$ref": "#/definitions/fieldWithMetadata"},
        "personalInjuryProtection": {"$ref": "#/definitions/fieldWithMetadata"}
      }
    },
    "homeMinimums": {
      "type": "object",
      "properties": {
        "_id": {"type": "string"},
        "dwellingCoverage": {"$ref": "#/definitions/fieldWithMetadata"},
        "liabilityCoverage": {"$ref": "#/definitions/fieldWithMetadata"}
      }
    },
    "rentersMinimums": {
      "type": "object",
      "properties": {
        "_id": {"type": "string"},
        "personalProperty": {"$ref": "#/definitions/fieldWithMetadata"},
        "liabilityCoverage": {"$ref": "#/definitions/fieldWithMetadata"}
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
        "uri": {"type": "string", "format": "uri", "description": "Source URL"},
        "pageId": {"type": "string", "pattern": "^page_[a-z0-9]{10}$", "description": "Required for Phase 2 raw data, optional after cleanup. Unique page ID (page_{cuid2})"},
        "pageFile": {"type": "string", "description": "Required for Phase 2 raw data, optional after cleanup. Path to saved page (_pages/page_{cuid2}.{ext})"},
        "elementRef": {"type": "string", "description": "CSS selector or XPath to element"},
        "extractedValue": {"type": "string", "description": "Exact text extracted from element"},
        "accessedDate": {"type": "string", "format": "date-time", "description": "ISO 8601 with timezone (YYYY-MM-DDTHH:mm:ssZ)"},
        "extractionMethod": {"enum": ["manual", "automated", "api"]},
        "confidence": {"enum": ["high", "medium", "low"], "description": "See sot-source-hierarchy.md#confidence-scoring-formula for scoring details"}
      }
    },
    "context": {
      "type": "object",
      "properties": {
        "surroundingText": {"type": "string"},
        "pageTitle": {"type": "string"},
        "qualifier": {"type": "string", "description": "'up to', 'average', 'typical', etc."}
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
        "totalConflicts": {"type": "integer"},
        "pendingConflicts": {"type": "integer"},
        "resolvedConflicts": {"type": "integer"}
      }
    },
    "conflicts": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "dataPoint", "conflictType", "severity", "sources", "status"],
        "properties": {
          "id": {"type": "string", "pattern": "^conf_[a-z0-9]{10}$"},
          "dataPoint": {"type": "string"},
          "detectedDate": {"type": "string", "format": "date-time"},
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
          "severity": {"enum": ["critical", "high", "medium", "low"]},
          "sources": {
            "type": "array",
            "minItems": 2,
            "items": {
              "type": "object",
              "properties": {
                "id": {"type": "string"},
                "uri": {"type": "string"},
                "value": {},
                "confidence": {"enum": ["high", "medium", "low"]},
                "sourceAuthority": {"type": "integer", "minimum": 1, "maximum": 5}
              }
            }
          },
          "analysis": {
            "type": "object",
            "properties": {
              "percentageDifference": {"type": "number"},
              "affectsRouting": {"type": "boolean"},
              "affectsCompliance": {"type": "boolean"},
              "recommendedAction": {"type": "string"}
            }
          },
          "resolution": {
            "oneOf": [
              {"type": "null"},
              {"$ref": "carrier-schema.json#/definitions/resolution"}
            ]
          },
          "status": {"enum": ["pending", "resolved", "escalated"]}
        }
      }
    }
  }
}
```

---

## 5. cuid2 ID Conventions

### Format Patterns

All entity IDs use **cuid2** format with type prefixes. See [sot-id-conventions.md](sot-id-conventions.md) for complete specification.

| Entity Type | Pattern | Example |
|-------------|---------|---------|
| Carrier | `carr_{cuid2}` | `carr_ckm9x7w8k0` |
| State | `state_{cuid2}` | `state_ckm9x7wtu6` |
| Discount | `disc_{cuid2}` | `disc_ckm9x7wdx1` |
| Field | `fld_{cuid2}` | `fld_ckm9x7whp2` |
| Conflict | `conf_{cuid2}` | `conf_ckm9x7wkm3` |
| Raw Data | `raw_{cuid2}` | `raw_ckm9x7wnp4` |
| Eligibility | `elig_{cuid2}` | `elig_ckm9x7wwx7` |
| Page | `page_{cuid2}` | `page_ckm9x7wqr5` |

### ID Generation

```typescript
import { createId } from '@paralleldrive/cuid2';

const fieldId = `fld_${createId()}`;  // "fld_ckm9x7whp2"
const carrierId = `carr_${createId()}`;  // "carr_ckm9x7w8k0"
```

---

## 6. Date and Timestamp Standards

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

## 7. Source Inheritance Rules

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
  "_sources": [],                    // Empty array
  "_inheritedFrom": "fld_cm6f0g2p4u",     // Parent field ID
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

## 8. Validation Rules

### Required Validations

1. **Every _id is unique** across entire knowledge pack
2. **Every field has _sources OR _inheritedFrom** (never both empty)
3. **_inheritedFrom references valid _id** in parent/ancestor
4. **Source URIs are valid** (proper format, accessible)
5. **Conflict IDs in _resolution exist** in conflicts.json
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
- **[CONSOLIDATION-PLAN.md](CONSOLIDATION-PLAN.md)** - References schemas in validation tasks and consolidation procedures
- **[knowledge-pack-methodology.md](knowledge-pack-methodology.md)** - Documents how schemas are designed in Phase 1 and applied throughout data gathering phases
- **[knowledge-pack-examples.md](knowledge-pack-examples.md)** - Demonstrates full schema compliance in real-world carrier data transformations
- **[README.md](README.md)** - Overview links to schemas as core data structure specification
