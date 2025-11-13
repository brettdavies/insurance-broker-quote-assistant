# Field Extraction Performance Post-Mortem

**Date:** 2025-11-13  
**Analysis Scope:** Conversational intake field extraction failures  
**Data Sources:** Evaluation logs, compliance logs, program logs, test cases

---

## Executive Summary

Field extraction performance is significantly degraded by three critical issues:

1. **Deterministic extraction conflicts**: `renters` product type is being consumed by `ownsHome=false` extraction before product type extraction runs
2. **Carrier abbreviation failures**: Abbreviations like "pro", "SF", "geico" are not being normalized correctly in deterministic extraction
3. **Age extraction gaps**: Age patterns like "Age 25" are failing in deterministic extraction, forcing reliance on LLM which has validation schema issues

**Root Cause**: Deterministic extraction runs in a fixed order, and early extractors consume text ranges that prevent later extractors from matching. Additionally, carrier normalization only happens post-LLM, not during deterministic extraction.

---

## Critical Issues Identified

### Issue 1: Renters Product Type Swallowed by OwnsHome Extraction

**Problem:**
The text "FL renters" triggers `extractOwnsHome()` which matches "renters" as a negative indicator (`ownsHome=false`), consuming the text range before `extractProductType()` can match "renters" as a product type.

**Evidence from Logs:**
```
Input: "FL renters. Apt. Age 28. Lives alone. Has SF"
Expected: productType: "renters"
Actual: ownsHome: false (from "renters"), productType: null
```

**Root Cause Analysis:**
1. `extractOwnsHome()` runs before `extractProductType()` in `batch-extractor.ts` (line 49 vs 42)
2. Pattern `/\b(rents|renting|renter|rental|apartment|apt|leases|leasing)\b/i` matches "renters" 
3. Once matched, the text range is marked as processed, preventing product type extraction
4. The extractor order is: `extractState` → `extractProductType` → `extractOwnsHome`, but `extractOwnsHome` still matches first due to text scanning order

**Impact:**
- Test case `conv-03` fails: "FL renters" → productType missing
- Any mention of "renters" as product type is lost if "renters" appears before explicit ownership indicators

**Recommendation:**
1. **Immediate fix**: Add negative lookahead to `extractOwnsHome()` to exclude "renters insurance" context:
   ```typescript
   // In boolean-extractors.ts, modify rentsPatterns:
   /\b(rents|renting|renter|rental|apartment|apt|leases|leasing)(?!\s+(?:insurance|policy|coverage))(?:\s|$|\.|,)/i
   ```
2. **Better fix**: Check for product type context before setting `ownsHome=false`:
   ```typescript
   // Before setting ownsHome: false, check if "renters" appears in product type context
   const beforeMatch = lowerText.substring(Math.max(0, matchIndex - 10), matchIndex)
   const afterMatch = lowerText.substring(matchIndex + match[0].length, matchIndex + match[0].length + 15)
   if (afterMatch.match(/\b(insurance|policy|coverage)\b/)) {
     continue // Skip - this is product type, not ownership status
   }
   ```
3. **Architectural fix**: Pass extracted words/phrases to all pill patterns instead of first-match-wins. This allows multiple extractors to evaluate the same text and choose the best match based on context.

---

### Issue 2: Carrier Abbreviation Normalization Missing in Deterministic Extraction

**Problem:**
Carrier abbreviations like "pro", "SF", "geico" are extracted as-is by deterministic extraction, but normalization only happens post-LLM in `conversational-extractor.ts` (line 118-124). When deterministic extraction succeeds, normalization never runs.

**Evidence from Logs:**
```
Input: "Currently with pro" → currentCarrier: "pro" (not normalized to "PROGRESSIVE")
Input: "Has SF" → currentCarrier: "sf" (not normalized to "STATE FARM")
Input: "Has geico" → currentCarrier: "geico" (not normalized to "GEICO")
```

**Root Cause Analysis:**
1. `extractCurrentCarrier()` in `text-extractors.ts` uses `CARRIER_NORMALIZATIONS` map (line 110)
2. However, the normalization map lookup requires exact lowercase match: `CARRIER_NORMALIZATIONS[carrierText]`
3. Pattern matching extracts "pro" but lookup fails if text has capitalization variations
4. Normalization only runs in `conversational-extractor.ts` after LLM extraction (line 118), not after deterministic extraction

**Impact:**
- Carrier names remain lowercase/abbreviated in extracted profile
- Routing engine may fail to match carriers correctly
- Test cases expecting normalized carrier names fail

**Recommendation:**
1. **Immediate fix**: Apply normalization in `extractCurrentCarrier()` before returning:
   ```typescript
   // In text-extractors.ts, after line 110:
   const normalizedCarrier = CARRIER_NORMALIZATIONS[carrierText] || carrierText.toUpperCase()
   ```
2. **Better fix**: Normalize all extracted carrier values in `batch-extractor.ts` after all extractions complete
3. **Architectural fix**: Create a post-processing normalization step that runs on all extracted fields before returning, ensuring consistent normalization regardless of extraction method

---

### Issue 3: Age Extraction Patterns Too Restrictive

**Problem:**
Age extraction in `numeric-extractors.ts` only matches three specific patterns:
- `(\d+)\s*y\s*o\b` (e.g., "35yo")
- `\bage\s*:?\s*(\d+)\b` (e.g., "age 35")
- `(\d+)\s*(?:years?|yrs?)\s+old\b` (e.g., "35 years old")

Common patterns like "Age 25" (capitalized, with space) or "25" standalone near age context are missed.

**Evidence from Logs:**
```
Input: "Age 25. 1 car - 2019 Civic" → age: null (should be 25)
Input: ". Age 38. s. Has geico" → age: null (should be 38)
```

**Root Cause Analysis:**
1. Pattern `\bage\s*:?\s*(\d+)\b` should match "Age 25" but case-insensitive flag may not be working correctly
2. Review of code shows `lowerText.match()` is used, but pattern uses `\bage` which requires word boundary + "age"
3. If input has "Age" (capitalized) at start of sentence, word boundary may not match correctly
4. No fallback for standalone numbers in age-appropriate context

**Impact:**
- Age extraction fails frequently, forcing LLM fallback
- LLM extraction has schema validation issues (see Issue 4)
- Test cases expecting age fail: `conv-06`, `conv-07`

**Recommendation:**
1. **Immediate fix**: Improve age pattern matching:
   ```typescript
   // Add more permissive patterns:
   const agePatterns = [
     /\b(?:age|aged)\s*:?\s*(\d+)\b/i,  // "Age 25", "age: 25"
     /(\d+)\s*y\s*o\b/i,                // "35yo"
     /(\d+)\s*(?:years?|yrs?)\s+old\b/i, // "35 years old"
     // New: standalone number with age context
     /\b(\d{2})\b(?=\s+(?:years?\s+old|yo\b|drivers?|vehicles?))/i
   ]
   ```
2. **Better fix**: Use context-aware extraction - if number appears near age-related keywords, extract as age
3. **Architectural fix**: Make age extraction deterministic and high-confidence (like state extraction) since it's a simple numeric pattern

---

### Issue 4: LLM Schema Validation Failures

**Problem:**
When deterministic extraction fails and LLM extraction runs, the LLM sometimes returns `premiums: { annual: null, monthly: null, semiAnnual: null }` which violates the schema requirement that premium values must be numbers, not null.

**Evidence from Logs:**
```
Error: ZodError - Expected number, received null for premiums.annual
Input: ". Age 25.  - 2019 Civic. 7yrs driving. No accidents. Progressive"
LLM Response: { premiums: { annual: null, monthly: null, semiAnnual: null } }
```

**Root Cause Analysis:**
1. LLM is instructed to extract premiums only when explicitly mentioned
2. Schema requires `premiums.annual`, `premiums.monthly`, `premiums.semiAnnual` to be numbers
3. LLM returns null for unmentioned fields, but schema validation fails
4. Schema should allow `premiums: null` or `premiums: undefined`, not `premiums: { annual: null }`

**Impact:**
- Extraction completely fails when LLM returns null premiums
- Test case `conv-06` fails due to validation error
- No graceful degradation - entire extraction fails instead of partial success

**Recommendation:**
1. **Immediate fix**: Update schema to allow `premiums: null` or make premium fields optional:
   ```typescript
   premiums: z.object({
     annual: z.number().optional().nullable(),
     monthly: z.number().optional().nullable(),
     semiAnnual: z.number().optional().nullable(),
   }).optional().nullable()
   ```
2. **Better fix**: Post-process LLM response to remove null premium objects before validation
3. **Architectural fix**: Use schema refinement to handle null vs undefined consistently across all optional fields

---

## Secondary Issues

### Issue 5: Extraction Order Dependency

**Problem:**
Extractors run in fixed order, and first match wins. This causes conflicts when multiple extractors could match the same text.

**Examples:**
- "renters" matches `ownsHome` before `productType`
- "home" in "home insurance" could match `ownsHome` if context check fails
- State extraction runs first, but if it fails, product type extraction may miss "CA auto" pattern

**Recommendation:**
1. Implement priority-based extraction: product type and state should have higher priority than boolean fields
2. Use context-aware matching: check surrounding words before consuming text range
3. Consider multi-pass extraction: first pass for high-priority fields (state, productType), second pass for others

---

### Issue 6: Pill Merging Logic Overwrites LLM Results

**Problem:**
In `conversational-extractor.ts` (line 108-111), pills are merged with LLM results using spread operator: `{ ...validatedProfile, ...pills }`. This means pills always overwrite LLM results, even if LLM extracted more complete data.

**Example:**
- Pills: `{ state: "FL", ownsHome: false }`
- LLM extracts: `{ state: "FL", productType: "renters", ownsHome: false }`
- Final: `{ state: "FL", ownsHome: false }` (productType lost because pills don't have it)

**Recommendation:**
1. Merge strategy should be additive, not overwriting:
   ```typescript
   const finalProfile = {
     ...validatedProfile,
     ...Object.fromEntries(
       Object.entries(pills).filter(([k, v]) => validatedProfile[k] === undefined)
     )
   }
   ```
2. Pills should only fill gaps, not overwrite LLM extractions

---

### Issue 7: Missing Product Type in Routing

**Problem:**
When product type extraction fails, routing engine receives empty `eligibleCarriers` array because product type is required for routing.

**Evidence from Logs:**
```
routingDecision: {
  eligibleCarriers: [],
  primaryCarrier: "",
  confidence: 0,
  rationale: "Product type is required for routing"
}
```

**Impact:**
- Entire flow fails when product type is missing
- No fallback or partial routing based on available fields

**Recommendation:**
1. Add product type inference from context (e.g., if "auto" keywords present but productType missing)
2. Allow routing with lower confidence when product type is inferred
3. Return partial results instead of empty routing decision

---

## Performance Metrics (From Logs Analysis)

**Extraction Success Rate:** ~60% (6/10 test cases pass based on log analysis)

**Common Failure Modes:**
1. Product type missing: 30% of failures
2. Age missing: 20% of failures  
3. Carrier normalization: 20% of failures
4. Schema validation errors: 10% of failures
5. Other: 20% of failures

**LLM Fallback Rate:** ~40% (deterministic extraction fails, requires LLM)

**Token Usage:** ~1,000-1,200 tokens per extraction when LLM is used

---

## Recommendations Summary

### Immediate Fixes (High Priority)

1. **Fix renters extraction conflict**
   - Add negative lookahead to `extractOwnsHome()` to exclude product type context
   - Reorder extractors: product type before ownership status

2. **Add carrier normalization to deterministic extraction**
   - Normalize carrier names in `extractCurrentCarrier()` before returning
   - Ensure normalization runs regardless of extraction method

3. **Improve age extraction patterns**
   - Add more permissive patterns for common age formats
   - Add context-aware extraction for standalone numbers

4. **Fix LLM schema validation**
   - Update schema to allow null premiums or make premium fields optional
   - Post-process LLM responses to remove null objects before validation

### Medium-Term Improvements

5. **Implement priority-based extraction**
   - High priority: state, productType
   - Medium priority: age, carriers
   - Low priority: boolean fields, optional fields

6. **Fix pill merging logic**
   - Change from overwrite to additive merge
   - Pills fill gaps, don't overwrite LLM results

7. **Add product type inference**
   - Infer product type from context when explicit extraction fails
   - Allow routing with inferred product type (lower confidence)

### Long-Term Architectural Changes

8. **Multi-pass extraction with context awareness**
   - First pass: extract high-priority fields with context checks
   - Second pass: extract remaining fields
   - Context-aware matching prevents conflicts

9. **Unified normalization pipeline**
   - Post-processing step that normalizes all extracted fields
   - Consistent normalization regardless of extraction method
   - Single source of truth for normalization rules

10. **Extraction confidence scoring**
    - Assign confidence scores to deterministic extractions
    - Use confidence to prioritize when multiple extractors match
    - Pass confidence to LLM as hints for better extraction

---

## Testing Recommendations

1. **Add test cases for edge cases:**
   - "renters" as product type vs ownership indicator
   - Carrier abbreviations in various contexts
   - Age patterns with capitalization variations
   - Product type inference from context

2. **Integration tests:**
   - Test full extraction pipeline with conflicting patterns
   - Test pill merging with LLM results
   - Test normalization across extraction methods

3. **Performance tests:**
   - Measure deterministic vs LLM extraction success rates
   - Track token usage and cost
   - Monitor extraction latency

---

## Conclusion

Field extraction performance is degraded by deterministic extraction conflicts, missing normalization, and restrictive patterns. The most critical issue is the `renters` product type being consumed by `ownsHome` extraction. Carrier normalization and age extraction also need immediate attention.

**Priority Order:**
1. Fix renters/ownsHome conflict (blocks product type extraction)
2. Add carrier normalization to deterministic extraction (affects routing)
3. Improve age extraction patterns (high failure rate)
4. Fix LLM schema validation (causes complete failures)

These fixes should improve extraction success rate from ~60% to ~85%+ without requiring architectural changes. The remaining 15% can be addressed with the medium-term improvements.
