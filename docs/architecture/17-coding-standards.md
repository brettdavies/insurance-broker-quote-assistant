# 17. Coding Standards

**Purpose:** Define critical rules ensuring code quality and architectural consistency across fullstack monorepo.

## 17.1 Critical Architectural Rules

**These rules prevent architectural violations that would break the hybrid LLM + rules system:**

- **Type Sharing:** Always define shared types in `packages/shared/src/types` and import from `@repo/shared` in both frontend and backend. Never duplicate type definitions.
  - **Why:** Single source of truth prevents type drift between frontend/backend

- **API Calls:** Never make direct `fetch()` calls in components. Always use Hono RPC client with TanStack Query hooks.
  - **Why:** Hono RPC provides automatic type inference, TanStack Query handles caching/errors

- **Environment Variables:** Access only through typed config objects, never `process.env` directly.
  - **Why:** Catches missing env vars at startup (fail-fast), provides type safety

- **Error Handling:** All API routes must use the global error handler middleware. Never catch errors and return 200 with error in body.
  - **Why:** Consistent error format for frontend, comprehensive logging for debugging

- **LLM API Calls:** Always include timeout and token usage logging. Use structured outputs (JSON mode) for extraction.
  - **Why:** Prevents hanging requests, tracks costs (required for evaluation), ensures valid JSON

- **Knowledge Pack:** Load at startup (async, non-blocking), never reload during request. Always query via RAG layer, never direct file access.
  - **Why:** Ensures data is available immediately when first query arrives, RAG layer provides citation tracking for compliance

- **Compliance Filter:** Run on ALL outputs that go to users. Never skip compliance validation, even for internal testing.
  - **Why:** Insurance regulatory requirement - 100% of outputs must be compliant

- **Citations:** Every discount/opportunity must include citation with cuid2 ID, entity type, and source file. Never return opportunities without source tracking.
  - **Why:** Regulatory audit trail - must prove every recommendation came from knowledge pack

- **Imports:** Use `@repo/shared` for shared package, `@/` for relative imports within app. Never use `../../../` relative paths.
  - **Why:** Monorepo path aliases prevent broken imports when moving files

## 17.2 Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `IntakeForm.tsx` |
| Hooks | camelCase with 'use' | - | `useIntake.ts` |
| API Routes | kebab-case | kebab-case | `/api/policy-analysis` |
| Functions | camelCase | camelCase | `routeToCarrier()` |
| Types/Interfaces | PascalCase | PascalCase | `UserProfile` |
| Constants | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE | `PROHIBITED_PHRASES` |
| Files | kebab-case | kebab-case | `routing-engine.ts` |

## 17.3 Implementation Guidance

**Purpose:** Practical patterns for common implementation tasks across the architecture.

### Data Transformation (snake_case ↔ camelCase)

**Use es-toolkit for runtime transformation:**
```typescript
import { camelCase, snakeCase } from 'es-toolkit/string'

// Database → Frontend (snake_case → camelCase)
const apiData = { product_line: 'auto', clean_record_3yr: true }
const frontendData = {
  productLine: camelCase(apiData.product_line),
  cleanRecord3Yr: apiData.clean_record_3yr
}

// Frontend → Database (camelCase → snake_case)
const dbKey = snakeCase('productLine')  // Returns 'product_line'
```

**Why es-toolkit:**
- **Modern & fast:** 2-3x faster than lodash, 97% smaller bundle size
- **Type-safe:** First-class TypeScript support with proper type inference
- **Standard functions:** `camelCase()`, `snakeCase()`, `kebabCase()` work like lodash equivalents

### Bundle Discount Data Collection

**Cross-References:** See Section 4.2 for UserProfile schema definition and Section 6.4 for Discount Engine implementation.

**Pattern for multi-carrier analysis:**
```typescript
// UserProfile must include existingPolicies array for bundle analysis
interface UserProfile {
  // ... other fields
  existingPolicies?: Array<{
    product: 'auto' | 'home' | 'renters' | 'umbrella'
    carrier: string  // Carrier ID (e.g., "carr_ckm9x7w8k0")
    premium: number  // Annual premium
  }>
}

// Discount Engine analyzes consolidation opportunities
// Example: User has auto with GEICO + home with State Farm
// → Opportunity: Move both to GEICO for 15% multi-policy discount
```

**Implementation approach:**
- **Iterative questioning:** Conversational Extractor asks follow-up questions to collect existingPolicies data
- **Progressive disclosure:** Frontend shows accordion/expandable sections for additional policy details
- **Validation:** Zod schema validates carrier IDs match knowledge pack carriers

### Progressive Disclosure UI

**Pattern for missing fields:**
```typescript
// API returns missing fields in IntakeResult
interface IntakeResult {
  profile: UserProfile
  missingFields: string[]  // e.g., ["age", "cleanRecord3Yr"]
  // ... other fields
}

// Frontend displays expandable form sections
<Accordion>
  {missingFields.includes('age') && (
    <AccordionItem>
      <AccordionTrigger>Additional Information Needed</AccordionTrigger>
      <AccordionContent>
        <Input label="Age" name="age" />
      </AccordionContent>
    </AccordionItem>
  )}
</Accordion>
```

**Why progressive disclosure:**
- **Better UX:** Don't overwhelm users with long forms upfront
- **Conversational feel:** Ask for additional info only when needed
- **Aligns with LLM extraction:** LLM extracts what's mentioned, flags what's missing

### Citation Propagation Pattern

**Flow: Knowledge Pack → Discount Engine → Pitch Generator → User:**
```typescript
// 1. Discount Engine retrieves discount with citation
const opportunity = {
  discount: 'Multi-Policy Bundle',
  percentage: 15,
  citation: {
    id: 'disc_ckm9x7wdx1',
    type: 'discount',
    carrier: 'carr_ckm9x7w8k0',
    file: 'knowledge_pack/carriers/geico.json'
  }
}

// 2. Pitch Generator receives opportunities array with citations
const pitchInput = {
  opportunities: [opportunity],  // Citations preserved
  userProfile: profile
}

// 3. Pitch Generator includes citations in prompt context
const prompt = `Generate pitch for these opportunities: ${JSON.stringify(opportunities)}`

// 4. Pitch output references citation IDs
const pitch = "You qualify for Multi-Policy Bundle (15% off) [disc_ckm9x7wdx1]"

// 5. Frontend displays citations as footnotes or tooltips
<div>
  {pitch}
  <Tooltip content={`Source: ${citation.file}`}>
    <sup>[{citation.id}]</sup>
  </Tooltip>
</div>
```

**Why citation propagation matters:**
- **Regulatory compliance:** Insurance recommendations must be traceable to source material
- **Audit trail:** DecisionTrace logs all citations for regulatory review
- **User trust:** Broker can explain "this came from GEICO's official discount rules"

---
