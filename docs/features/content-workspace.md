# Content Workspace

## Goal

Content Workspace connects source discovery to content creation without forcing the user to rebuild context manually.

The ideal flow is:

`find signal -> inspect source -> keep the right source attached -> generate Thai content`

## Current Product Rules

### Two-mode workspace

- The workspace has search and create modes.
- Search is used to find candidate sources and inspect them.
- Create is used to generate or regenerate content from the selected context.

### Source attachment behavior

- A selected source can be attached and carried into the create flow.
- Attached source state should survive normal navigation and workspace switching.
- The attached source panel is intentionally compact so it does not consume the writing surface.
- Compact layout matters because the textarea is the primary work area once the user is ready to draft.

### Article reader translation behavior

- RSS and article-reader flows reuse the same reader modal.
- Article translation is on-demand and uses the current xAI translation path.
- When the user reopens the same RSS article, the app should reuse durable translation cache instead of paying to translate the same article again.

### Translation cache contract

- Translation cache should be keyed by stable article identity such as RSS fingerprint, article id, or canonical URL.
- Reopening the same source should prefer cached Thai output first.
- Translation should only be requested again if no stable cached result is available.

## Main User Flow

1. The user opens Content Workspace.
2. The user searches or reviews candidate source material.
3. The user opens a source in the reader when deeper context is needed.
4. The user attaches the right source to the create flow.
5. The user writes a prompt or idea.
6. The system generates a draft using the attached context.
7. The user can regenerate from the same context without rebuilding the setup.

## Create-Mode Attachment UX

The attached-source card should behave like a compact reference block, not like a second full-size content panel.

The current layout expectations are:

- source identity remains visible
- headline remains visible in short form
- summary is present but clamped
- preview image stays small
- the remove action stays easy to reach
- the attachment must not push the editor too far down the page

## Important Edge Cases

### Reopening the same RSS article

- The reader should use cached Thai translation if already available.
- The user should not feel a second translation delay for the same article.

### Very long attached summaries

- Attachment summaries must be visually clamped so the editor remains dominant.

### X video source

- X video sources may need extra context hints because the generation flow can analyze video content.
- Even in this case, the attached block must remain compact.

## File Ownership

- `src/components/ContentWorkspace.tsx`
- `src/components/CreateContent.tsx`
- `src/components/ArticleReaderModal.tsx`
- `src/services/GrokService.ts`
- `src/services/ArticleService.ts`

## When This Doc Must Be Updated

Update this page whenever a change affects:

- attached source persistence
- article-reader translation behavior
- translation cache behavior
- create-mode gating or premium access
- attached source layout or information density

## Change Log

- 2026-04-12: documented durable article translation reuse and compact attached-source layout expectations in create mode
