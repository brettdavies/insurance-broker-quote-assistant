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
- **shadcn/ui enforced:** ESLint blocks direct Radix imports, ensures consistent styling across app
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
  state: z.string().length(2).optional()
})

// Route definition with typed search params
export const Route = createRoute({
  path: '/results',
  validateSearch: searchSchema
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
      queryFn: () => api.api.carriers.$get().then(res => res.json())
    })
  }
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
    return res.json()  // REQUIRED: Parse response body to extract typed data
  }
})
```

**Key Design Decisions:**
- **Hono RPC over fetch:** Type safety worth the Hono dependency
- **Response parsing required:** Hono RPC returns `Response` objects - always call `.json()` to extract data
- **TanStack Query wraps API calls:** All API calls go through `useMutation` or `useQuery` for automatic error handling and caching
- **Error boundaries:** React Error Boundary catches API errors, displays user-friendly message

---
