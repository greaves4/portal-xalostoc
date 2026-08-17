# Handoff: Industry design system

## Overview
**Industry** is a wireframe/blueprint design system: steel-blue accent on a light technical ground, Barlow Condensed headings over Barlow body, a modular grid, and cards/figures/buttons framed as blueprint objects — square-cornered, hairline-bordered, with `+` registration marks at the corners. Photography is duotoned into the steel accent; icons are thin-stroke Lucide (1.5).

This bundle contains the complete system: one token+component stylesheet, foundation specimen pages, component reference pages, and two starter templates (landing page, slide deck).

## About the design files
The files in `design-system/` are **design references authored in HTML/CSS** — the source of truth for the *look*, not necessarily production code for your stack. The task is to **reproduce this system inside the target codebase's own environment** (React, Vue, Svelte, SwiftUI, native, Tailwind, etc.) using its established patterns. `styles.css` is plain CSS with no build step and no JS, so it *can* be dropped in as-is; if the codebase has a component library, port the tokens first and re-implement the component classes as components of that library.

If no environment exists yet, pick the most appropriate framework for the project and implement the system there.

## Fidelity
**High-fidelity.** All colors, type sizes, spacing, radii, shadows and interaction states are final and exact. Reproduce them literally. Every value below is also machine-readable in `design-system/theme.json` and defined as a CSS custom property at the top of `design-system/styles.css`.

## Design tokens

### Color roles
| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#f2f2f3` | Page ground |
| `--color-surface` | `#e9e9ea` | Input fills (cards are transparent) |
| `--color-text` | `#1d1f20` | Body and heading text |
| `--color-accent` | `#5980a6` | The single steel accent |
| `--color-accent-2` | `#728fab` | Machine-derived stand-in — **mono scheme, treat as one role** |
| `--color-divider` | `color-mix(in srgb, #1d1f20 16%, transparent)` | All hairline borders |

### Tonal ramps
Three ramps (`neutral`, `accent`, `accent-2`), steps 100–900, generated in OKLCH on one shared perceptual lightness scale so step *N* of any ramp has the same visual weight.

Neutral: `100 #f5f5f8` · `200 #e7e7ea` · `300 #d4d4d7` · `400 #b7b7ba` · `500 #98989b` · `600 #7a7a7d` · `700 #5d5d60` · `800 #424244` · `900 #2b2b2d`

Accent: `100 #eef6ff` · `200 #d6ebff` · `300 #b5d9fd` · `400 #94bce3` · `500 #749dc4` · `600 #597ea3` · `700 #416180` · `800 #2c455d` · `900 #1d2d3d`

Accent-2: `100 #eef6ff` · `200 #d6ebff` · `300 #bdd8f2` · `400 #9ebbd8` · `500 #7e9cb8` · `600 #627d98` · `700 #486077` · `800 #314457` · `900 #1f2d3a`

Rules: 100–300 for tinted fills, hovers and subtle borders; 500 as the role base; 700–900 for text on tinted fills and pressed states. Prefer ramp steps over ad-hoc `color-mix()`. Accent-on-ground contrast is ~3:1 — fine for icons, large text and chrome, **not** body copy; use `--color-accent-700` for paragraph-size accent text.

### Typography
- `--font-heading`: `"Barlow Condensed", system-ui, sans-serif` at weight **600**
- `--font-body`: `"Barlow", system-ui, sans-serif`
- Loaded from Google Fonts: Barlow 400/500/700, Barlow Condensed 400/600
- Body: `15px / 1.55 / 400`
- Headings: `line-height 1.12`, `letter-spacing -0.015em`, `margin 0 0 var(--space-2)`
- Scale: `h1 42px` · `h2 32px` · `h3 25px` · `h4 20px` · `h5 16px` · `h6 13px` (h6 also `uppercase`, `letter-spacing 0.08em`)
- `figcaption` 11px at 55% text opacity; `.text-muted` = 55% text opacity

### Spacing (density 0.85×)
`--space-1 3.4px` · `--space-2 6.8px` · `--space-3 10.2px` · `--space-4 13.6px` · `--space-6 20.4px` · `--space-8 27.2px`

### Radius
`--radius-sm 2px` · `--radius-md 4px` · `--radius-lg 7px`

**Important override:** the blueprint layer at the end of `styles.css` forces `border-radius: 0` on `.card`, `.btn`, `.input`, `.tag`, `.seg`, `.dialog`. The radius tokens exist for the theme record; in practice interface objects are square. `.dialog` keeps `--radius-lg` only where not overridden — check the cascade before changing.

### Elevation
- `--shadow-sm`: `0 1px 2px color-mix(in srgb, #2b2b2d 14%, transparent)`
- `--shadow-md`: `0 3px 10px color-mix(in srgb, #2b2b2d 16%, transparent)`
- `--shadow-lg`: `0 12px 32px color-mix(in srgb, #2b2b2d 22%, transparent)`

Applied via `.elev-sm` / `.elev-md` / `.elev-lg`. Never write ad-hoc box-shadows.

## Components

All components are plain CSS classes on plain HTML — no JavaScript, no build step. Each has a reference page under `design-system/components/`; view source there for exact markup.

### Blueprint frame — `.blueprint`
The signature treatment. A `.blueprint` element is `position: relative` with a `1px solid var(--color-divider)` border and `border-radius: 0`, plus **four children**: `<i class="corner tl">`, `.tr`, `.bl`, `.br`. Each corner is an 11×11 crosshair drawn with `::before` (1px vertical) and `::after` (1px horizontal) at 55% text opacity, offset `-6px` outside the box. Never omit the marks from a framed element. When combined with `.halftone`/`.plate`/`.duotone`, `overflow: visible` is forced so the marks aren't clipped.

### Buttons — `.btn` (`components/buttons.html`)
Base: inline-flex, centered, `gap 6px`, heading font at **14px/1.2**, `padding var(--space-2) calc(var(--space-3) * 1.2)`, `1px solid var(--color-divider)`, square. 14px matches `.input` because the pair sits side by side in sign-up rows.
- `.btn-primary` — `background var(--color-accent)`, text `var(--color-bg)`, border `var(--color-accent)`. Hover `--color-accent-600`, active `--color-accent-700`. **The one solid object on the board.**
- `.btn-secondary` — divider border. Hover `text 7%` tint, active `text 14%`.
- `.btn-ghost` — accent text, transparent border, `padding-inline var(--space-1)`. Hover `accent 10%`, active `accent 18%`.
- `.btn-icon` — 36×36, no padding.
- `.btn-block` — full width, `margin-top var(--space-2)`.
- `:disabled` — `opacity 0.45`, `cursor not-allowed`.

### Tags — `.tag` (`components/buttons.html`)
inline-flex, `11px`, `letter-spacing 0.02em`, `padding 3px 10px`. Variants: `.tag-accent` (accent-100 bg / accent-800 text), `.tag-accent-2` (accent-2-100 / accent-2-800 — reads the same, mono palette), `.tag-neutral` (neutral-100 / neutral-800), `.tag-outline` (1px accent border, accent text).

### Forms (`components/forms.html`)
- `.field > label` — block, `12px`, `margin-bottom 5px`, text at 70% opacity.
- `.input` — full width, `min-height 36px`, `padding 6px 10px`, `14px`, `background var(--color-surface)`, divider border, `caret-color var(--color-accent)`. Hover: border → `text 45%`. Focus-visible: border → accent, `outline-offset 0`. `textarea.input` — `min-height 90px`, `resize vertical`.
- `.radio` + `.dot` — native input visually hidden; `.dot` is 16px circle, `1.5px` divider border. Hover → accent border. Checked → accent border + accent fill + `inset 0 0 0 4px var(--color-bg)` ring. Focus-visible → 2px accent outline, offset 2px.
- `.seg` + `.seg-opt` — inline-flex group, divider border, `overflow hidden`, square. Options `padding 7px 12px`, `13px`, `gap 6px`, separated by `border-left`. `:has(input:checked)` → accent bg, bg-colored text. Unchecked hover → `text 7%`. Focused option → inset 2px accent outline.

### Cards — `.card` (`components/cards.html`)
Flex column, `gap var(--space-2)`, `padding var(--space-3)`, **transparent background**, `1px solid var(--color-divider)`, square. Children: `.card-kicker` (10px, `letter-spacing 0.1em`, uppercase, accent), `.card-title` (heading font, 17px/1.2), `.card-body` (13px, `opacity 0.8`, `flex 1`), `.card-meta` (flex, 11px, text at 50%). Combine with `.blueprint` + four corners.

### Navigation — `.nav` (`components/navigation.html`)
Flex row, `align-items center`, `gap var(--space-4)`, `padding var(--space-3) var(--space-4)`, **no bottom border**. `.nav-brand` — heading font, 18px, `margin-right auto`. Links inherit color, `14px`, undecorated; hover and `[aria-current="page"]` → accent.

### Table — `.table` (`components/table.html`)
Full width, `border-collapse collapse`, `14px`. `th` — left-aligned, 11px, `letter-spacing 0.08em`, uppercase, text at 60%, `padding var(--space-2)`, `border-bottom 1px solid var(--color-divider)`. `td` — same padding, `border-bottom` at `text 8%`. Row hover — `text 4%` tint.

### Dialog (`components/dialog.html`)
`.dialog-backdrop` — `position fixed; inset 0`, grid-centered, `padding var(--space-4)`, background `neutral-900 at 50%`. `.dialog` — `width min(440px, 100%)`, flex column `gap var(--space-3)`, `padding var(--space-4)`, transparent with divider border (blueprint layer), `box-shadow var(--shadow-lg)`. `.dialog-title` heading font 20px; `.dialog-body` 14px at `opacity 0.85`; `.dialog-actions` flex, right-aligned, `gap var(--space-2)`, `margin-top var(--space-2)`.

### Imagery — `.duotone` (`foundations/image.html`)
Wrapper: `position relative; overflow hidden`, with `::after { inset: 0; background: var(--color-accent); mix-blend-mode: color }`. Every content photograph goes through it, so imagery re-colors with the theme. Frame figures with `.blueprint` + corners; never round or clip them.

### Rule — `.hr`
`height 1px`, `margin var(--space-4) 0`, `background var(--color-divider)`. Exists but the system prefers whitespace — avoid.

## Interaction states
Themed, never browser defaults. Port these exactly:
- **Hover** — a tint from the accent ramp or a `color-mix()` of text for outlined/ghost variants.
- **Pressed** — one step past the base (`--color-accent-600` light ground, `--color-accent-400` dark).
- **Focus** — `:focus { outline: none }` plus `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`. Never leave the default blue ring.
- **Selection** — `::selection { background: color-mix(in srgb, var(--color-accent) 30%, transparent) }`.
- **Disabled** — `opacity 0.45`.

These live in the stylesheet; don't restyle per page or per component.

## Icons
[Lucide](https://lucide.dev) at **stroke-width 1.5**. No other icon set, no thicker strokes. `.btn svg { display: block }`. See `foundations/icons.html` for interface sizes inline and in buttons.

## Do / Don't

**Do** — frame cards, figures and primary buttons as blueprint objects (`.blueprint` + four corner marks); keep the modular grid visible with equal cells and strong rhythm; condense headings, keep body in Barlow; duotone photographs.

**Don't** — round cards, figures or buttons; give cards or figures a surface fill (they are line drawings — the solid accent primary button is the one deliberate exception); drop registration marks from a framed element; use thick icon strokes; add decorative color beyond the steel accent. `--color-accent-900` may carry a full field (deck section dividers use it — steel ground, type reversed to paper).

## Assets
- `design-system/assets/photo.jpg` — the reference photograph the imagery page duotones. Replace with real project imagery.
- Fonts: Barlow and Barlow Condensed, loaded from Google Fonts via `@import` at the top of `styles.css`. In a production build, self-host or use the codebase's font pipeline instead of the runtime `@import`.
- No other binary assets; all specimen graphics are CSS.

## Files in this bundle

```
design-system/
  styles.css                    THE stylesheet — tokens (:root) + component layer. Link from every page.
  readme.md                     The system's own written guidance.
  theme.json                    Machine-readable record of the parameters everything derives from.
  theme.html                    Theme parameters as a reference sheet.
  thumbnail.html                Project cover (brand mark + swatches).
  foundations/
    type.html                   Type scale + heading/body pairing at real sizes.
    color.html                  Color roles and 100–900 ramps with usage notes.
    layout.html                 Spacing scale, grid, and how edges are drawn.
    icons.html                  Icon set at interface sizes.
    image.html                  Photograph and figure treatment.
  components/
    buttons.html                Buttons, icon buttons, tags — every variant and state.
    forms.html                  Text fields, radios, segmented control.
    cards.html                  Content cards, blueprint frame, elevation steps.
    navigation.html             Header bar pattern.
    table.html                  Data table.
    dialog.html                 Modal over backdrop at top elevation.
  templates/
    landing/index.html          A full starter page consuming the system correctly — the best
                                single reference for how the pieces compose. Loads the system
                                via ds-base.js; image-slot.js is a vendored image placeholder.
    deck/Deck.dc.html           A slide-deck starter (deck-stage.js is the slide shell,
                                support.js is its runtime — both are tooling, not design).
  assets/photo.jpg
```

## Implementation order (suggested)
1. Port the tokens — `:root` block of `styles.css` → the codebase's token layer (CSS vars, Tailwind theme, SwiftUI palette, whatever it uses). Everything else depends on this.
2. Port the base layer — resets, type scale, `a`, `img`, `figcaption`, focus/selection.
3. Build the `.blueprint` frame primitive first; the rest of the system references it.
4. Port components in this order: buttons → tags → forms → cards → nav → table → dialog. Compare each against its reference page open in a browser.
5. Port the `.duotone` image wrapper.
6. Validate against `templates/landing/index.html` — recreating that page in the target stack is a good acceptance test.

To view any reference page, open it directly in a browser; they are self-contained apart from the relative link to `styles.css`.
