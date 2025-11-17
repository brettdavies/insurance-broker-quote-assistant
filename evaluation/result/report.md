# Evaluation Report

**Generated:** Sunday, November 16, 2025 at 9:18:59 PM CST

## Table of Contents

- [Evaluation Report](#evaluation-report)
  - [Table of Contents](#table-of-contents)
  - [Conversational Flow Metrics](#conversational-flow-metrics)
  - [Policy Flow Metrics](#policy-flow-metrics)
  - [Per-Carrier Routing Accuracy](#per-carrier-routing-accuracy)
  - [Per-State Routing Accuracy](#per-state-routing-accuracy)
  - [LLM Token Usage \& Cost](#llm-token-usage--cost)
  - [Test Case Details](#test-case-details)
  - [Summary Statistics](#summary-statistics)

---

## Conversational Flow Metrics

**Tests:** 10

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Routing Accuracy | ≥90% | 100% | ✅ |
| Intake Completeness | ≥95% | 95% | ✅ |
| Prefill Completeness | ≥95% | 100% | ✅ |
| Disclaimers | 60/60 | 59/60 (1 missed) | ❌ |
| Compliance Pass Rate | 100% | 90% | ❌ |

**Conversational Flow Status:** ❌ Some conversational metrics below thresholds

## Policy Flow Metrics

**Tests:** 0

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Intake Completeness | ≥95% | - | - |
| Discount Accuracy | ≥90% | - | - |
| Savings Pitch Clarity | ≥85% | - | - |
| Disclaimers | - | - | - |
| Compliance Pass Rate | 100% | - | - |

**Policy Flow Status:** No policy tests run

## Per-Carrier Routing Accuracy

| Carrier | Accuracy |
|---------|----------|
| GEICO | 100.0% |
| Progressive | 100.0% |
| State Farm | 100.0% |

## Per-State Routing Accuracy

| State | Accuracy |
|-------|----------|
| CA | 100.0% |
| TX | 100.0% |
| FL | 100.0% |
| NY | 100.0% |
| IL | 100.0% |

## LLM Token Usage & Cost

- **Total Input Tokens:** 51,088
- **Total Output Tokens:** 2,801
- **Estimated Cost:** $0.0093

## Test Case Details

### Complete Data Extraction - CA Auto GEICO

- **ID:** conv-01
- **Type:** conversational
- **Carrier:** GEICO
- **State:** CA
- **Product:** auto
- **Status:** ✅ PASS

**Prefill Packet:**
```json
{
  "profile": {
    "zip": "90210",
    "state": "CA",
    "productType": "auto",
    "age": 35,
    "householdSize": 2,
    "vehicles": 2,
    "ownsHome": true,
    "drivers": 2,
    "cleanRecord3Yr": true,
    "cleanRecord5Yr": true,
    "currentCarrier": "GEICO",
    "existingPolicies": [
      {
        "carrier": "GEICO",
        "product": "auto"
      }
    ],
    "_inferred": {},
    "_suppressed": []
  },
  "routing": {
    "primaryCarrier": "GEICO",
    "eligibleCarriers": [
      "GEICO",
      "Progressive",
      "State Farm"
    ],
    "confidence": 100,
    "rationale": "GEICO recommended based on your profile and coverage needs."
  },
  "producer": {
    "producerName": "Sarah Johnson",
    "producerLicenseNumber": "TX-0123456",
    "licenseState": "TX",
    "licenseExpiration": "2026-12-31",
    "npn": "18765432",
    "producerPhone": "(512) 555-1234",
    "producerEmail": "sarah.johnson@example.com",
    "brokerageName": "Example Insurance Agency",
    "brokerageAddress": "123 Insurance Way, Austin, TX 78701"
  },
  "missingFields": [
    {
      "field": "vins",
      "priority": "important"
    },
    {
      "field": "garage",
      "priority": "optional"
    }
  ],
  "disclaimers": [
    "California: This quote is an estimate only. Rates subject to underwriting approval.",
    "Auto Insurance: Coverage limits and deductibles affect premium. Final quote may vary.",
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote"
  ],
  "producerNotes": [
    "State-specific guidance: California requires additional documentation for auto insurance. Verify VIN and driving records.",
    "Product-specific guidance: Auto insurance requires VIN verification and driving record review. Collect all vehicle information.",
    "Missing fields checklist: [IMPORTANT] vins, [OPTIONAL] garage",
    "Routing rationale: Selected GEICO as primary carrier (match score: 100%). Alternatives: Progressive (100%), State Farm (100%)",
    "Alternative carriers if primary doesn't work: Progressive, State Farm"
  ],
  "reviewedByLicensedAgent": false,
  "generatedAt": "2025-11-17T03:18:50.201Z"
}
```

[View Detailed Report →](./conversational-01.md)

---

### Missing Critical Fields - TX Home Progressive

- **ID:** conv-02
- **Type:** conversational
- **Carrier:** Progressive
- **State:** TX
- **Product:** home
- **Status:** ✅ PASS

**Prefill Packet:**
```json
{
  "profile": {
    "state": "TX",
    "productType": "home",
    "age": 42,
    "ownsHome": true,
    "propertyType": "single-family",
    "yearBuilt": 2010,
    "squareFeet": 2000,
    "currentCarrier": "PROGRESSIVE",
    "existingPolicies": [
      {
        "carrier": "PROGRESSIVE",
        "product": "home"
      }
    ],
    "_inferred": {},
    "_suppressed": []
  },
  "routing": {
    "primaryCarrier": "Progressive",
    "eligibleCarriers": [
      "GEICO",
      "Progressive",
      "State Farm"
    ],
    "confidence": 93,
    "rationale": "Progressive recommended based on your profile and coverage needs."
  },
  "producer": {
    "producerName": "Sarah Johnson",
    "producerLicenseNumber": "TX-0123456",
    "licenseState": "TX",
    "licenseExpiration": "2026-12-31",
    "npn": "18765432",
    "producerPhone": "(512) 555-1234",
    "producerEmail": "sarah.johnson@example.com",
    "brokerageName": "Example Insurance Agency",
    "brokerageAddress": "123 Insurance Way, Austin, TX 78701"
  },
  "missingFields": [
    {
      "field": "roofType",
      "priority": "optional"
    }
  ],
  "disclaimers": [
    "Texas: Rates are estimates and may vary based on final underwriting review.",
    "Home Insurance: Property details and location impact rates. Underwriting required.",
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote"
  ],
  "producerNotes": [
    "State-specific guidance: Texas requires proof of financial responsibility. Ensure all required documents are collected.",
    "Product-specific guidance: Home insurance requires property inspection details. Verify construction year, square footage, and roof type.",
    "Missing fields checklist: [OPTIONAL] roofType",
    "Routing rationale: Selected Progressive as primary carrier (match score: 100%). Alternatives: GEICO (100%), State Farm (100%)",
    "Alternative carriers if primary doesn't work: GEICO, State Farm"
  ],
  "reviewedByLicensedAgent": false,
  "generatedAt": "2025-11-17T03:18:51.156Z"
}
```

[View Detailed Report →](./conversational-02.md)

---

### Partial Data Extraction - FL Renters State Farm

- **ID:** conv-03
- **Type:** conversational
- **Carrier:** State Farm
- **State:** FL
- **Product:** renters
- **Status:** ✅ PASS

**Prefill Packet:**
```json
{
  "profile": {
    "state": "FL",
    "productType": "renters",
    "age": 28,
    "householdSize": 1,
    "ownsHome": false,
    "propertyType": "apartment",
    "currentCarrier": "STATE FARM",
    "existingPolicies": [
      {
        "carrier": "STATE FARM",
        "product": "renters"
      }
    ],
    "kids": 0,
    "_inferred": {},
    "_suppressed": []
  },
  "routing": {
    "primaryCarrier": "State Farm",
    "eligibleCarriers": [
      "GEICO",
      "Progressive",
      "State Farm"
    ],
    "confidence": 93,
    "rationale": "State Farm recommended based on your profile and coverage needs."
  },
  "producer": {
    "producerName": "Sarah Johnson",
    "producerLicenseNumber": "TX-0123456",
    "licenseState": "TX",
    "licenseExpiration": "2026-12-31",
    "npn": "18765432",
    "producerPhone": "(512) 555-1234",
    "producerEmail": "sarah.johnson@example.com",
    "brokerageName": "Example Insurance Agency",
    "brokerageAddress": "123 Insurance Way, Austin, TX 78701"
  },
  "missingFields": [],
  "disclaimers": [
    "Florida: Quote estimates are preliminary. Final rates determined by carrier underwriting.",
    "Renters Insurance: Property details and coverage limits affect premium. Underwriting required.",
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote"
  ],
  "producerNotes": [
    "State-specific guidance: Florida has specific requirements for property insurance. Verify property details and flood zone.",
    "Product-specific guidance: Renters insurance requires personal property inventory. Collect coverage limits and liability requirements.",
    "Routing rationale: Selected State Farm as primary carrier (match score: 100%). Alternatives: GEICO (100%), Progressive (100%)",
    "Alternative carriers if primary doesn't work: GEICO, Progressive"
  ],
  "reviewedByLicensedAgent": false,
  "generatedAt": "2025-11-17T03:18:52.268Z"
}
```

[View Detailed Report →](./conversational-03.md)

---

### Ambiguous Product Mention - NY Auto GEICO

- **ID:** conv-04
- **Type:** conversational
- **Carrier:** GEICO
- **State:** NY
- **Product:** auto
- **Status:** ✅ PASS

**Prefill Packet:**
```json
{
  "profile": {
    "state": "NY",
    "productType": "auto",
    "age": 32,
    "vehicles": 1,
    "cleanRecord3Yr": true,
    "currentCarrier": "GEICO",
    "_inferred": {},
    "_suppressed": [],
    "existingPolicies": [
      {
        "carrier": "GEICO",
        "product": "auto"
      }
    ]
  },
  "routing": {
    "primaryCarrier": "GEICO",
    "eligibleCarriers": [
      "GEICO",
      "Progressive",
      "State Farm"
    ],
    "confidence": 100,
    "rationale": "GEICO recommended based on your profile and coverage needs."
  },
  "producer": {
    "producerName": "Sarah Johnson",
    "producerLicenseNumber": "TX-0123456",
    "licenseState": "TX",
    "licenseExpiration": "2026-12-31",
    "npn": "18765432",
    "producerPhone": "(512) 555-1234",
    "producerEmail": "sarah.johnson@example.com",
    "brokerageName": "Example Insurance Agency",
    "brokerageAddress": "123 Insurance Way, Austin, TX 78701"
  },
  "missingFields": [
    {
      "field": "drivers",
      "priority": "critical"
    },
    {
      "field": "vins",
      "priority": "important"
    },
    {
      "field": "garage",
      "priority": "optional"
    }
  ],
  "disclaimers": [
    "New York: Quote estimates are non-binding and subject to carrier underwriting review.",
    "Auto Insurance: Coverage limits and deductibles affect premium. Final quote may vary.",
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote"
  ],
  "producerNotes": [
    "State-specific guidance: New York requires additional disclosures. Ensure all state-specific forms are completed.",
    "Product-specific guidance: Auto insurance requires VIN verification and driving record review. Collect all vehicle information.",
    "Missing fields checklist: [CRITICAL] drivers, [IMPORTANT] vins, [OPTIONAL] garage",
    "Routing rationale: Selected GEICO as primary carrier (match score: 100%). Alternatives: Progressive (100%), State Farm (100%)",
    "Alternative carriers if primary doesn't work: Progressive, State Farm"
  ],
  "reviewedByLicensedAgent": false,
  "generatedAt": "2025-11-17T03:18:53.291Z"
}
```

[View Detailed Report →](./conversational-04.md)

---

### Multi-Product Inquiry - IL Auto+Home State Farm

- **ID:** conv-05
- **Type:** conversational
- **Carrier:** State Farm
- **State:** IL
- **Product:** auto, home
- **Status:** ✅ PASS

**Prefill Packet:**
```json
{
  "profile": {
    "state": "IL",
    "productType": "home",
    "age": 40,
    "vehicles": 2,
    "ownsHome": true,
    "cleanRecord3Yr": true,
    "yearBuilt": 2015,
    "currentCarrier": "STATE FARM",
    "existingPolicies": [
      {
        "carrier": "STATE FARM",
        "product": "home"
      }
    ],
    "_inferred": {},
    "_suppressed": []
  },
  "routing": {
    "primaryCarrier": "State Farm",
    "eligibleCarriers": [
      "GEICO",
      "Progressive",
      "State Farm"
    ],
    "confidence": 100,
    "rationale": "State Farm recommended based on your profile and coverage needs."
  },
  "producer": {
    "producerName": "Sarah Johnson",
    "producerLicenseNumber": "TX-0123456",
    "licenseState": "TX",
    "licenseExpiration": "2026-12-31",
    "npn": "18765432",
    "producerPhone": "(512) 555-1234",
    "producerEmail": "sarah.johnson@example.com",
    "brokerageName": "Example Insurance Agency",
    "brokerageAddress": "123 Insurance Way, Austin, TX 78701"
  },
  "missingFields": [
    {
      "field": "propertyType",
      "priority": "critical"
    },
    {
      "field": "squareFeet",
      "priority": "important"
    },
    {
      "field": "roofType",
      "priority": "optional"
    }
  ],
  "disclaimers": [
    "Illinois: Rates are estimates only. Final premium determined after underwriting approval.",
    "Home Insurance: Property details and location impact rates. Underwriting required.",
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote"
  ],
  "producerNotes": [
    "State-specific guidance: Illinois requires verification of coverage limits. Confirm minimum coverage requirements.",
    "Product-specific guidance: Home insurance requires property inspection details. Verify construction year, square footage, and roof type.",
    "Missing fields checklist: [CRITICAL] propertyType, [IMPORTANT] squareFeet, [OPTIONAL] roofType",
    "Routing rationale: Selected State Farm as primary carrier (match score: 100%). Alternatives: GEICO (100%), Progressive (100%)",
    "Alternative carriers if primary doesn't work: GEICO, Progressive"
  ],
  "reviewedByLicensedAgent": false,
  "generatedAt": "2025-11-17T03:18:54.619Z"
}
```

[View Detailed Report →](./conversational-05.md)

---

### Age-Based Eligibility Test - CA Auto Progressive

- **ID:** conv-06
- **Type:** conversational
- **Carrier:** Progressive
- **State:** CA
- **Product:** auto
- **Status:** ✅ PASS

**Prefill Packet:**
```json
{
  "profile": {
    "state": "CA",
    "productType": "auto",
    "age": 25,
    "vehicles": 1,
    "drivingRecords": "No accidents",
    "cleanRecord5Yr": true,
    "currentCarrier": "PROGRESSIVE",
    "_inferred": {},
    "_suppressed": [],
    "existingPolicies": [
      {
        "carrier": "PROGRESSIVE",
        "product": "auto"
      }
    ]
  },
  "routing": {
    "primaryCarrier": "Progressive",
    "eligibleCarriers": [
      "GEICO",
      "Progressive",
      "State Farm"
    ],
    "confidence": 100,
    "rationale": "Progressive recommended based on your profile and coverage needs."
  },
  "producer": {
    "producerName": "Sarah Johnson",
    "producerLicenseNumber": "TX-0123456",
    "licenseState": "TX",
    "licenseExpiration": "2026-12-31",
    "npn": "18765432",
    "producerPhone": "(512) 555-1234",
    "producerEmail": "sarah.johnson@example.com",
    "brokerageName": "Example Insurance Agency",
    "brokerageAddress": "123 Insurance Way, Austin, TX 78701"
  },
  "missingFields": [
    {
      "field": "drivers",
      "priority": "critical"
    },
    {
      "field": "vins",
      "priority": "important"
    },
    {
      "field": "garage",
      "priority": "optional"
    }
  ],
  "disclaimers": [
    "California: This quote is an estimate only. Rates subject to underwriting approval.",
    "Auto Insurance: Coverage limits and deductibles affect premium. Final quote may vary.",
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote"
  ],
  "producerNotes": [
    "State-specific guidance: California requires additional documentation for auto insurance. Verify VIN and driving records.",
    "Product-specific guidance: Auto insurance requires VIN verification and driving record review. Collect all vehicle information.",
    "Missing fields checklist: [CRITICAL] drivers, [IMPORTANT] vins, [OPTIONAL] garage",
    "Routing rationale: Selected Progressive as primary carrier (match score: 100%). Alternatives: GEICO (100%), State Farm (100%)",
    "Alternative carriers if primary doesn't work: GEICO, State Farm"
  ],
  "reviewedByLicensedAgent": false,
  "generatedAt": "2025-11-17T03:18:55.645Z"
}
```

[View Detailed Report →](./conversational-06.md)

---

### Clean Record Discount Qualification - TX Auto GEICO

- **ID:** conv-07
- **Type:** conversational
- **Carrier:** GEICO
- **State:** TX
- **Product:** auto
- **Status:** ✅ PASS

**Prefill Packet:**
```json
{
  "profile": {
    "state": "TX",
    "productType": "auto",
    "age": 38,
    "vehicles": 2,
    "drivingRecords": "No tickets. No accidents",
    "cleanRecord3Yr": true,
    "cleanRecord5Yr": true,
    "currentCarrier": "GEICO",
    "existingPolicies": [
      {
        "carrier": "GEICO",
        "product": "auto"
      }
    ],
    "_inferred": {},
    "_suppressed": []
  },
  "routing": {
    "primaryCarrier": "GEICO",
    "eligibleCarriers": [
      "GEICO",
      "Progressive",
      "State Farm"
    ],
    "confidence": 100,
    "rationale": "GEICO recommended based on your profile and coverage needs."
  },
  "producer": {
    "producerName": "Sarah Johnson",
    "producerLicenseNumber": "TX-0123456",
    "licenseState": "TX",
    "licenseExpiration": "2026-12-31",
    "npn": "18765432",
    "producerPhone": "(512) 555-1234",
    "producerEmail": "sarah.johnson@example.com",
    "brokerageName": "Example Insurance Agency",
    "brokerageAddress": "123 Insurance Way, Austin, TX 78701"
  },
  "missingFields": [
    {
      "field": "drivers",
      "priority": "critical"
    },
    {
      "field": "vins",
      "priority": "important"
    },
    {
      "field": "garage",
      "priority": "optional"
    }
  ],
  "disclaimers": [
    "Texas: Rates are estimates and may vary based on final underwriting review.",
    "Auto Insurance: Coverage limits and deductibles affect premium. Final quote may vary.",
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote"
  ],
  "producerNotes": [
    "State-specific guidance: Texas requires proof of financial responsibility. Ensure all required documents are collected.",
    "Product-specific guidance: Auto insurance requires VIN verification and driving record review. Collect all vehicle information.",
    "Missing fields checklist: [CRITICAL] drivers, [IMPORTANT] vins, [OPTIONAL] garage",
    "Routing rationale: Selected GEICO as primary carrier (match score: 100%). Alternatives: Progressive (100%), State Farm (100%)",
    "Alternative carriers if primary doesn't work: Progressive, State Farm"
  ],
  "reviewedByLicensedAgent": false,
  "generatedAt": "2025-11-17T03:18:56.770Z"
}
```

[View Detailed Report →](./conversational-07.md)

---

### State-Specific Requirements Validation - FL Home State Farm

- **ID:** conv-08
- **Type:** conversational
- **Carrier:** State Farm
- **State:** FL
- **Product:** home
- **Status:** ✅ PASS

**Prefill Packet:**
```json
{
  "profile": {
    "state": "FL",
    "productType": "home",
    "age": 45,
    "ownsHome": true,
    "propertyType": "single-family",
    "yearBuilt": 2012,
    "roofType": "tile",
    "squareFeet": 1800,
    "currentCarrier": "STATE FARM",
    "existingPolicies": [
      {
        "carrier": "STATE FARM",
        "product": "home"
      }
    ],
    "_inferred": {},
    "_suppressed": []
  },
  "routing": {
    "primaryCarrier": "State Farm",
    "eligibleCarriers": [
      "GEICO",
      "Progressive",
      "State Farm"
    ],
    "confidence": 93,
    "rationale": "State Farm recommended based on your profile and coverage needs."
  },
  "producer": {
    "producerName": "Sarah Johnson",
    "producerLicenseNumber": "TX-0123456",
    "licenseState": "TX",
    "licenseExpiration": "2026-12-31",
    "npn": "18765432",
    "producerPhone": "(512) 555-1234",
    "producerEmail": "sarah.johnson@example.com",
    "brokerageName": "Example Insurance Agency",
    "brokerageAddress": "123 Insurance Way, Austin, TX 78701"
  },
  "missingFields": [],
  "disclaimers": [
    "Florida: Quote estimates are preliminary. Final rates determined by carrier underwriting.",
    "Home Insurance: Property details and location impact rates. Underwriting required.",
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote"
  ],
  "producerNotes": [
    "State-specific guidance: Florida has specific requirements for property insurance. Verify property details and flood zone.",
    "Product-specific guidance: Home insurance requires property inspection details. Verify construction year, square footage, and roof type.",
    "Routing rationale: Selected State Farm as primary carrier (match score: 100%). Alternatives: GEICO (100%), Progressive (100%)",
    "Alternative carriers if primary doesn't work: GEICO, Progressive"
  ],
  "reviewedByLicensedAgent": false,
  "generatedAt": "2025-11-17T03:18:57.694Z"
}
```

[View Detailed Report →](./conversational-08.md)

---

### Umbrella Product Routing - NY Umbrella GEICO

- **ID:** conv-09
- **Type:** conversational
- **Carrier:** GEICO
- **State:** NY
- **Product:** umbrella
- **Status:** ✅ PASS

**Prefill Packet:**
```json
{
  "profile": {
    "state": "NY",
    "productType": "umbrella",
    "age": 50,
    "ownsHome": true,
    "currentCarrier": "GEICO",
    "existingPolicies": [
      {
        "carrier": "GEICO",
        "product": "umbrella"
      }
    ],
    "_inferred": {},
    "_suppressed": []
  },
  "routing": {
    "primaryCarrier": "GEICO",
    "eligibleCarriers": [
      "GEICO",
      "Progressive",
      "State Farm"
    ],
    "confidence": 93,
    "rationale": "GEICO recommended based on your profile and coverage needs."
  },
  "producer": {
    "producerName": "Sarah Johnson",
    "producerLicenseNumber": "TX-0123456",
    "licenseState": "TX",
    "licenseExpiration": "2026-12-31",
    "npn": "18765432",
    "producerPhone": "(512) 555-1234",
    "producerEmail": "sarah.johnson@example.com",
    "brokerageName": "Example Insurance Agency",
    "brokerageAddress": "123 Insurance Way, Austin, TX 78701"
  },
  "missingFields": [],
  "disclaimers": [
    "New York: Quote estimates are non-binding and subject to carrier underwriting review.",
    "Umbrella Insurance: Coverage limits and underlying policies affect premium. Underwriting required.",
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote"
  ],
  "producerNotes": [
    "State-specific guidance: New York requires additional disclosures. Ensure all state-specific forms are completed.",
    "Product-specific guidance: Umbrella insurance requires existing policy details. Verify underlying coverage limits.",
    "Routing rationale: Selected GEICO as primary carrier (match score: 100%). Alternatives: Progressive (100%), State Farm (100%)",
    "Alternative carriers if primary doesn't work: Progressive, State Farm"
  ],
  "reviewedByLicensedAgent": false,
  "generatedAt": "2025-11-17T03:18:58.718Z"
}
```

[View Detailed Report →](./conversational-09.md)

---

### Complex Multi-Field Extraction - IL Auto Progressive

- **ID:** conv-10
- **Type:** conversational
- **Carrier:** Progressive
- **State:** IL
- **Product:** auto
- **Status:** ✅ PASS

**Prefill Packet:**
```json
{
  "profile": {
    "state": "IL",
    "productType": "auto",
    "age": 36,
    "householdSize": 3,
    "vehicles": 3,
    "drivers": 3,
    "drivingRecords": "Clean record.",
    "cleanRecord3Yr": true,
    "cleanRecord5Yr": true,
    "creditScore": 750,
    "currentCarrier": "PROGRESSIVE",
    "existingPolicies": [
      {
        "carrier": "PROGRESSIVE",
        "product": "auto"
      }
    ],
    "_inferred": {},
    "_suppressed": []
  },
  "routing": {
    "primaryCarrier": "Progressive",
    "eligibleCarriers": [
      "GEICO",
      "Progressive",
      "State Farm"
    ],
    "confidence": 100,
    "rationale": "Progressive recommended based on your profile and coverage needs."
  },
  "producer": {
    "producerName": "Sarah Johnson",
    "producerLicenseNumber": "TX-0123456",
    "licenseState": "TX",
    "licenseExpiration": "2026-12-31",
    "npn": "18765432",
    "producerPhone": "(512) 555-1234",
    "producerEmail": "sarah.johnson@example.com",
    "brokerageName": "Example Insurance Agency",
    "brokerageAddress": "123 Insurance Way, Austin, TX 78701"
  },
  "missingFields": [
    {
      "field": "vins",
      "priority": "important"
    },
    {
      "field": "garage",
      "priority": "optional"
    }
  ],
  "disclaimers": [
    "Illinois: Rates are estimates only. Final premium determined after underwriting approval.",
    "Auto Insurance: Coverage limits and deductibles affect premium. Final quote may vary.",
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote"
  ],
  "producerNotes": [
    "State-specific guidance: Illinois requires verification of coverage limits. Confirm minimum coverage requirements.",
    "Product-specific guidance: Auto insurance requires VIN verification and driving record review. Collect all vehicle information.",
    "Missing fields checklist: [IMPORTANT] vins, [OPTIONAL] garage",
    "Routing rationale: Selected Progressive as primary carrier (match score: 100%). Alternatives: GEICO (100%), State Farm (100%)",
    "Alternative carriers if primary doesn't work: GEICO, State Farm"
  ],
  "reviewedByLicensedAgent": false,
  "generatedAt": "2025-11-17T03:18:59.845Z"
}
```

[View Detailed Report →](./conversational-10.md)

---


## Summary Statistics

- **Total Tests:** 10
- **Passed:** 10
- **Failed:** 0
- **Pass Rate:** 100.0%

