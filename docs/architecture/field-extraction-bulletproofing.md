# Field Extraction Bulletproofing Architecture
## Known vs Inferred Pills System

**Status:** Approved for Implementation
**Target Completion:** 2 sprints (14-16 hours development + 4-6 hours testing)
**Priority:** P0 (Blocks MVP launch)
**Last Updated:** 2025-11-13

---

## Executive Summary

Field extraction performance in the conversational intake flow is currently at **~60% success rate**, significantly below the **85%+ target** required for MVP launch. This document outlines a comprehensive **known vs inferred pills architecture** that enables user-curated field extraction through transparent inference rules and broker control.

### The Problem

The current system treats all extracted fields equally, leading to three critical issues:

1. **Pattern Ambiguity** - Text like "renters" can indicate both product type AND home ownership status, but system can only extract one
2. **Low Broker Confidence** - Brokers don't know which fields are high-confidence vs inferred, leading to manual verification overhead
3. **No User Control** - Wrong inferences cannot be dismissed, requiring broker to override in final output

### The Solution: Known vs Inferred Pills

Instead of trying to resolve pattern conflicts with complex logic, we embrace ambiguity and give brokers **transparent control over inferences**:

- **Known Fields**: Extracted directly from user input (deterministic patterns or explicit mentions)
- **Inferred Fields**: Derived from known fields or text patterns (shown separately, dismissible)
- **User Curation**: Broker can dismiss wrong inferences or convert good ones to known fields

### Key Benefits

1. **Transparency**: Broker sees exactly which fields are inferred vs explicitly extracted
2. **Control**: Broker can dismiss wrong inferences with one click ([✕] button)
3. **Simplicity**: No complex pattern conflict resolution logic needed
4. **Accuracy**: Broker validates inferences instead of system guessing
5. **Config-Driven**: Inference rules stored in config files, easy to modify

### Success Metrics

| Metric | Current | Target (Post-Implementation) |
|--------|---------|------------------------------|
| Overall Extraction Accuracy | ~60% | ~85%+ |
| Product Type Extraction | ~70% | ~95% |
| Age Extraction | ~80% | ~98% |
| Carrier Extraction | ~85% | ~95% |
| Broker Confidence in Extractions | Low (requires manual verification) | High (transparent inferences) |
| Inference Dismissal Rate | N/A | <20% (most inferences are correct) |

### Investment

- **Development:** 14-16 hours (2 sprints)
- **Testing:** 4-6 hours (unit + integration + evaluation)
- **Documentation:** 2-3 hours (update affected sections)
- **Total:** ~20-25 hours

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Root Cause Analysis](#2-root-cause-analysis)
3. [Proposed Solution Architecture](#3-proposed-solution-architecture)
4. [UI/UX Specifications](#4-uiux-specifications)
5. [Backend Architecture](#5-backend-architecture)
6. [Config File Structure](#6-config-file-structure)
7. [Implementation Details by Component](#7-implementation-details-by-component)
8. [Testing Strategy](#8-testing-strategy)
9. [Story Extraction Guide](#9-story-extraction-guide)
10. [Architecture Documentation Updates](#10-architecture-documentation-updates)

---

## 1. Current State Analysis

### 1.1 Extraction Architecture Overview

IQuote Pro uses a **hybrid deterministic + LLM extraction architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (pills)                          │
│  extractNormalizedFields() → Batch Extractor → 11 Extractors    │
│  Result: { state, ownsHome, age, ... }                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Pills sent to backend
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (orchestrator)                       │
│  1. Check key-value syntax → Deterministic parser               │
│  2. LLM extraction (receives pills as partialFields)            │
│  3. Merge: { ...llmResult, ...pills } (pills take precedence)   │
│  4. Normalize carrier: "pro" → "PROGRESSIVE"                    │
│  5. Infer existing policies                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Key Files:**
- **Frontend:** [apps/web/src/lib/pill-parser.ts](apps/web/src/lib/pill-parser.ts)
- **Backend Orchestrator:** [apps/api/src/services/conversational-extractor.ts](apps/api/src/services/conversational-extractor.ts)
- **Batch Extractor:** [packages/shared/src/utils/field-normalization/extractors/batch-extractor.ts](packages/shared/src/utils/field-normalization/extractors/batch-extractor.ts)

### 1.2 Current Extraction Flow

**Example:** User types "FL renters. Age 28. Lives alone."

1. **Frontend Pills:**
   - `state: "FL"` (deterministic)
   - `age: 28` (deterministic)
   - ⚠️ **Problem**: "renters" could mean productType OR ownsHome indicator

2. **Backend Processing:**
   - LLM receives partial fields
   - LLM tries to extract remaining fields
   - ⚠️ **Problem**: LLM may interpret "renters" differently than frontend

3. **Final Result:**
   - May have `productType: "renters"` OR `ownsHome: false`, but not both
   - Broker has no visibility into which was chosen or why

### 1.3 Current Issues

1. **Pattern Ambiguity**: Same text matches multiple patterns, system picks one arbitrarily
2. **No Inference Transparency**: Broker doesn't know which fields are high-confidence vs inferred
3. **No User Control**: Broker cannot dismiss wrong inferences without manual override
4. **Complex Conflict Resolution**: Code tries to resolve pattern conflicts with negative lookaheads, context checking, etc. (brittle)

---

## 2. Root Cause Analysis

### 2.1 The Fundamental Problem: Treating All Extractions Equally

**Current Approach:**
- All extracted fields treated the same (no distinction between explicit vs inferred)
- System tries to be "smart" and pick the "right" interpretation
- Broker has no visibility or control

**Why This Fails:**
- Natural language is ambiguous ("renters" = product type OR ownership status)
- System cannot reliably choose the "right" interpretation without context
- Broker cannot validate system's choice without inspecting raw output

### 2.2 Example Failure Case: "FL renters"

**Input:** "FL renters. Age 28. Lives alone. Has SF"

**Current System Behavior:**
1. Frontend extracts: `state: "FL"`, `age: 28`
2. Pattern matches "renters" to `ownsHome: false` (first match wins)
3. productType never extracted → routing fails

**Expected Behavior:**
1. Extract `productType: "renters"` (high confidence, explicit mention)
2. **Infer** `ownsHome: false` from product type (lower confidence, derived)
3. Show broker both fields with clear distinction
4. Broker can dismiss inferred `ownsHome` if wrong

### 2.3 Why Complex Pattern Conflict Resolution Doesn't Work

**Approaches We Rejected:**

1. **Negative Lookaheads**: `/\b(rents|renting)(?!\s+(?:insurance|policy))/i`
   - Brittle: Breaks on variations like "renters coverage", "rental insurance"
   - Complex: Hard to maintain and debug

2. **Context Checking**: Check surrounding words before matching
   - Unreliable: Context can be far from matched text
   - Expensive: Requires scanning text multiple times

3. **Multi-Pattern Evaluation with Confidence Scoring**: Evaluate all patterns, pick highest confidence
   - Complex: Requires confidence scoring logic for all patterns
   - Opaque: Broker doesn't understand why system chose one interpretation

**Better Approach: User-Curated Inferences**
- Extract all matches (don't pick one)
- Show high-confidence matches as "known"
- Show derived matches as "inferred"
- Let broker curate (dismiss or confirm)

---

## 3. Proposed Solution Architecture

### 3.1 Known vs Inferred Pills Philosophy

We distinguish between two types of extracted fields:

1. **Known Fields** (High Confidence):
   - Extracted directly from explicit user input
   - Examples: "FL" → `state: "FL"`, "age 28" → `age: 28`
   - Deterministic patterns with clear matches
   - **User cannot dismiss** (only edit value)

2. **Inferred Fields** (Lower Confidence):
   - Derived from known fields or text patterns
   - Examples: `productType: "renters"` → infer `ownsHome: false`
   - Shown separately with visual distinction
   - **User can dismiss** or **convert to known**

### 3.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  DETERMINISTIC EXTRACTION                        │
│  1. Extract high-confidence patterns → Known Fields              │
│  2. Apply inference rules → Inferred Fields                      │
│  3. Send to backend: { knownFields, suppressedFields }           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND PROCESSING                          │
│  1. Receive: knownFields, suppressedFields                       │
│  2. Apply additional inferences (deterministic rules)            │
│  3. LLM extraction:                                              │
│     - Never modify known fields (read-only)                      │
│     - Can modify inferred fields (delete, edit, upgrade)         │
│  4. Return: { known, inferred, suppressedFields, reasons }       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND UI                              │
│  1. Captured Fields sidebar: Show known + inferred (distinct)    │
│  2. Inferred Fields section: Show inferred below textbox         │
│  3. User actions:                                                │
│     - Click [✕] → Dismiss inferred field (add to suppression)   │
│     - Click [Save Known] → Convert to known + inject pill        │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 User-Curated Inference Flow

**Scenario:** User types "FL renters. Age 28."

1. **Deterministic Extraction**:
   - Known: `state: "FL"`, `productType: "renters"`, `age: 28`
   - Inferred: `ownsHome: false` (from productType="renters")

2. **UI Display**:
   - Captured Fields sidebar shows all 4 fields (inferred is muted + has [✕])
   - Inferred Fields section shows `ownsHome: false` with reasoning

3. **Broker Actions**:
   - **Scenario A**: Inference is correct → Broker clicks [Save Known] → Converts to known field
   - **Scenario B**: Inference is wrong → Broker clicks [✕] → Dismissed (added to suppression)
   - **Scenario C**: Broker ignores → Stays as inferred (included in final output with lower confidence)

### 3.4 Key Advantages

1. **Transparency**: Broker sees which fields are inferred vs explicitly extracted
2. **Control**: Broker can dismiss wrong inferences instantly
3. **Simplicity**: No complex conflict resolution logic needed
4. **Accuracy**: Broker validates inferences, improving over time
5. **Config-Driven**: Inference rules in config files, easy to modify
6. **LLM-Aware**: LLM respects known fields, can improve inferred fields

---

## 4. UI/UX Specifications

### 4.1 Inferred Fields Section (New Component)

**Location:** Between lexical textbox and compliance panel

**Purpose:** Show inferred fields separately from known fields, allow broker to review and curate

**Layout:**

```
┌────────────────────────────────────────────────────────────────────┐
│  Notes Panel (70% width)                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ [Lexical contentEditable text box]                          │  │
│  │                                                              │  │
│  │ Client needs renters insurance in FL. Age 28. Lives alone.  │  │
│  │ [state:FL] [productType:renters] [age:28]                   │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Inferred Fields                                         [−]  │  │
│  │                                                              │  │
│  │ Details:                                                     │  │
│  │ └─ Owns Home: No (75%)  ℹ️ [✕] [Click]                      │  │
│  │ └─ Household Size: 1 (82%)  ℹ️ [✕] [Click]                  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ────────────────────────────────────────────────────────────────  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Compliance: FL Renters Insurance                            │  │
│  │ This quote is an estimate only...                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

**Visual Styling:**

- **Container**: Collapsible card (default: expanded)
- **Background**: `#1a1a1a` (slightly elevated from main panel `#0a0a0a`)
- **Border**: `1px solid #2a2a2a` (top and bottom)
- **Padding**: 16px (matches card padding from front-end-spec)
- **Border radius**: 8px (matches card style)
- **Margin**: 16px 0 (spacing between textbox and compliance)

**Visibility Rules:**

- **Entire section hides** if no inferred fields exist
- **Categories hide** if empty (e.g., if no Details inferences, hide Details category)
- **Always starts expanded** when shown

**Field Row Structure:**

```
└─ Owns Home: No (75%)  ℹ️ [✕] [Click]
```

**Interactive Elements:**

1. **ℹ️ Info Icon**:
   - Size: 14px, opacity 0.6, hover 1.0
   - Tooltip: Shows keyboard shortcut (if applicable)
   - Example: "Owns Home - /o"

2. **[✕] Dismiss Button**:
   - Size: 14px
   - Color: `#ef4444` (red) on hover
   - Action: Removes field from UI, adds to suppression list
   - Tooltip: "Dismiss inference"

3. **[Click] Button**:
   - Style: Small button from shadcn/ui, subtle border
   - Action: Opens modal (3-button version)
   - Tooltip: "Edit or convert to known"

**Confidence Display:**

- Format: `(75%)` in parentheses after value
- Text color: `#737373` (tertiary text color)
- Font size: 12px, italic
- **Only show if confidence < 90%** (minimize visual noise)

**Category Grouping:**

- Group by category: Identity, Location, Product, Details
- Same categories as Captured Fields sidebar
- Empty categories are hidden

### 4.2 Modal Modifications (3-Button Modal)

**When clicking inferred field [Click] button, open existing modal with modified buttons:**

```
┌─────────────────────────────────────────────┐
│  Owns Home (Inferred)                  [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  [Dropdown: No ▼]                           │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Reasoning:                                 │
│  "Renters insurance implies tenant status   │
│   (inferred from product type: renters)"    │
│                                             │
│  Confidence: 75%                            │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  [Delete]  [Save Inferred]  [Save Known]   │
└─────────────────────────────────────────────┘
```

**Modal Title:**

- Format: `{FieldName} (Inferred)` (Option A per user confirmation)
- Example: "Owns Home (Inferred)", "Household Size (Inferred)"
- Color: Normal text color (not muted)

**Modal Body:**

1. **Input Field** (top):
   - Same as existing modal (dropdown, text input, etc.)
   - Pre-filled with current value
   - Editable

2. **Reasoning Section** (middle):
   - Label: "Reasoning:" (bold)
   - Text: Explanation of why field was inferred
   - Example: "Renters insurance implies tenant status (inferred from product type: renters)"
   - Text color: `#a3a3a3` (muted)
   - Font size: 14px

3. **Confidence Score** (if < 90%):
   - Label: "Confidence:"
   - Format: "75%"
   - Text color: `#737373` (tertiary)
   - Font size: 12px, italic

**Modal Buttons (3 buttons, left to right):**

1. **[Delete]**:
   - Style: Destructive button (red outline, no fill)
   - Action:
     1. Remove field from inferred section
     2. Add field name to suppression list
     3. Close modal
   - Keyboard: Delete key
   - Same effect as clicking [✕] in inferred section

2. **[Save Inferred]**:
   - Style: Secondary button (gray outline)
   - Action:
     1. Update inferred value (if changed)
     2. Keep field in inferred section
     3. Stays in muted style
     4. Close modal
   - Keyboard: Cmd+S or Enter (if value changed)
   - Use case: Broker edits inference but doesn't fully trust it yet

3. **[Save Known]**:
   - Style: Primary button (blue fill)
   - Action:
     1. Convert to known field
     2. Add pill to END of lexical textbox: `{fieldKey}:{value}`
     3. Remove from inferred fields section
     4. Update styling in sidebar (normal color, no [✕])
     5. Remove from suppression list (if present)
     6. Close modal
   - Keyboard: Cmd+Shift+S
   - Use case: Broker confirms inference is correct

**Modal Behavior for Known Fields:**

- If clicking a **known field** (from sidebar), modal only shows 2 buttons:
  - [Cancel] [Save]
- No "Reasoning" or "Confidence" sections (known fields don't have these)

### 4.3 Sidebar Changes (Captured Fields)

**Captured Fields section shows both known AND inferred fields, with visual distinction:**

```
┌─────────────────────────────────────┐
│ Captured Fields          [−]        │
│                                     │
│ Location:                           │
│ └─ State: FL  ℹ️ [Click]            │  ← KNOWN (normal color)
│                                     │
│ Product:                            │
│ └─ Type: Renters  ℹ️ [Click]        │  ← KNOWN
│                                     │
│ Details:                            │
│ └─ Age: 28  ℹ️ [Click]              │  ← KNOWN
│ └─ Owns Home: No (75%)  ℹ️ [✕] [Click] │  ← INFERRED (muted)
│ └─ Household: 1 (82%)  ℹ️ [✕] [Click]  │  ← INFERRED
└─────────────────────────────────────┘
```

**Styling Comparison:**

| Aspect | Known Fields | Inferred Fields |
|--------|--------------|-----------------|
| **Text Color** | `#f5f5f5` (primary) | `#a3a3a3` (muted) |
| **Font Weight** | 400 (regular) | 400 (regular) |
| **Interactive Elements** | ℹ️ + [Click] (2 buttons) | ℹ️ + [✕] + [Click] (3 buttons) |
| **Confidence Score** | Hidden | Shown if <90% (e.g., "(75%)") |
| **Tooltip on ℹ️** | "Field Name - /shortcut or Click to edit" | "Field Name - /shortcut or Click to edit/dismiss" |

**Behavior:**

- **Clicking [Click] on known field**: Opens 2-button modal (Cancel, Save)
- **Clicking [Click] on inferred field**: Opens 3-button modal (Delete, Save Inferred, Save Known)
- **Clicking [✕] on inferred field**: Same as clicking [Delete] in modal

### 4.4 Pill Injection on Conversion

**When broker clicks [Save Known] in modal:**

1. **Remove from Inferred Fields section**
2. **Add pill to END of lexical textbox**:
   - Format: `{fieldKey}:{value}` (e.g., `ownsHome:false`)
   - Lexical node type: `PillNode` (same as existing pills)
   - Styling: Green pill (valid known field)
   - Position: Append to end of text, preceded by space if needed

3. **Update Captured Fields sidebar**:
   - Change styling to normal (no mute, no [✕])
   - Move to appropriate category (if not already there)

**Example Flow:**

**Before conversion:**
```
Lexical textbox:
Client needs renters in FL. Age 28. Lives alone. [state:FL]
[productType:renters] [age:28]

Inferred Fields section:
└─ Owns Home: No (75%)  ℹ️ [✕] [Click]
└─ Household Size: 1 (82%)  ℹ️ [✕] [Click]

Captured Fields sidebar:
└─ Owns Home: No (75%)  ℹ️ [✕] [Click]  ← muted
```

**After clicking [Save Known] on Owns Home:**
```
Lexical textbox:
Client needs renters in FL. Age 28. Lives alone. [state:FL]
[productType:renters] [age:28] [ownsHome:false]  ← NEW PILL

Inferred Fields section:
└─ Household Size: 1 (82%)  ℹ️ [✕] [Click]  ← only one left

Captured Fields sidebar:
└─ Owns Home: No  ℹ️ [Click]  ← normal style, no [✕]
```

---

## 5. Backend Architecture

### 5.1 API Request/Response Changes

**Request Structure:**

```typescript
POST /api/intake
{
  message: "FL renters. Age 28. Lives alone.",
  knownFields: {
    state: "FL",
    productType: "renters",
    age: 28
  },
  suppressedFields: ["drivers"] // Fields user has explicitly dismissed
}
```

**Response Structure:**

```typescript
{
  extraction: {
    method: "hybrid",
    known: {
      state: "FL",
      productType: "renters",
      age: 28
    },
    inferred: {
      ownsHome: false,
      householdSize: 1
    },
    suppressedFields: ["drivers"], // Echo back + any new suppressions
    inferenceReasons: {
      ownsHome: "Renters insurance implies tenant status (inferred from product type: renters)",
      householdSize: "Lives alone implies household size of 1 (inferred from text pattern)"
    },
    confidence: {
      ownsHome: 0.75,
      householdSize: 0.82
    }
  },
  routing: { /* ... existing routing data ... */ },
  // ... rest of IntakeResult
}
```

### 5.2 Inference Engine Architecture

**Location:** `packages/shared/src/services/inference-engine.ts` (new file)

**Purpose:** Apply deterministic inference rules to known fields

**Flow:**

```typescript
export class InferenceEngine {
  constructor(
    private fieldInferences: FieldInferenceRules, // from unified-field-metadata
    private textPatternInferences: TextPatternInference[], // from config
    private suppressedFields: string[] // from request
  ) {}

  /**
   * Apply all inference rules to known fields and text
   * Returns: { inferredFields, inferenceReasons, confidence }
   */
  applyInferences(
    knownFields: Partial<UserProfile>,
    inputText: string
  ): InferenceResult {
    const inferred: Partial<UserProfile> = {}
    const reasons: Record<string, string> = {}
    const confidence: Record<string, number> = {}

    // Step 1: Field-to-field inferences (from known fields)
    for (const [fieldName, fieldValue] of Object.entries(knownFields)) {
      const metadata = this.fieldInferences[fieldName]
      if (!metadata?.infers) continue

      for (const rule of metadata.infers) {
        // Skip if target field already known or suppressed
        if (knownFields[rule.targetField] !== undefined) continue
        if (this.suppressedFields.includes(rule.targetField)) continue

        const inferredValue = rule.inferValue(fieldValue)
        if (inferredValue !== undefined) {
          inferred[rule.targetField] = inferredValue
          reasons[rule.targetField] = rule.reasoning
          confidence[rule.targetField] = this.confidenceToNumber(rule.confidence)
        }
      }
    }

    // Step 2: Text pattern inferences (from input text)
    for (const pattern of this.textPatternInferences) {
      const match = inputText.match(pattern.pattern)
      if (!match) continue

      for (const inference of pattern.infers) {
        // Skip if field already known or suppressed
        if (knownFields[inference.field] !== undefined) continue
        if (inferred[inference.field] !== undefined) continue // Already inferred from field-to-field
        if (this.suppressedFields.includes(inference.field)) continue

        // Handle capture group references (e.g., "$2" means capture group 2)
        let value = inference.value
        if (typeof value === 'string' && value.startsWith('$')) {
          const captureGroupIndex = parseInt(value.substring(1))
          value = match[captureGroupIndex]
        }

        inferred[inference.field] = value
        reasons[inference.field] = inference.reasoning
        confidence[inference.field] = this.confidenceToNumber(inference.confidence)
      }
    }

    return { inferred, reasons, confidence }
  }

  private confidenceToNumber(level: 'high' | 'medium' | 'low'): number {
    switch (level) {
      case 'high': return 0.85
      case 'medium': return 0.70
      case 'low': return 0.50
    }
  }
}
```

### 5.3 LLM Prompt Updates

**System Prompt Changes:**

```
CRITICAL RULES FOR FIELD EXTRACTION:

1. KNOWN FIELDS (read-only):
   - Never modify, delete, or contradict known fields
   - Known fields are explicitly extracted from user input
   - Known fields: {JSON.stringify(knownFields)}

2. INFERRED FIELDS (can modify):
   - You may confirm, edit, or delete inferred fields based on context
   - Only modify if you have explicit evidence in the text
   - Current inferred fields: {JSON.stringify(inferredFields)}

3. SUPPRESSED FIELDS (never infer):
   - Do not infer or suggest these fields: {suppressedFields.join(', ')}
   - User has explicitly rejected these inferences

4. CONFIDENCE LEVELS:
   - High confidence (≥85%): Explicit mention in text
   - Medium confidence (70-84%): Strong contextual evidence
   - Low confidence (<70%): Weak or ambiguous evidence
   - If confidence ≥85%, you may upgrade inferred field to known

5. EXTRACTION PRIORITY:
   - Focus on filling missing required fields
   - Confirm or improve existing inferred fields if you have better evidence
   - Do not hallucinate values - only extract what is explicitly stated
```

**User Prompt Updates:**

```
Extract insurance shopper information from the following message.

Already Known (do not modify):
{JSON.stringify(knownFields, null, 2)}

Currently Inferred (you may modify):
{JSON.stringify(inferredFields, null, 2)}

Suppressed (do not infer):
{suppressedFields.join(', ')}

User Message:
{message}

Extract any additional fields not already known. For inferred fields, you may:
- Confirm with same value if text supports it
- Edit if text provides better/different value
- Delete if text contradicts the inference
- Upgrade to known if confidence ≥85%

Return JSON with:
- known: fields with high confidence (≥85%)
- inferred: fields with medium/low confidence (<85%)
- confidence: confidence scores for each inferred field
- reasoning: explanation for each inferred field
```

### 5.4 Suppression List Management

**Storage:** Session-scoped only (no localStorage or database)

**Lifecycle:**
- **Created**: Empty array on session start
- **Updated**: When user clicks [✕] or [Delete] on inferred field
- **Cleared**: On `/reset` or page refresh
- **Overridden**: If broker types explicit value for suppressed field (converts to known)

**Implementation:**

```typescript
// Frontend: src/lib/suppression-manager.ts
export class SuppressionManager {
  private suppressedFields: string[] = []

  addSuppression(fieldName: string) {
    if (!this.suppressedFields.includes(fieldName)) {
      this.suppressedFields.push(fieldName)
    }
  }

  removeSuppression(fieldName: string) {
    this.suppressedFields = this.suppressedFields.filter(f => f !== fieldName)
  }

  isSuppressed(fieldName: string): boolean {
    return this.suppressedFields.includes(fieldName)
  }

  getAll(): string[] {
    return [...this.suppressedFields]
  }

  clear() {
    this.suppressedFields = []
  }
}
```

**Backend Integration:**

```typescript
// Backend receives suppressedFields in request
const inferenceEngine = new InferenceEngine(
  fieldInferences,
  textPatternInferences,
  request.suppressedFields || []
)

// Inference engine skips suppressed fields
const { inferred, reasons, confidence } = inferenceEngine.applyInferences(
  request.knownFields,
  request.message
)
```

---

## 6. Config File Structure

### 6.1 Field Metadata Extension

**File:** `packages/shared/src/schemas/unified-field-metadata.ts`

**Add `infers` property to UnifiedFieldMetadata interface:**

```typescript
export interface UnifiedFieldMetadata {
  shortcut: string
  label: string
  question: string
  description?: string
  category: string
  fieldType: 'string' | 'numeric' | 'date' | 'object' | 'boolean'
  aliases?: string[]
  flows: ('intake' | 'policy')[]
  nestedFields?: Record<string, UnifiedFieldMetadata>
  min?: number
  max?: number

  // NEW: Inference rules for field-to-field inferences
  infers?: InferenceRule[]
}

export interface InferenceRule {
  targetField: string // Field name to infer (e.g., "ownsHome")
  inferValue: (sourceValue: any) => any // Function to compute inferred value
  confidence: 'high' | 'medium' | 'low' // Confidence level
  reasoning: string // Why this inference is made (for UI tooltip)
}
```

**Example Usage:**

```typescript
// In field-metadata/shared-fields.ts
productType: {
  shortcut: 'p',
  label: 'Product Type',
  question: 'What type of insurance does the client need?',
  description: 'Type of insurance product (auto, home, renters, umbrella)',
  category: 'Product',
  fieldType: 'string',
  aliases: ['product', 'type'],
  flows: ['intake', 'policy'],

  // NEW: Inference rules
  infers: [
    {
      targetField: 'ownsHome',
      inferValue: (productType) => {
        if (productType === 'renters') return false
        if (productType === 'home') return true
        return undefined // No inference for other product types
      },
      confidence: 'high',
      reasoning: 'Renters insurance implies tenant status; home insurance implies ownership'
    }
  ]
}
```

### 6.2 Text Pattern Inferences Config

**File:** `packages/shared/src/config/text-pattern-inferences.ts` (new file)

**Purpose:** Define pattern-based inferences that don't depend on field values

```typescript
export interface TextPatternInference {
  pattern: RegExp // Pattern to match in input text
  infers: Array<{
    field: string // Field name to infer
    value: any // Value to infer (or "$N" for capture group reference)
    confidence: 'high' | 'medium' | 'low'
    reasoning: string
  }>
}

export const TEXT_PATTERN_INFERENCES: TextPatternInference[] = [
  // "Lives alone" → householdSize: 1
  {
    pattern: /\b(lives?\s+alone|single|solo)\b/i,
    infers: [
      {
        field: 'householdSize',
        value: 1,
        confidence: 'medium',
        reasoning: 'Lives alone implies household size of 1 (inferred from text pattern)'
      }
    ]
  },

  // "Family of N" → householdSize: N
  {
    pattern: /\bfamily\s+of\s+(\d+)\b/i,
    infers: [
      {
        field: 'householdSize',
        value: '$1', // Capture group 1
        confidence: 'high',
        reasoning: 'Explicit family size mentioned (inferred from text pattern)'
      }
    ]
  },

  // "Clean record" → cleanRecord5Yr: true
  {
    pattern: /\bclean\s+(?:driving\s+)?record\b/i,
    infers: [
      {
        field: 'cleanRecord5Yr',
        value: true,
        confidence: 'medium',
        reasoning: 'Clean driving record mentioned (inferred from text pattern)'
      }
    ]
  },

  // Add more patterns as POC proves useful
  // Keep list small to start (3-5 patterns max)
]
```

### 6.3 Config Loading

**Backend:** Load on server startup (async)

```typescript
// Backend: src/config/index.ts
import { unifiedFieldMetadata } from '@repo/shared/schemas/unified-field-metadata'
import { TEXT_PATTERN_INFERENCES } from '@repo/shared/config/text-pattern-inferences'

export function loadInferenceConfig() {
  // Build field-to-field inference map
  const fieldInferences: Record<string, InferenceRule[]> = {}

  for (const [fieldName, metadata] of Object.entries(unifiedFieldMetadata)) {
    if (metadata.infers) {
      fieldInferences[fieldName] = metadata.infers
    }
  }

  return {
    fieldInferences,
    textPatternInferences: TEXT_PATTERN_INFERENCES
  }
}
```

**Frontend:** Load on component mount

```typescript
// Frontend: src/hooks/useInferenceConfig.ts
export function useInferenceConfig() {
  const { data: config } = useQuery({
    queryKey: ['inference-config'],
    queryFn: async () => {
      const res = await fetch('/api/config/inferences')
      return res.json()
    },
    staleTime: Infinity // Never refetch (static config)
  })

  return config
}
```

---

## 7. Implementation Details by Component

### 7.1 Shared Package Changes

**Location:** `packages/shared/src/`

**Files to Create:**

1. **`config/text-pattern-inferences.ts`** (new):
   - Export `TEXT_PATTERN_INFERENCES` array
   - POC: 3-5 text patterns (lives alone, family of N, clean record)

2. **`services/inference-engine.ts`** (new):
   - Export `InferenceEngine` class
   - Methods: `applyInferences()`, `confidenceToNumber()`
   - Pure functions, no side effects

**Files to Modify:**

1. **`schemas/unified-field-metadata.ts`**:
   - Add `infers?: InferenceRule[]` property
   - Export `InferenceRule` interface

2. **`schemas/field-metadata/shared-fields.ts`**:
   - Add `infers` rules to `productType` field (renters → ownsHome:false)
   - Keep POC simple: 1-2 rules only

3. **`types/intake-result.ts`**:
   - Update `IntakeResult.extraction` to include:
     - `known: Partial<UserProfile>`
     - `inferred: Partial<UserProfile>`
     - `inferenceReasons: Record<string, string>`
     - `confidence: Record<string, number>`

**Dependencies:**
- No new external dependencies
- Reuse existing types and utilities

### 7.2 Frontend Changes

**Location:** `apps/web/src/`

**Files to Create:**

1. **`components/notes/InferredFieldsSection.tsx`** (new):
   - Collapsible card component
   - Shows inferred fields grouped by category
   - Hides entire section if no inferences
   - Interactive elements: ℹ️ + [✕] + [Click]

2. **`lib/suppression-manager.ts`** (new):
   - Export `SuppressionManager` class
   - Methods: `addSuppression()`, `removeSuppression()`, `isSuppressed()`, `getAll()`, `clear()`
   - Session-scoped state management

3. **`components/modals/InferredFieldModal.tsx`** (new):
   - 3-button modal (Delete, Save Inferred, Save Known)
   - Shows reasoning and confidence
   - Handles pill injection on "Save Known"

**Files to Modify:**

1. **`components/notes/NotesPanel.tsx`**:
   - Add `<InferredFieldsSection>` component below lexical textbox
   - Pass `inferredFields`, `inferenceReasons`, `confidence` as props

2. **`components/sidebar/CapturedFields.tsx`**:
   - Add visual distinction for inferred fields (muted + [✕] button)
   - Conditionally render 2 vs 3 buttons based on known/inferred

3. **`components/modals/FieldModal.tsx`**:
   - Add `isInferred` prop to conditionally show reasoning/confidence
   - Add 3-button layout for inferred fields
   - Implement "Save Known" action (pill injection)

4. **`lib/pill-parser.ts`**:
   - Integrate with `InferenceEngine` from shared package
   - Apply inference rules after deterministic extraction
   - Return separate `known` and `inferred` objects

5. **`hooks/useIntake.ts`** (or equivalent API hook):
   - Update API request to send `knownFields` + `suppressedFields`
   - Update response handling to receive `known` + `inferred` + `reasons` + `confidence`

**Lexical Integration (Pill Injection):**

```typescript
// In InferredFieldModal.tsx, "Save Known" handler
function handleSaveKnown() {
  const editor = lexicalEditorRef.current

  editor.update(() => {
    // Get root node
    const root = $getRoot()

    // Find last paragraph node (or create one)
    const lastChild = root.getLastChild()
    let paragraph = lastChild instanceof ParagraphNode
      ? lastChild
      : root.append($createParagraphNode())

    // Add space if last node is not whitespace
    const lastNode = paragraph.getLastChild()
    if (lastNode && !lastNode.getTextContent().endsWith(' ')) {
      paragraph.append($createTextNode(' '))
    }

    // Create pill node
    const pillNode = $createPillNode({
      key: fieldKey,
      value: fieldValue,
      isValid: true
    })

    // Append pill
    paragraph.append(pillNode)

    // Focus at end
    const selection = $createRangeSelection()
    selection.focus.set(paragraph.getKey(), paragraph.getChildrenSize(), 'element')
    $setSelection(selection)
  })

  // Update state: remove from inferred, add to known
  updateKnownFields({ [fieldKey]: fieldValue })
  removeInferredField(fieldKey)
  removeSuppressionIfPresent(fieldKey)

  closeModal()
}
```

### 7.3 Backend Changes

**Location:** `apps/api/src/`

**Files to Create:**

1. **`routes/config.ts`** (new):
   - `GET /api/config/inferences` - Return inference config for frontend

**Files to Modify:**

1. **`services/conversational-extractor.ts`**:
   - Import `InferenceEngine` from shared package
   - Apply inference rules after deterministic extraction
   - Update LLM prompt to include known/inferred/suppressed fields
   - Update response to return separate `known` + `inferred` objects

2. **`prompts/conversational-extraction-system.txt`**:
   - Add critical rules section (never modify known, can modify inferred, respect suppression)

3. **`prompts/conversational-extraction-user.txt`**:
   - Add sections for already known, currently inferred, suppressed fields
   - Update extraction instructions

**Backend Flow (Updated):**

```typescript
// In conversational-extractor.ts
export async function extractFromMessage(
  message: string,
  knownFields: Partial<UserProfile>,
  suppressedFields: string[]
): Promise<ExtractionResult> {
  // Step 1: Apply deterministic inferences
  const inferenceConfig = loadInferenceConfig()
  const inferenceEngine = new InferenceEngine(
    inferenceConfig.fieldInferences,
    inferenceConfig.textPatternInferences,
    suppressedFields
  )

  const { inferred, reasons, confidence } = inferenceEngine.applyInferences(
    knownFields,
    message
  )

  // Step 2: LLM extraction (aware of known/inferred/suppressed)
  const llmResult = await llmProvider.extractWithStructuredOutput({
    systemPrompt: buildSystemPrompt(),
    userPrompt: buildUserPrompt(message, knownFields, inferred, suppressedFields),
    schema: userProfileSchema
  })

  // Step 3: Merge LLM results with existing known/inferred
  // LLM can upgrade inferred → known if confidence ≥85%
  const finalKnown = { ...knownFields, ...llmResult.known }
  const finalInferred = { ...inferred, ...llmResult.inferred }

  // Step 4: Normalize carrier names, infer policies, etc.
  // (existing post-processing logic)

  return {
    known: finalKnown,
    inferred: finalInferred,
    suppressedFields,
    inferenceReasons: { ...reasons, ...llmResult.reasoning },
    confidence: { ...confidence, ...llmResult.confidence }
  }
}
```

---

## 8. Testing Strategy

### 8.1 Unit Testing

**Inference Engine Tests:**

```typescript
// packages/shared/src/services/inference-engine.test.ts
describe('InferenceEngine', () => {
  describe('Field-to-field inferences', () => {
    it('should infer ownsHome:false from productType:renters', () => {
      const engine = new InferenceEngine(fieldInferences, [], [])
      const result = engine.applyInferences({ productType: 'renters' }, '')

      expect(result.inferred.ownsHome).toBe(false)
      expect(result.reasons.ownsHome).toContain('Renters insurance implies tenant status')
      expect(result.confidence.ownsHome).toBe(0.85) // high confidence
    })

    it('should not infer if target field already known', () => {
      const engine = new InferenceEngine(fieldInferences, [], [])
      const result = engine.applyInferences(
        { productType: 'renters', ownsHome: true },
        ''
      )

      expect(result.inferred.ownsHome).toBeUndefined() // Already known
    })

    it('should not infer if target field suppressed', () => {
      const engine = new InferenceEngine(fieldInferences, [], ['ownsHome'])
      const result = engine.applyInferences({ productType: 'renters' }, '')

      expect(result.inferred.ownsHome).toBeUndefined() // Suppressed
    })
  })

  describe('Text pattern inferences', () => {
    it('should infer householdSize:1 from "lives alone"', () => {
      const engine = new InferenceEngine({}, textPatternInferences, [])
      const result = engine.applyInferences({}, 'Client lives alone in FL')

      expect(result.inferred.householdSize).toBe(1)
      expect(result.reasons.householdSize).toContain('Lives alone implies household size')
      expect(result.confidence.householdSize).toBe(0.70) // medium confidence
    })

    it('should infer householdSize from "family of N"', () => {
      const engine = new InferenceEngine({}, textPatternInferences, [])
      const result = engine.applyInferences({}, 'Family of 4 in CA')

      expect(result.inferred.householdSize).toBe(4)
      expect(result.confidence.householdSize).toBe(0.85) // high confidence
    })
  })
})
```

**Suppression Manager Tests:**

```typescript
// apps/web/src/lib/suppression-manager.test.ts
describe('SuppressionManager', () => {
  it('should add field to suppression list', () => {
    const manager = new SuppressionManager()
    manager.addSuppression('ownsHome')

    expect(manager.isSuppressed('ownsHome')).toBe(true)
    expect(manager.getAll()).toEqual(['ownsHome'])
  })

  it('should not duplicate suppressions', () => {
    const manager = new SuppressionManager()
    manager.addSuppression('ownsHome')
    manager.addSuppression('ownsHome')

    expect(manager.getAll()).toEqual(['ownsHome']) // No duplicate
  })

  it('should remove field from suppression list', () => {
    const manager = new SuppressionManager()
    manager.addSuppression('ownsHome')
    manager.removeSuppression('ownsHome')

    expect(manager.isSuppressed('ownsHome')).toBe(false)
    expect(manager.getAll()).toEqual([])
  })
})
```

### 8.2 Integration Testing

**Full Extraction Flow Tests:**

```typescript
// apps/api/src/services/conversational-extractor.test.ts
describe('Conversational Extractor - Known vs Inferred', () => {
  it('should return separate known and inferred fields', async () => {
    const result = await extractFromMessage(
      'FL renters. Age 28. Lives alone.',
      {},
      []
    )

    // Known fields (explicit extraction)
    expect(result.known.state).toBe('FL')
    expect(result.known.productType).toBe('renters')
    expect(result.known.age).toBe(28)

    // Inferred fields (derived)
    expect(result.inferred.ownsHome).toBe(false)
    expect(result.inferred.householdSize).toBe(1)

    // Inference reasons
    expect(result.inferenceReasons.ownsHome).toContain('Renters insurance')
    expect(result.inferenceReasons.householdSize).toContain('Lives alone')

    // Confidence scores
    expect(result.confidence.ownsHome).toBeGreaterThan(0.8)
    expect(result.confidence.householdSize).toBeGreaterThan(0.6)
  })

  it('should respect suppression list', async () => {
    const result = await extractFromMessage(
      'FL renters. Age 28.',
      {},
      ['ownsHome'] // Suppress ownsHome inference
    )

    expect(result.known.productType).toBe('renters')
    expect(result.inferred.ownsHome).toBeUndefined() // Suppressed
  })

  it('should not infer if field already known', async () => {
    const result = await extractFromMessage(
      'FL renters. Age 28.',
      { ownsHome: true }, // Already known (user confirmed they own)
      []
    )

    expect(result.known.ownsHome).toBe(true) // Keep known value
    expect(result.inferred.ownsHome).toBeUndefined() // Don't infer
  })

  it('should allow LLM to upgrade inferred to known', async () => {
    // Mock LLM to return high confidence for ownsHome
    mockLLM({ known: { ownsHome: false }, confidence: { ownsHome: 0.95 } })

    const result = await extractFromMessage(
      'FL renters. Age 28. I rent an apartment.',
      {},
      []
    )

    // LLM found explicit mention, upgraded to known
    expect(result.known.ownsHome).toBe(false)
    expect(result.inferred.ownsHome).toBeUndefined()
  })
})
```

**Frontend UI Tests:**

```typescript
// apps/web/src/components/notes/InferredFieldsSection.test.tsx
describe('InferredFieldsSection', () => {
  it('should hide section if no inferred fields', () => {
    const { container } = render(
      <InferredFieldsSection inferredFields={{}} reasons={{}} confidence={{}} />
    )

    expect(container.querySelector('.inferred-fields-section')).toBeNull()
  })

  it('should show inferred fields grouped by category', () => {
    const { getByText } = render(
      <InferredFieldsSection
        inferredFields={{ ownsHome: false, householdSize: 1 }}
        reasons={{
          ownsHome: 'Renters insurance implies tenant status',
          householdSize: 'Lives alone implies household size of 1'
        }}
        confidence={{ ownsHome: 0.75, householdSize: 0.82 }}
      />
    )

    expect(getByText('Details:')).toBeInTheDocument()
    expect(getByText(/Owns Home: No/)).toBeInTheDocument()
    expect(getByText(/Household Size: 1/)).toBeInTheDocument()
  })

  it('should call onDismiss when clicking [✕] button', () => {
    const onDismiss = jest.fn()
    const { getByLabelText } = render(
      <InferredFieldsSection
        inferredFields={{ ownsHome: false }}
        reasons={{ ownsHome: 'Reason' }}
        confidence={{ ownsHome: 0.75 }}
        onDismiss={onDismiss}
      />
    )

    fireEvent.click(getByLabelText('Dismiss inference'))

    expect(onDismiss).toHaveBeenCalledWith('ownsHome')
  })
})

// apps/web/src/components/modals/InferredFieldModal.test.tsx
describe('InferredFieldModal - 3 buttons', () => {
  it('should show 3 buttons for inferred fields', () => {
    const { getByText } = render(
      <InferredFieldModal
        field="ownsHome"
        value={false}
        isInferred={true}
        reasoning="Renters insurance implies tenant status"
        confidence={0.75}
      />
    )

    expect(getByText('Delete')).toBeInTheDocument()
    expect(getByText('Save Inferred')).toBeInTheDocument()
    expect(getByText('Save Known')).toBeInTheDocument()
  })

  it('should inject pill when clicking Save Known', async () => {
    const onSaveKnown = jest.fn()
    const { getByText } = render(
      <InferredFieldModal
        field="ownsHome"
        value={false}
        isInferred={true}
        onSaveKnown={onSaveKnown}
      />
    )

    fireEvent.click(getByText('Save Known'))

    await waitFor(() => {
      expect(onSaveKnown).toHaveBeenCalledWith('ownsHome', false)
      // Verify pill injection in lexical editor (separate test)
    })
  })
})
```

### 8.3 Evaluation Framework Testing

**Run evaluation suite before and after implementation:**

```bash
# Before implementation (baseline)
bun run eval > baseline-results.json

# After implementation
bun run eval > after-results.json

# Compare results
bun run eval:compare baseline-results.json after-results.json
```

**Test Cases to Add:**

1. **Renters inference test**:
   - Input: "FL renters. Age 28."
   - Expected known: state, productType, age
   - Expected inferred: ownsHome=false

2. **Lives alone inference test**:
   - Input: "CA auto. Age 35. Lives alone."
   - Expected known: state, productType, age
   - Expected inferred: householdSize=1

3. **Suppression test**:
   - Input: "FL renters" (after dismissing ownsHome once)
   - Expected: ownsHome NOT inferred (suppressed)

4. **Conversion test**:
   - Input: "FL renters" → broker converts ownsHome to known
   - Expected: ownsHome appears in known fields, pill added to text

**Success Metrics:**
- Overall extraction accuracy: 60% → 85%+
- Inference dismissal rate: <20% (most inferences are correct)
- Broker satisfaction: Qualitative feedback on transparency/control

---

## 9. Story Extraction Guide

### 9.1 Story Breakdown

#### Story 1: Create Inference Config Files

**Epic:** Field Extraction Bulletproofing
**Priority:** P0 (Critical - blocks other stories)
**Estimate:** 2 story points (~2 hours)

**Description:**
Create config file structure for inference rules (field-to-field + text patterns). Add `infers` property to unified field metadata.

**Acceptance Criteria:**
- [ ] `packages/shared/src/config/text-pattern-inferences.ts` created
- [ ] Export `TEXT_PATTERN_INFERENCES` array with 3-5 POC patterns
- [ ] `unified-field-metadata.ts` extended with `infers` property
- [ ] `InferenceRule` interface exported
- [ ] `productType` field has `infers` rule for ownsHome
- [ ] All TypeScript compilation passes
- [ ] Config files have JSDoc comments explaining usage

**Technical Approach:**
1. Create text-pattern-inferences.ts with POC patterns:
   - "lives alone" → householdSize: 1
   - "family of N" → householdSize: N
   - "clean record" → cleanRecord5Yr: true
2. Update unified-field-metadata.ts interface
3. Add `infers` rule to productType field in shared-fields.ts

**Files to Create:**
- `packages/shared/src/config/text-pattern-inferences.ts`

**Files to Modify:**
- `packages/shared/src/schemas/unified-field-metadata.ts`
- `packages/shared/src/schemas/field-metadata/shared-fields.ts`

**Tests to Add:**
- Unit tests for config file imports (verify structure)

---

#### Story 2: Implement Deterministic Inference Engine

**Epic:** Field Extraction Bulletproofing
**Priority:** P0 (Critical)
**Estimate:** 3 story points (~3 hours)

**Description:**
Create InferenceEngine class that applies deterministic inference rules to known fields and text patterns. Respects suppression list.

**Acceptance Criteria:**
- [ ] `packages/shared/src/services/inference-engine.ts` created
- [ ] `InferenceEngine` class implemented with `applyInferences()` method
- [ ] Field-to-field inferences work (productType → ownsHome)
- [ ] Text pattern inferences work ("lives alone" → householdSize)
- [ ] Suppression list respected (skips suppressed fields)
- [ ] Returns inference reasons and confidence scores
- [ ] All unit tests pass (>90% coverage)

**Technical Approach:**
1. Create InferenceEngine class with constructor accepting:
   - fieldInferences (from metadata)
   - textPatternInferences (from config)
   - suppressedFields (from request)
2. Implement `applyInferences(knownFields, inputText)` method:
   - Step 1: Apply field-to-field rules
   - Step 2: Apply text pattern rules
   - Skip if field already known or suppressed
3. Return `{ inferred, reasons, confidence }`

**Implementation Notes:**

**Pattern Optimization Opportunity:**

Story 1 currently uses two separate patterns for "years clean" detection:
- Pattern A: `/\b[3-4]\s+years?\s+clean/i` → infers `cleanRecord3Yr: true`
- Pattern B: `/\b(?:5|[6-9]|\d{2,})\s+years?\s+clean/i` → infers `cleanRecord5Yr: true`

This approach works but could be optimized in this story by:
1. Combining into single pattern: `/\b(\d+)\s+years?\s+clean/i`
2. Adding conditional logic in InferenceEngine to handle capture groups:
   ```typescript
   const yearCount = parseInt(match[1])
   if (yearCount >= 5) {
     inferred['cleanRecord5Yr'] = true
   } else if (yearCount >= 3) {
     inferred['cleanRecord3Yr'] = true
   }
   ```
3. Potentially inferring BOTH fields (e.g., "5 years clean" → cleanRecord3Yr AND cleanRecord5Yr)

**Decision:** Leave as two patterns for POC simplicity. Consider optimization in production if needed.

**Files to Create:**
- `packages/shared/src/services/inference-engine.ts`
- `packages/shared/src/services/inference-engine.test.ts`

**Tests to Add:**
- Field-to-field inference tests
- Text pattern inference tests
- Suppression list tests
- Confidence score tests
- Capture group resolution tests (if pattern optimization is implemented)

---

#### Story 3: Add Inferred Fields Section to UI

**Epic:** Field Extraction Bulletproofing
**Priority:** P0 (Critical)
**Estimate:** 3 story points (~3 hours)

**Description:**
Create InferredFieldsSection component that displays inferred fields below lexical textbox, grouped by category, with dismiss and edit functionality.

**Acceptance Criteria:**
- [ ] `apps/web/src/components/notes/InferredFieldsSection.tsx` created
- [ ] Section hides entirely if no inferred fields
- [ ] Categories hide if empty
- [ ] Fields grouped by category (Identity, Location, Product, Details)
- [ ] Each field shows: value, confidence (if <90%), ℹ️, [✕], [Click]
- [ ] Confidence shown as "(75%)" in parentheses
- [ ] Styling matches front-end-spec.md (muted colors, correct spacing)
- [ ] All component tests pass

**Technical Approach:**
1. Create collapsible card component
2. Group fields by category (load from metadata)
3. Render field rows with 3 interactive elements
4. Hide section if inferredFields is empty
5. Style with muted colors (#a3a3a3 for text)

**Files to Create:**
- `apps/web/src/components/notes/InferredFieldsSection.tsx`
- `apps/web/src/components/notes/InferredFieldsSection.test.tsx`

**Files to Modify:**
- `apps/web/src/components/notes/NotesPanel.tsx` (add InferredFieldsSection)

**Tests to Add:**
- Visibility tests (hide if empty, hide categories if empty)
- Grouping tests (fields grouped by category)
- Interactive element tests (click handlers)

---

#### Story 4: Modify Field Modal with 3-Button Behavior

**Epic:** Field Extraction Bulletproofing
**Priority:** P0 (Critical)
**Estimate:** 4 story points (~4 hours)

**Description:**
Update field modal to show 3 buttons for inferred fields (Delete, Save Inferred, Save Known) and display reasoning + confidence.

**Acceptance Criteria:**
- [ ] Modal title shows "(Inferred)" for inferred fields
- [ ] Reasoning section displayed below input field
- [ ] Confidence score displayed (if <90%)
- [ ] 3 buttons shown: [Delete] [Save Inferred] [Save Known]
- [ ] [Delete] removes field, adds to suppression list
- [ ] [Save Inferred] updates value, keeps as inferred
- [ ] [Save Known] converts to known (pill injection happens)
- [ ] Known fields still show 2-button modal (Cancel, Save)
- [ ] All modal tests pass

**Technical Approach:**
1. Add `isInferred` prop to FieldModal component
2. Conditionally render reasoning/confidence sections
3. Conditionally render 3-button vs 2-button layout
4. Implement button handlers:
   - Delete: call onDismiss callback
   - Save Inferred: call onSaveInferred callback
   - Save Known: call onSaveKnown callback (pill injection in Story 5)

**Files to Create:**
- `apps/web/src/components/modals/InferredFieldModal.tsx` (or merge into existing FieldModal)
- `apps/web/src/components/modals/InferredFieldModal.test.tsx`

**Files to Modify:**
- `apps/web/src/components/modals/FieldModal.tsx` (if merging)

**Tests to Add:**
- 3-button layout tests
- Reasoning/confidence display tests
- Button handler tests

---

#### Story 5: Implement Pill Injection on "Save Known"

**Epic:** Field Extraction Bulletproofing
**Priority:** P0 (Critical)
**Estimate:** 3 story points (~3 hours)

**Description:**
Implement pill injection into lexical textbox when broker converts inferred field to known. Pill appended to end of text.

**Acceptance Criteria:**
- [ ] Clicking [Save Known] injects pill at END of lexical text
- [ ] Pill format: `{fieldKey}:{value}` (e.g., `ownsHome:false`)
- [ ] Pill styled as green valid pill
- [ ] Space added before pill if needed
- [ ] Cursor positioned after pill
- [ ] Field removed from inferred section
- [ ] Field updated in sidebar (normal style, no [✕])
- [ ] All pill injection tests pass

**Technical Approach:**
1. Get lexical editor reference
2. Use `editor.update()` to modify document:
   - Find last paragraph node
   - Add space if needed
   - Create PillNode with key/value
   - Append to paragraph
   - Set cursor position
3. Update state: remove from inferred, add to known

**Files to Modify:**
- `apps/web/src/components/modals/InferredFieldModal.tsx` (handleSaveKnown)
- `apps/web/src/hooks/usePillInjection.ts` (new hook for lexical manipulation)

**Tests to Add:**
- Pill injection tests (verify lexical state)
- State update tests (inferred → known)
- Cursor positioning tests

---

#### Story 6: Update Sidebar to Show Known vs Inferred Styling

**Epic:** Field Extraction Bulletproofing
**Priority:** P0 (Critical)
**Estimate:** 2 story points (~2 hours)

**Description:**
Update Captured Fields sidebar to visually distinguish known vs inferred fields. Inferred fields are muted with [✕] button.

**Acceptance Criteria:**
- [ ] Known fields: normal color (#f5f5f5), 2 buttons (ℹ️ + [Click])
- [ ] Inferred fields: muted color (#a3a3a3), 3 buttons (ℹ️ + [✕] + [Click])
- [ ] Confidence shown for inferred fields (if <90%)
- [ ] [✕] button calls onDismiss handler
- [ ] Clicking known field opens 2-button modal
- [ ] Clicking inferred field opens 3-button modal
- [ ] All sidebar styling tests pass

**Technical Approach:**
1. Add `isInferred` property to field metadata in sidebar
2. Conditionally apply muted styling
3. Conditionally render [✕] button
4. Conditionally show confidence score
5. Pass `isInferred` to modal when opening

**Files to Modify:**
- `apps/web/src/components/sidebar/CapturedFields.tsx`
- `apps/web/src/components/sidebar/FieldRow.tsx` (if separate component)

**Tests to Add:**
- Styling tests (known vs inferred)
- Button rendering tests (2 vs 3 buttons)
- Confidence display tests

---

#### Story 7: Implement Suppression List Management

**Epic:** Field Extraction Bulletproofing
**Priority:** P1 (High)
**Estimate:** 2 story points (~2 hours)

**Description:**
Create SuppressionManager class for frontend and integrate with backend API. Session-scoped, cleared on /reset.

**Acceptance Criteria:**
- [ ] `SuppressionManager` class created with methods:
  - `addSuppression(fieldName)`
  - `removeSuppression(fieldName)`
  - `isSuppressed(fieldName)`
  - `getAll()`
  - `clear()`
- [ ] Clicking [✕] or [Delete] adds to suppression list
- [ ] Converting to known removes from suppression list
- [ ] Suppression list sent to backend in API requests
- [ ] Backend respects suppression list (skips inferences)
- [ ] `/reset` clears suppression list
- [ ] Page refresh clears suppression list (session-scoped)
- [ ] All suppression tests pass

**Technical Approach:**
1. Create SuppressionManager class (frontend)
2. Store in React state or context
3. Integrate with [✕] and [Delete] buttons
4. Send suppressedFields in API request
5. Clear on /reset or page refresh

**Files to Create:**
- `apps/web/src/lib/suppression-manager.ts`
- `apps/web/src/lib/suppression-manager.test.ts`

**Files to Modify:**
- `apps/web/src/hooks/useIntake.ts` (send suppressedFields in request)
- `apps/api/src/services/conversational-extractor.ts` (receive suppressedFields)

**Tests to Add:**
- Add/remove suppression tests
- Duplicate prevention tests
- Clear on reset tests

---

#### Story 8: Update LLM Prompts to Respect Known/Inferred

**Epic:** Field Extraction Bulletproofing
**Priority:** P1 (High)
**Estimate:** 3 story points (~3 hours)

**Description:**
Update LLM system and user prompts to include critical rules: never modify known fields, can modify inferred fields, respect suppression list.

**Acceptance Criteria:**
- [ ] System prompt includes critical rules section
- [ ] User prompt includes already known, currently inferred, suppressed fields
- [ ] LLM never modifies known fields in responses
- [ ] LLM can delete/edit/upgrade inferred fields
- [ ] LLM respects suppression list (doesn't infer suppressed fields)
- [ ] LLM can upgrade inferred → known if confidence ≥85%
- [ ] All LLM extraction integration tests pass
- [ ] Evaluation suite shows improvement

**Technical Approach:**
1. Update conversational-extraction-system.txt with critical rules
2. Update conversational-extraction-user.txt with known/inferred/suppressed sections
3. Modify buildPrompt functions to inject known/inferred/suppressed data
4. Parse LLM response to separate known vs inferred fields

**Files to Modify:**
- `apps/api/src/prompts/conversational-extraction-system.txt`
- `apps/api/src/prompts/conversational-extraction-user.txt`
- `apps/api/src/services/conversational-extractor.ts` (buildPrompt functions)

**Tests to Add:**
- LLM prompt generation tests
- Known field protection tests (verify LLM doesn't modify)
- Inferred field modification tests (verify LLM can edit)
- Suppression respect tests (verify LLM doesn't infer)

---

#### Story 9: Update Architecture Documentation

**Epic:** Field Extraction Bulletproofing
**Priority:** P2 (Medium)
**Estimate:** 2 story points (~2 hours)

**Description:**
Update architecture documentation to reflect known vs inferred pills system. Update affected sections in architecture docs.

**Acceptance Criteria:**
- [ ] Section 6.1 (Conversational Extractor) updated
- [ ] Section 8.1 (Intake Flow) updated
- [ ] New section added for inference architecture (if needed)
- [ ] All diagrams updated to show inferred fields flow
- [ ] Code references updated (file paths, line numbers)
- [ ] Links validated

**Technical Approach:**
1. Review all architecture changes from Stories 1-8
2. Update affected sections in docs/architecture/
3. Add new diagrams for inference flow
4. Update code references

**Files to Modify:**
- `docs/architecture/6-components.md`
- `docs/architecture/8-core-workflows.md`
- `docs/architecture/index.md` (if needed)

**Tests to Add:**
- Documentation review
- Link validation

---

### 9.2 Epic Summary

**Epic:** Field Extraction Bulletproofing
**Total Stories:** 9
**Total Story Points:** 24 (~24 hours)
**Priority:** P0 (Blocks MVP launch)

**Story Breakdown:**
- **Phase 1 (Infrastructure):** Stories 1-2 (5 points, ~5 hours)
- **Phase 2 (UI Components):** Stories 3-6 (12 points, ~12 hours)
- **Phase 3 (Integration):** Stories 7-8 (5 points, ~5 hours)
- **Phase 4 (Documentation):** Story 9 (2 points, ~2 hours)

**Dependencies:**
- Story 1 blocks Stories 2, 8 (config files needed)
- Story 2 blocks Stories 7, 8 (inference engine needed)
- Story 3 blocks Story 6 (inferred section needed for sidebar integration)
- Story 4 blocks Story 5 (modal needed for pill injection)
- Stories 1-8 block Story 9 (architecture changes needed for docs)

**Sprint Planning:**
- **Sprint 1:** Stories 1-2, 3-4 (Infrastructure + UI start)
- **Sprint 2:** Stories 5-6, 7-8, 9 (UI completion + Integration + Docs)

---

## 10. Architecture Documentation Updates

### 10.1 Sections Requiring Updates

#### Section 6.1: Conversational Extractor Agent

**File:** [docs/architecture/6-components.md](docs/architecture/6-components.md#61-conversational-extractor-agent-llm)

**Changes:**
- Add description of known vs inferred pills architecture
- Document InferenceEngine integration
- Update design decisions to reflect user-curated approach

**Key Points to Add:**
- "Extraction distinguishes between known fields (explicit) and inferred fields (derived)"
- "InferenceEngine applies deterministic inference rules before LLM extraction"
- "Broker has transparent control over inferences (dismiss or convert to known)"
- "LLM respects known fields (read-only) but can modify inferred fields"

---

#### Section 8.1: Conversational Intake Flow

**File:** [docs/architecture/8-core-workflows.md](docs/architecture/8-core-workflows.md#81-conversational-intake-flow)

**Changes:**
- Update flow diagram to show inference step
- Add inferred fields UI to sequence diagram
- Document broker curation actions

**Key Points to Add:**
- "After deterministic extraction, InferenceEngine applies rules to derive additional fields"
- "Inferred fields shown separately in UI, broker can dismiss or convert to known"
- "Converting inferred → known injects pill into lexical textbox"

---

### 10.2 New Documentation to Create

#### Known vs Inferred Pills Architecture Deep Dive

**File:** `docs/architecture/field-extraction-bulletproofing.md` (this document)

**Purpose:** Comprehensive reference for known vs inferred pills architecture

**Contents:**
- Root cause analysis
- Solution architecture
- UI/UX specifications
- Backend architecture
- Config file structure
- Implementation details
- Testing strategy
- Story extraction guide

**Status:** This document serves as the source of truth for bulletproofing effort.

---

### 10.3 Documentation Review Checklist

- [ ] Section 6.1 (Conversational Extractor) reviewed and updated
- [ ] Section 8.1 (Intake Flow) reviewed and updated
- [ ] New architecture doc created (this document)
- [ ] All code references (file paths, line numbers) verified
- [ ] All diagrams updated to reflect inference flow
- [ ] All links validated

---

## Summary

This architecture document provides a comprehensive blueprint for implementing **known vs inferred pills** in IQuote Pro. The system gives brokers transparent control over field inferences through:

- **Transparent Inference Rules**: Config-driven, easy to modify
- **User Curation**: Broker can dismiss wrong inferences or convert good ones to known
- **Visual Distinction**: Inferred fields shown separately with clear styling
- **LLM-Aware Architecture**: LLM respects known fields, can improve inferred fields

**Key Outcomes:**
- Extraction accuracy: 60% → 85%+
- Broker confidence: Low → High (transparent inferences)
- Inference dismissal rate: <20% (most inferences are correct)
- System complexity: Reduced (no complex pattern conflict resolution)

**Investment:** 24 story points (~24 hours) over 2 sprints

**Next Steps:**
1. Scrum master creates 9 stories from this document
2. Development team completes Phase 1 (Infrastructure) - Stories 1-2
3. Development team completes Phase 2 (UI Components) - Stories 3-6
4. Development team completes Phase 3 (Integration) - Stories 7-8
5. Development team completes Phase 4 (Documentation) - Story 9
6. Run evaluation suite to measure improvement

---

**Document Prepared By:** Winston, Holistic System Architect
**Status:** Ready for Story Creation
**Version:** 2.0 (Revised)
**Last Updated:** 2025-11-13
