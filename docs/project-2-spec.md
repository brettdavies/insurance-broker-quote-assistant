# Project 2: IQuote Pro Sales Assistant - Specification

**Source:** AI Strategies Applied AI Case Studies (Nov 2025) - Pages 4-7

---

## Project Overview

Build a sales-focused assistant that helps an insurance broker qualify shoppers and prepare quotes across multiple carriers and states. The assistant supports two input scenarios:

- **Conversational intake:** a dialogue that gathers quote essentials (e.g., who you are, state, product line) and routes to the correct quoting path.
- **Policy-based pitch:** given an existing policy, explain how an agent can position savings opportunities (bundles, deductible/limit trade-offs, discounts) and prepare a pre-fill packet.

The tool must not use live web search at runtime. Students will create an offline "knowledge pack" (files derived from public web sources) to train/configure sub-bots with carrier/state/product rules. Architecture should account for carriers operating in different states, varying eligibility, costs, discounts, and pay structures.

---

## Problem Statement

Design a multi-agent (or equivalent) assistant that:

- Elicits or parses required quote info, routes to an appropriate carrier/state/product flow, and produces an IQuote Pro pre-fill packet (or stub) with disclaimers and handoff.
- In a policy-based scenario, analyzes provided coverage/limits/premiums and generates a clear savings pitch for an agent to discuss—grounded in the offline knowledge pack and policy data.
- Operates entirely on local/offline artifacts at runtime; no web search or live rate scraping.

---

## Business Context & Impact

Brokerages sell across multiple carriers and states with different rules and compensation. A unified, sales-oriented assistant can increase completed quotes, improve lead quality, and standardize compliant positioning—if it routes correctly, avoids prohibited statements, and produces agent-ready pre-fill.

---

## Key Impact Metrics

- **Routing accuracy:** ≥90% correct carrier/state/product routing on test cases
- **Intake completeness:** ≥95% of required quote fields captured or flagged for follow-up
- **Savings explanation quality:** ≥85% of pitches rated "clear and actionable" by reviewers
- **Compliance:** 100% required disclaimers shown; 0 prohibited statements; proper handoff to licensed agent
- **Offline guarantee:** 0 runtime calls to external web search; all answers grounded in provided policy + knowledge pack

---

## Technical Requirements

### Required Programming Languages

- Feel free to choose whatever language you want, be prepared to justify your choices.

### AI/ML Frameworks

- Flexible: rules, small models, or LLMs permitted
- No live web retrieval at runtime; all knowledge comes from student-generated offline files

### Development Tools

- Minimal chat/UI for conversational intake and for rendering savings pitches
- Local store for knowledge pack (YAML/JSON/CSV) and logs
- RAG over the offline knowledge pack (citations to files/sections)

### Cloud Platforms

- Not required; local acceptable
- If used, keep secrets in environment variables; provide .env.example

### Other Specific Requirements

- Synthetic data only; no real PII in inputs or logs
- No binding quotes or guarantees; include required sales disclaimers and licensed-agent handoff
- At runtime, disable network search; document how to reproduce offline
- Students must include a "knowledge pack" folder with carrier/state/product rules, average prices for products, discounts, eligibility, and compensation notes, plus citations in a README (offline, not called at runtime)

---

## Success Criteria

What does success look like for this project?

- **Conversational scenario:** bot collects essentials (e.g., state, product, household/vehicle/home basics), routes to a carrier/state path, and produces an IQuote Pro pre-fill JSON (or stub) plus a lead handoff summary
- **Policy-based scenario:** bot ingests a synthetic declarations page and outputs a savings pitch with clear rationale (e.g., eligible discounts, bundle options, deductible/limit trade-offs), grounded in the knowledge pack and the policy
- **Compliance guardrails:** required disclaimers, refusal patterns for prohibited claims, and handoff to a licensed agent
- **Offline operation demonstrated:** logs show no external search calls
- **Evaluation harness reports:** routing accuracy, intake completeness, savings-pitch clarity, and compliance pass rate

---

## Functional Requirements (Must-Haves)

### Two input modes:

- **Conversational intake** → carrier/state/product routing → IQuote Pro pre-fill packet (or structured stub) + lead capture
- **Policy-based analysis** → savings opportunities + agent talking points + eligibility notes

### Multi-carrier/state logic:

- Encode carrier availability by state, product lines (Auto/Home/Renters/Umbrella), common eligibility rules, discount programs, and compensation/pay structure differences

### Knowledge pack (offline):

- Student-generated files (YAML/JSON/CSV) that define rules, glossary, and sample FAQs; include citations in docs (not used at runtime)

### Compliance and safety:

- Mandatory disclosures; prohibited statements list; refusal/escalation to licensed agent

### Interfaces:

- Minimal UI or CLI for both scenarios
- Expose structured outputs: route decision, missing fields checklist, pre-fill JSON/stub, savings pitch with cited knowledge-pack sections

### Observability:

- Redacted logs; per-interaction decision trace (inputs, rules consulted, outputs)

---

## Non-Functional Requirements

- Clear, maintainable architecture (multi-agent orchestrator preferred, but modular single-agent acceptable)
- Deterministic local demo; one-command setup; concise README
- No runtime dependency on web search; network can be disabled without breaking core flows

---

## Recommended Steps

1. **Build the offline Knowledge Pack** (authoring phase only may use the web)
   - Collect carrier/state/product rules, average prices, eligibility, discounts, pay structures, and common FAQs from public sources.
   - Normalize into local files (YAML/JSON/CSV) with clear keys (carrier, state, product, effective_date) and include citations in a README. Do not call the web at runtime.

2. **Design the bot architecture** (multi-agent preferred; modular alternative acceptable)
   - **Orchestrator/Router:** chooses Sales vs Policy flow and routes by carrier/state/product.
   - **Intake Agent:** conversational slot-filling for quote essentials; outputs a "missing fields" checklist.
   - **Policy Agent:** parses synthetic declarations and extracts coverages/limits/premiums.
   - **Rules Agent:** applies knowledge-pack rules for eligibility, discounts, and savings opportunities.
   - **Pre-fill Agent:** generates IQuote Pro pre-fill JSON (or stub) and a lead handoff summary.
   - **Compliance Agent:** injects disclosures, enforces refusal patterns, and triggers licensed-agent handoff.

3. **Implement the two input scenarios**
   - Conversational intake → route → pre-fill packet + lead capture + disclosures.
   - Policy-based analysis → savings pitch (bundles, deductible/limit trade-offs, discounts) grounded in the policy + knowledge pack.

4. **Add guardrails and offline guarantees**
   - Refuse prohibited statements; always show required disclaimers.
   - Disable network access at runtime; log evidence that responses are grounded in local files (file/section citations).

5. **Ship a minimal UI/CLI and structured outputs**
   - Simple chat or CLI for intake and policy flows.
   - Output JSONs: route decision, missing_fields[], prefill_packet (stub ok), savings_pitch with citations.

6. **Create an evaluation harness**
   - Provide synthetic test cases for routing accuracy, intake completeness, and savings-pitch clarity.
   - Emit a short report with metrics (e.g., accuracy, % fields captured, reviewer scores) and sample logs.

7. **Observability and packaging**
   - Redacted logs and a decision trace per interaction (inputs → rules consulted → outputs).
   - One-command setup; README with how to demo offline, assumptions, and limitations.

---

## Deliverables

GitHub repo with:

- README (setup, architecture, flows, disclaimers, how to demo)
- Offline knowledge pack (carrier/state/product rules) + citations in docs
- Sample synthetic policies (declarations) and example conversations
- Pre-fill packet schema (JSON) compatible with IQuote Pro expectations (or documented stub)
- Evaluation harness and short report (routing accuracy, intake completeness, savings-pitch clarity, compliance checks)
- Decision log of key trade-offs
