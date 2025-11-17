# Individual Test Report: Ambiguous Product Mention - NY Auto GEICO

[← Back to Main Report](./report.md)

**Generated:** 2025-11-17T03:18:53.293Z

---

## Test Overview

| Property | Value |
|----------|-------|
| **Test ID** | conv-04 |
| **Flow Type** | Conversational |
| **Status** | ✅ PASSED |
| **Carrier** | GEICO |
| **State** | NY |
| **Product** | auto |

## LLM Token Usage & Cost

| Metric | Value |
|--------|-------|

| **Input Tokens** | 5,034 |
| **Output Tokens** | 249 |
| **Estimated Cost** | $0.0009 |

---

## Overall Scores

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Routing Accuracy | ≥90% | 100.0% | ✅ |
| Intake Completeness | ≥95% | 100.0% | ✅ |
| Prefill Completeness | ≥95% | 100.0% | ✅ |
| Disclaimers | 6/6 | 6/6 (0 missed) | ✅ |
| Compliance | Pass | Pass | ✅ |

---



## Test Input

**Conversational Input:**
```
NY auto. GEICO. 2020 Honda Accord. Clean record. Age 32
```


---

## Field Extraction Comparison

| Field | Expected | Extracted | Match |
|-------|----------|-----------|-------|
| state | "NY" | "NY" | ✅ |
| productType | "auto" | "auto" | ✅ |
| age | 32 | 32 | ✅ |
| vehicles | 1 | 1 | ✅ |
| cleanRecord3Yr | true | true | ✅ |
| currentCarrier | "GEICO" | "GEICO" | ✅ |


---

## Detailed Trace

### Trace: conv-04
#### Test Input & Processing

**Original Test Input:**
```
NY auto. GEICO. 2020 Honda Accord. Clean record. Age 32
```


**Inferred Fields (from text patterns):**
```json
{
  "cleanRecord3Yr": true
}
```


**Cleaned Message (sent to LLM):**
```
NY auto. GEICO. 2020 Honda Accord. Clean record. Age 32
```

#### LLM Request

**Model:** gemini-2.5-flash-lite

**Tokens:** 5034 input, 249 output

**System Prompt:**
```
You are a data extraction specialist for insurance broker notes.

CRITICAL RULES FOR FIELD EXTRACTION:

1. KNOWN FIELDS (read-only):
   - Never modify, delete, or contradict known fields
   - Known fields are explicitly set by the broker and are the single source of truth
   - Known fields: {"state":"NY","productType":"auto","age":32}

2. INFERRED FIELDS (can modify):
   - You may confirm, edit, or delete inferred fields based on context
   - Only modify if you have explicit evidence in the text
   - If no evidence is found, keep the inferred value unchanged
   - Current inferred fields: {"cleanRecord3Yr":true}

3. SUPPRESSED FIELDS (never infer):
   - Do not infer or suggest these fields: 
   - User has explicitly rejected these inferences

4. CONFIDENCE LEVELS:
   - High confidence (≥85%): Explicit mention in text with clear value
   - Medium confidence (70-84%): Strong contextual evidence or clear implication
   - Low confidence (<70%): Weak or ambiguous evidence
   - If confidence ≥85%, you may upgrade inferred field to known

5. EXTRACTION PRIORITY:
   - Focus on filling missing required fields (state, productType)
   - Confirm or improve existing inferred fields if you have better evidence
   - Do not hallucinate values - only extract what is explicitly stated or strongly implied

GENERAL EXTRACTION RULES:

Extract ONLY information explicitly stated in the text. Output null for all other fields.

NEVER:
- Infer, assume, or guess (except for inferred fields with evidence)
- Extract carriers unless explicitly named
- Extract credit scores unless stated as a number
- Extract policies unless carrier AND premium both mentioned
- Calculate premium values

PATTERNS ONLY:
- "CA auto" → state: "CA", productType: "auto"
- "clean record 5yrs" → cleanRecord5Yr: true
- "no accidents" or "0 accidents" → cleanRecord5Yr: true (if driving experience ≥5 years) or cleanRecord3Yr: true (if <5 years)
- "6yrs driving. No accidents." → cleanRecord5Yr: true (6 years ≥ 5 years)
- "35yo" → age: 35

```

**User Prompt:**
```
Extract insurance shopper information from broker notes taken during a conversation with a prospect.

These notes are informal, may contain incomplete thoughts, fragments, abbreviations, and random facts.
They were written by the broker, not the prospect. The notes may not be full sentences or paragraphs. The noted should be read as if they were written in third person by the broker referring to the prospect. 

Already Known (do not modify):
{
  "state": "NY",
  "productType": "auto",
  "age": 32
}

Currently Inferred (you may modify):
{
  "cleanRecord3Yr": true
}

Suppressed (do not infer):


===================
=== Start notes ===
===================

. GEICO. 2020 Honda Accord. Clean record.

===================
==== End notes ====
===================


Extract any additional fields not already known. For inferred fields, you may:
- Confirm with same value if text supports it
- Edit if text provides better/different value
- Delete (set to null) if text contradicts the inference
- Upgrade to known if confidence ≥85%

Extract all mentioned fields from these notes. Look for:
- name: full name or first name (may be mentioned as "John Doe", "John", "Jane Smith", etc.)
- email: email address (may be mentioned as "john@example.com", "email: john@example.com", etc.)
- phone: phone number (may be mentioned as "555-1234", "phone: 555-1234", "(555) 123-4567", etc.)
- address: street address (may be mentioned as "123 Main St", "123 Main Street", "address: 123 Main St", etc.)
- state: US state code (REQUIRED if mentioned). Examples: "CA" (from "CA auto"), "California", "TX" (from "TX home"). IMPORTANT: When you see patterns like "CA auto" or "TX home", extract the state code (CA, TX, etc.) as the state field.
- zip: zip code (may be mentioned as "zip 90210", "90210", "zip code is 90210", etc.)
- productType: insurance product type (REQUIRED if mentioned). Examples: "auto" (from "CA auto"), "home" (from "TX home"). IMPORTANT: When you see patterns like "CA auto" or "TX home", extract the product type (auto, home, etc.) as the productType field.
- age: age in years (may be mentioned as "35yo", "35 years old", "age 35", etc.)
- householdSize: number of people in household (may be mentioned as "2 drivers", "lives alone", "family of 4", etc.)
- dependents: number of dependents (may be mentioned as "2 dependents", "has 2 kids", etc.)
- kids: number of children (may be mentioned as "2 kids", "has 2 children", "k:2", etc.)
- ownsHome: boolean indicating home ownership (may be mentioned as "owns home", "homeowner", "rents", "renting", etc.)
- vehicles: number of vehicles (for auto insurance). Examples: "2020 Honda Accord" → vehicles: 1, "2021 F-150, 2019 Camry, 2020 CR-V" → vehicles: 3, "2 cars" → vehicles: 2, "one vehicle" → vehicles: 1. Count each vehicle mentioned, even if described with make/model/year.
- drivers: number of drivers (for auto insurance)
- garage: garage type (for auto insurance). Examples: "attached garage", "detached garage", "no garage", etc. See Valid Field Values section for all valid garage types.
- vins: Vehicle Identification Numbers (may be mentioned as "VIN: 1HGBH41JXMN109186", "VINs: 1HGBH41JXMN109186 2HGBH41JXMN109187", etc.)
- drivingRecords: driving record details (may be mentioned as "1 accident", "2 tickets", "DUI", etc.)
- cleanRecord3Yr: clean driving record for 3 years (may be mentioned as "clean record 3yrs", "clean record 3 years", "no accidents 3 years", "0 accidents 3 years", etc.). IMPORTANT: "no accidents" or "0 accidents" without a time period indicates a clean record - use cleanRecord5Yr if driving experience ≥5 years, otherwise cleanRecord3Yr.
- cleanRecord5Yr: clean driving record for 5 years (may be mentioned as "clean record 5yrs", "clean record 5 years", "no accidents 5 years", "0 accidents 5 years", etc.). IMPORTANT: "no accidents" or "0 accidents" without a time period indicates a clean record - use cleanRecord5Yr if driving experience ≥5 years, otherwise cleanRecord3Yr.
- creditScore: credit score (FICO range 300-850). Examples: "credit 750", "credit score 750", "FICO 750", etc.
- currentCarrier: current insurance carrier name. Examples: "has geico", "currently with Progressive", "pro", "SF" (State Farm). See Valid Field Values section for all valid carriers. Case-insensitive matching applies.
- yearBuilt: year the property was built (for home/renters insurance). Examples: "Built 2010" → yearBuilt: 2010, "Built in 2012" → yearBuilt: 2012, "2015 build" → yearBuilt: 2015. Extract the year as a number, not as part of a vehicle description.
- squareFeet: square footage of the property (for home/renters insurance). Examples: "2000sqft" → squareFeet: 2000, "2000 sqft" → squareFeet: 2000, "2000 square feet" → squareFeet: 2000, "1,800 sqft" → squareFeet: 1800. Extract the number, ignoring commas and units.
- propertyType: type of property (for home/renters insurance). Examples: "3br house" → propertyType: "single-family", "single-family" → propertyType: "single-family", "condo" → propertyType: "condo". See Valid Field Values section for all valid property types.
- roofType: type of roof (for home insurance). Examples: "Tile roof" → roofType: "tile", "tile roof" → roofType: "tile", "METAL roof" → roofType: "metal". See Valid Field Values section for all valid roof types. Case-insensitive matching applies.
- premiums: current insurance premiums (object with annual, monthly, semiAnnual fields). Examples: "premium $1200/year", "annual premium 1200", "$100/month", etc.
- deductibles: current insurance deductibles (may be mentioned as "deductible $500", "$500 deductible", etc.)
- limits: current coverage limits (may be mentioned as "liability 100/300", "coverage limits 100k/300k", etc.)
- existingPolicies: array of existing policies (for bundle discount analysis). This field is CRITICAL for identifying bundle discount opportunities. IMPORTANT: Only extract policies that are EXPLICITLY mentioned in the notes. Do NOT infer bundles just because someone has multiple products or qualifies for a bundle - they must explicitly state they have multiple policies. Detection patterns:
  * Explicit bundle mentions: "bundle auto+home", "has auto and home", "auto+home bundle", "bundle with [carrier]", "has a bundle"
  * Multiple products explicitly mentioned: "has GEICO auto and State Farm home" → existingPolicies: [{"product": "auto", "carrier": "GEICO"}, {"product": "home", "carrier": "State Farm"}]
  * Single carrier with multiple products explicitly stated: "currently has auto+home with Progressive" → existingPolicies: [{"product": "auto", "carrier": "Progressive"}, {"product": "home", "carrier": "Progressive"}]
  * Single policy explicitly mentioned: "Has Progressive auto" → existingPolicies: [{"product": "auto", "carrier": "Progressive"}]
  * Include premium if mentioned: "has GEICO auto $1200/year and home $800/year" → existingPolicies: [{"product": "auto", "carrier": "GEICO", "premium": 1200}, {"product": "home", "carrier": "GEICO", "premium": 800}]
  * Always include all products explicitly mentioned, even if with different carriers. This enables multi-carrier consolidation analysis.
  * DO NOT infer bundles: Just because someone has "auto" productType and "ownsHome: true" does NOT mean they have a home policy. Just because they have "home" productType and "vehicles > 0" does NOT mean they have an auto policy. Only include policies that are explicitly stated in the notes.

Valid Field Values:

Valid carriers include: "GEICO", "Progressive", "State Farm"
Valid garage types include: "attached", "detached", "carport", "none", "street"
Valid product types include: "auto", "home", "renters", "umbrella"
Valid property types include: "single-family", "condo", "townhouse", "mobile-home", "duplex", "apartment"
Valid roof types include: "asphalt", "metal", "tile", "shingle", "flat", "slate", "wood", "rubber"
Valid states include: "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"

IMPORTANT: Enum values should be detected using case-insensitive matching. The values listed above may be written in any case in the notes (uppercase, lowercase, mixed case). For example, "geico" or "GEICO" or "Geico" should all be recognized as "GEICO", and "AUTO" or "auto" or "Auto" should all be recognized as "auto". Always return the normalized value as listed in the Valid Field Values section above, regardless of how it appears in the notes.

Example 1 (input):
"CA auto. 2 cars, 2 drivers. Clean record 5 years."

Example 1 (output):
{
  "state": "CA",
  "productType": "auto",
  "vehicles": 2,
  "drivers": 2,
  "cleanRecord5Yr": true,
  "cleanRecord3Yr": null,
  "age": null,
  "creditScore": null,
  "existingPolicies": null,
  "kids": null,
  ... [all unmentioned fields as null]
}

Example 2 (input):
"OR auto. 33yo. 2 cars, 2 drivers. Clean record 4yrs. Owns home. Zip 97201"

Example 2 (output):
{
  "state": "OR",
  "productType": "auto",
  "age": 33,
  "vehicles": 2,
  "drivers": 2,
  "cleanRecord5Yr": null,
  "cleanRecord3Yr": true,
  "ownsHome": true,
  "zip": "97201",
  "creditScore": null,
  "existingPolicies": null,
  ... [all unmentioned fields as null]
}

Example 3 (input):
"CA auto. Age 25. 1 car - 2019 Civic. 6yrs driving. No accidents."

Example 3 (output):
{
  "state": "CA",
  "productType": "auto",
  "age": 25,
  "vehicles": 1,
  "cleanRecord5Yr": true,
  "cleanRecord3Yr": null,
  "creditScore": null,
  "existingPolicies": null,
  ... [all unmentioned fields as null]
}

Example 4 (input):
"CA auto. 2020 Honda Accord. Age 30. Clean record 5 years."

Example 4 (output):
{
  "state": "CA",
  "productType": "auto",
  "age": 30,
  "vehicles": 1,
  "cleanRecord5Yr": true,
  "cleanRecord3Yr": null,
  "creditScore": null,
  "existingPolicies": null,
  ... [all unmentioned fields as null]
}

Example 5 (input):
"CA auto. 2021 F-150, 2019 Camry, 2020 CR-V. Age 36. 3 drivers. Clean record."

Example 5 (output):
{
  "state": "CA",
  "productType": "auto",
  "age": 36,
  "vehicles": 3,
  "drivers": 3,
  "cleanRecord5Yr": true,
  "cleanRecord3Yr": null,
  "creditScore": null,
  "existingPolicies": null,
  ... [all unmentioned fields as null]
}

Example 6 (input):
"TX home. Currently with geico. Single-family property. Roof type is METAL."

Example 6 (output):
{
  "state": "TX",
  "productType": "home",
  "currentCarrier": "GEICO",
  "propertyType": "single-family",
  "roofType": "metal",
  "creditScore": null,
  "existingPolicies": null,
  ... [all unmentioned fields as null]
}

Note: In Example 6, "geico" (lowercase) is recognized as "GEICO" and "METAL" (uppercase) is recognized as "metal" - both match the valid enum values regardless of case. Always return the normalized value as listed in the Valid Field Values section.

Example 7 (input):
"AZ home. Condo built in 2015. 1500 sqft. Currently insured with State Farm. Age 38. Asphalt roof."

Example 7 (output):
{
  "state": "AZ",
  "productType": "home",
  "age": 38,
  "yearBuilt": 2015,
  "squareFeet": 1500,
  "propertyType": "condo",
  "roofType": "asphalt",
  "currentCarrier": "State Farm",
  "creditScore": null,
  "existingPolicies": null,
  ... [all unmentioned fields as null]
}

Note: In Example 7, "built in 2015" extracts yearBuilt: 2015 (the year, not a vehicle year), "1500 sqft" extracts squareFeet: 1500 (the number, ignoring the unit), "Condo" extracts propertyType: "condo", and "Asphalt roof" extracts roofType: "asphalt" (case-insensitive).

Example 8 (input):
"CO renters. Name: Sarah Johnson. Email: sarah.j@email.com. Phone: 303-555-7890. Address: 456 Oak Ave, Denver. Age 29. Lives alone. Credit score 720. Currently with Allstate."

Example 8 (output):
{
  "state": "CO",
  "productType": "renters",
  "name": "Sarah Johnson",
  "email": "sarah.j@email.com",
  "phone": "303-555-7890",
  "address": "456 Oak Ave, Denver",
  "age": 29,
  "householdSize": 1,
  "creditScore": 720,
  "currentCarrier": "Allstate",
  "existingPolicies": null,
  ... [all unmentioned fields as null]
}

Note: In Example 8, contact information (name, email, phone, address) is extracted, along with credit score and current carrier. "Lives alone" infers householdSize: 1.

Example 9 (input):
"WA auto. Currently has bundle with Allstate - auto and home. Age 45. 2 vehicles. Clean record 5 years."

Example 9 (output):
{
  "state": "WA",
  "productType": "auto",
  "age": 45,
  "vehicles": 2,
  "cleanRecord5Yr": true,
  "currentCarrier": "Allstate",
  "existingPolicies": [
    {"product": "auto", "carrier": "Allstate"},
    {"product": "home", "carrier": "Allstate"}
  ],
  "creditScore": null,
  ... [all unmentioned fields as null]
}

Note: In Example 9, "bundle with Allstate - auto and home" explicitly indicates multiple policies with the same carrier, so both are included in existingPolicies array.

Example 10 (input):
"NV home. Has Progressive auto. Owns home. Age 50. Built 2018. 2200 sqft."

Example 10 (output):
{
  "state": "NV",
  "productType": "home",
  "age": 50,
  "ownsHome": true,
  "yearBuilt": 2018,
  "squareFeet": 2200,
  "currentCarrier": "Progressive",
  "existingPolicies": [
    {"product": "auto", "carrier": "Progressive"}
  ],
  "creditScore": null,
  ... [all unmentioned fields as null]
}

Note: In Example 10, "Has Progressive auto" explicitly mentions an existing auto policy, so it's included in existingPolicies. Even though they own a home and are inquiring about home insurance, only the explicitly mentioned auto policy is included. We do NOT infer that they have a home policy just because they own a home - it must be explicitly stated.

IMPORTANT: Discounts and Bundles
- Discounts: Just because fields are present that qualify for a discount (e.g., cleanRecord5Yr: true qualifies for safe driver discount), this does NOT mean the customer currently has that discount. Discounts are only applied if explicitly mentioned in the notes (e.g., "has safe driver discount", "gets 10% discount"). The presence of qualifying fields does not imply the discount exists.
- Bundles: Just because someone has auto and home policies with the same carrier does NOT mean they have a bundle discount. A bundle must be explicitly mentioned (e.g., "has bundle", "bundle discount", "auto+home bundle"). Only extract existingPolicies when policies are explicitly stated, not inferred from other fields.

IMPORTANT: Return JSON with the following structure:
- known: fields with high confidence (≥85%) that you extracted from the text
- inferred: fields with medium/low confidence (<85%) or confirmed/edited from existing inferred fields
- confidence: confidence scores (0.0-1.0) for each field in both known and inferred
- reasoning: explanation for each inferred field modification or new inference

```

**JSON Schema:** UserProfile schema (see [packages/shared/src/schemas/user-profile.ts](packages/shared/src/schemas/user-profile.ts))

#### LLM Response & Extraction

**Status:** ✅ Extraction successful


**Extracted Fields:**
```json
{
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
}
```


**Full Extraction Result:**
```json
{
  "method": "llm",
  "fields": {
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
  "confidence": {
    "state": 0.8,
    "productType": 0.8,
    "age": 0.8,
    "vehicles": 0.8,
    "cleanRecord3Yr": 0.8,
    "currentCarrier": 0.8,
    "_inferred": 0.8,
    "_suppressed": 0.8
  },
  "reasoning": "Extracted from natural language using Gemini structured outputs"
}
```

#### Routing Decision

```json
{
  "eligibleCarriers": [
    "GEICO",
    "Progressive",
    "State Farm"
  ],
  "primaryCarrier": "GEICO",
  "tiedCarriers": [
    "Progressive",
    "State Farm"
  ],
  "matchScores": {
    "GEICO": 100,
    "Progressive": 100,
    "State Farm": 100
  },
  "confidence": 100,
  "rationale": "Selected GEICO as primary carrier (match score: 100%). Alternatives: Progressive (100%), State Farm (100%)",
  "citations": [
    {
      "id": "carr_foh5t5b435ubg3q3bq2ymodz",
      "type": "carrier",
      "carrier": "carr_foh5t5b435ubg3q3bq2ymodz",
      "file": "knowledge_pack/carriers/geico.json"
    },
    {
      "id": "carr_nemqnt5tabru300u2o6nnh66",
      "type": "carrier",
      "carrier": "carr_nemqnt5tabru300u2o6nnh66",
      "file": "knowledge_pack/carriers/progressive.json"
    },
    {
      "id": "carr_g8c6fstxl7pdid8izom4j1br",
      "type": "carrier",
      "carrier": "carr_g8c6fstxl7pdid8izom4j1br",
      "file": "knowledge_pack/carriers/state-farm.json"
    }
  ],
  "rulesEvaluated": [
    "knowledge_pack/carriers/geico.json",
    "knowledge_pack/carriers/progressive.json",
    "knowledge_pack/carriers/state-farm.json"
  ]
}
```

#### Discount Opportunities

```json
[
  {
    "discountId": "disc_xrcd4bhsnd58vx2yu99ca4bn",
    "discountName": "Safe Driver",
    "percentage": 10,
    "annualSavings": 0,
    "missingRequirements": [],
    "metRequirements": [
      "has auto insurance",
      "clean 3-year driving record"
    ],
    "citation": {
      "id": "disc_xrcd4bhsnd58vx2yu99ca4bn",
      "type": "discount",
      "carrier": "GEICO",
      "file": "knowledge_pack/carriers/geico.json"
    },
    "stackable": true,
    "requiresDocumentation": false
  }
]
```

#### Compliance Check

```json
{
  "disclaimersRequired": 6,
  "disclaimersShown": 6,
  "disclaimersMissed": 0,
  "required": [
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote",
    "New York: Quote estimates are non-binding",
    "Auto Insurance: Coverage limits and deductibles affect premium"
  ],
  "shown": [
    "New York: Quote estimates are non-binding and subject to carrier underwriting review.",
    "Auto Insurance: Coverage limits and deductibles affect premium. Final quote may vary.",
    "Rates subject to underwriting and approval",
    "Actual rates may vary based on complete application",
    "Must be reviewed and finalized by a licensed insurance agent",
    "Not a binding quote"
  ],
  "missed": []
}
```

#### Prefill Packet (IQuote Pro Format)

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

#### Rules Consulted

```json
[
  "knowledge_pack/carriers/geico.json",
  "knowledge_pack/carriers/progressive.json",
  "knowledge_pack/carriers/state-farm.json"
]
```

---


---

**Report Generated:** 2025-11-17T03:18:53.293Z
