# User Interface Design Goals

## Overall UX Vision

The IQuote Pro interface prioritizes **broker efficiency and confidence** during client interactions. The UX should feel like a professional sales tool—fast, keyboard-driven, and information-dense without being cluttered. Brokers need to maintain eye contact with clients while navigating the system, so the interface must support rapid data entry via shortcuts and provide clear visual feedback on routing decisions, missing fields, and compliance status. The overall aesthetic should convey trustworthiness and professionalism appropriate for financial services conversations.

## Key Interaction Paradigms

- **Conversational Flow with Slash Command Shortcuts**: Text-based chat interface using slash commands for rapid data entry and actions (e.g., `/k` for kids, `/v` for vehicles, `/export` for export, `/copy` for clipboard). This pattern eliminates modifier key conflicts (especially Emacs shortcuts in text inputs), provides Slack-familiar UX for target users, and achieves fastest possible input at 2 keystrokes. See [keyboard-shortcuts-reference.md](keyboard-shortcuts-reference.md) for complete shortcut list
- **Progressive Disclosure**: Show only essential fields initially, expanding sections as the intake progresses (e.g., vehicle details only appear after Auto product is selected)
- **Real-Time Validation Feedback**: Instant visual indicators for routing eligibility, missing required fields, and compliance warnings
- **Export Actions**: One-click copy-to-clipboard for pre-fill packets, savings pitches, and lead summaries; plus file system export (download JSON) for pre-fill stubs
- **Dual Workflow Launch**: Home screen provides immediate access to both Conversational Intake and Policy Analysis workflows without intermediate mode selection

## AI Visibility Constraint

**Critical:** The AI operates **silently in the background** for the demo. The interface must NOT use a chatbot paradigm:

- **No chatbot interface:** AI extraction happens invisibly without conversational UI
- **No AI personas or avatars:** No "AI: ..." message bubbles in chat panel
- **No AI-initiated prompts:** AI does not ask the broker questions
- **Broker-centric input only:** Chat panel displays only broker's typed notes/input
- **Silent extraction feedback:** Real-time field capture shown in sidebar panels, not as AI responses in chat
- **Optional system notifications:** Brief, non-conversational status updates acceptable (e.g., "Field captured: Kids = 2") but must not resemble chatbot dialogue

**Rationale:** Brokers are professionals who know what information to collect. The AI is a background extraction and routing assistant, not a conversational partner. During live client calls, brokers need a note-taking interface with intelligent field extraction, not a chatbot asking them questions.

## Core Screens and Views

- **Home Screen with Dual Workflow Entry**: Main landing page with two prominent action areas—(1) start conversational intake chat or (2) upload/input policy for analysis—allowing brokers to begin either workflow immediately
- **Conversational Intake Chat View**: Full-screen chat with sidebar showing captured fields, routing status, and missing items checklist
- **Policy Upload/Input Panel**: Drag-and-drop for declarations page (PDF) or manual field entry available directly from home screen (no separate navigation required)
- **Savings Pitch Dashboard**: Generated recommendations with citations, discount eligibility, and bundle opportunities
- **Pre-Fill Packet Review**: Final review screen showing all captured data, disclaimers, and licensed-agent handoff instructions

## Accessibility: **None** (Minimal Usability Focus)

No formal WCAG compliance required. Focus on basic usability for target broker users: readable fonts, sufficient contrast for typical office lighting, keyboard navigation support (required for shortcuts anyway). Screen reader support and other advanced accessibility features are explicitly out of scope for this 5-day MVP.

## Branding

No specific branding requirements identified. Use clean, professional styling appropriate for financial services software:

- Neutral color palette (blues/grays suggesting trust and professionalism)
- Sans-serif fonts for readability
- Minimal visual flourishes—function over decoration
- Optional: client logo placement if appropriate for demo presentation

## Target Device and Platforms: **Desktop Only**

**Desktop browsers only** (Chrome/Firefox/Safari) on broker workstations. Demo will be presented at **1024px window size**. The interface should handle window resizing gracefully, but mobile phone and tablet support are explicitly out of scope—brokers will use this on office computers or laptops during client meetings.

---
