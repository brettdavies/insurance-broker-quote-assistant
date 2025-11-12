# IQuote Pro Keyboard Shortcuts Analysis

**Document Version:** 4.0
**Last Updated:** 2025-11-09
**Author:** Sally (UX Expert)
**Status:** Complete - Ready for Review

---

## Executive Summary

This document provides a complete analysis of the keyboard shortcut system for IQuote Pro, including:

- **Complete field inventory** (27 unique fields requiring shortcuts)
- **macOS + Chrome conflict analysis** (platform-specific for demo scope)
- **Revised shortcut philosophy** with zero conflicts
- **Three alternative shortcut schemes** with pros/cons
- **Final recommendations** for implementation
- **Developer reference** with complete mapping

### Critical Findings

The original shortcut philosophy (`Alt+` for actions, `Ctrl+` for fields/modes) has **4 critical conflicts** with macOS Emacs-style text editing and **2 moderate conflicts** with Chrome browser functions:

🔴 **Critical Emacs Conflicts:**

- `Ctrl+A` (ages) → conflicts with "move to line start"
- `Ctrl+D` (deps) → conflicts with "delete character right"
- `Ctrl+K` (kids) → conflicts with "cut to end of line"
- `Ctrl+V` (vehicles) → conflicts with "page down"

⚠️ **Moderate Chrome Conflicts:**

- `Cmd+K` → Chrome address bar (if user accidentally uses Cmd instead of Ctrl)
- `Cmd+D` → Bookmark page (if user accidentally uses Cmd instead of Ctrl)

### Recommended Solution

**Single-prefix system** using only slash commands with clear categorization:

1. **`/{letter}`** - All field shortcuts (27 fields)
   - Single letters for fast data entry
   - Examples: `/k` (kids), `/v` (vehicles), `/n` (name)
   - ✅ Zero conflicts with macOS/Chrome shortcuts
   - ✅ Works globally (from anywhere in app)
   - ✅ Fastest possible: just 2 keystrokes, no modifier keys

2. **`/{word}`** - All app-level actions (6 actions)
   - Full words for app actions
   - Examples: `/export`, `/copy`, `/reset`, `/policy`, `/intake`, `/help`
   - ✅ Highly discoverable: Slack/Discord users recognize `/` commands
   - ✅ Visual feedback: show `/...` indicator after first keystroke
   - ✅ No modifier keys required - ultimate simplicity

---

## Part 1: Developer Reference

### 1.1 Complete Field Inventory

Based on [docs/architecture/4-data-models.md](architecture/4-data-models.md) and [docs/prd.md](prd.md), IQuote Pro requires shortcuts for **27 unique fields** across both conversational intake and policy analysis workflows.

#### Identity Fields (3 fields)

| Field     | Pill Syntax    | Current Shortcut | Conflicts | Proposed Shortcut |
| --------- | -------------- | ---------------- | --------- | ----------------- |
| **Name**  | `name:`, `n:`  | None             | -         | `/n`              |
| **Email** | `email:`, `e:` | None             | -         | `/e`              |
| **Phone** | `phone:`, `p:` | None             | -         | `/p`              |

#### Location Fields (2 fields)

| Field        | Pill Syntax    | Current Shortcut | Conflicts | Proposed Shortcut |
| ------------ | -------------- | ---------------- | --------- | ----------------- |
| **State**    | `state:`, `s:` | None             | -         | `/s`              |
| **Zip Code** | `zip:`, `z:`   | None             | -         | `/z`              |

#### Product Selection (1 field)

| Field            | Pill Syntax         | Current Shortcut | Conflicts | Proposed Shortcut |
| ---------------- | ------------------- | ---------------- | --------- | ----------------- |
| **Product Line** | `product:`, `prod:` | None             | -         | `/l` (L for Line) |

#### Household Fields (4 fields)

| Field                | Pill Syntax                  | Current Shortcut | Conflicts                                                    | Proposed Shortcut |
| -------------------- | ---------------------------- | ---------------- | ------------------------------------------------------------ | ----------------- |
| **Age**              | `age:`, `a:`                 | None             | -                                                            | `/a`              |
| **Household Size**   | `household:`, `hh:`          | None             | -                                                            | `/h`              |
| **Children Count**   | `kids:`, `k:`, `children:`   | `Ctrl+K`         | 🔴 Emacs: Cut to end of line<br>⚠️ Cmd+K: Chrome address bar | `/k`              |
| **Dependents Count** | `deps:`, `d:`, `dependents:` | `Ctrl+D`         | 🔴 Emacs: Delete char right<br>⚠️ Cmd+D: Bookmark            | `/d`              |

#### Vehicle/Auto Fields (7 fields)

| Field                | Pill Syntax                    | Current Shortcut             | Conflicts                                             | Proposed Shortcut       |
| -------------------- | ------------------------------ | ---------------------------- | ----------------------------------------------------- | ----------------------- |
| **Vehicle Count**    | `vehicles:`, `v:`, `cars:`     | `Ctrl+V`                     | 🔴 Emacs: Page down                                   | `/v`                    |
| **Garage Type**      | `garage:`, `car:`, `c:`        | None                         | -                                                     | `/g` (G for Garage)     |
| **VINs**             | `vins:`, `vin:`                | None                         | -                                                     | `/i` (I for VIN)        |
| **Driver Ages**      | `drivers:`, `driver_ages:`     | `Ctrl+A` (mentioned in spec) | 🔴 Cmd+A: Select all<br>🔴 Ctrl+A: Move to line start | `/r` (R for dRivers)    |
| **Driving Records**  | `records:`, `driving_records:` | None                         | -                                                     | `/c` (C for reCords)    |
| **Clean Record 3yr** | `clean:`, `clean_record:`      | None                         | -                                                     | `/u` (U for Unsullied)  |
| **Vehicles Array**   | `vehicles:` (full array)       | None                         | -                                                     | (Same as vehicle count) |

#### Property/Home Fields (5 fields)

| Field                 | Pill Syntax                             | Current Shortcut | Conflicts | Proposed Shortcut   |
| --------------------- | --------------------------------------- | ---------------- | --------- | ------------------- |
| **Owns Home**         | `owns_home:`, `owner:`                  | None             | -         | `/o`                |
| **Property Type**     | `property:`, `prop_type:`               | None             | -         | `/t` (T for Type)   |
| **Construction Year** | `year:`, `built:`, `construction_year:` | None             | -         | `/y`                |
| **Roof Type**         | `roof:`, `roof_type:`                   | None             | -         | `/f` (F for rooF)   |
| **Square Feet**       | `sqft:`, `square_feet:`                 | None             | -         | `/q` (Q for sQuare) |

#### Coverage/Policy Fields (5 fields)

| Field                 | Pill Syntax              | Current Shortcut | Conflicts | Proposed Shortcut           |
| --------------------- | ------------------------ | ---------------- | --------- | --------------------------- |
| **Current Carrier**   | `carrier:`               | None             | -         | `/r` (R for caRrier)        |
| **Current Premium**   | `premium:`               | None             | -         | `/m` (M for preMium)        |
| **Deductibles**       | `deductible:`, `ded:`    | None             | -         | `/b` (B for deducti**B**le) |
| **Limits**            | `limits:`, `limit:`      | None             | -         | `/x` (X for maX)            |
| **Existing Policies** | `policies:`, `existing:` | None             | -         | `/w` (W for poWicies)       |

**Note on Conflicts:** Some letters are used twice (e.g., `R` for drivers and carrier, `L` for product line and clean record). This will be resolved in Section 2.3 with context-aware assignments (intake vs policy mode).

---

### 1.2 Action Shortcuts (Non-Field)

These shortcuts use **full-word slash commands** for all app-level actions, modes, and help - providing ultimate simplicity with just one prefix pattern.

| Shortcut              | Action                                      | Category    | Conflicts                                       |
| --------------------- | ------------------------------------------- | ----------- | ----------------------------------------------- |
| `/export`             | Export/Download (pre-fill or savings pitch) | Action      | ✅ None                                         |
| `/copy`               | Copy to clipboard                           | Action      | ✅ None (different from `/c` = driving records) |
| `/reset`              | Session reset                               | Action      | ✅ None                                         |
| `/policy`             | Toggle to Policy Analysis mode              | Mode Switch | ✅ None                                         |
| `/intake` or `/convo` | Toggle to Intake mode                       | Mode Switch | ✅ None                                         |
| `/help` or `/?`       | Show keyboard shortcuts browser             | Help        | ✅ None                                         |

**Philosophy Update:** Simplified to **one prefix pattern**: slash commands. Single letters (`/k`, `/v`) for fields (27 shortcuts), full words (`/export`, `/policy`) for actions (6 shortcuts). Zero modifier keys, maximum simplicity.

---

### 1.3 macOS + Chrome Conflict Matrix

This table documents all shortcuts that MUST be avoided in IQuote Pro to prevent conflicts with macOS system or Chrome browser functions.

#### System-Wide macOS Shortcuts (Always Conflicting)

| Shortcut    | Function         | Severity    | Notes                                         |
| ----------- | ---------------- | ----------- | --------------------------------------------- |
| `Cmd+A`     | Select All       | 🔴 Critical | Never override - users expect this everywhere |
| `Cmd+C`     | Copy             | 🔴 Critical | Never override                                |
| `Cmd+V`     | Paste            | 🔴 Critical | Never override                                |
| `Cmd+X`     | Cut              | 🔴 Critical | Never override                                |
| `Cmd+Z`     | Undo             | 🔴 Critical | Never override                                |
| `Cmd+S`     | Save             | 🔴 Critical | Users expect this for saving                  |
| `Cmd+Q`     | Quit Application | 🔴 Critical | Never override - system-level                 |
| `Cmd+W`     | Close Window/Tab | 🔴 Critical | Chrome standard                               |
| `Cmd+T`     | New Tab          | 🔴 Critical | Chrome standard                               |
| `Cmd+,`     | Preferences      | ⚠️ Moderate | Chrome standard                               |
| `Cmd+Space` | Spotlight        | 🔴 Critical | macOS system-wide                             |
| `Cmd+Tab`   | Switch Apps      | 🔴 Critical | macOS system-wide                             |

#### Chrome-Specific Shortcuts (Demo Scope)

| Shortcut  | Function          | Severity    | Notes                                                 |
| --------- | ----------------- | ----------- | ----------------------------------------------------- |
| `Cmd+K`   | Focus Address Bar | ⚠️ Moderate | Can override in web app with `event.preventDefault()` |
| `Cmd+D`   | Bookmark Page     | ⚠️ Moderate | Can override in web app                               |
| `Cmd+L`   | Focus Address Bar | ⚠️ Moderate | Alternative to Cmd+K                                  |
| `Cmd+R`   | Reload Page       | ⚠️ Moderate | Can override but risky (users expect reload)          |
| `Cmd+1-9` | Switch to Tab N   | ⚠️ Moderate | Can override                                          |
| `Cmd+[`   | Back              | ⚠️ Moderate | Can override                                          |
| `Cmd+]`   | Forward           | ⚠️ Moderate | Can override                                          |

#### Emacs-Style Text Editing (macOS Text Fields)

These shortcuts work in ALL macOS text inputs (contentEditable, textarea, input) and should NOT be overridden:

| Shortcut | Function                    | Severity    | Notes                                   |
| -------- | --------------------------- | ----------- | --------------------------------------- |
| `Ctrl+A` | Move to line start          | 🔴 Critical | Emacs standard, expected in notes input |
| `Ctrl+E` | Move to line end            | 🔴 Critical | Emacs standard                          |
| `Ctrl+F` | Move forward one character  | ⚠️ Moderate | Less common, can override               |
| `Ctrl+B` | Move backward one character | ⚠️ Moderate | Less common, can override               |
| `Ctrl+N` | Move down one line          | ⚠️ Moderate | Less common, can override               |
| `Ctrl+P` | Move up one line            | ⚠️ Moderate | Less common, can override               |
| `Ctrl+K` | Cut to end of line          | 🔴 Critical | Very commonly used in text editing      |
| `Ctrl+D` | Delete character right      | 🔴 Critical | Very commonly used                      |
| `Ctrl+H` | Delete character left       | ⚠️ Moderate | Delete key more common                  |

#### Safe Shortcut Patterns

These patterns are **safe to use** for custom shortcuts:

✅ **`/{letter}`** - Slash command pattern (Slack/Discord-style), zero conflicts
✅ **`Cmd+Shift+{letter}`** - No system conflicts (but 3-key combo is slower)
✅ **`Option+{letter}`** - Minimal conflicts (some app menus)
✅ **Prefix-based modifiers** - `Ctrl+X {letter}` (Emacs-style) for actions

---

### 1.4 Implementation Notes

#### Event Handling

Slash commands work **globally** (from anywhere in the app) using a document-level listener:

```typescript
// Global slash command system
let commandMode = false
let commandBuffer = ''
let commandTimeout: NodeJS.Timeout | null = null

document.addEventListener('keydown', (e) => {
  // Detect / to enter command mode
  if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    // Don't trigger in modal inputs or text fields (except notes input)
    const target = e.target as HTMLElement
    const isNotesInput = target.id === 'notes-input' || target.dataset.notesInput === 'true'
    const isOtherInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

    if (!isNotesInput && isOtherInput) {
      // Let user type / normally in other inputs
      return
    }

    e.preventDefault()
    commandMode = true
    showCommandIndicator('/...')

    // Clear previous timeout
    if (commandTimeout) clearTimeout(commandTimeout)

    // 2-second timeout
    commandTimeout = setTimeout(() => {
      commandMode = false
      hideCommandIndicator()
    }, 2000)

    return
  }

  // In command mode, next keystroke adds to buffer
  if (commandMode && /^[a-z]$/i.test(e.key)) {
    e.preventDefault()
    commandBuffer += e.key.toLowerCase()

    // Check for single-letter field shortcuts (immediate execution)
    const fieldShortcuts: Record<string, string> = {
      k: 'kids',
      v: 'vehicles',
      d: 'dependents',
      n: 'name',
      s: 'state',
      e: 'email',
      p: 'phone',
      z: 'zip',
      // ... etc for all 27 fields
    }

    // Check for multi-letter action shortcuts
    const actionShortcuts: Record<string, string> = {
      export: 'export',
      copy: 'copy',
      reset: 'reset',
      policy: 'policy',
      intake: 'intake',
      convo: 'intake',
      help: 'help',
    }

    // If buffer matches single-letter field, execute immediately
    if (commandBuffer.length === 1 && fieldShortcuts[commandBuffer]) {
      openFieldModal(fieldShortcuts[commandBuffer])
      commandMode = false
      commandBuffer = ''
      hideCommandIndicator()
      if (commandTimeout) clearTimeout(commandTimeout)
    }
    // If buffer matches action shortcut, execute
    else if (actionShortcuts[commandBuffer]) {
      executeAction(actionShortcuts[commandBuffer])
      commandMode = false
      commandBuffer = ''
      hideCommandIndicator()
      if (commandTimeout) clearTimeout(commandTimeout)
    }
    // Update indicator with current buffer
    else {
      showCommandIndicator(`/${commandBuffer}`)
    }
  }

  // Exit command mode on Escape
  if (commandMode && e.key === 'Escape') {
    commandMode = false
    hideCommandIndicator()
    if (commandTimeout) clearTimeout(commandTimeout)
  }
})

// Special handling in notes input: clear the / character
const notesInput = document.getElementById('notes-input')
notesInput?.addEventListener('input', (e) => {
  const target = e.target as HTMLInputElement
  // If slash was just typed at start of sequence, enter command mode
  if (target.value.endsWith('/') && commandMode) {
    // Remove the / from display
    target.value = target.value.slice(0, -1)
  }
})
```

#### Smart Slash Detection (Avoiding False Positives)

The system should NOT trigger on legitimate slash usage:

```typescript
// In notes input, detect legitimate slash usage
function shouldTriggerCommand(text: string, cursorPosition: number): boolean {
  // Don't trigger if preceded by a digit (likely a date: 1/5/2025)
  const beforeCursor = text.substring(0, cursorPosition)
  if (/\d$/.test(beforeCursor)) {
    return false
  }

  // Don't trigger if part of URL (http://, https://)
  if (beforeCursor.includes('http:') || beforeCursor.includes('https:')) {
    return false
  }

  // Don't trigger if preceded by another / (escape: //k for literal /k)
  if (beforeCursor.endsWith('/')) {
    return false // This is an escape sequence
  }

  return true
}
```

#### Visual Feedback for Slash Commands

When user presses `/`, show visual indicator that system is awaiting second keystroke:

- **Bottom-right corner:** Small badge showing `/...` with 2-second timeout
- **After second keystroke:** Badge disappears, modal opens
- **If timeout:** Badge fades out, returns to normal state
- **On Escape:** Badge disappears immediately

#### Modal Behavior

All field-specific modals follow this pattern:

1. **Auto-focus** on input field when modal opens
2. **Pre-fill** with current value if field already captured (editing mode)
3. **Enter** submits value, closes modal, injects pill into notes
4. **Escape** cancels, closes modal without changes
5. **Click outside** closes modal (same as Escape)

#### Keyboard Shortcut Browser (`/help` or `/?`)

The shortcuts browser modal should display:

- **Grouped by category:** Actions (`/export`, `/copy`, `/reset`), Fields (Identity/Location/Product/etc.), Mode Switching (`/policy`, `/intake`)
- **Visual slash commands:** Show `/{letter}` for fields, `/{word}` for actions
- **Search/filter:** Allow typing to filter shortcuts by name
- **Printable reference:** Option to print or export as PDF
- **Pro tip:** Show that ALL shortcuts are slash commands - no modifier keys needed

---

## Part 2: UX Decision Rationale

### 2.1 Original Philosophy Analysis

#### Strengths

✅ **Clear separation of concerns:** `Alt+` for actions, `Ctrl+` for fields/modes makes logical sense
✅ **Memorable categories:** Easy to remember "Alt = action, Ctrl = input"
✅ **Low risk for actions:** Alt+ prefix has minimal browser conflicts

#### Weaknesses

🔴 **Emacs conflicts ignored:** Ctrl+A/D/K/V are heavily used in macOS text editing
🔴 **Doesn't scale:** Only 4 field shortcuts documented, but 27 fields needed
🔴 **Inconsistent coverage:** Many fields lack shortcuts (name, email, state, etc.)
⚠️ **Chrome conflicts:** Cmd+K and Cmd+D confusion when users mistype Ctrl as Cmd

---

### 2.2 Browser Conflict Findings

#### macOS-Specific Behavior

On macOS, **Ctrl key is NOT the primary modifier** for copy/paste/select all. Instead:

- **Cmd (⌘)** is used for: Copy, Paste, Cut, Select All, Save, etc.
- **Ctrl (^)** is used for: Emacs-style text navigation (line start/end, delete char, cut line)

This means:

- ✅ `Ctrl+V` does NOT conflict with paste (that's Cmd+V)
- 🔴 `Ctrl+V` DOES conflict with Emacs "page down" in text fields
- 🔴 `Ctrl+K` DOES conflict with "cut to end of line" (very common for power users)

#### Chrome-Specific Behavior

In Chrome on macOS:

- `Cmd+K` focuses the address bar (omnibox)
- `Cmd+D` bookmarks the current page
- Web apps CAN override these with `event.preventDefault()`, but users may expect them

#### Risk Assessment

| Original Shortcut   | Conflict Type            | Risk Level  | User Impact                                            |
| ------------------- | ------------------------ | ----------- | ------------------------------------------------------ |
| `Ctrl+K` (kids)     | Emacs: cut to line end   | 🔴 High     | Power users will be frustrated - this is muscle memory |
| `Ctrl+D` (deps)     | Emacs: delete char right | 🔴 High     | Common deletion shortcut, breaks text editing          |
| `Ctrl+V` (vehicles) | Emacs: page down         | ⚠️ Moderate | Less common, but still used                            |
| `Ctrl+A` (ages)     | Emacs: line start        | 🔴 High     | Extremely common for navigation                        |
| `Alt+E` (export)    | Firefox: Edit menu       | 🟡 Low      | Chrome demo only, minimal impact                       |
| `Alt+R` (reset)     | Some browsers: reload    | 🟡 Low      | Can override, low usage                                |

**Conclusion:** The original `Ctrl+` prefix for field shortcuts **must be replaced** to avoid breaking text editing functionality in the notes input field.

---

### 2.3 Proposed Shortcut Schemes

#### Option A: Cmd+Shift+{Letter} for All Fields

**Pattern:** Use Cmd+Shift+K for kids, Cmd+Shift+V for vehicles, etc.

**Pros:**

- ✅ Zero conflicts with system/browser shortcuts
- ✅ Simple pattern: one modifier combo for all fields
- ✅ Scales to all 27 fields

**Cons:**

- ❌ Three-key combination is slower to type (Cmd + Shift + letter)
- ❌ Harder to reach for one-handed typing
- ❌ Not as elegant as two-keystroke prefix pattern

**Example:**

```
Cmd+Shift+K → Kids modal
Cmd+Shift+V → Vehicles modal
Cmd+Shift+N → Name modal
```

**Verdict:** ⚠️ **Functional but not optimal** - works but sacrifices speed

---

#### Option B: `/{letter}` Slash Commands (RECOMMENDED)

**Pattern:** Press `/`, then single letter (e.g., `/k` for kids)

**Pros:**

- ✅ **Fastest possible:** Just 2 keystrokes, no modifier keys, can type with one hand
- ✅ **Works globally:** From notes input, sidebar, PDF viewer, anywhere in app (document-level listener)
- ✅ **Highly discoverable:** Slack/Discord users instantly recognize `/` commands
- ✅ **Zero conflicts:** No browser or system shortcut conflicts
- ✅ **Scales infinitely:** 26 letters available
- ✅ **Visual feedback natural:** Show `/...` indicator after first keystroke
- ✅ **"Command mode" concept:** Clearly in special state (like Vim or Slack)
- ✅ **No modifier fatigue:** Don't need to hold Cmd/Ctrl/Option

**Cons:**

- ⚠️ **Smart detection needed:** Must avoid triggering on dates (1/5/2025) or URLs (http://)
- ⚠️ **Requires prefix state management:** Track first vs second keystroke (same as any prefix pattern)
- ⚠️ **Less familiar to non-Slack users:** Though intuitive once explained

**Example:**

```
/ → (Visual indicator: "/...")
k → Opens kids modal
v → Opens vehicles modal
n → Opens name modal
```

**How It Works Globally:**

```
1. User presses / (from anywhere: sidebar, PDF, notes)
2. System enters "command mode" for 2 seconds
3. Visual indicator appears: "/..."
4. User presses second key (e.g., k)
5. Modal opens, mode resets
6. Smart detection prevents false triggers (dates, URLs)
```

**False Positive Prevention:**

```typescript
// Don't trigger on:
- 1/5/2025 (date with digit before /)
- http:// or https:// (URLs)
- //k (double slash = escape for literal /k)
- / in other input fields (except notes input)
```

**Verdict:** ✅ **RECOMMENDED** - Fastest, most discoverable, works everywhere, zero conflicts

---

#### Option C: Context-Aware Cmd+{Letter}

**Pattern:** Use Cmd+{letter} for fields where safe, Cmd+Shift+{letter} where conflicts exist

**Pros:**

- ✅ Fastest for common fields (single modifier + letter)
- ✅ No prefix required for most shortcuts
- ✅ Minimal conflicts when carefully assigned

**Cons:**

- ❌ Inconsistent pattern - users must remember which fields use Shift
- ❌ Harder to learn (no predictable rule)
- ❌ Requires careful conflict checking for each new field
- ❌ Doesn't scale well (only ~10 safe Cmd+{letter} combinations)

**Example:**

```
Cmd+N → Name (safe, Cmd+N is "new email" but we can override)
Cmd+Shift+S → State (Cmd+S conflicts with Save)
Cmd+Shift+K → Kids (Cmd+K conflicts with Chrome address bar)
```

**Verdict:** ❌ **Not recommended** - Inconsistency hurts learnability

---

#### Option D: Option/Alt+{Letter} for All Fields

**Pattern:** Use Option+K for kids, Option+V for vehicles, etc.

**Pros:**

- ✅ Single modifier (faster than Cmd+Shift)
- ✅ Option key is underutilized on macOS
- ✅ Scales to all 26 letters
- ✅ No Emacs conflicts

**Cons:**

- ⚠️ Option+{letter} sometimes triggers app menu shortcuts (Option+E, Option+F)
- ⚠️ Doesn't match existing pattern (Ctrl+X for actions, Alt+ for actions)
- ⚠️ Less discoverable (Option key not as obvious as Cmd)

**Example:**

```
Option+K → Kids modal
Option+V → Vehicles modal
Option+N → Name modal
```

**Verdict:** ⚠️ **Workable but not optimal** - Could work but less consistent with existing patterns

---

### 2.4 Final Recommendation: Option B (`/{letter}` Slash Commands)

**Selected Scheme:** **`/{letter}`** slash command system

**Rationale:**

1. **Fastest possible input:** Just `/k` (2 keystrokes, no modifiers) vs `Cmd+F K` (3 keystrokes with modifier hold)
2. **Works globally:** Document-level listener means `/k` works from sidebar, PDF viewer, notes input, anywhere
3. **Highly discoverable:** Insurance brokers already use Slack - they'll recognize `/` commands instantly
4. **Zero conflicts:** No browser or system shortcuts use unmodified `/` + letter pattern
5. **Scalability:** 26 letters available (exceeds our 27 fields when using smart letter assignments)
6. **No modifier fatigue:** Single hand can type `/k` without reaching for Cmd/Ctrl/Option
7. **Visual feedback natural:** `/...` indicator matches Slack/Discord command UX pattern
8. **Accessible:** No modifier keys required makes it easier for users with mobility considerations

**Why Slash Commands Beat Modifier-Based Shortcuts:**

| Metric              | `/k`                  | `Cmd+F K`                        | `Opt+K`                         | `Cmd+Shift+K`        |
| ------------------- | --------------------- | -------------------------------- | ------------------------------- | -------------------- |
| **Keystrokes**      | 2 (sequential)        | 3 (2 simultaneous + 1)           | 2 (simultaneous)                | 3 (all simultaneous) |
| **One-handed**      | ✅ Yes                | ❌ No (need two hands for Cmd+F) | 🟡 Maybe (depends on hand size) | ❌ No                |
| **Discoverability** | ✅ High (Slack users) | 🟡 Medium (tooltips)             | 🟡 Medium (tooltips)            | 🟡 Medium            |
| **Works globally**  | ✅ Yes                | ✅ Yes                           | ✅ Yes                          | ✅ Yes               |
| **Zero conflicts**  | ✅ Yes                | 🟡 Overrides Find                | 🟡 Some app menus               | ✅ Yes               |
| **Speed**           | ✅ Fastest            | 🟡 Moderate                      | ✅ Fast                         | ❌ Slow              |

**Philosophy Update:**

**Single-prefix system with clear categorization:**

1. **`/{letter}`** - Field shortcuts (27 fields)
   - Single letters for fast data entry
   - Examples: `/k` (kids), `/v` (vehicles), `/n` (name)

2. **`/{word}`** - App-level actions (6 actions)
   - Full words for app actions
   - Examples: `/export`, `/copy`, `/reset`, `/policy`, `/intake`, `/help`

**Benefits:**

- **One pattern** instead of three (was: `/`, `Alt+`, `Cmd+Shift+`)
- **Zero modifier keys** - everything is slash-based
- **Maximum simplicity** - just type `/` then a letter or word
- **Highly discoverable** - Slack/Discord users instantly understand

**Migration from Original Spec:**

| Original            | New             | Change Reason                                      |
| ------------------- | --------------- | -------------------------------------------------- |
| `Ctrl+K` (kids)     | `/k`            | Avoid Emacs conflict + faster input                |
| `Ctrl+V` (vehicles) | `/v`            | Avoid Emacs conflict + faster input                |
| `Ctrl+D` (deps)     | `/d`            | Avoid Emacs conflict + faster input                |
| None (ages)         | `/r`            | Never use Ctrl+A (select all conflict)             |
| `Alt+E` (export)    | `/export`       | Simplify to ONE prefix (slash commands only)       |
| `Alt+C` (copy)      | `/copy`         | Simplify to ONE prefix                             |
| `Alt+R` (reset)     | `/reset`        | Simplify to ONE prefix                             |
| `Ctrl+X P` (policy) | `/policy`       | Fix Ctrl+X = cut conflict + simplify to ONE prefix |
| `Ctrl+?` (help)     | `/help` or `/?` | Simplify to ONE prefix                             |

---

### 2.5 Complete Field-to-Shortcut Mapping (Final Scheme)

This table provides the definitive mapping of all 27 fields to their keyboard shortcuts under the recommended **slash command** scheme.

#### Group 1: Identity & Contact

| Field | Pill Syntax    | Shortcut | Mnemonic  | Flow   |
| ----- | -------------- | -------- | --------- | ------ |
| Name  | `name:`, `n:`  | `/n`     | **N**ame  | Intake |
| Email | `email:`, `e:` | `/e`     | **E**mail | Intake |
| Phone | `phone:`, `p:` | `/p`     | **P**hone | Intake |

#### Group 2: Location

| Field    | Pill Syntax    | Shortcut | Mnemonic  | Flow           |
| -------- | -------------- | -------- | --------- | -------------- |
| State    | `state:`, `s:` | `/s`     | **S**tate | Intake, Policy |
| Zip Code | `zip:`, `z:`   | `/z`     | **Z**ip   | Intake         |

#### Group 3: Product & Household

| Field            | Pill Syntax                  | Shortcut | Mnemonic         | Flow           |
| ---------------- | ---------------------------- | -------- | ---------------- | -------------- |
| Product Line     | `product:`, `prod:`          | `/l`     | Product **L**ine | Intake, Policy |
| Age              | `age:`, `a:`                 | `/a`     | **A**ge          | Intake         |
| Household Size   | `household:`, `hh:`          | `/h`     | **H**ousehold    | Intake         |
| Children Count   | `kids:`, `k:`, `children:`   | `/k`     | **K**ids         | Intake         |
| Dependents Count | `deps:`, `d:`, `dependents:` | `/d`     | **D**ependents   | Intake         |

#### Group 4: Vehicle/Auto (Intake Mode)

| Field            | Pill Syntax                    | Shortcut | Mnemonic                                   | Flow   |
| ---------------- | ------------------------------ | -------- | ------------------------------------------ | ------ |
| Vehicle Count    | `vehicles:`, `v:`, `cars:`     | `/v`     | **V**ehicles                               | Intake |
| Garage Type      | `garage:`, `car:`, `c:`        | `/g`     | **G**arage                                 | Intake |
| VINs             | `vins:`, `vin:`                | `/i`     | V**I**Ns                                   | Intake |
| Driver Ages      | `drivers:`, `driver_ages:`     | `/r`     | D**R**ivers                                | Intake |
| Driving Records  | `records:`, `driving_records:` | `/c`     | Re**C**ords                                | Intake |
| Clean Record 3yr | `clean:`, `clean_record:`      | `/u`     | Clean (safe driver) → **U**nsullied record | Intake |

**Note:** VINs uses "I" (V**I**N), Driving Records uses "C" (re**C**ords), Clean Record uses "U" (**u**nsullied) to avoid conflicts with Vehicle (V) and Drivers (R).

#### Group 5: Property/Home (Intake Mode)

| Field             | Pill Syntax                             | Shortcut | Mnemonic          | Flow   |
| ----------------- | --------------------------------------- | -------- | ----------------- | ------ |
| Owns Home         | `owns_home:`, `owner:`                  | `/o`     | **O**wner         | Intake |
| Property Type     | `property:`, `prop_type:`               | `/t`     | Property **T**ype | Intake |
| Construction Year | `year:`, `built:`, `construction_year:` | `/y`     | **Y**ear Built    | Intake |
| Roof Type         | `roof:`, `roof_type:`                   | `/f`     | Roo**F** Type     | Intake |
| Square Feet       | `sqft:`, `square_feet:`                 | `/q`     | S**Q**uare Feet   | Intake |

**Note:** Roof Type uses "F" (roo**F**) to distinguish from other fields. Square Feet uses "Q" (s**q**uare).

#### Group 6: Coverage/Policy (Policy Analysis Mode)

| Field             | Pill Syntax              | Shortcut | Mnemonic                                                            | Flow   |
| ----------------- | ------------------------ | -------- | ------------------------------------------------------------------- | ------ |
| Current Carrier   | `carrier:`               | `/r`     | Ca**R**rier                                                         | Policy |
| Current Premium   | `premium:`               | `/m`     | Pre**M**ium                                                         | Policy |
| Deductibles       | `deductible:`, `ded:`    | `/b`     | Deducti**B**le                                                      | Policy |
| Limits            | `limits:`, `limit:`      | `/x`     | Ma**X**imum Limits                                                  | Policy |
| Existing Policies | `policies:`, `existing:` | `/w`     | Existing (other products for bundles) → **W**hat else do they have? | Policy |

**Note on Letter Conflicts:**

- **R** is used for both "Drivers" (intake) and "Carrier" (policy) - **No conflict** because they're in different modes
- **L** is used for "Product Line" (both modes) - **Context-aware**: modal title and placeholder text differ by mode
- Other letters are unique within each mode

---

### 2.6 Context-Aware Shortcut Behavior

Some letters are reused across intake and policy modes. The system should show **different modal content** based on the active mode:

| Shortcut | Intake Mode                                                          | Policy Mode                                           |
| -------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| `/r`     | Driver Ages modal<br>"How many drivers? (ages)"                      | Current Carrier modal<br>"Current insurance carrier?" |
| `/l`     | Product Line modal<br>"Insurance type? (auto/home/renters/umbrella)" | Product Line modal<br>"Policy product type?"          |

**Implementation:** Check active mode (`intake` or `policy`) when opening modal, render appropriate field.

---

### 2.7 Edge Cases & Fallbacks

#### Scenario 1: User Forgets Second Keystroke

**Problem:** User presses `/` but doesn't press second letter
**Solution:** 2-second timeout automatically exits "command mode"
**UX:** Visual indicator ("/...") fades out after 2 seconds

#### Scenario 2: User Presses Invalid Second Letter

**Problem:** User presses `/` then `9` (no field mapped to 9)
**Solution:** Show brief toast "No field shortcut for '9'"
**UX:** Non-blocking notification, mode resets

#### Scenario 3: User Types Slash in Date or URL

**Problem:** User types `1/5/2025` (date) or `http://example.com` (URL) and `/` triggers command mode
**Solution:** Smart detection prevents trigger when `/` preceded by digit or in URL context
**UX:** Normal typing behavior, no false positives

#### Scenario 4: Field Not Available in Current Mode

**Problem:** User presses `/v` in policy mode (vehicles not relevant for policy analysis)
**Solution:** Modal shows "Vehicles not available in Policy mode. Switch to Intake mode?"
**UX:** Helpful error with actionable guidance

#### Scenario 5: User Wants Literal Slash Command Text

**Problem:** User wants to type "/k" literally in notes (not trigger shortcut)
**Solution:** Typing `//k` escapes the first slash, resulting in literal `/k` text
**UX:** Double slash = escape mechanism (similar to markdown `\\`)

---

### 2.8 Future Considerations

#### Expanding Beyond 26 Fields

If more than 26 fields are added in the future, consider:

1. **Additional prefixes:** `Cmd+G` (G for "group") for secondary field shortcuts
2. **Mode-specific letters:** Reuse more letters across intake/policy modes
3. **Dropdown shortcut menu:** Pressing `Cmd+F` twice shows searchable field list

#### Accessibility Considerations

When accessibility becomes a requirement post-MVP:

- **Screen reader support:** Announce "Field shortcut mode active" after Cmd+F
- **Visual-only prefix indicator:** Add audio cue for screen reader users
- **Keyboard-only navigation:** Ensure all shortcuts work without mouse

#### Internationalization

For non-English locales:

- **Mnemonic letters may not make sense** (e.g., "K" for "kids" doesn't work in Spanish "niños")
- **Consider numeric shortcuts:** `Cmd+F 1` for first field, `Cmd+F 2` for second, etc.
- **Keep English shortcuts as fallback:** Even in localized versions

---

## Part 3: Testing & Validation

### 3.1 Conflict Testing Checklist

Before deployment, validate that custom shortcuts do NOT interfere with browser/system functions:

- [ ] Verify `Cmd+A` (select all) still works in notes input
- [ ] Verify `Cmd+C` (copy) and `Cmd+V` (paste) work in all text fields
- [ ] Verify `Cmd+Z` (undo) works in notes input
- [ ] Verify `Ctrl+K` (cut to end of line) works in notes input when NOT in field shortcut mode
- [ ] Verify `Ctrl+A` (move to line start) works in notes input
- [ ] Verify `Cmd+R` (reload page) still works (should not be overridden)
- [ ] Verify `Cmd+W` (close tab) still works (should not be overridden)
- [ ] Verify `Cmd+F` (find in page) is overridden ONLY when focus is on IQuote Pro app

### 3.2 User Acceptance Testing Scenarios

Test with target users (insurance brokers):

**Scenario 1: New User Learning Shortcuts**

- Task: Capture client info using only keyboard shortcuts (no mouse)
- Success: User completes intake flow using shortcuts within 5 minutes
- Metric: ≥80% of users successfully use `Cmd+F K`, `Cmd+F V`, `Cmd+F D`

**Scenario 2: Power User Efficiency**

- Task: Experienced user completes intake in under 2 minutes using shortcuts
- Success: User uses shortcuts without looking at shortcut browser
- Metric: Average time to open field modal <1 second (Cmd+F + letter)

**Scenario 3: Error Recovery**

- Task: User accidentally presses wrong shortcut (e.g., `Cmd+F 9`)
- Success: Clear error message, user understands how to correct
- Metric: 100% of users recover from wrong shortcut without assistance

---

## Part 4: Implementation Checklist

### 4.1 Development Tasks

- [ ] Implement prefix state management (`Cmd+F` detection)
- [ ] Add visual indicator component ("Cmd+F ..." badge)
- [ ] Update all 27 field modals with correct shortcuts
- [ ] Update shortcuts browser (`Ctrl+?`) with new mappings
- [ ] Add `event.preventDefault()` for all custom shortcuts
- [ ] Implement 2-second timeout for prefix mode
- [ ] Add error handling for invalid second keystrokes
- [ ] Support both `Cmd+F` and `Ctrl+F` as valid prefixes (cross-platform compatibility)
- [ ] Add context-aware modal rendering (intake vs policy mode)
- [ ] Update placeholder text in notes input to show `Cmd+F` pattern

### 4.2 Documentation Tasks

- [ ] Update [docs/front-end-spec.md](front-end-spec.md) with new shortcut philosophy
- [ ] Create keyboard shortcut reference card (printable PDF)
- [ ] Add shortcut hints to all field modals (e.g., "Cmd+F K")
- [ ] Document implementation details in developer README
- [ ] Add inline code comments explaining prefix pattern

### 4.3 Design Tasks

- [ ] Design visual indicator for "Cmd+F ..." state
- [ ] Update shortcuts browser UI with new mappings
- [ ] Add keyboard shortcut badges to sidebar field labels (optional)
- [ ] Design error toast for invalid shortcuts

---

## Appendix A: Quick Reference Cards

### For Developers

**Slash Command Implementation:**

```
1. Listen for / keydown (document-level)
2. Enter "command mode" (set state flag)
3. Show visual indicator ("/...")
4. Listen for second keystroke (A-Z)
5. Map letter to field, open corresponding modal
6. Reset mode, hide indicator
7. Timeout after 2 seconds if no second keystroke
8. Smart detection: Don't trigger on dates (1/5/2025) or URLs (http://)
```

**Modal Injection Pattern:**

```
1. Modal opens (field-specific)
2. Input auto-focused
3. User types value
4. User presses Enter
5. Value injected as pill into notes (e.g., `k:2`)
6. Modal closes
7. Sidebar updates with captured field
```

**Global Shortcut Access:**

```
Slash commands work from ANYWHERE in the app:
- Notes input: Type / then letter
- Sidebar: Press / then letter
- PDF viewer: Press / then letter
- Any other context: Press / then letter (except modal inputs)
```

---

### For Users (Brokers)

**Cheat Sheet: Common Field Shortcuts**

| Field      | Shortcut | Example                | Result                  |
| ---------- | -------- | ---------------------- | ----------------------- |
| Kids       | `/k`     | Type "2", press Enter  | Injects `k:2`           |
| Vehicles   | `/v`     | Type "3", press Enter  | Injects `v:3`           |
| Dependents | `/d`     | Type "1", press Enter  | Injects `d:1`           |
| Name       | `/n`     | Type "John Doe", Enter | Injects `name:John Doe` |
| State      | `/s`     | Type "CA", Enter       | Injects `state:CA`      |
| Drivers    | `/r`     | Type "2", Enter        | Injects `drivers:2`     |

**Pro Tip:** Slash commands work from anywhere in the app, not just when typing in notes!

**Other Shortcuts:**

- `/export` - Export pre-fill packet or savings pitch
- `/copy` - Copy to clipboard
- `/reset` - Reset session
- `/policy` - Switch to policy analysis mode
- `/intake` or `/convo` - Switch to intake mode
- `/help` or `/?` - Show all keyboard shortcuts

---

## Appendix B: Alternatives Considered & Rejected

### Single-Key Shortcuts (e.g., just `K` for kids)

**Why rejected:** Conflicts with typing in notes input - user can't type the letter "k" without triggering shortcut.

### Number Pad Shortcuts (e.g., `Cmd+1` for kids)

**Why rejected:** Not memorable (users can't remember which number maps to which field), doesn't scale beyond 10 fields.

### Function Keys (e.g., `F1` for kids)

**Why rejected:** Requires reaching far from home row, conflicts with browser/OS F-key shortcuts (F11 fullscreen, F12 devtools).

### Mouse-Only Approach (click field in sidebar)

**Why rejected:** Slower than keyboard for power users, breaks flow during client calls.

---

## Change Log

| Date       | Version | Description                                                                                                                                                                                                                                                                                                                                                                 | Author            |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 2025-11-09 | 4.0     | **FINAL SIMPLIFICATION - One prefix only:** Replaced ALL modifier-based shortcuts with slash commands. System now uses ONLY slash commands: `/{letter}` for fields (27 shortcuts: `/k`, `/v`, `/n`) and `/{word}` for actions (6 shortcuts: `/export`, `/copy`, `/reset`, `/policy`, `/intake`, `/help`). Zero modifier keys, maximum simplicity.                           | Sally (UX Expert) |
| 2025-11-09 | 3.0     | **Simplified to two prefixes:** Replaced `Alt+` and `Ctrl+X` shortcuts with unified `Cmd+Shift+{letter}` for all app-level actions (export, copy, reset, mode switching, help). System now has only 2 prefixes: `/{letter}` for fields (27 shortcuts) and `Cmd+Shift+{letter}` for actions (6 shortcuts). Fixes `Ctrl+X` conflict (cut command) and reduces cognitive load. | Sally (UX Expert) |
| 2025-11-09 | 2.0     | **Major revision:** Changed recommendation from `Cmd+F {letter}` to `/{letter}` slash commands based on critical feedback. Slash commands are faster (2 keystrokes vs 3), work globally, more discoverable (Slack users), and have zero conflicts. Updated all tables, code examples, and implementation notes.                                                             | Sally (UX Expert) |
| 2025-11-09 | 1.0     | Initial keyboard shortcuts analysis with complete field inventory, macOS+Chrome conflict research, and recommended Cmd+F prefix scheme                                                                                                                                                                                                                                      | Sally (UX Expert) |

---

**Document Status:** ✅ Complete - Ready for stakeholder review and front-end spec update
