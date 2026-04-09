# FORO DESIGN.md

Design system guide for FORO. Use this file as the source of truth when editing product UI so every new screen, state, and component moves the product toward a more mature software feel.

## 1. Product Aesthetic

FORO should feel like a serious intelligence workspace, not a concept mockup and not a marketing site. The closest references are:

- Linear: sharp alignment, disciplined density, subtle motion, clear active states.
- Notion: calm reading rhythm, low-noise surfaces, content-first hierarchy.
- GitHub / modern developer tools: practical controls, strong information structure, restrained polish.

The desired outcome:

- Premium but quiet.
- Dense but legible.
- Technical but not cold.
- Dark, focused, and editorial.
- Confident without looking flashy.

FORO should not feel playful, neon-heavy, gamer-ish, glassmorphic, or decorative.

## 2. Core Direction

### What "world-class" means here

- Fewer visual ideas, executed consistently.
- Strong information hierarchy before visual flourish.
- Components that feel interoperable across the app.
- Motion that supports clarity instead of calling attention to itself.
- High-quality defaults: spacing, radii, typography, and states should already look correct before extra styling.

### Reference balance

- Take `precision` from Linear.
- Take `readability` from Notion.
- Keep FORO's own dark intelligence identity through black surfaces and blue system accents.

Do not copy any reference literally. Borrow the discipline, not the branding.

## 3. Visual Personality

FORO is a command-center product. The interface should suggest:

- continuous monitoring
- structured thinking
- fast action on content
- trust in the system state

This means the UI should prioritize:

- panels
- lists
- cards
- toolbars
- drawers
- modals
- search surfaces

It should not prioritize:

- hero banners
- showcase sections
- ornamental gradients
- oversized copy blocks
- decorative imagery

## 4. Color System

Primary tokens live in [src/index.css](D:/Work/FORO-MOCK/test/src/index.css). Reuse them before inventing new ones.

### Core palette

| Token | Value | Role |
| --- | --- | --- |
| `--bg-950` | `#000000` | Global shell, negative space, app backdrop |
| `--bg-900` | `#121212` | Main panels and workspace surfaces |
| `--bg-800` | `#1c1c1c` | Cards and elevated blocks |
| `--bg-700` | `#161922` | Active/hover nested surfaces |
| `--accent-secondary` | `#2997ff` | Primary active signal |
| `--text-main` | `rgba(255,255,255,0.98)` | Primary copy |
| `--text-muted` | `#cbd5e1` | Secondary labels |
| `--text-dim` | `#94a3b8` | Metadata and passive UI |
| `--glass-border` | `rgba(255,255,255,0.08)` | Standard border |
| `--blue-border` | `rgba(41,151,255,0.45)` | Focused state border |

### Color rules

- The product is black and charcoal first, blue second.
- Blue is a system signal, not decoration.
- White should establish hierarchy, not fill the whole screen.
- Purple must remain rare and supporting only. It should never become the dominant identity.
- Prefer flat fills, thin borders, and subtle tints over glowing gradients.
- If an element uses a glow, it must communicate one of these:
  - primary action
  - focus
  - selected state
  - live AI / live processing

### Avoid

- rainbow gradients
- strong purple-blue blends as a default
- glossy "startup" CTA treatments
- background effects that compete with content

## 5. Typography

### Font stack

- UI copy: `Inter`, `Noto Sans Thai`, `sans-serif`
- Display titles: `Kanit`, `sans-serif`

### Role assignment

Use `Kanit` only where emphasis matters:

- workspace titles
- modal titles
- major section headings
- key Thai-first display labels

Use `Inter` / `Noto Sans Thai` for:

- navigation
- buttons
- metadata
- lists
- body copy
- cards
- settings
- long-form reading

### Typography rules

- Thai readability is mandatory. Keep generous enough line-height for Thai.
- Avoid overly compressed display headings.
- Avoid large title blocks that consume the first screen.
- Prefer short, exact labels over expressive marketing copy.
- Keep sentence casing or practical title casing. Avoid random all caps except for tiny metadata or chips.

### Suggested scale

| Use | Size | Weight | Notes |
| --- | --- | --- | --- |
| App / workspace title | `28px-32px` | `750-800` | Strong but compact |
| Large focused title | `40px-44px` | `800` | Rare, only for key empty/search hero states |
| Section heading | `18px-22px` | `700-750` | Toolbars, major group titles |
| Card title / high-value row | `15px-17px` | `650-750` | Dense but readable |
| Body copy | `14px-16px` | `450-550` | Default content rhythm |
| Label / nav | `13px-15px` | `600-700` | Product chrome |
| Metadata | `11px-13px` | `600-700` | Counts, sources, timestamps |

## 6. Spacing & Rhythm

FORO should feel disciplined. Spacing should look intentional, not improvised.

Use this primary rhythm:

- `8`
- `12`
- `16`
- `20`
- `24`
- `32`
- `40`
- `48`

Rules:

- Choose one spacing scale per component and stay consistent.
- Avoid mixing too many gap values in a single block.
- Tighten controls before tightening reading content.
- Favor clean internal spacing over oversized outer padding.

## 7. Radius, Borders, and Depth

The current product can support soft corners, but they should feel deliberate and modern.

### Radius guidance

- Main panels: `20px`
- Cards: `16px-24px`
- Small controls: `10px-14px`
- Pills: full radius

Do not over-round every element. A "premium" feel comes from consistency, not maximum radius.

### Border guidance

- Borders do more work than shadows in this product.
- Most panels and cards should be separated by subtle border contrast.
- Active states should prefer border/tint changes before stronger glow.

### Shadow guidance

- Use shadows sparingly on dark UI.
- Favor short, soft shadows over huge ambient blur.
- Hover elevation should feel like a 1-step lift, not a floating card.

## 8. Motion

Motion should feel like Linear:

- fast
- quiet
- directional
- useful

### Good motion

- `120ms-220ms` hover / focus transitions
- small lift on hover
- subtle fade / slide for panel reveal
- clear state transitions for loading, selection, and expansion

### Bad motion

- infinite decorative shimmer
- large sweeping transforms
- rubbery bounce
- animated gradients on standard UI controls
- motion that competes with reading

If animation can be removed without losing meaning, it probably should be removed.

## 9. Layout Architecture

### Desktop

FORO remains a 3-region application:

- Left rail for navigation and account / workspace context
- Main workspace for the current task
- Right rail for support context, sources, related entities, or secondary actions

The layout should feel like a tool that stays open all day. That means:

- content-first above the fold
- no oversized headers
- no decorative dead zones
- no giant empty gutters inside the workspace

### Tablet

- Compress horizontal padding first
- Collapse or defer low-priority right-rail content
- Keep toolbar actions wrap-safe

### Mobile

- Prioritize current task content
- Collapse secondary chrome aggressively
- Avoid any horizontal overflow, especially pills, chips, and stats
- Keep action buttons obvious and reachable

## 10. Component Principles

### App shell

- Black outer canvas
- Main surfaces on `--bg-900`
- Rails should feel stable and quiet
- Workspace should visually own the screen

### Navigation

- Navigation should feel surgical, not loud
- Active state should read immediately with shape, tint, and text contrast
- Hover should be gentle
- Busy state should feel informative, not alarming

Preferred nav behavior:

- restrained background tint
- subtle left indicator or border accent
- compact icon + label relationship

Avoid:

- oversized pills that look like consumer apps
- overly glossy active states
- strong gradients in default navigation

### Buttons

Buttons should feel decisive and mature.

Preferred hierarchy:

- Primary: solid blue or restrained gradient if already established
- Secondary: dark fill or transparent with border
- Tertiary: quiet text/ghost treatment

Rules:

- Minimize animation on buttons
- Keep labels short
- Default to clarity over flair
- Avoid making every CTA glow

### Cards

Cards are the core artifact in FORO. They should feel structured and readable.

Card rules:

- clear header / body / footer zones
- strong text wrapping discipline
- predictable action placement
- stable metadata rhythm
- subtle hover feedback

Avoid:

- too many nested visual treatments inside one card
- multiple competing accent colors
- footer actions fighting with metadata
- decorative gradients as content background

### Inputs and search

Search should feel like a tool, not a marketing hero.

- Dark field
- clear focus ring
- strong placeholder contrast
- enough height to feel important
- no flashy chrome around it

### Sidebars

- Keep sidebars dense but breathable
- Use list patterns, not stacked mini-cards unless necessary
- Reduce visual competition with main workspace
- Account / plan section should feel composed and product-like, not toy-like

### Modals

- Title first, task second
- Compact framing
- Dark surface, calm border, strong contrast
- One primary action focus

## 11. Content Hierarchy

FORO is a content product, so hierarchy matters more than ornament.

Order of importance on most screens:

1. Current task or selected entity
2. Primary content/result
3. Supporting context
4. Metadata
5. Secondary actions

If metadata or chrome is louder than the content, the design is off.

## 12. Tone of UI Copy

Copy should sound practical and high-confidence.

Use:

- direct verbs
- short labels
- plain product language
- clear system states

Avoid:

- hype language
- cute labels
- vague AI marketing wording
- overly explanatory buttons

Good:

- `Open pricing`
- `Read article`
- `Generate summary`
- `Add to watchlist`

Bad:

- `Unlock the future`
- `Supercharge this`
- `Experience AI magic`

## 13. Anti-Patterns

Do not introduce these patterns into FORO:

- landing-page sections inside the product shell
- giant hero banners before the actual tool
- decorative blur blobs
- consumer-social style floating chips everywhere
- excessive glassmorphism
- purple-led branding drift
- long gradients as default control styling
- too many simultaneous shadows, borders, and glows on one component
- inconsistent corner radii across neighboring components
- overly tall cards with weak information density

## 14. Design Corrections to Favor

When in doubt, move the UI in these directions:

- less glow
- less gradient
- less visual noise
- stronger alignment
- tighter hierarchy
- cleaner spacing
- more readable text
- more stable component patterns
- more obvious active states
- more practical controls

## 15. Implementation Guidance

Before editing UI:

1. Check [src/index.css](D:/Work/FORO-MOCK/test/src/index.css) first.
2. Reuse existing tokens before inventing new ones.
3. Preserve app-shell structure unless there is a real usability reason to change it.
4. Test both Thai and English text lengths.
5. Check desktop and mobile overflow.
6. Prefer improving an existing pattern over creating a new visual language.

### If you need to simplify the current UI

Start in this order:

1. Reduce unnecessary animation
2. Reduce glow intensity
3. Reduce gradient usage
4. Normalize spacing and radius
5. Strengthen text hierarchy
6. Simplify card and sidebar internals

## 16. Agent Prompt Guide

Use this when asking a coding agent to edit FORO UI:

> Use [DESIGN.md](D:/Work/FORO-MOCK/test/DESIGN.md) as the source of truth. Push FORO toward a mature product-software aesthetic inspired by Linear and Notion: dark command-center layout, quiet surfaces, disciplined spacing, strong hierarchy, restrained motion, and blue as the primary system accent. Reuse tokens from [src/index.css](D:/Work/FORO-MOCK/test/src/index.css). Reduce decorative gradients, heavy glow, purple emphasis, oversized hero treatment, and any mockup-like styling. Prioritize clarity, density, and calm polish.

### Quick checklist

- Does the screen feel like a serious tool instead of a concept mockup?
- Is the hierarchy clear within 3 seconds?
- Are blue accents signaling state, not decoration?
- Are cards, rails, and controls visually related?
- Is the motion subtle enough to disappear into the workflow?
- Does Thai text still read cleanly at real content lengths?
