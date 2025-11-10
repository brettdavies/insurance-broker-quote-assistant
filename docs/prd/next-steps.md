# Next Steps

## Demo Script (Example Scenarios)

Based on evaluation criteria, the following demo scenarios should be prepared:

**Scenario 1: Conversational Intake - Complete Flow (California Auto Insurance)**
1. Broker starts chat, types: "Client is John Smith in California, needs auto insurance"
2. System extracts state (CA), product (Auto), routes to available carriers
3. Broker uses key-value shortcuts: `k:2` (2 kids), `v:2` (2 vehicles), `drivers:3`
4. System shows missing critical fields in sidebar (VINs, driver ages, driving records)
5. Broker completes conversation with natural language + shortcuts
6. Broker presses `Ctrl+X E` to export pre-fill packet
7. System generates JSON with routing decision (e.g., "StateFarm CA Auto"), missing fields checklist, CA auto disclaimers
8. **Validation:** Routing accuracy ≥90%, intake completeness ≥95%, 100% compliance (CA disclaimers present)

**Scenario 2: Policy Analysis - Savings Pitch (Florida Home Insurance)**
1. Broker drags PDF declarations page into policy upload panel
2. System extracts: Carrier=Allstate, State=FL, Product=Home, Premium=$2400/yr, Deductible=$1000
3. System analyzes against knowledge pack, identifies:
   - Eligible discount: Hurricane shutters (not applied) - saves $180/yr
   - Bundle opportunity: Add auto for 15% multi-policy discount - saves $360/yr
   - Deductible trade-off: Raise to $2500 - saves $240/yr
4. Savings pitch dashboard shows opportunities ranked by impact with citations
5. Broker presses `Ctrl+X S` to export savings pitch JSON
6. System generates structured pitch with FL home disclaimers
7. **Validation:** Savings pitch clarity ≥85%, 100% compliance (FL disclaimers present), knowledge pack citations included

**Scenario 3: Compliance Validation - Prohibited Statement Handling**
1. Broker attempts to send message containing prohibited statement (e.g., "Guaranteed lowest price")
2. System blocks message, displays licensed-agent handoff message
3. **Validation:** 100% compliance enforcement (prohibited statement filtered)

**Scenario 4: Offline Operation Proof**
1. Disable network access (except OpenAI API)
2. Run conversational intake flow
3. Review decision trace logs showing knowledge pack queries as in-memory cache hits (zero external web calls)
4. **Validation:** Offline guarantee (0 runtime web calls besides LLM)

**Scenario 5: Evaluation Harness Execution**
1. Run `bun run evaluate` command
2. System executes 15 synthetic test cases (10 conversational, 5 policy)
3. Generate report with metrics:
   - Routing accuracy: X% (target ≥90%)
   - Intake completeness: Y% (target ≥95%)
   - Savings pitch clarity: Z% (target ≥85%)
   - Compliance: 100% (target 100%)
4. Report includes LLM token usage, sample decision traces
5. **Validation:** All target metrics met

## UX Expert Prompt

Review the **User Interface Design Goals** section above and create detailed UI specifications for the IQuote Pro integrated home screen. Prioritize:

1. **Dark mode design system** (default theme with light mode toggle) - define color palette, component tokens, and contrast ratios
2. **Slash command shortcuts** - design visual feedback for command mode (e.g., `/...` indicator), modal popup UI patterns for field shortcuts (e.g., `/k`, `/v`, `/n`), and action shortcuts (e.g., `/export`, `/copy`). See [keyboard-shortcuts-reference.md](keyboard-shortcuts-reference.md) for complete v3.0 finalized design with 27 field + 6 action shortcuts
3. **Field-specific modals** - specify modal dimensions, animations, and field injection behavior for structured data capture
4. **Key-value syntax highlighting** - design inline syntax highlighting for `kids:3`, `k:3`, `deps:4` patterns in chat interface
5. **Real-time field capture sidebar** - design layout for missing fields display and adaptive compliance disclaimers

**Critical constraint:** The AI must be invisible. **No chatbot interface, no "AI: ..." message bubbles, no AI asking questions.** The broker types naturally or uses key-value syntax, and extraction happens silently in the background. The sidebar shows captured fields, but the chat panel never contains AI responses—only broker input and optional system notifications (e.g., "✓ Field captured: Kids = 2"). The interface is a note-taking tool with intelligent background extraction, NOT a conversational assistant.

Reference Sarah Chen's persona (power-user broker) and ensure all UI patterns optimize for speed during live client calls. Deliverable should be Figma mockups or detailed component specifications ready for developer handoff.

## Architect Prompt

The architect should review this PRD alongside the comprehensive architecture documentation in [docs/architecture/](docs/architecture/) and proceed with implementation planning. Key focus areas:

1. **Validate Tech Stack** - Confirm all specified technologies (Hono, TanStack, shadcn/ui) are appropriate
2. **Knowledge Pack Schema Design** - Define JSON structure for carriers, states, products, discounts, eligibility rules
3. **Hybrid Extraction Implementation** - Design key-value parser (regex patterns for kids:3, k:3 syntax) + LLM fallback logic
4. **Routing Rules Engine** - Implement deterministic eligibility evaluation without LLM
5. **Compliance Filter** - Design state/product-aware disclaimer selection and prohibited statement detection
6. **Adaptive UI Components** - Implement Emacs shortcuts, modal popups, real-time field capture sidebar
7. **Decision Trace Logging** - Design structured logging with PII redaction and knowledge pack citations
8. **Docker Deployment** - Create docker-compose.yml with knowledge pack volume mount

The system architecture should follow the hybrid LLM + deterministic rules pattern documented in [docs/architecture/2-high-level-architecture.md](docs/architecture/2-high-level-architecture.md). All implementation decisions should prioritize the 5-day timeline while maintaining production-quality code standards.

---
