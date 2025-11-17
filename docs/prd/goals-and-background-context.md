# Goals and Background Context

## Goals

- **Enable insurance brokers to qualify shoppers efficiently** through conversational intake that captures quote essentials and routes to the correct carrier/state/product path within the supported coverage (3 carriers, 5 states)
- **Empower agents with data-driven savings pitches** by analyzing existing policies and identifying bundle opportunities, discount eligibility, and coverage optimization based on the offline knowledge pack
- **Ensure 100% regulatory compliance** through mandatory disclaimers, prohibited statement filtering, and proper licensed-agent handoff
- **Demonstrate production-quality architecture and working functionality** with offline operation, multi-agent orchestration, and comprehensive observability running on local hardware
- **Achieve measurable success metrics**: ≥90% routing accuracy, ≥95% intake completeness, ≥85% pitch clarity, 100% compliance, 0 runtime web calls

## Background Context

Insurance brokers face complexity when quoting across multiple carriers, states, and product lines—each with different eligibility rules, discount programs, and compensation structures. Manual qualification and quote preparation is time-consuming and error-prone, leading to incomplete applications and missed savings opportunities.

IQuote Pro addresses this by providing an AI-powered sales assistant that guides brokers through two critical workflows: (1) conversational intake that captures shopper information and routes to the appropriate quoting path, and (2) policy analysis that generates agent-ready talking points for positioning competitive offers. The system operates entirely on an offline "knowledge pack" of carrier/state/product rules (covering 3 carriers across 5 states with defined product lines), ensuring consistent, compliant, and fast responses without runtime dependencies on web search or live rate scraping. This 5-day MVP demonstrates both production-quality architectural thinking and a working local demo suitable for client evaluation.

## Primary User Persona

**Sarah Chen, Senior Insurance Broker**

- **Experience:** 8 years in insurance sales, handles 50-60 quotes per week across multiple carriers
- **Typical Day:** Back-to-back client calls (phone + in-person), juggling multiple carrier portals, chasing missing information from clients, ensuring compliance with state regulations
- **Pain Points:**
  - Manual data entry across disparate carrier systems wastes 30-40% of day
  - Discovering missing fields late in quote process requires awkward client follow-ups
  - Compliance anxiety—uncertain if disclaimers are state/product appropriate
  - Missed cross-sell opportunities—no time to analyze existing policies for bundle savings
- **Goals:**
  - Qualify clients faster during initial conversations (reduce time-to-quote)
  - Capture complete information first time (eliminate follow-up calls)
  - Maintain compliance confidence (100% certainty disclaimers are correct)
  - Identify savings opportunities proactively (increase conversion rates)
- **Tech Comfort:** High—comfortable with keyboard shortcuts, prefers speed over GUI, uses multiple monitors

## Change Log

| Date       | Version | Description          | Author          |
| ---------- | ------- | -------------------- | --------------- |
| 2025-11-06 | 0.1     | Initial PRD creation | John (PM Agent) |

---
