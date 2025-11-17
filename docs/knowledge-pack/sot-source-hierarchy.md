# Knowledge Pack Source Hierarchy & Authority Rankings

> **📌 Single Source of Truth**: This document is the authoritative source for source authority levels, confidence scoring, and conflict resolution strategies used throughout the knowledge pack system.

**Version**: 1.0  
**Date**: 2025-11-05  
**Project**: Insurance Broker Quote Assistant (IQuote Pro)  
**Purpose**: Define source authority levels and conflict resolution strategies

---

## Overview

This document establishes a clear hierarchy for source authority and provides decision-making frameworks for resolving conflicts when multiple sources provide different values for the same data point.

---

## Source Authority Levels

### Level 5: Authoritative (Regulatory)

**Description**: Government regulatory bodies and official state insurance departments

**Examples**:

- California Department of Insurance (insurance.ca.gov)
- Texas Department of Insurance (tdi.texas.gov)
- Florida Office of Insurance Regulation (floir.com)
- New York Department of Financial Services (dfs.ny.gov)
- Illinois Department of Insurance (illinois.gov/insurance)
- NAIC (National Association of Insurance Commissioners) - naic.org

**When to Use**:

- State minimum coverage requirements
- Mandatory disclosures and disclaimers
- Prohibited advertising statements
- Legal requirements and regulations
- Licensing and compliance issues

**Authority Score**: 5/5

**Conflict Resolution**: Always prefer Level 5 sources over all others for regulatory matters

---

### Level 4: Primary (Carrier Official Sites)

**Description**: Official insurance carrier websites and direct communications

**Examples**:

- geico.com
- progressive.com
- statefarm.com
- Official carrier mobile apps
- Official carrier PDF documents
- Direct email/mail from carriers

**When to Use**:

- Carrier-specific discount percentages
- Product availability by state
- Eligibility criteria for coverage
- Pricing estimates and averages
- Carrier compensation/commission (if available)
- Product features and options

**Authority Score**: 4/5

**Conflict Resolution**: Prefer Level 4 over Levels 3, 2, or 1 for carrier-specific information

---

### Level 3: Reference (Industry Organizations)

**Description**: Established industry research organizations and advocacy groups

**Examples**:

- Insurance Information Institute (iii.org)
- National Association of Insurance Commissioners (naic.org) - consumer guides
- Insurance trade associations
- Academic insurance research centers
- Government consumer protection agencies (non-regulatory)

**When to Use**:

- Industry averages and benchmarks
- Statistical data on pricing
- Consumer education and explanations
- Insurance concepts and terminology
- Historical trends and analysis

**Authority Score**: 3/5

**Conflict Resolution**: Use for context and benchmarking; prefer Level 5 or 4 for specific values

---

### Level 2: Secondary (Financial & Comparison Sites)

**Description**: Reputable financial news and comparison websites

**Examples**:

- Bankrate (bankrate.com)
- NerdWallet (nerdwallet.com)
- ValuePenguin (valuepenguin.com)
- The Zebra (thezebra.com)
- Consumer Reports (consumerreports.org)
- J.D. Power (jdpower.com)

**When to Use**:

- Average pricing across multiple carriers
- Carrier comparison and reviews
- Consumer satisfaction data
- General insurance education
- Supplementary verification of carrier claims

**Authority Score**: 2/5

**Conflict Resolution**: Use as secondary sources; always verify against Level 5, 4, 3 sources

**Cautions**:

- May have affiliate relationships with carriers
- Data may be aggregated (not carrier-specific)
- Update frequency varies
- May show conservative estimates

---

### Level 1: Tertiary (User-Generated & Forums)

**Description**: Community forums, blog posts, and user-generated content

**Examples**:

- Reddit (r/insurance)
- Insurance forums
- Individual blog posts
- Yahoo Answers / Quora
- Social media posts
- YouTube videos (non-official)

**When to Use**:

- Anecdotal experiences (not authoritative data)
- Initial research direction
- Identifying questions to ask official sources
- Real-world application insights

**Authority Score**: 1/5

**Conflict Resolution**: Never use as sole source; always verify with higher authority

**Cautions**:

- Unverified information
- Personal opinions, not facts
- May be outdated
- Geographic specificity unclear
- Cannot be cited in compliance logs

---

## Confidence Scoring Formula

### Field Definitions

**Confidence Field Structure:**

- **`confidence`** (required): A **classification string** indicating confidence level. Valid values:
  - `'high'` - Score 4.0-5.0 (Use with minimal verification)
  - `'medium'` - Score 3.0-3.9 (Use with supplementary source)
  - `'low'` - Score 2.0-2.9 (Verify with higher authority source)

- **`confidenceScore`** (optional): A **numeric score** (1.0-5.0) calculated using the formula below. Only include if precise scoring is needed. The classification in the `confidence` field is the authoritative field for data processing; numeric score serves as supporting context.

### Scoring Calculation

For each source, calculate overall confidence:

```
Confidence = (Authority × 0.5) + (Freshness × 0.3) + (Specificity × 0.2)
```

### Authority Component (0-5)

Use authority level as defined above (1-5)

### Freshness Component (0-5)

| Age               | Score | Assessment       |
| ----------------- | ----- | ---------------- |
| < 6 months        | 5     | Current          |
| 6 months - 1 year | 4     | Recent           |
| 1-2 years         | 3     | Moderately Fresh |
| 2-3 years         | 2     | Dated            |
| > 3 years         | 1     | Stale            |

### Specificity Component (0-5)

| Specificity  | Score | Example              |
| ------------ | ----- | -------------------- |
| Exact value  | 5     | "15% discount"       |
| Narrow range | 4     | "12-15% discount"    |
| Wide range   | 3     | "10-20% discount"    |
| Qualifier    | 2     | "up to 20% discount" |
| Vague        | 1     | "save money"         |

### Confidence Classifications

| Score Range | Classification | Action                              |
| ----------- | -------------- | ----------------------------------- |
| 4.0 - 5.0   | High           | Use with minimal verification       |
| 3.0 - 3.9   | Medium         | Use with supplementary source       |
| 2.0 - 2.9   | Low            | Verify with higher authority source |
| < 2.0       | Very Low       | Do not use; find better source      |

### Example Calculation

**Source**: GEICO official discount page

- Authority: 4 (Primary)
- Freshness: 5 (Accessed today)
- Specificity: 5 (Exact "15%")

```
Confidence = (4 × 0.5) + (5 × 0.3) + (5 × 0.2)
           = 2.0 + 1.5 + 1.0
           = 4.5 (High Confidence)
```

**Source**: Reddit post about GEICO discounts

- Authority: 1 (Tertiary)
- Freshness: 2 (Posted 2.5 years ago)
- Specificity: 3 (Range "10-15%")

```
Confidence = (1 × 0.5) + (2 × 0.3) + (3 × 0.2)
           = 0.5 + 0.6 + 0.6
           = 1.7 (Very Low Confidence)
```

---

## Conflict Resolution Decision Tree

### Step 1: Check Authority Levels

```
IF sources have different authority levels:
  → SELECT source with highest authority level
  → DOCUMENT other sources as secondary
  → RESOLUTION: "authoritative_source"
```

**Example**:

- Source A: CA Dept of Insurance (Level 5): "15/30/5 minimum"
- Source B: NerdWallet (Level 2): "15/30/10 minimum"
- **Resolution**: Use Source A (Level 5)
- **Method**: "authoritative_source"

### Step 2: If Same Authority, Check Specificity

```
IF authority levels equal:
  IF one source more specific than other:
    → SELECT more specific value
    → RESOLUTION: "specificity_preference"
```

**Example**:

- Source A: GEICO (Level 4): "15% discount"
- Source B: GEICO FAQ (Level 4): "10-15% discount"
- **Resolution**: Use "15%" (exact vs. range)
- **Method**: "specificity_preference"

### Step 3: If Same Specificity, Check Freshness

```
IF authority equal AND specificity equal:
  IF sources have different dates:
    → SELECT most recent source
    → RESOLUTION: "temporal_preference"
```

**Example**:

- Source A: GEICO (Level 4), Accessed 2025-11-05: "15%"
- Source B: GEICO (Level 4), Accessed 2023-06-10: "12%"
- **Resolution**: Use 15% (more recent)
- **Method**: "temporal_preference"

### Step 4: Apply Domain Knowledge

```
IF all metadata equal:
  IF conservative_estimate makes sense:
    → SELECT lower value for discounts
    → SELECT higher value for minimums
    → RESOLUTION: "conservative_estimate"
```

**Example** (Discount):

- Source A: "15% multi-policy discount"
- Source B: "15% multi-policy discount"
- **No conflict - values agree**

**Example** (Discount conflict):

- Source A: "15% discount"
- Source B: "18% discount"
- **Resolution**: Use 15% (conservative for discount)
- **Method**: "conservative_estimate"

**Example** (Minimum conflict):

- Source A: CA minimum BI: $15,000
- Source B: CA minimum BI: $20,000
- **Resolution**: Use $20,000 (higher for safety)
- **Method**: "conservative_estimate"

### Step 5: Check for Majority Consensus

```
IF 3+ sources available:
  IF >50% of sources agree on value:
    → SELECT majority value
    → RESOLUTION: "majority_consensus"
```

**Example**:

- Source A: "15%"
- Source B: "15%"
- Source C: "12%"
- **Resolution**: Use 15% (2 out of 3)
- **Method**: "majority_consensus"

### Step 6: Apply Context Awareness

```
IF conflict involves qualifiers:
  → PARSE qualifier ("up to", "as low as", "average")
  → INTERPRET contextually
  → RESOLUTION: "context_aware_decision"
```

**Example**:

- Source A: "Save up to 15%"
- Source B: "Average savings: 12%"
- **Resolution**: Use 15% as maximum, note 12% as typical
- **Method**: "context_aware_decision"
- **Implementation**: Store both values with metadata

### Step 7: Escalate to Expert Judgment

```
IF no clear resolution from Steps 1-6:
  → FLAG for manual review
  → REQUIRE written rationale
  → RESOLUTION: "expert_judgment"
```

**Example**:

- Complex eligibility criteria with contradictory requirements
- **Resolution**: Manual review by data curator
- **Method**: "expert_judgment"
- **Requires**: Documented rationale in resolutions.json

---

## Resolution Method Reference

| Method                   | Description                  | When to Use                | Example                   |
| ------------------------ | ---------------------------- | -------------------------- | ------------------------- |
| `authoritative_source`   | Higher authority source wins | Different authority levels | State .gov > Carrier site |
| `specificity_preference` | More specific value wins     | Exact vs. range            | "15%" > "10-15%"          |
| `temporal_preference`    | More recent source wins      | Different dates            | 2025 > 2023               |
| `conservative_estimate`  | Safer value chosen           | Domain knowledge needed    | Lower discount %          |
| `majority_consensus`     | Most common value wins       | 3+ sources available       | 2/3 agree                 |
| `context_aware_decision` | Qualifier interpretation     | "up to", "average" present | Parse qualifier           |
| `expert_judgment`        | Manual curator decision      | No clear automated rule    | Complex conflicts         |

---

## Special Cases & Edge Cases

### Case 1: State-Specific vs. National

**Scenario**: National source says one thing, state-specific says another

**Resolution**:

- For state-specific data (minimums, requirements): Use state source
- For carrier availability: Use state source to verify
- For pricing: Prefer state-specific data

**Example**:

- National site: "GEICO available in all 50 states"
- CA Dept of Insurance: "GEICO licensed in CA"
- **Resolution**: Both can be true; verify state-by-state

### Case 2: Range vs. Specific Number

**Scenario**: One source gives range, another gives specific number

**Resolution**:

- If specific number within range: Use specific (more precise)
- If specific number outside range: Investigate further (conflict)
- Document both values with context

**Example**:

- Source A: "10-15% multi-policy discount"
- Source B: "12% multi-policy discount"
- **Resolution**: Use 12% (within range and specific)

### Case 3: "Up To" Qualifiers

**Scenario**: Maximum value stated with "up to" qualifier

**Resolution**:

- Store maximum value as primary
- Note qualifier in metadata
- If average also available, store separately

**Example**:

- "Save up to 15% with multi-policy bundle"
- **Storage**: `percentage: 15`, `qualifier: "up to"`
- Use for pitch generation: "You may save up to 15%"

### Case 4: Promotional vs. Standard

**Scenario**: Promotional rate differs from standard rate

**Resolution**:

- Use standard/permanent rate as primary
- Note promotional rate if relevant
- Check effective dates

**Example**:

- Promotional: "20% off for new customers"
- Standard: "15% multi-policy discount"
- **Resolution**: Use 15% (ongoing), note 20% promo with dates

### Case 5: Contradictory Boolean Values

**Scenario**: One source says "required", another says "optional"

**Resolution**:

- Prioritize regulatory source (Level 5)
- Check state-specific context
- Document both sources

**Example**:

- FL homeowners: Hurricane coverage "required" vs. "optional"
- **Resolution**: Check FL state insurance dept (authoritative)
- **Result**: Hurricane coverage mandatory in certain zones

### Case 6: Missing Data from One Source

**Scenario**: Source A has value, Source B doesn't mention it

**Resolution**:

- Not a conflict (absence of data ≠ contradictory data)
- Use Source A value
- Continue searching for confirmation
- Flag if only single source available

---

## Quality Assurance Checks

### Pre-Resolution Checks

Before resolving conflicts:

1. ✅ Verify all sources are properly cited (URI + element ref)
2. ✅ Confirm authority levels assigned correctly
3. ✅ Check freshness dates are accurate
4. ✅ Ensure specificity scores appropriate
5. ✅ Review context (qualifiers, caveats, conditions)

### Post-Resolution Checks

After resolving conflicts:

1. ✅ Resolution method documented
2. ✅ Rationale provided (human-readable)
3. ✅ All sources retained (even non-selected ones)
4. ✅ Primary source marked clearly
5. ✅ Confidence score calculated
6. ✅ No data loss (all sources preserved in audit trail)

---

## Resolution Documentation Template

```json
{
  "conflictId": "conflict-###",
  "dataPoint": "[semantic_identifier]",
  "resolution": {
    "selectedValue": "[chosen_value]",
    "method": "[resolution_method]",
    "strategyRank": [1-7],
    "rationale": "[Human-readable explanation of why this value was chosen]",
    "resolvedBy": "data_curator",
    "resolvedDate": "2025-11-05T15:30:00Z",
    "confidence": "[high|medium|low]",
    "reviewRequired": [true|false],
    "retainedSources": [
      {
        "id": "raw-###",
        "uri": "[full_url]",
        "elementRef": "[css_selector]",
        "value": "[extracted_value]",
        "authority": [1-5],
        "freshness": [1-5],
        "specificity": [1-5],
        "confidenceScore": [calculated],
        "primary": [true|false],
        "note": "[Why this source was/wasn't selected]"
      }
    ]
  }
}
```

---

## Common Resolution Examples

### Example 1: Regulatory Override

**Conflict**: CA minimum bodily injury liability

**Sources**:

- Source A (Level 5 - insurance.ca.gov): "$15,000 per person"
- Source B (Level 2 - Bankrate): "$25,000 per person"

**Resolution**:

```json
{
  "selectedValue": 15000,
  "method": "authoritative_source",
  "strategyRank": 1,
  "rationale": "California Department of Insurance is authoritative source for state minimums. Bankrate may be showing recommended coverage, not legal minimum.",
  "confidence": "high"
}
```

### Example 2: Specificity Wins

**Conflict**: GEICO multi-policy discount

**Sources**:

- Source A (Level 4 - geico.com/discounts): "Save up to 15%"
- Source B (Level 4 - geico.com/faq): "Typically 10-15%"

**Resolution**:

```json
{
  "selectedValue": 15,
  "method": "specificity_preference",
  "strategyRank": 2,
  "rationale": "Using maximum value (15%) from discount page. FAQ provides range confirming 15% is top end. Note 'up to' qualifier.",
  "confidence": "high",
  "metadata": {
    "qualifier": "up to",
    "typicalRange": "10-15"
  }
}
```

### Example 3: Temporal Preference

**Conflict**: State Farm safe driver discount

**Sources**:

- Source A (Level 4 - statefarm.com, accessed 2025-11-05): "10% discount"
- Source B (Level 4 - statefarm.com, accessed 2023-03-15): "8% discount"

**Resolution**:

```json
{
  "selectedValue": 10,
  "method": "temporal_preference",
  "strategyRank": 3,
  "rationale": "Most recent data from official State Farm site shows 10%. Discount percentage may have increased since 2023.",
  "confidence": "high"
}
```

### Example 4: Conservative Estimate

**Conflict**: Progressive multi-vehicle discount

**Sources**:

- Source A (Level 4 - progressive.com): "12% discount"
- Source B (Level 2 - NerdWallet): "15% discount"

**Resolution**:

```json
{
  "selectedValue": 12,
  "method": "authoritative_source",
  "strategyRank": 1,
  "rationale": "Progressive official site (Level 4) shows 12%. NerdWallet (Level 2) may be showing maximum or promotional rate. Using carrier's stated percentage.",
  "confidence": "high"
}
```

### Example 5: Majority Consensus

**Conflict**: Average auto insurance California

**Sources**:

- Source A (III): "$1,200/year"
- Source B (Bankrate): "$1,150/year"
- Source C (NerdWallet): "$1,200/year"
- Source D (ValuePenguin): "$1,250/year"

**Resolution**:

```json
{
  "selectedValue": 1200,
  "method": "majority_consensus",
  "strategyRank": 5,
  "rationale": "3 out of 4 sources cluster around $1,200 (±$50). Using $1,200 as representative average. ValuePenguin's $1,250 within margin of error.",
  "confidence": "medium",
  "note": "Average pricing has inherent variability; using consensus value"
}
```

---

## Summary

### Authority Hierarchy

5 > 4 > 3 > 2 > 1

**Regulatory > Carrier > Industry > Comparison > Forums**

### Resolution Priority

1. Authoritative source (highest authority wins)
2. Specificity preference (exact > range)
3. Temporal preference (recent > old)
4. Conservative estimate (domain knowledge)
5. Majority consensus (3+ sources)
6. Context awareness (parse qualifiers)
7. Expert judgment (manual with rationale)

### Key Principles

✅ Always preserve all sources (never delete conflicting data)  
✅ Document resolution method and rationale  
✅ Calculate confidence scores objectively  
✅ Prefer official sources over aggregators  
✅ Use conservative estimates when in doubt  
✅ Require manual review for critical conflicts

---

**See Also:**

- 📖 [Conflict Resolution in Methodology](knowledge-pack-methodology.md#phase-4-conflict-resolution) - When conflict resolution happens in the workflow
- 🔗 [Resolution Schema](sot-schemas.md#resolution-object) - Data structure for documenting resolutions
- 📊 [Resolution Examples](knowledge-pack-examples.md#example-2-california-auto-minimums) - Real-world conflicts resolved
- 🔍 [Search Queries](sot-search-queries.md) - Finding high-authority sources
- 🤖 [Phase 2 Agent Workflow](phase-2-agent-instructions.md#step-6-save-raw-entry) - Capturing confidence during scraping

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Status**: Ready for Implementation

---

## Referenced By

- **[sot-schemas.md](sot-schemas.md)** - Uses source authority levels in schema design for confidence scoring and resolution objects
- **[phase-2-agent-instructions.md](phase-2-agent-instructions.md)** - Step 6 requires assigning confidence/authority levels during raw data collection based on this hierarchy
- **[knowledge-pack-methodology.md](knowledge-pack-methodology.md)** - Phase 4 conflict resolution workflow applies source authority hierarchy to resolve disagreements
- **[knowledge-pack-examples.md](knowledge-pack-examples.md)** - Demonstrates real-world use of authority levels in conflict resolution examples
- **[README.md](README.md)** - Overview document links to source hierarchy as foundational concept for data quality
- **[sot-search-queries.md](sot-search-queries.md)** - Specifies search queries optimized for finding high-authority sources according to this hierarchy
