# Pricing Workspace

## Goal

Pricing Workspace explains plan differences in terms that matter to actual product behavior, not only marketing language.

It should let the user understand:

- current plan
- remaining daily quota
- object limits
- practical workflow limits that affect Home, AI filter, and watchlist usage

## Current Product Rules

### Public plans

- `Free`
- `Plus`

### Home feed limits shown in plan details

Pricing details now explicitly include the Home-feed and AI-filter ceiling for each plan:

- `Free`: 30 cards
- `Plus`: 100 cards

This is important because Home feed and AI filter are plan-limited user-facing workflows, not invisible internal implementation details.

### Usage communication

Pricing should still display the existing daily feature quotas such as feed, search, and generate.

In addition, pricing must now communicate practical working-surface limits:

- watchlist capacity
- post-list capacity
- Home feed plus AI filter card ceiling

### Checkout path

- Selecting `Plus` opens the purchase flow.
- Non-checkout plan transitions still use the internal plan-selection path.

## Main User Flow

1. The user opens Pricing.
2. The user compares current plan against the alternative plan.
3. The user checks daily quotas and workspace limits.
4. The user decides whether to upgrade.

## Important Edge Cases

### Docs drift

- If product behavior changes but plan details do not mention it, users will infer the wrong contract.
- Home feed limits are an example of behavior that must be present in pricing copy.

### Hidden workflow limits

- If a workflow is plan-limited in practice, Pricing should name it directly.
- Users should not have to discover plan ceilings only by hitting the limit inside Home.

## File Ownership

- `src/components/PricingWorkspace.tsx`
- `src/config/pricingPlans.ts`
- `src/components/PlanPanel.tsx`

## When This Doc Must Be Updated

Update this page whenever a change affects:

- plan list
- daily quotas
- watchlist or post-list limits
- Home feed or AI filter limits
- checkout or upgrade flow

## Change Log

- 2026-04-12: documented Home feed and AI filter plan ceilings and aligned plan details with `Free 30 / Plus 100`
