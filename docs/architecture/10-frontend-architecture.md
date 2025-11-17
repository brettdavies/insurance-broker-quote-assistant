# 10. Frontend Architecture

**Purpose:** Single-page React application enabling brokers to interact with conversational intake and policy analysis flows.

**Tech Stack:** React 18.2, TanStack Router, TanStack Query, TanStack Form, shadcn/ui, Tailwind CSS

---

## 10.1 Component Architecture

**Component Organization:**

- **Feature-based structure:** Components organized by feature domain (intake/, policy/, results/) not technical role
- **shadcn/ui for primitives:** All base UI components (Button, Input, Card) from shadcn/ui, no vanilla Radix imports
- **Colocation:** Keep related components together (IntakeForm + MissingFieldsAlert in same intake/ folder)

**Key Design Decisions:**

- **Feature folders over technical folders:** `components/intake/IntakeForm.tsx` instead of `components/forms/IntakeForm.tsx` (easier to find related code)
- **shadcn/ui enforced:** Biome blocks direct Radix imports, ensures consistent styling across app
- **Prettier for React components:** All `.tsx` files formatted with Prettier + prettier-plugin-tailwindcss for automatic Tailwind class sorting
- **Shared types from monorepo:** All types re-exported from `@repo/shared`, single source of truth

**Three Primary UI Flows:**

1. **Landing page** - Binary choice: text input OR file upload
2. **Conversational intake** - Text box → API call → Display pitch/prefill/routing
3. **Policy analysis** - File upload (PDF/DOCX/TXT) → API call → Display savings opportunities

**File Upload Component (Policy Analysis):**

- **UI Component:** shadcn/ui DropZone or Input with `type="file"`
- **Validation:** Client-side file type check (PDF, DOCX, TXT only) + 5MB size limit
- **UX Pattern:** Drag-and-drop OR click to browse (mobile-friendly)
- **Error handling:** Display toast notification if invalid file type or size exceeded
- **Loading state:** Show spinner while file uploads and LLM parses document
- **File handling:** Frontend sends file as multipart/form-data, backend extracts text and passes to LLM

### 10.1.5 Known vs Inferred Field Components (Epic 4)

**Purpose:** Components that display and manage known vs inferred field separation for broker curation workflow.

**Components:**

1. **InferredFieldsSection** (`apps/web/src/components/notes/InferredFieldsSection.tsx`)
   - Displays inferred fields separately below lexical textbox
   - Groups fields by category (Identity, Location, Product, Details)
   - Shows confidence scores if < 90%
   - Interactive elements: info tooltip, dismiss button ([✕]), edit button
   - Collapsible card (default: expanded)
   - Hides entirely if no inferred fields

2. **FieldModal** (`apps/web/src/components/shortcuts/FieldModal.tsx`)
   - Updated with 3-button layout for inferred fields (Story 4.4)
   - Buttons: [Delete] (dismisses inference), [Save Inferred] (updates value, keeps as inferred), [Save Known] (converts to known field)
   - Shows inference reasoning and confidence score
   - Pill injection on [Save Known] (injects pill into lexical editor)
   - Backward compatible with legacy slash command editing

3. **FieldItem** (`apps/web/src/components/shared/FieldItem.tsx`)
   - Updated with known vs inferred styling
   - Known fields: normal color (#f5f5f5), 2 buttons (ℹ️ + [Click])
   - Inferred fields: muted color (#a3a3a3), 3 buttons (ℹ️ + [✕] + [Click])
   - Shows confidence percentage if < 90%
   - Used by CapturedFields sidebar component

**Design Decisions:**

- **Visual separation:** Inferred fields visually distinct (muted color) to indicate lower confidence
- **Broker control:** Broker can dismiss incorrect inferences or convert to known fields
- **Pill injection:** Converting inferred → known injects pill into lexical editor (visual feedback)

---

## 10.2 State Management

**What We Use:**

- **TanStack Query for server state (90%):** API responses, automatic caching, refetching
- **React useState for UI state (10%):** Form inputs, modal visibility, current step

**Why This Approach:**

- **No global state store needed:** TanStack Query handles API data caching, useState handles local UI
- **Simpler than Redux/Zustand:** For demo scope, full state management library is overkill
- **Type-safe by default:** TanStack Query infers types from API client (Hono RPC)

**State Categories:**

- **Server state (TanStack Query):** Intake results, policy analysis, carriers list, error states
- **Form state (TanStack Form):** User message, policy upload, validation errors
- **UI state (useState):** Sidebar open, modal visible, current flow step
- **URL state (TanStack Router):** Selected carrier, flow type (shareable links)

**Key Design Decisions:**

- **Derive, don't store:** Calculate `hasErrors = error != null` on render instead of storing in state
- **Context sparingly:** Only for truly global UI state (theme), not for API data
- **React Hook Form alternative:** Use TanStack Form for consistency with TanStack ecosystem

### 10.2.5 Known vs Inferred Field State (Epic 4)

**Hooks:**

1. **usePillInjection** (`apps/web/src/hooks/usePillInjection.ts`)
   - Provides `injectPill(fieldKey, value)` function
   - Injects pill nodes into Lexical editor at end of document
   - Used when converting inferred → known via [Save Known] button
   - Handles cursor positioning and trailing spaces

2. **useSuppressionManager** (`apps/web/src/hooks/useSuppressionManager.ts`)
   - Wraps `SuppressionManager` class in React hook
   - Session-scoped suppression list (cleared on refresh)
   - Methods: `addSuppression()`, `removeSuppression()`, `isSuppressed()`, `getAll()`, `clear()`
   - Suppressed fields sent to backend in API request (`suppressedFields` array)

**Suppression List State Management:**

- **Storage:** Session-scoped only (no localStorage, no database)
- **Lifecycle:** Created empty on session start, updated on dismiss, cleared on `/reset` or refresh
- **Backend integration:** Suppressed fields sent in `POST /api/intake` request
- **Prevents re-inference:** Backend InferenceEngine skips suppressed fields

**Design Decisions:**

- **Session-scoped:** No persistence needed (broker can re-dismiss if needed)
- **Frontend-only:** Suppression list managed client-side, sent to backend per request
- **Broker control:** Broker has final say on which inferences to accept

---

## 10.3 Routing

**Routes:**

- `/` - Landing page with 2 flow options (text input or file upload)
- `/intake` - Conversational intake form
- `/policy` - Policy analysis form

**Why TanStack Router:**

- **Type-safe routing:** Route paths are type-checked, no typo bugs
- **File-based routing:** Routes defined in `routes/` folder, automatic registration
- **URL state management:** Query params and path params are first-class, typed state

**Key Design Decisions:**

- **Simple 3-route structure:** No nested routes, no auth-protected routes (demo scope)
- **Landing page as router:** User chooses flow on `/`, navigates to `/intake` or `/policy`
- **No breadcrumbs needed:** Flat structure, back button sufficient

**TanStack Best Practices (2025 Patterns):**

**1. Search Parameter Validation with Zod:**

```typescript
// Use Zod schemas for search param validation (not manual validators)
import { z } from 'zod'

const searchSchema = z.object({
  carrier: z.string().optional(),
  state: z.string().length(2).optional(),
})

// Route definition with typed search params
export const Route = createRoute({
  path: '/results',
  validateSearch: searchSchema,
})
```

**2. Prefetching in Route Loaders:**

```typescript
// Prefetch queries in route loaders for instant data availability
export const Route = createRoute({
  path: '/intake',
  loader: async ({ context }) => {
    // Prefetch carriers list before component renders
    await context.queryClient.prefetchQuery({
      queryKey: ['carriers'],
      queryFn: () => api.api.carriers.$get().then((res) => res.json()),
    })
  },
})
```

**3. Selectors for Performance:**

```typescript
// Use selectors in hooks to avoid unnecessary re-renders
const carrier = Route.useSearch({ select: (search) => search.carrier })
const routeParams = Route.useParams({ select: (params) => params.id })

// Only re-renders when carrier changes, not when other search params change
```

**Why These Patterns:**

- **Zod validation:** Type-safe search params with runtime validation, prevents invalid URLs
- **Prefetching:** Data loads in parallel with route transition, eliminates loading spinners
- **Selectors:** Component only re-renders when specific data changes, improves performance

---

## 10.4 API Integration

**What We Use:**

- **Hono RPC client:** Type-safe API client with zero boilerplate
- **TanStack Query:** Automatic caching, refetching, error handling for API calls

**Why Hono RPC:**

- **Zero-boilerplate type safety:** Frontend imports backend's `AppType`, instant type inference
- **No manual type sync:** Types update automatically when backend changes
- **Better than OpenAPI:** For 5-day timeline, OpenAPI codegen is overkill

**API Client Pattern (Non-Standard):**

```typescript
// Backend exports AppType (apps/api/src/index.ts)
export type AppType = typeof app

// Frontend imports and creates type-safe client (apps/web/src/lib/api-client.ts)
import { hc } from 'hono/client'
import type { AppType } from '@repo/api'
export const api = hc<AppType>('http://localhost:7070')

// Usage with TanStack Query - full type inference + response parsing
const { mutate } = useMutation({
  mutationFn: async (data) => {
    const res = await api.api.intake.$post({ json: data })
    return res.json() // REQUIRED: Parse response body to extract typed data
  },
})
```

**Key Design Decisions:**

- **Hono RPC over fetch:** Type safety worth the Hono dependency
- **Response parsing required:** Hono RPC returns `Response` objects - always call `.json()` to extract data
- **TanStack Query wraps API calls:** All API calls go through `useMutation` or `useQuery` for automatic error handling and caching
- **Error boundaries:** React Error Boundary catches API errors, displays user-friendly message

### 10.1.6 UI Interaction Flows (Epic 4)

**Dismiss Inferred Field Flow:**

1. Broker sees inferred field in `InferredFieldsSection` (muted color)
2. Broker clicks [✕] button on inferred field
3. `onDismiss(fieldName)` callback triggered
4. Field added to suppression list via `useSuppressionManager().addSuppression()`
5. Field removed from UI (no longer displayed)
6. On next API call, `suppressedFields` array sent to backend
7. Backend InferenceEngine skips suppressed field (never re-inferred)

**Convert Inferred → Known Flow:**

1. Broker sees inferred field in `InferredFieldsSection` or sidebar
2. Broker clicks field to edit (opens `FieldModal`)
3. Modal shows 3 buttons: [Delete] [Save Inferred] [Save Known]
4. Broker clicks [Save Known]
5. `usePillInjection().injectPill(fieldKey, value)` called
6. Pill node injected into Lexical editor at end of document
7. Field removed from inferred fields list
8. Field added to known fields (appears in sidebar with normal styling)
9. Suppression removed (if field was previously suppressed)

**Suppression List Persistence Flow:**

1. Suppression list managed by `useSuppressionManager` hook
2. List stored in component state (session-scoped)
3. On API call (`POST /api/intake`), `suppressedFields` array included in request
4. Backend receives suppression list, passes to InferenceEngine
5. InferenceEngine skips suppressed fields (never generates inference)
6. Response echoes back `suppressedFields` array
7. On page refresh or `/reset` command, suppression list cleared

**Design Decisions:**

- **Visual feedback:** Pill injection provides immediate visual confirmation of conversion
- **No persistence:** Suppression list resets on refresh (broker can re-dismiss if needed)
- **Backend respect:** Backend always respects suppression list (100% guarantee)

---
