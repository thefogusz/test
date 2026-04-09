# Docs Governance

This repo uses docs as a living source of truth for product behavior, not just architecture notes.

## The Rule

Update docs in the same pull request when a change does any of the following:

- changes user-facing behavior
- changes a business rule or limit
- adds or removes a workflow step
- changes loading, empty, success, or error states
- changes an external integration expectation
- introduces a new feature

You usually do not need a docs update for:

- internal refactors with no behavior change
- renames or code cleanup only
- styling-only changes that do not affect UX behavior
- test-only changes

## Source of Truth Model

Keep these layers separate:

- Feature docs: what the product does today
- Decision logs: why the team chose a behavior or tradeoff
- Architecture docs: how the system is wired together

When these layers get mixed together, docs drift much faster.

## Minimal Workflow

1. Find the existing page in `docs/features/`.
2. Update `Current Behavior`, `Core Rules`, `UI States`, and `Change Log` if needed.
3. If the behavior changed because of a deliberate tradeoff, add or update a decision log.
4. Ship the code and docs in the same PR.

## Suggested Review Question

Before merging, reviewers should ask:

`If another dev opens the docs tomorrow, will they understand the current product behavior without replaying this PR?`

## Commands

```bash
npm run docs:dev
npm run docs:build
```
