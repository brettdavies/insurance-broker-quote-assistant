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

## 10.5 Adaptive UI Components Implementation

**Purpose:** Provide keyboard-driven, power-user interface for brokers conducting live client calls with minimal mouse interaction.

**Three Adaptive Systems:**
1. **Emacs-Style Keyboard Shortcuts** - Multi-keystroke command sequences for rapid actions
2. **Field-Specific Modals** - Focused data entry popups with automatic chat injection
3. **Real-Time Field Capture Sidebar** - Live display of extracted data and missing fields

**Why These Components:**
- **Broker Efficiency:** Power users need speed during live client calls (maintain eye contact, no mouse dependency)
- **Cognitive Load Reduction:** Modals focus attention on single field entry, reducing split-attention effect
- **Instant Feedback:** Real-time sidebar shows progress and missing items without prompting or interrupting conversation flow
- **Professional Aesthetic:** Dark mode financial services styling builds client trust
- **Keyboard-Driven Workflow:** Mirrors broker's existing terminal/keyboard-heavy workflows

---

### 10.5.1 Emacs Multi-Keystroke State Machine (Non-Standard Pattern)

**What:** State machine handling Emacs-style multi-keystroke command sequences (e.g., `Ctrl+X Ctrl+C` for new session).

**Why Emacs Style:**
- Brokers familiar with terminal shortcuts expect multi-keystroke patterns
- Prefix keys (`Ctrl+X`) enable larger command vocabulary without conflicts
- Industry-standard pattern in power-user tools (Emacs, Vim, terminal multiplexers)

**State Machine Logic (Non-Obvious Implementation):**
```
State: IDLE
  - On "Ctrl+X": Transition to PREFIX_CTRL_X (start 2-second timeout)
  - On "Ctrl+K": Execute KIDS_MODAL
  - On "Ctrl+D": Execute DEPENDENTS_MODAL
  - On "Ctrl+V": Execute VEHICLES_MODAL
  - On "Ctrl+?": Execute SHORTCUTS_BROWSER

State: PREFIX_CTRL_X (timeout: 2 seconds)
  - On "Ctrl+C": Execute NEW_SESSION, return to IDLE
  - On "E": Execute EXPORT, return to IDLE
  - On "P": Execute POLICY_MODE, return to IDLE
  - On "S": Execute SAVE_PITCH, return to IDLE
  - On timeout: Return to IDLE (show "Ctrl+X cancelled" toast)
  - On any other key: Return to IDLE (cancel prefix)

State: MODAL_OPEN (field-specific)
  - Capture typed value in focused input
  - On "Enter": Inject "{alias}:{value}" into chat, close modal, return to IDLE
  - On "Escape": Cancel modal, return to IDLE (no injection)
```

**Timeout Rationale:**
2-second timeout for prefix keys prevents stuck state if user forgets command sequence. Visual indicator (e.g., "Ctrl+X..." in status bar) shows prefix is active.

**Why This Pattern Is Non-Obvious:**
- Multi-keystroke sequences are uncommon in web applications (most use single modifier+key)
- State machine with timeout adds complexity vs simple event handlers
- Requires careful event propagation to prevent browser default behavior

---

### 10.5.2 Keyboard Shortcut Handler Architecture (Non-Standard Pattern)

**What:** Hybrid global/component-level keyboard event listeners with priority ordering to prevent conflicts.

**Architecture:**
- **Global listener:** Attached to `document` for Emacs sequences (`Ctrl+X` prefix, `Ctrl+?` shortcuts browser)
- **Component-level listeners:** Attached to chat input for field-specific modals (`Ctrl+K`, `Ctrl+D`, `Ctrl+V`)
- **Priority order:** Component listeners execute first, then global (prevents chat input shortcuts from triggering global actions)

**Why Hybrid Approach:**
- **Global for app-level actions:** New session, export, shortcuts browser affect entire app state
- **Component for contextual actions:** Field modals only make sense when chat input is focused
- **Priority prevents conflicts:** If chat input has focus, `Ctrl+K` opens modal (not hypothetical global action)

**Event Propagation Pattern:**
```typescript
// Component-level handler (executes first)
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault()      // Prevent browser default
    e.stopPropagation()     // Prevent global handler
    openKidsModal()
  }
}

// Global handler (executes if not stopped)
useEffect(() => {
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'x') {
      e.preventDefault()
      setPrefix('ctrl-x')
      startTimeout()
    }
  }
  document.addEventListener('keydown', handleGlobalKeyDown)
  return () => document.removeEventListener('keydown', handleGlobalKeyDown)
}, [])
```

**Why This Pattern Is Non-Obvious:**
- Event propagation order not intuitive (component → document → window)
- Requires `stopPropagation()` to prevent global handlers from conflicting with component handlers
- Browser default behavior (e.g., `Ctrl+P` for print) must be prevented with `preventDefault()`

---

### 10.5.3 Modal Chat Injection Pattern (Non-Standard)

**What:** Field-specific modals that inject formatted key-value syntax into chat input after submission.

**Workflow:**
1. Broker presses `Ctrl+K` (kids shortcut) while chat input is focused
2. Modal opens with focused input field and label "How many kids?"
3. Broker types value (e.g., "3")
4. Broker presses Enter
5. Modal formats as `k:3` and injects into chat message input field
6. Modal closes, focus returns to chat input
7. Broker can edit injected value or press Enter to send immediately

**Why Inject Into Chat (Not Direct API Call):**
- **Visibility:** Broker sees exact syntax being sent (transparency for training/debugging)
- **Editability:** Broker can modify injected value before sending (e.g., change `k:3` to `k:2`)
- **Consistency:** All data flows through single chat interface, simpler mental model
- **Audit trail:** Chat history shows exactly what was entered, including key-value syntax

**Modal Component Structure:**
```typescript
<Dialog open={isKidsModalOpen} onOpenChange={setKidsModalOpen}>
  <DialogContent>
    <DialogHeader>How many kids?</DialogHeader>
    <Input
      autoFocus
      type="number"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          injectIntoChat(`k:${value}`)
          setKidsModalOpen(false)
        }
        if (e.key === 'Escape') {
          setKidsModalOpen(false)
        }
      }}
    />
  </DialogContent>
</Dialog>
```

**Why This Pattern Is Non-Obvious:**
- Web apps typically use modals for confirmations or standalone forms, not as input assistants for other fields
- Injecting into another input field (rather than submitting directly) adds indirection
- Pattern requires coordination between modal state, chat input state, and focus management

---

### 10.5.4 Real-Time Field Capture Sidebar

**What:** Live sidebar displaying extracted fields, missing fields, and adaptive compliance disclaimers as conversation progresses.

**Why Real-Time Updates:**
- **Progress visibility:** Broker sees exactly what data has been captured without asking
- **Missing field awareness:** Broker knows what to ask next without system prompting
- **Compliance transparency:** Broker sees state/product-specific disclaimers as they're determined

**Update Mechanism:**
- **TanStack Query automatic refetching:** After each chat message submitted, query invalidation triggers sidebar refresh
- **Optimistic UI updates:** Sidebar updates immediately with submitted data, then reconciles with server response
- **WebSocket alternative:** For production, consider WebSocket for sub-second latency (demo uses polling)

**Sidebar Data Categories:**
1. **Identity:** Name, contact info (extracted from conversation)
2. **Location:** State, zip code (determines routing and compliance)
3. **Product:** Product type preference (auto/home/renters/umbrella)
4. **Details:** Household data (kids, dependents), vehicle data (count, garage), property data (type, year, roof)
5. **Missing Fields:** Red-highlighted fields still needed for quote (e.g., "VINs: MISSING")
6. **Adaptive Disclaimers:** State/product-specific compliance text (e.g., "CA Auto Disclaimer: Rates subject to Prop 103...")

**Why Sidebar (Not Inline Chat):**
- **Persistent visibility:** Sidebar always visible, chat scrolls away
- **Structured display:** Sidebar uses organized categories, chat is chronological
- **Less intrusive:** Sidebar doesn't interrupt conversation flow with system messages

---

**Implementation Notes:**

**Dark Mode Default:**
- Use shadcn/ui dark mode as default theme (financial services professional aesthetic)
- Light mode toggle available but not default
- Color tokens: Blues/grays for trust, high contrast for readability

**Component Organization:**
- `components/shortcuts/KeyboardShortcutProvider.tsx` - Global state machine
- `components/modals/FieldModal.tsx` - Reusable modal with injection logic
- `components/sidebar/FieldCaptureSidebar.tsx` - Real-time data display
- `components/shortcuts/ShortcutsBrowser.tsx` - `Ctrl+?` help overlay

**Accessibility Considerations:**
- Keyboard shortcuts must not conflict with screen reader shortcuts (test with NVDA/JAWS)
- Modal focus trapping (Tab cycles within modal, doesn't escape)
- Escape key always closes modals (standard pattern)

---
