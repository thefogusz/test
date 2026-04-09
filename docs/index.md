---
layout: home

hero:
  name: "Foro Docs"
  text: "Living product and engineering docs"
  tagline: "Built so devs can open one place and understand what the app does today, even when ideas keep moving."
  actions:
    - theme: brand
      text: Start Here
      link: /getting-started
    - theme: alt
      text: Feature Docs
      link: /features/
    - theme: alt
      text: Docs Governance
      link: /process/docs-governance

features:
  - title: Product Source Of Truth
    details: Feature pages capture current behavior, rules, states, and ownership so implementation does not drift with chat.
  - title: Built For Fast Teams
    details: Architecture pages explain the system, while feature docs explain what should stay true during rapid iteration.
  - title: PR-Friendly
    details: Docs updates now have a lightweight governance rule and pull request checklist so behavior changes ship with matching docs.
---

## Use This Site In Layers

Start with [Getting Started](/getting-started), then open the matching page in [Feature Docs](/features/) for the area you are changing.

If a behavior changed because of a product tradeoff, capture the reason in [Decision Index](/decisions/). Keep architecture pages focused on implementation structure, not moving product requirements.

## Commands

```bash
npm run docs:dev
npm run docs:build
```
