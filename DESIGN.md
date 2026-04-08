# FORO DESIGN.md

Design system guide for FORO. Use this file when editing UI so new screens, states, and components stay aligned with the current product language.

## 1. Visual Theme & Atmosphere

FORO is a dark, high-focus intelligence workspace for reading, filtering, and turning feeds into usable content. The interface should feel like a calm command center: black canvas, dense but breathable panels, crisp typography, restrained motion, and electric-blue feedback for live AI or data activity.

The product direction blends three references:

- Linear: precise alignment, quiet borders, crisp state changes, fast but subtle motion.
- Spotify: dark media-like surfaces, confident side navigation, immersive feed/list energy.
- Notion: calm reading surfaces, editorial spacing, low-noise controls, content-first hierarchy.

Core mood:

- Dark editorial dashboard, not a marketing landing page.
- Utility-first and content-first: feeds, summaries, search, and workspaces are the hero.
- Premium black surfaces with soft elevation and subtle borders.
- Blue is the active intelligence signal. Use it for focus, progress, primary actions, and AI/filter states.
- Avoid decorative clutter. Do not add random gradient blobs, floating orbs, or ornamental illustration unless a feature explicitly needs an asset.
- Motion should feel like Linear: short, directional, and useful. Prefer small lifts, fades, and focus rings over sweeping animations.

## 2. Color Palette & Roles

Primary tokens are defined in `src/index.css`.

| Token | Value | Role |
| --- | --- | --- |
| `--bg-950` | `#000000` | App shell, outer gutters, negative space between panels |
| `--bg-900` | `#121212` | Main panel, sidebars, dominant dark surface |
| `--bg-800` | `#1c1c1c` | Cards and elevated content surfaces |
| `--bg-700` | `#161922` | Hover, active, and nested surface states |
| `--accent-primary` | `#ffffff` | Highest contrast foreground/action contrast |
| `--accent-secondary` | `#2997ff` | Primary FORO blue, active intelligence signal |
| `--accent-blue` | `#2997ff` | Alias for electric blue |
| `--accent-purple` | `#9d75ff` | Rare secondary highlight only, never dominant |
| `--accent-gradient` | `linear-gradient(135deg, #0062ff 0%, #2997ff 100%)` | Primary CTA and AI emphasis |
| `--accent-gradient-hover` | `linear-gradient(135deg, #0050d2 0%, #0062ff 100%)` | Primary CTA hover |
| `--accent-glow-blue` | `rgba(41, 151, 255, 0.22)` | Blue glow, focus ring, active shadow |
| `--accent-glow-subtle` | `rgba(41, 151, 255, 0.08)` | Quiet blue background tint |
| `--accent-tint` | `rgba(41, 151, 255, 0.14)` | Filled chips and selected states |
| `--text-main` | `rgba(255, 255, 255, 0.98)` | Primary text |
| `--text-muted` | `#cbd5e1` | Secondary labels and readable metadata |
| `--text-dim` | `#94a3b8` | Timestamps, helper copy, inactive controls |
| `--glass-border` | `rgba(255, 255, 255, 0.08)` | Standard dark border |
| `--blue-border` | `rgba(41, 151, 255, 0.45)` | Focused or selected border |
| `--card-border` | `rgba(255, 255, 255, 0.05)` | Quiet card border |
| `--card-shadow` | `0 4px 20px rgba(0, 0, 0, 0.6)` | Default dark elevation |

Usage rules:

- Keep surfaces black-to-charcoal. Do not introduce beige, cream, or pastel page backgrounds.
- Use white text sparingly for emphasis. Most metadata should use `--text-muted` or `--text-dim`.
- Use blue for state, not decoration. If an element glows blue, it should communicate focus, selection, AI work, or a primary action.
- Purple may appear as a supporting tint in existing gradients, but do not make purple the dominant brand direction.
- Warning and billing colors can be local exceptions, but keep them muted on dark surfaces.

## 3. Typography Rules

Primary UI font:

- `Inter`, `Noto Sans Thai`, `sans-serif`

Heading/display font:

- `Kanit`, `sans-serif`

Rules:

- Use `Kanit` for major screen titles, modal titles, feed titles, reader titles, and high-emphasis Thai headings.
- Use `Inter`/`Noto Sans Thai` for nav, controls, labels, metadata, long UI copy, and dense panels.
- Preserve Thai readability. Avoid overly tight line-height on Thai paragraphs.
- Keep all labels short and functional. FORO UI copy should say what the action does, not explain the interface.
- Existing UI uses slightly tight tracking. Do not reduce letter spacing further.

Suggested scale:

| Use | Size | Weight | Notes |
| --- | --- | --- | --- |
| Workspace title | `32px` | `800` | Current dashboard title scale |
| Search hero title | `48px` | `800` | Only for focused search workspace hero states |
| Section title | `18px-22px` | `700-800` | Toolbars, feed sections |
| Card body | `15px-16px` | `500-650` | Feed body and summaries |
| Nav item | `15px` | `620-700` | Sidebar actions |
| Metadata | `11px-13px` | `600-800` | Uppercase badges, counts, source labels |
| Button label | `13px-15px` | `700` | Compact, high-confidence actions |

## 4. Component Stylings

### App Shell

- Desktop layout is a three-panel command center:
  - Left sidebar: `288px`, fixed, `top: 12px`, `left: 8px`, `bottom: 12px`.
  - Main workspace: centered, `margin: 12px 0`, `padding: 24px 48px`, dark panel.
  - Right sidebar: `320px`, fixed, `top: 12px`, `right: 8px`, `bottom: 12px`.
- Outer background should remain pure black so panel gaps feel intentional.
- Main and side panels use `--bg-900` with large `20px` radius.
- Inner panels can scroll; body should not become the primary scroll container.

### Navigation

- Nav items are pill-like rows with icon shell, label, optional spinner.
- Active nav item uses a deep blue-black linear fill plus a thin blue left indicator.
- Busy state uses a small spinning icon and blue text/accent.
- Hover should be quiet: slight white surface tint and brighter text.
- Mobile may hide pricing from the nav and expose profile/plan controls contextually.

### Buttons

- Use `.btn-pill` for compact pill actions.
- Primary actions use `--accent-gradient` and blue glow.
- Secondary actions use transparent or dark surfaces with `--glass-border`.
- Icon-only actions use compact square/circular dark controls with blue hover/focus.
- Disabled actions should stay visible but muted; explain disabled context through title/status where useful.

### Feed Cards

- Feed cards are the main content artifact.
- Surface: `linear-gradient(145deg, var(--bg-800) 0%, #1a1a1a 100%)`.
- Border: faint white, upgraded to blue on hover/focus.
- Radius: current card language allows large radii around `24px-28px`.
- Motion: subtle lift on hover is allowed for desktop cards.
- Preserve readable text width and prevent overflow with wrapping.
- Metadata and action rows should compress gracefully; never let badges push cards wider than their container.

### Search & Filter

- Search forms should feel like command input: full-width pill, dark translucent surface, blue focus ring.
- AI filter controls should be visibly related to FORO intelligence features through blue tint or gradient.
- Summary cards can use a subtle glass surface and a small blue icon badge.
- Avoid decorative blue blobs inside summary cards unless they are already part of an existing pattern and do not distract from reading.

### Sidebars

- Left sidebar is navigation and plan context.
- Right sidebar is supporting intelligence: lists, sources, recent items, workspace context.
- Sidebar titles should be compact, uppercase or high-weight when useful.
- Right sidebar list rows should be low-friction: small hover surface, soft separators, no heavy nested cards.

### Modals

- Keep modal surfaces dark, bordered, and focused.
- Use `Kanit` for modal titles and `Inter`/`Noto Sans Thai` for body text and controls.
- Close buttons should be visible but secondary.
- Modal copy should be direct. Avoid explaining the whole app in the modal.

### Pricing

- Pricing is an exception where plan identity may use warmer or premium accents.
- Still keep the page dark and panel-based.
- Plan cards must remain compact on mobile and avoid dense copy blocks.

## 5. Layout Principles

- Prefer panels, rails, and cards over full-page marketing sections.
- Build the usable workspace as the first screen. Do not add a landing page in front of the app.
- Keep desktop density high but not cramped. FORO should feel like a tool that can stay open all day.
- Use `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `48px` as the main spacing rhythm.
- Use grid/flex layouts with `min-width: 0` on text-heavy children to prevent overflow.
- Important content should remain visible above the fold. Avoid tall headers that hide the feed.
- Mobile should prioritize current task controls, then feed/content. Hide or collapse secondary rails.

## 6. Depth & Elevation

- Default surface hierarchy:
  - Page shell: `--bg-950`.
  - Workspace panels: `--bg-900`.
  - Cards: `--bg-800`.
  - Hover/active inset surfaces: `--bg-700` or translucent white.
- Use shadows sparingly because dark UI can get muddy.
- Use border and tint before heavy shadow.
- Blue glow is for active/focused intelligence states only.

## 7. Do's and Don'ts

Do:

- Reuse existing tokens from `src/index.css`.
- Keep blue as the primary action and intelligence color.
- Use real content density: summaries, cards, feeds, source names, timestamps, actions.
- Use `Kanit` for Thai-heavy titles and important display text.
- Keep action labels short and practical.
- Test responsive behavior for sidebars, feed cards, and search forms.
- Preserve accessibility basics: visible focus, readable contrast, real button elements.

Don't:

- Do not add a marketing landing page before the app workspace.
- Do not introduce beige, cream, or pastel page backgrounds.
- Do not make purple or purple-blue gradients the main brand direction.
- Do not add decorative gradient orbs, bokeh blobs, or unrelated illustrations.
- Do not put cards inside cards unless the existing component pattern already demands it.
- Do not make text or controls exceed their parent container.
- Do not add wide copy blocks inside nav/sidebar rails.
- Do not reduce letter spacing beyond current values.

## 8. Responsive Behavior

Desktop:

- Preserve the three-panel layout where space allows.
- Keep the main workspace scrollable and sidebars fixed.
- Hover lift and glow interactions are acceptable.

Tablet:

- Compress horizontal padding before removing information.
- Sidebars may collapse or hide secondary sections.
- Keep action bars wrap-safe and avoid horizontal scroll.

Mobile:

- Prioritize the active workspace.
- Navigation should become compact and avoid crowding the top of the feed.
- Buttons and chips must wrap or reduce text, never overflow.
- Feed cards should keep readable padding while reducing decorative metadata.
- Pricing cards should collapse copy and keep primary action reachable.

## 9. Agent Prompt Guide

Use this when asking a coding agent to edit FORO UI:

> Use `DESIGN.md` as the source of truth. Keep FORO as a dark command-center UI with black panels, electric-blue active states, Kanit display headings, compact pill controls, and content-first feed cards. Reuse tokens in `src/index.css`; do not introduce a marketing landing page, beige backgrounds, decorative gradient blobs, or a purple-dominant brand direction.

Quick color reference:

- Shell: `#000000`
- Panel: `#121212`
- Card: `#1c1c1c`
- Active blue: `#2997ff`
- Text: `rgba(255,255,255,0.98)`
- Muted text: `#cbd5e1`
- Dim text: `#94a3b8`

Implementation checklist:

- Check `src/index.css` before inventing new tokens.
- Match existing radii and density unless intentionally fixing a responsive issue.
- Keep components task-oriented and avoid landing-page patterns.
- Verify mobile and desktop widths after UI edits.
- If adding new text, make sure Thai and English both render cleanly and do not overflow.
