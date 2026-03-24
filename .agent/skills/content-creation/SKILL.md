---
name: content-creation
description: "Mastering High-Quality Thai Content Generation with Adaptive RAG v3 Evidence"
---

# Content Creation Skill (Adaptive RAG v3)

This skill defines the technical benchmarks and linguistic rules for generating "Masterpiece" Thai content using the Adaptive RAG v3 architecture.

## 🏆 Core Philosophy
Content must be **Evidence-First**, **Human-Centric**, and **Contextually Grounded**. Never generate fluff. Every claim must have an underlying trace to the research data.

## 🛠️ Implementation Steps

### 1. Research & Fact-Check Phase
Before writing, always ensure the research data is cleaned and synthesized:
- Use `agentFilterFeed` to select high-signal posts.
- Use `buildSearchPlan` to ensure both Web (Tavily) and X data are present.
- **Goal**: Establish a `Fact Sheet` with Verified Facts, Open Questions, and Community Signals.

### 2. Briefing Phase (Critical)
Never jump straight to drafting. Use `buildContentBrief` to define:
- **Main Angle**: What is the "hook"?
- **Structure**: 2-4 short paragraphs for social, or H1/H2 for articles.
- **Voice Notes**: Professional, human rhythmic flow.

### 3. Drafting & Drafting Ethics
- **No Passive Voice**: Avoid "ถูก..." unless it's a negative action.
- **Semantic Spacing**: Use spaces between independent clauses instead of rigid punctuation.
- **Drop Pronouns**: Drop "มัน" (it) or "พวกเขา" (they) where context is clear.
- **No Dictionary Pairs**: Never write "Artificial Intelligence (ปัญญาประดิษฐ์)". Choose one.
- **Perspective**: Write as a knowledgeable expert (Original Creator), not a news aggregator.

### 4. Polish & Quality Control
- **Anti-Bait**: Strip engagement bait (e.g. "คุณคิดยังไง?").
- **Hype Mitigation**: Soften words like "สะเทือนโลก" to "มีนัยสำคัญ".
- **Citation Check**: Ensure the [T1], [T2] citations align with the fact sheet.

## 📏 Linguistic Benchmarks (Thai)

| Rule | Bad AI-Thai | Good Native Thai | Rationale |
| :--- | :--- | :--- | :--- |
| **Space** | "บริษัทAppleเปิดตัวสินค้า!" | "บริษัท Apple เปิดตัว..." | Improved readability. |
| **Passive** | "มันถูกมองว่าเป็น..." | "หลายคนมองว่า..." | Professional tone. |
| **Hype** | "โลกจะไม่เหมือนเดิมอีกต่อไป" | "แคมเปญนี้ได้เปลี่ยนภาพตลาด..." | Professional credibility. |
| **Emoji** | "🚀🔥⚡️" | "🔥" (Max 3-4 per post) | Avoid spammy look. |

## 📦 Related Services
- `GrokService.js`: `generateStructuredContentV2` (Primary entry point)
- `TwitterService.js`: Evidence curation logic
