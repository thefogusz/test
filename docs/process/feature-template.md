# Feature Doc Template

Copy this structure when adding a new feature page in `docs/features/`.

```md
# Feature Name

## Purpose

Why this feature exists and what user problem it solves.

## Current Behavior

- Describe the real behavior in production or on the current branch.
- Focus on what devs should preserve.

## User Flow

1. User starts here.
2. User takes an action.
3. System responds.

## Core Rules

- Business rules
- Limits
- Important assumptions

## UI States

- Loading
- Empty
- Success
- Error

## Main Files

- `src/...`
- `server/...`

## Dependencies

- APIs
- state hooks
- background jobs

## Out of Scope

- Call out what this feature does not own.

## Change Log

- YYYY-MM-DD: Short note.
```

## Naming Suggestion

Use one page per feature area, not one page per component.

Good:

- `docs/features/home-feed.md`
- `docs/features/news-sources.md`

Avoid:

- `docs/features/button.md`
- `docs/features/sidebar-icon.md`
