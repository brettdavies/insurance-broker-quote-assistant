# Knowledge Pack ID Conventions (cuid2)

**Version**: 1.0  
**Date**: 2025-11-05  
**Project**: Insurance Broker Quote Assistant (IQuote Pro)  
**Purpose**: Define globally unique identifier conventions using cuid2

---

## Overview

The knowledge pack uses **cuid2** for all entity identifiers to ensure global uniqueness, avoid collisions, and maintain auditability across distributed data gathering workflows.

---

## Why cuid2?

### Requirements

✅ **Globally Unique**: No central coordination needed  
✅ **Collision Resistant**: Cryptographically secure randomness  
✅ **Compact**: Short enough for JSON files (10 chars)  
✅ **URL-Safe**: No special characters requiring encoding  
✅ **Sortable**: Roughly sortable by creation time  
✅ **No Dependencies**: No database or server required

### cuid2 vs Alternatives

| Feature | cuid2 | UUID v4 | Sequential | Custom Pattern |
|---------|-------|---------|------------|----------------|
| **Global Uniqueness** | ✅ Yes | ✅ Yes | ❌ No | ⚠️ Maybe |
| **Collision Risk** | Negligible | Negligible | High | Unknown |
| **Length** | 10 chars | 36 chars | Variable | Variable |
| **URL-Safe** | ✅ Yes | ⚠️ With dashes | ✅ Yes | Depends |
| **Sortable** | ✅ Roughly | ❌ No | ✅ Yes | Depends |
| **Human-Readable** | ⚠️ Partial | ❌ No | ✅ Yes | ✅ Yes |
| **Setup Complexity** | Low | Low | High | Medium |

**Decision**: cuid2 provides the best balance of uniqueness, compactness, and usability for this project.

---

## Installation

```bash
bun add @paralleldrive/cuid2
```

---

## Basic Usage

### TypeScript/JavaScript

```typescript
import { createId } from '@paralleldrive/cuid2';

// Generate a new ID
const id = createId();
// Example: "ckm9x7w8k0"

// Generate multiple IDs
const ids = Array.from({ length: 5 }, () => createId());
// Example: ["ckm9x7w8k0", "ckm9x7wdx1", "ckm9x7whp2", ...]
```

### With Type Prefixes

```typescript
import { createId } from '@paralleldrive/cuid2';

// Entity-specific ID generators
const generateCarrierId = () => `carr_${createId()}`;
const generateFieldId = () => `fld_${createId()}`;
const generateConflictId = () => `conf_${createId()}`;
const generateRawId = () => `raw_${createId()}`;

// Usage
const carrierId = generateCarrierId();
// Example: "carr_ckm9x7w8k0"

const fieldId = generateFieldId();
// Example: "fld_ckm9x7wdx1"
```

---

## ID Conventions by Entity Type

### Carrier IDs

**Pattern**: `carr_{cuid2}`
**Example**: `"carr_ckm9x7w8k0"`

```typescript
const carrierId = `carr_${createId()}`;
```

**Usage**:
```json
{
  "_id": "carr_ckm9x7w8k0",
  "name": "GEICO",
  "operatesIn": {...}
}
```

### Discount IDs

**Pattern**: `disc_{cuid2}`
**Example**: `"disc_ckm9x7wdx1"`

```typescript
const discountId = `disc_${createId()}`;
```

**Usage**:
```json
{
  "_id": "disc_ckm9x7wdx1",
  "name": "Multi-Policy Bundle",
  "percentage": 15
}
```

### Field IDs

**Pattern**: `fld_{cuid2}`
**Example**: `"fld_ckm9x7whp2"`

```typescript
const fieldId = `fld_${createId()}`;
```

**Usage**:
```json
{
  "_id": "fld_ckm9x7whp2",
  "value": 15,
  "_sources": [...]
}
```

### Conflict IDs

**Pattern**: `conf_{cuid2}`
**Example**: `"conf_ckm9x7wkm3"`

```typescript
const conflictId = `conf_${createId()}`;
```

**Usage**:
```json
{
  "id": "conf_ckm9x7wkm3",
  "dataPoint": "geico_multi_policy_discount_percentage",
  "sources": [...]
}
```

### Raw Data IDs

**Pattern**: `raw_{cuid2}`
**Example**: `"raw_ckm9x7wnp4"`

```typescript
const rawId = `raw_${createId()}`;
```

**Usage**:
```json
{
  "id": "raw_ckm9x7wnp4",
  "dataPoint": "geico_multi_policy_discount_percentage",
  "rawValue": "up to 15%",
  "source": {...}
}
```

### Source IDs

**Pattern**: `src_{cuid2}`
**Example**: `"src_ckm9x7wqr5"`

```typescript
const sourceId = `src_${createId()}`;
```

**Usage**:
```json
{
  "sources": {
    "src_ckm9x7wqr5": {
      "uri": "https://www.geico.com/auto/discounts/",
      "elementRef": "div.discount-card",
      "accessedDate": "2025-11-05"
    }
  }
}
```

### State IDs

**Pattern**: `state_{cuid2}`
**Example**: `"state_ckm9x7wtu6"`

```typescript
const stateId = `state_${createId()}`;
```

**Usage**:
```json
{
  "_id": "state_ckm9x7wtu6",
  "code": "CA",
  "name": "California"
}
```

### Eligibility IDs

**Pattern**: `elig_{cuid2}`
**Example**: `"elig_ckm9x7wwx7"`

```typescript
const eligibilityId = `elig_${createId()}`;
```

**Usage**:
```json
{
  "_id": "elig_ckm9x7wwx7",
  "auto": {
    "minAge": 16,
    "maxVehicles": 4
  }
}
```

---

## Complete ID Prefix Reference

| Entity Type | Prefix | Example | Generator Function |
|-------------|--------|---------|-------------------|
| Carrier | `carr_` | `carr_ckm9x7w8k0` | `generateCarrierId()` |
| Discount | `disc_` | `disc_ckm9x7wdx1` | `generateDiscountId()` |
| Field | `fld_` | `fld_ckm9x7whp2` | `generateFieldId()` |
| Conflict | `conf_` | `conf_ckm9x7wkm3` | `generateConflictId()` |
| Raw Data | `raw_` | `raw_ckm9x7wnp4` | `generateRawId()` |
| Source | `src_` | `src_ckm9x7wqr5` | `generateSourceId()` |
| State | `state_` | `state_ckm9x7wtu6` | `generateStateId()` |
| Eligibility | `elig_` | `elig_ckm9x7wwx7` | `generateEligibilityId()` |
| Product | `prod_` | `prod_ckm9x7wza8` | `generateProductId()` |
| Compliance | `comp_` | `comp_ckm9x7x2c9` | `generateComplianceId()` |

---

## Implementation Examples

### 1. ID Generator Utility Module

**File**: `scripts/utils/id-generator.ts`

```typescript
import { createId } from '@paralleldrive/cuid2';

/**
 * Generate globally unique IDs for knowledge pack entities
 */

export const generateCarrierId = () => `carr_${createId()}`;
export const generateDiscountId = () => `disc_${createId()}`;
export const generateFieldId = () => `fld_${createId()}`;
export const generateConflictId = () => `conf_${createId()}`;
export const generateRawId = () => `raw_${createId()}`;
export const generateSourceId = () => `src_${createId()}`;
export const generateStateId = () => `state_${createId()}`;
export const generateEligibilityId = () => `elig_${createId()}`;
export const generateProductId = () => `prod_${createId()}`;
export const generateComplianceId = () => `comp_${createId()}`;

/**
 * Extract prefix from ID
 */
export function getIdPrefix(id: string): string | null {
  const match = id.match(/^([a-z]+)_/);
  return match ? match[1] : null;
}

/**
 * Validate ID format
 */
export function isValidId(id: string): boolean {
  // Pattern: {prefix}_{10-char-cuid2}
  return /^[a-z]+_[a-z0-9]{10}$/.test(id);
}

/**
 * Get entity type from ID
 */
export function getEntityType(id: string): string | null {
  const prefix = getIdPrefix(id);
  const prefixMap: Record<string, string> = {
    carr: 'carrier',
    disc: 'discount',
    fld: 'field',
    conf: 'conflict',
    raw: 'raw_data',
    src: 'source',
    state: 'state',
    elig: 'eligibility',
    prod: 'product',
    comp: 'compliance'
  };
  return prefix ? prefixMap[prefix] || null : null;
}
```

### 2. Using ID Generators in Scraping Script

**File**: `scripts/01-scrape-carriers.ts`

```typescript
import { generateRawId, generateSourceId } from './utils/id-generator';

// Scrape GEICO discount data
const rawDataEntry = {
  id: generateRawId(),              // "raw_ckm9x7wnp4"
  dataPoint: "geico_multi_policy_discount_percentage",
  rawValue: "Save up to 15%",
  normalizedValue: 15,
  source: {
    id: generateSourceId(),          // "src_ckm9x7wqr5"
    uri: "https://www.geico.com/auto/discounts/",
    elementRef: "div.discount-card > p.percentage",
    accessedDate: "2025-11-05T10:30:00Z",
    extractionMethod: "manual",
    confidence: "high"
  }
};

// Save to raw file
await saveRawData('geico/discounts_auto.raw.json', rawDataEntry);
```

### 3. Using ID Generators in Clean Data Assembly

**File**: `scripts/08-assemble-kb.ts`

```typescript
import {
  generateCarrierId,
  generateDiscountId,
  generateFieldId
} from './utils/id-generator';

// Assemble GEICO carrier data
const geicoData = {
  meta: {
    schemaVersion: "1.0",
    generatedDate: new Date().toISOString()
  },
  carrier: {
    _id: generateCarrierId(),        // "carr_ckm9x7w8k0"
    name: "GEICO",
    discounts: [
      {
        _id: generateDiscountId(),   // "disc_ckm9x7wdx1"
        name: {
          _id: generateFieldId(),    // "fld_ckm9x7whp2"
          value: "Multi-Policy Bundle",
          _sources: [...]
        },
        percentage: {
          _id: generateFieldId(),    // "fld_ckm9x7wkm3"
          value: 15,
          _sources: [...]
        }
      }
    ]
  }
};

// Save to production file
await saveCarrierData('carriers/geico.json', geicoData);
```

---

## Validation Rules

### ID Format Validation

```typescript
function validateId(id: string, expectedPrefix?: string): boolean {
  // Check basic format: prefix_10chars
  if (!/^[a-z]+_[a-z0-9]{10}$/.test(id)) {
    return false;
  }

  // Check expected prefix if provided
  if (expectedPrefix) {
    const prefix = id.split('_')[0];
    if (prefix !== expectedPrefix) {
      return false;
    }
  }

  return true;
}

// Examples
validateId("carr_ckm9x7w8k0");                    // true
validateId("carr_ckm9x7w8k0", "carr");             // true
validateId("invalid");                             // false
validateId("carr_short");                          // false
validateId("carr_ckm9x7w8k0", "disc");             // false
```

### Uniqueness Validation

```typescript
function ensureUnique(ids: string[]): boolean {
  const uniqueIds = new Set(ids);
  return uniqueIds.size === ids.length;
}

// Example
const allIds = [
  "carr_ckm9x7w8k0",
  "disc_ckm9x7wdx1",
  "fld_ckm9x7whp2"
];

ensureUnique(allIds);  // true

// With duplicate
const duplicatedIds = [
  "carr_ckm9x7w8k0",
  "carr_ckm9x7w8k0"   // Duplicate!
];

ensureUnique(duplicatedIds);  // false
```

### Cross-Reference Validation

```typescript
function validateCrossReference(
  id: string,
  knownIds: Set<string>
): boolean {
  return knownIds.has(id);
}

// Example
const knownIds = new Set([
  "carr_ckm9x7w8k0",
  "fld_ckm9x7whp2"
]);

// Validate inheritance reference
const field = {
  _id: "fld_ckm9x7wkm3",
  _sources: [],
  _inheritedFrom: "fld_ckm9x7whp2"
};

validateCrossReference(field._inheritedFrom, knownIds);  // true
```

---

## Audit Trail Integration

### Tracking ID Generation

```typescript
interface IdGenerationLog {
  id: string;
  prefix: string;
  entityType: string;
  generatedAt: string;
  generatedBy: string;  // script name or user
}

const idLog: IdGenerationLog[] = [];

function logIdGeneration(id: string, context: string): void {
  const prefix = getIdPrefix(id);
  const entityType = getEntityType(id);

  idLog.push({
    id,
    prefix: prefix || 'unknown',
    entityType: entityType || 'unknown',
    generatedAt: new Date().toISOString(),
    generatedBy: context
  });
}

// Usage
const carrierId = generateCarrierId();
logIdGeneration(carrierId, 'scrape-carriers.ts');
```

### ID Lineage in Audit Trail

```json
{
  "dataPoint": "fld_ckm9x7whp2",
  "lineage": [
    {
      "step": 1,
      "phase": "raw_scraping",
      "id": "raw_ckm9x7wnp4",
      "action": "Generated raw data entry",
      "timestamp": "2025-11-05T10:30:00Z"
    },
    {
      "step": 2,
      "phase": "clean_data",
      "id": "fld_ckm9x7whp2",
      "action": "Created field with metadata",
      "timestamp": "2025-11-05T16:00:00Z"
    }
  ]
}
```

---

## Migration from Sequential IDs

If existing data uses sequential IDs (e.g., `field-001`), migrate as follows:

### Migration Script

```typescript
import { createId } from '@paralleldrive/cuid2';
import { generateFieldId } from './utils/id-generator';

interface MigrationMapping {
  oldId: string;
  newId: string;
}

const idMappings: MigrationMapping[] = [];

function migrateId(oldId: string): string {
  // Check if already migrated
  const existing = idMappings.find(m => m.oldId === oldId);
  if (existing) {
    return existing.newId;
  }

  // Extract prefix from old ID
  const prefixMatch = oldId.match(/^([a-z]+)-/);
  const prefix = prefixMatch ? prefixMatch[1] : 'fld';

  // Generate new ID with appropriate prefix
  const newId = `${prefix}_${createId()}`;

  // Store mapping
  idMappings.push({ oldId, newId });

  return newId;
}

// Usage
const oldIds = ["field-001", "field-002", "carrier-geico-001"];
const newIds = oldIds.map(migrateId);

// Save mapping for reference
await saveMigrationMapping('id-migration.json', idMappings);
```

---

## Best Practices

### ✅ DO

1. **Always use generator functions** for consistency
2. **Validate IDs** before using in cross-references
3. **Log ID generation** for audit trail
4. **Use descriptive prefixes** (4-6 chars)
5. **Store mappings** when migrating old IDs
6. **Include IDs in all entities** (carriers, fields, sources, conflicts)

### ❌ DON'T

1. **Don't hard-code IDs** in JSON files
2. **Don't reuse IDs** across different entity types
3. **Don't create custom ID formats** outside this system
4. **Don't use sequential numbers** (defeats global uniqueness)
5. **Don't skip ID validation** in production code
6. **Don't omit prefixes** (makes debugging harder)

---

## Summary

### Key Points

✅ **Use cuid2** for all entity IDs (10-char alphanumeric)  
✅ **Add prefixes** to indicate entity type (`carr_`, `disc_`, `fld_`, etc.)  
✅ **Generate via utility functions** for consistency  
✅ **Validate format** before using in cross-references  
✅ **Track in audit trail** for complete lineage  
✅ **Never hard-code** IDs in static files

### Installation

```bash
bun add @paralleldrive/cuid2
```

### Quick Reference

```typescript
import { createId } from '@paralleldrive/cuid2';

// Generate IDs
const id = createId();                        // "ckm9x7w8k0"
const carrierId = `carr_${createId()}`;      // "carr_ckm9x7w8k0"
const fieldId = `fld_${createId()}`;         // "fld_ckm9x7whp2"

// Validate
const isValid = /^[a-z]+_[a-z0-9]{10}$/.test(id);  // true/false
```

---

**See Also:**
- 📖 [Schemas Using IDs](knowledge-pack-schemas.md#field-metadata-envelope) - How IDs appear in data structures
- 🔗 [Phase 2 Agent Workflow](phase-2-agent-instructions.md#step-2-generate-unique-ids) - ID generation in practice
- 📊 [Complete Examples](knowledge-pack-examples.md) - See IDs used in real data transformations
- 🛠️ [Methodology Phase 1](knowledge-pack-methodology.md#phase-1-enhanced-json-schema-design) - When IDs are designed

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Status**: Ready for Implementation
