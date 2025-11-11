# Keyboard Shortcuts Reference

**Document Version:** v3.0  
**Last Updated:** 2025-11-09  
**Status:** Complete

---

## Overview

This document provides a comprehensive reference table of all keyboard shortcuts in IQuote Pro. For the design rationale and philosophy, see [keyboard-shortcuts-analysis.md](keyboard-shortcuts-analysis.md).

**Quick Summary:**

- **`/{letter}`** - Field shortcuts (28 fields, works globally from anywhere in app)
  - Examples: `/k` (kids), `/v` (vehicles), `/n` (name), `/j` (credit score)
- **`/{word}`** - App-level actions (6 actions, works globally from anywhere in app)
  - Examples: `/export`, `/copy`, `/reset`, `/policy`, `/intake`, `/help`
- **One pattern, zero modifier keys** - Ultimate simplicity

---

## Field Shortcuts (Slash Commands)

All field shortcuts use the pattern `/{letter}` and work globally from anywhere in the application (sidebar, notes input, PDF viewer, etc.). When triggered, they open a modal dialog for that specific field.

### Identity & Contact

| Shortcut | Field | Modal Action                                        | Available In |
| -------- | ----- | --------------------------------------------------- | ------------ |
| `/n`     | Name  | Opens name input modal (First + Last name fields)   | Both modes   |
| `/e`     | Email | Opens email input modal (validates email format)    | Both modes   |
| `/p`     | Phone | Opens phone input modal (formats to (XXX) XXX-XXXX) | Both modes   |

### Location

| Shortcut | Field    | Modal Action                                          | Available In |
| -------- | -------- | ----------------------------------------------------- | ------------ |
| `/s`     | State    | Opens state picker modal (dropdown with US states)    | Both modes   |
| `/z`     | Zip Code | Opens zip code input modal (validates 5-digit format) | Both modes   |

### Product Selection

| Shortcut | Field        | Modal Action                                               | Available In |
| -------- | ------------ | ---------------------------------------------------------- | ------------ |
| `/l`     | Product Line | Opens product picker modal (auto, home, renters, umbrella) | Both modes   |

### Household Information

| Shortcut | Field                 | Modal Action                                        | Available In |
| -------- | --------------------- | --------------------------------------------------- | ------------ |
| `/a`     | Age                   | Opens age input modal (validates 16-100 range)      | Both modes   |
| `/h`     | Household Size        | Opens household size modal (number input, min: 1)   | Both modes   |
| `/k`     | Kids (Children Count) | Opens children count modal (number input, min: 0)   | Both modes   |
| `/d`     | Dependents            | Opens dependents count modal (number input, min: 0) | Both modes   |

### Eligibility Information

| Shortcut          | Field        | Modal Action                                                  | Available In |
| ----------------- | ------------ | ------------------------------------------------------------- | ------------ |
| `/j` or `/credit` | Credit Score | Opens credit score input modal (validates 300-850 FICO range) | Both modes   |

### Vehicle Information (Auto Insurance)

| Shortcut | Field              | Modal Action                                                                                    | Available In |
| -------- | ------------------ | ----------------------------------------------------------------------------------------------- | ------------ |
| `/v`     | Vehicles           | Opens vehicle count modal (number input, triggers multi-car discount check)                     | Both modes   |
| `/g`     | Garage Type        | Opens garage type picker modal (garage, carport, street, driveway)                              | Both modes   |
| `/i`     | VINs               | Opens VIN input modal (multi-line, validates VIN format)                                        | Both modes   |
| `/r`     | Drivers / Carrier  | **Context-aware:** Opens driver ages modal in intake mode, current carrier modal in policy mode | Both modes   |
| `/c`     | Driving Records    | Opens driving records modal (structured form for violations, accidents)                         | Both modes   |
| `/u`     | Clean Record (3yr) | Opens clean record confirmation modal (Yes/No toggle)                                           | Both modes   |
| `/j`     | Credit Score       | Opens credit score input modal (validates 300-850 FICO range)                                   | Both modes   |

### Property Information (Home/Renters Insurance)

| Shortcut | Field             | Modal Action                                                                            | Available In |
| -------- | ----------------- | --------------------------------------------------------------------------------------- | ------------ |
| `/o`     | Owns Home         | Opens owns home confirmation modal (Yes/No toggle, affects bundle eligibility)          | Both modes   |
| `/t`     | Property Type     | Opens property type picker modal (single-family, condo, townhouse, apartment)           | Both modes   |
| `/y`     | Construction Year | Opens year built input modal (validates 1800-2025 range)                                | Both modes   |
| `/f`     | Roof Type         | Opens roof type picker modal (asphalt, metal, tile, wood - affects wind/hail discounts) | Both modes   |
| `/q`     | Square Feet       | Opens square footage input modal (number input, min: 100)                               | Both modes   |

### Coverage Information (Policy Analysis)

| Shortcut | Field             | Modal Action                                                                             | Available In     |
| -------- | ----------------- | ---------------------------------------------------------------------------------------- | ---------------- |
| `/m`     | Current Premium   | Opens premium input modal (dollar amount, annual/monthly toggle)                         | Policy mode only |
| `/b`     | Deductibles       | Opens deductibles modal (multi-field form by coverage type)                              | Policy mode only |
| `/x`     | Coverage Limits   | Opens limits modal (multi-field form by coverage type)                                   | Policy mode only |
| `/w`     | Existing Policies | Opens existing policies modal (structured form for multi-carrier consolidation analysis) | Both modes       |

---

## Action Shortcuts

All action shortcuts use **full-word slash commands** for maximum simplicity and consistency.

| Shortcut  | Action               | Behavior                                                                 | Available In |
| --------- | -------------------- | ------------------------------------------------------------------------ | ------------ |
| `/export` | Export to IQuote Pro | Generates pre-fill packet and opens export confirmation modal            | Both modes   |
| `/copy`   | Copy to Clipboard    | Copies current notes + extracted data to clipboard in structured format  | Both modes   |
| `/reset`  | Reset Session        | Clears all data and returns to welcome screen (with confirmation prompt) | Both modes   |

---

## Mode Switching & Help

Mode switching and help use **full-word slash commands** like all other app actions.

| Shortcut              | Action                  | Behavior                                                        | Available In     |
| --------------------- | ----------------------- | --------------------------------------------------------------- | ---------------- |
| `/intake` or `/convo` | Switch to Intake Mode   | Switches from policy analysis to conversational intake workflow | Policy mode only |
| `/policy`             | Switch to Policy Mode   | Switches from intake to policy analysis workflow                | Intake mode only |
| `/help` or `/?`       | Show Keyboard Shortcuts | Opens help modal with all shortcuts and search functionality    | Both modes       |

---

## How Slash Commands Work

### Global Functionality

Slash commands work from **anywhere** in the application via document-level event listeners:

1. User types `/` (without modifiers)
2. App enters "command mode" for 2 seconds
3. Visual indicator appears: `/...`
4. User types command letters (e.g., `k` for kids, `credit` for credit score)
5. User presses `Enter` or `Space` to submit command
6. Modal opens for field commands, action executes for action commands
7. Press `Escape` to cancel command mode at any time

**Example Flow:**

```
User types: / → [Command mode active, shows "/..."]
User types: k → [Buffer shows "/k"]
User types: Enter or Space → [Opens "Kids (Children Count)" modal]
User enters: 2 → [Modal closes, injects "k:2" pill into notes]
```

### Smart Detection

The system intelligently avoids false positives:

- **Dates:** `1/5/2025` does not trigger (digits before slash)
- **URLs:** `http://example.com` does not trigger (letters before slash)
- **Escape Sequence:** Type `//k` to insert literal `/k` without triggering modal
- **Modal Inputs:** Slash commands disabled in modal text fields (except notes input)

### Command Submission

All slash commands require `Enter` or `Space` to submit:

- Single-letter commands: `/k` + `Enter` or `Space` → Opens kids modal
- Multi-letter commands: `/credit` + `Enter` or `Space` → Opens credit score modal
- Action commands: `/export` + `Enter` or `Space` → Executes export action

### Modal Behavior

When a slash command opens a modal:

1. **Focus:** Cursor automatically focuses in modal input field
2. **Validation:** Real-time validation with error messages
3. **Submit:** `Enter` key submits, `Escape` cancels
4. **Injection:** On submit, formatted value injected as pill into notes
5. **Keyboard Navigation:** `Tab` moves between fields in multi-field modals

---

## Context-Aware Shortcuts

Some shortcuts change behavior based on the current workflow mode:

| Shortcut | Intake Mode Behavior                           | Policy Mode Behavior                     |
| -------- | ---------------------------------------------- | ---------------------------------------- |
| `/r`     | Opens "Driver Ages" modal                      | Opens "Current Carrier" modal            |
| `/l`     | Opens product picker for new insurance inquiry | Opens product picker for policy analysis |
| `/m`     | (Not available)                                | Opens "Current Premium" modal            |
| `/b`     | (Not available)                                | Opens "Deductibles" modal                |
| `/x`     | (Not available)                                | Opens "Coverage Limits" modal            |

---

## Visual Feedback

### Command Mode Indicator

When slash command mode is active, the UI shows a visual indicator:

```
┌─────────────────────────────────────┐
│ Notes Input                          │
│                                      │
│ Customer wants to add a second car  │
│                                      │
│ /...                    ← Indicator │
└─────────────────────────────────────┘
```

### Tooltip Hints

All UI elements that support shortcuts display the shortcut in their tooltip:

```
┌─────────────────┐
│ [+] Add Vehicle │  ← Hover shows: "Add vehicle (/v)"
└─────────────────┘
```

### Placeholder Text

Input fields display shortcut hints in placeholder text:

```
┌─────────────────────────────────────┐
│ Type /k for kids, /v for vehicles  │  ← Placeholder
└─────────────────────────────────────┘
```

---

## Developer Implementation Notes

### Event Listener Pattern

```typescript
// Global document-level listener
let commandMode = false
let commandBuffer = ''
let commandTimeout: NodeJS.Timeout | null = null

document.addEventListener('keydown', (e) => {
  // Enter command mode on /
  if (e.key === '/' && !hasModifiers(e)) {
    const isNotesInput = (e.target as HTMLElement).dataset.notesInput === 'true'
    const isOtherInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)

    if (!isNotesInput && isOtherInput) return // Don't trigger in modal inputs

    e.preventDefault()
    enterCommandMode()
    return
  }

  // In command mode, next keystroke adds to buffer
  if (commandMode && /^[a-z]$/i.test(e.key)) {
    e.preventDefault()
    commandBuffer += e.key.toLowerCase()

    // Check if buffer matches single-letter field shortcut (execute immediately)
    if (commandBuffer.length === 1 && FIELD_SHORTCUTS[commandBuffer]) {
      executeCommand(FIELD_SHORTCUTS[commandBuffer])
      exitCommandMode()
      return
    }

    // Check if buffer matches full-word action shortcut
    if (ACTION_SHORTCUTS[commandBuffer]) {
      executeAction(ACTION_SHORTCUTS[commandBuffer])
      exitCommandMode()
      return
    }

    // Update visual indicator with current buffer
    showCommandIndicator(`/${commandBuffer}`)
  }

  // Cancel on Escape
  if (commandMode && e.key === 'Escape') {
    exitCommandMode()
  }
})
```

### Command Mapping

```typescript
// Single-letter field shortcuts
const FIELD_SHORTCUTS: Record<string, string> = {
  n: 'name',
  e: 'email',
  p: 'phone',
  s: 'state',
  z: 'zip',
  l: 'productLine',
  a: 'age',
  h: 'household',
  k: 'kids',
  d: 'dependents',
  v: 'vehicles',
  g: 'garage',
  i: 'vins',
  r: 'drivers',
  c: 'drivingRecords',
  u: 'cleanRecord3Yr',
  j: 'creditScore',
  o: 'ownsHome',
  t: 'propertyType',
  y: 'constructionYear',
  f: 'roofType',
  q: 'squareFeet',
  w: 'existingPolicies',
  m: 'currentPremium',
  b: 'deductibles',
  x: 'limits',
}

// Full-word action shortcuts
const ACTION_SHORTCUTS: Record<string, string> = {
  export: 'export',
  copy: 'copy',
  reset: 'reset',
  policy: 'policy',
  intake: 'intake',
  convo: 'intake', // alias
  help: 'help',
}

// Context-aware field mapping (intake vs policy mode)
const CONTEXT_AWARE_FIELDS: Record<string, { intake: string; policy: string }> = {
  r: { intake: 'drivers', policy: 'currentCarrier' },
}
```

### Smart Detection Logic

```typescript
function shouldTriggerSlashCommand(e: KeyboardEvent): boolean {
  if (e.key !== '/') return false
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return false

  const target = e.target as HTMLElement
  const precedingText = getPrecedingText(target)

  // Don't trigger if preceded by digit (date) or colon (URL protocol)
  if (/\d$/.test(precedingText)) return false
  if (/:$/.test(precedingText)) return false

  return true
}
```

---

## Accessibility

All keyboard shortcuts are designed with accessibility in mind:

- **Focus Management:** Modals trap focus and return focus to previous element on close
- **Escape Hatch:** All modals can be dismissed with `Escape` key
- **No Mouse Required:** Entire workflow navigable via keyboard only
- **Visual Indicators:** Command mode shows persistent visual feedback for low-vision users

---

## FAQ

### Why slash commands instead of Ctrl+ or Cmd+?

Slash commands are:

- **Faster:** 2 keystrokes for fields (`/k`), slightly longer for actions (`/export`)
- **Zero conflicts:** No browser/OS shortcut conflicts
- **Highly discoverable:** Familiar to Slack/Discord users
- **One-handed:** No modifier key stretching
- **One pattern to learn:** All shortcuts use slash commands (no mixing of modifier keys)

See [keyboard-shortcuts-analysis.md](keyboard-shortcuts-analysis.md) for full rationale.

### What if I need to type a literal slash?

Just type `/` normally in any context except the notes input. In the notes input, type `//` to insert a literal `/` without triggering command mode.

### What happens if I press a letter that's not mapped?

Nothing. The command mode times out after 2 seconds if no valid command is entered. You can also press `Escape` to cancel immediately.

### Do shortcuts work while a modal is open?

No. Slash commands are disabled when a modal is open to prevent interference with form inputs. Once the modal closes, shortcuts reactivate.

---

## Change Log

| Version | Date       | Changes                                                                                                                                                                                                                                                                                                                                             |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v3.1    | 2025-11-11 | Added credit score shortcut (`/j`) for eligibility evaluation. Updated cleanRecord command to cleanRecord3Yr to match UserProfile schema. Total field shortcuts: 28.                                                                                                                                                                                |
| v3.0    | 2025-11-09 | **FINAL SIMPLIFICATION - One prefix only:** Replaced ALL modifier-based shortcuts with slash commands. System now uses ONLY slash commands: `/{letter}` for fields (27: `/k`, `/v`, `/n`) and `/{word}` for actions (6: `/export`, `/copy`, `/reset`, `/policy`, `/intake`, `/help`). Zero modifier keys, maximum simplicity, one pattern to learn. |
| v2.0    | 2025-11-09 | **Simplified to two prefixes:** Changed all `Alt+` actions and `Ctrl+X` mode switches to unified `Cmd+Shift+{letter}` prefix. System now has only 2 prefixes: `/{letter}` for fields (27) and `Cmd+Shift+{letter}` for app actions (6). Fixes `Ctrl+X` cut conflict.                                                                                |
| v1.0    | 2025-11-09 | Initial release with complete slash command system (27 field shortcuts, 3 action shortcuts, 3 mode shortcuts)                                                                                                                                                                                                                                       |

---

**Related Documentation:**

- [keyboard-shortcuts-analysis.md](keyboard-shortcuts-analysis.md) - Design rationale and philosophy
- [front-end-spec.md](front-end-spec.md) - WHAT and WHY of keyboard shortcuts
- [prd.md](prd.md) - Product requirements and user workflows
