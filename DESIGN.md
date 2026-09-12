---
name: manhwaindex
description: A legal index for manhwa, manga, manhua and anime, staged as a theatre cyclorama at dawn.
colors:
  night: "#050508"
  night-raised: "#0b0d1a"
  night-sunk: "#030306"
  cobalt: "#16337d"
  cobalt-line: "#24418f"
  cobalt-bright: "#5f7fe0"
  rose: "#e0688a"
  rose-soft: "#f0a3b8"
  dawn: "#f5ecdd"
  dawn-dim: "#b8b3c9"
  dawn-faint: "#8d87a6"
  day: "#ffffff"
typography:
  display:
    fontFamily: "Saira, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.3rem + 3vw, 3.4rem)"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Saira Stencil One, Saira, sans-serif"
    fontSize: "clamp(1.05rem, 0.95rem + 0.5vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "0.06em"
  title:
    fontFamily: "Saira, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Saira, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Saira Stencil One, Saira, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 400
    letterSpacing: "0.14em"
    fontFeature: "tabular-nums"
rounded:
  none: "0"
  hairline: "2px"
  chip: "3px"
  control: "4px"
  panel: "6px"
spacing:
  xs: "0.35rem"
  sm: "0.6rem"
  md: "0.9rem"
  lg: "1.25rem"
  xl: "1.75rem"
  section: "2.75rem"
components:
  cue-tag:
    textColor: "{colors.cobalt-bright}"
    typography: "{typography.label}"
    backgroundColor: "{colors.night}"
  cue-tag-rose:
    textColor: "{colors.rose-soft}"
    typography: "{typography.label}"
    backgroundColor: "{colors.night}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.dawn-dim}"
    rounded: "{rounded.chip}"
    padding: "0.35rem 0.95rem"
  chip-hover:
    backgroundColor: "{colors.dawn}"
    textColor: "{colors.night}"
  finder-input:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.dawn}"
    rounded: "{rounded.control}"
    padding: "0.45rem 0.9rem"
  finder-panel:
    backgroundColor: "{colors.night-sunk}"
    textColor: "{colors.dawn}"
    rounded: "{rounded.panel}"
    padding: "0.3rem"
  cover-card:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.dawn}"
    rounded: "{rounded.none}"
  cover-card-hover:
    textColor: "{colors.day}"
  platform-row:
    backgroundColor: "transparent"
    textColor: "{colors.dawn}"
    rounded: "{rounded.control}"
    padding: "0.85rem 0.5rem"
  platform-row-hover:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.day}"
  crosslink:
    backgroundColor: "transparent"
    textColor: "{colors.dawn}"
    rounded: "{rounded.none}"
    padding: "1rem 1.1rem"
  trailer-button:
    backgroundColor: "rgb(3 3 6 / 0.7)"
    textColor: "{colors.dawn}"
    rounded: "{rounded.chip}"
    padding: "0.6rem 1.3rem"
  trailer-button-hover:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.night}"
  empty-state:
    backgroundColor: "transparent"
    textColor: "{colors.dawn-dim}"
    rounded: "{rounded.none}"
    padding: "1.1rem 1.2rem"
---

# Design System: manhwaindex

## Overview

**Creative North Star: "Cyclorama Dawn"**

The whole site is one lit stage. A cyclorama is the seamless curved backdrop at the rear of a theatre, and lighting it well is what turns an empty box into a sky. That is the entire model here: the page ground is depthless cyc black, structure is a low cobalt horizon drawn in 1px rules, rose light gathers above that horizon, and pure white is held back as the fully-active state. Cover art does not sit inside frames or float in a grid of cards — it stands *on* the horizon band like actors against a Shinkai sky, which is the one composition move that makes an index of hotlinked artwork read as a designed surface instead of a scrape.

The second half of the world is the lighting plot. Every section is a numbered cue — "Cue 10 · Night", "Cue 30 · Dawn", "Cue 60 · Day, hold" — set in a stencil face with tabular numerals, riding the cobalt rule the way a plot annotation rides a pipe. Pages progress through named phases (night → first light → dawn → hold → day), each phase a slightly warmer wash rising from the bottom of its band. The phase is always written in words, never carried by colour alone, so the device survives a colourblind reader, a greyscale print, and a screen reader.

Density is high and honest. This is a reference site people reach from a phone at night after a Google search on one title, so the answer — the official places to read or watch — arrives first, and the atmosphere is confined to the cyclorama behind it. Every effect here is a gradient, a 1px rule, or a shadow: no images, no libraries, nothing that costs Core Web Vitals. The visual direction the build rejects is the pirate-aggregator look — dense boxed cards, loud badges, sidebar ad furniture — because looking legal is the product.

**Key Characteristics:**
- Depthless black ground with a single cobalt horizon line as the only structural drawing
- Light gathers upward: warm washes rise from the bottom edge of every band
- Stencil cue tags with tabular numerals name each phase in text
- Cover art stands on the horizon; the design frames artwork and never competes with it
- Pure white is a state, not a colour
- Platform brand colours are admitted as lighting gels because they are information

## Colors

A cold stage and a warm sky: near-black ground, cobalt structure, rose light, warm-cream text, with saturated foreign colour admitted only where it carries meaning.

### Primary
- **Rose Gather** (`{colors.rose}`): the light itself. The wordmark accent, focus rings, the caret, the selection highlight, the backlight behind a title-page cover, the bloom in every lifted shadow, and the hover border on a crosslink. It is the site's one warm accent and it earns attention precisely because no surface is ever filled with it.
- **Rose Soft** (`{colors.rose-soft}`): rose one step further into the light. Used for the answer-block headings, dawn-phase cue tags, and the role label on a character's appearance list — places that should read as lit without shouting.

### Secondary
- **Cobalt Horizon** (`{colors.cobalt}`): the structure of the world. Every dividing line, section top-rule, masthead underline, footer rule and scrollbar thumb is this one blue. It is the horizon, and it is the only thing that draws.
- **Cobalt Line** (`{colors.cobalt-line}`): the horizon a shade brighter, for borders that surround something rather than divide it — cover borders, chips, portraits, the finder dropdown, the trailer frame.
- **Cobalt Bright** (`{colors.cobalt-bright}`): the readable blue. Cue tags, link underline colour, scrollbar hover. The only cobalt allowed to carry text.

### Tertiary
- **Platform Gels** (per-platform, supplied by the catalog data): Webtoon green, Crunchyroll orange, Netflix red and the rest, mounted as 15×5px bars under a cover and as an 18px square beside a platform row, each with a soft shadow tinted from its own hue. This is the one place foreign colour is permitted, because a reader scanning a grid uses it to answer "is this on the app I already pay for?"

### Neutral
- **Cyc Black** (`{colors.night}`): the page ground. Depthless, not a dark grey — the point is that it has no surface.
- **Raised Black** (`{colors.night-raised}`): the one step up, for hover fills, image placeholders, and input wells.
- **Sunk Black** (`{colors.night-sunk}`): the one step down, for the masthead, the footer blackout, the finder panel and the scrollbar track.
- **Dawn** (`{colors.dawn}`): primary text. Warm cream, the colour of first light — never pure white, so that white stays available as a state.
- **Dawn Dim** (`{colors.dawn-dim}`): secondary text, tinted violet by the sky above it. Intros, nav at rest, synopses, footer links.
- **Dawn Faint** (`{colors.dawn-faint}`): tertiary text. Counts, captions, field labels, placeholders.
- **Day** (`{colors.day}`): pure white, reserved.

### Named Rules
**The Reserved Day Rule.** Pure white appears only on a fully active element — hover, focus, or `aria-current`. Nothing is white at rest. If a new surface wants white for emphasis, it wants Dawn.

**The Gel Rule.** The only foreign colour permitted in the world is a platform's own brand colour, and only where it identifies that platform. A gel is never decorative, never a background fill, and never larger than the 18px square it occupies beside a platform row.

**The Named Phase Rule.** Every phase wash is also spelled out in text on the same band ("Cue 20 · First light"). Colour is never the sole carrier of a distinction. A new band without its cue tag is not finished.

## Typography

**Display / Body Font:** Saira (with `ui-sans-serif, system-ui, sans-serif`) at 400 / 600 / 700 / 800
**Label / Cue Font:** Saira Stencil One (with `Saira, sans-serif`) at 400

**Character:** Saira is a slightly condensed grotesque — it packs a long title into a narrow card without looking squeezed, and at 800 with -0.02em tracking its headlines have real weight against the sky. Saira Stencil One is its own stencilled sibling, so the two share skeletons while reading as two completely different voices: one is the site talking, the other is the lighting plot annotating it. `font-synthesis-weight: none` is set globally so no faked weight ever ships.

### Hierarchy
- **Display** (Saira 800, `clamp(2rem, 1.3rem + 3vw, 3.4rem)`, line-height 1.06, -0.02em): page headlines only, one per page, capped at 15–18ch so it stacks into a block rather than running as a line.
- **Headline** (Saira Stencil One 400, `clamp(1.05rem, 0.95rem + 0.5vw, 1.3rem)`, uppercase, 0.06em): every `h2`. Section names are cue names, so they speak in the plot voice, not the site voice.
- **Title** (Saira 600, 1.05rem): `h3`, card titles (0.92rem, clamped to two lines), platform names (700, -0.01em).
- **Body** (Saira 400, 1rem, line-height 1.6): prose, capped at 70ch globally and 52–62ch in hero and footer contexts.
- **Label** (Saira Stencil One 400, 0.72–0.85rem, uppercase, 0.08–0.14em): cue tags, genre chips, the "go" affordance on a platform row, footer column heads, the trailer play button.

### Named Rules
**The Two Voices Rule.** Stencil is the lighting plot; it may only name, number, or tag. Section headings, cue tags, chips, column heads, go-labels. It never sets a headline, never sets a sentence, and never sets anything longer than about four words.

**The Cue-Sheet Numeral Rule.** Any number a reader might compare — cue numbers, catalog counts, scores, genre tallies, fact values — is set in tabular numerals (`font-variant-numeric: tabular-nums`). Numbers in this world belong to a cue sheet and have to align.

## Layout

One centred column: `--shell` is `min(1180px, 100% - 2.5rem)`, tightening to `100% - 2rem` below 760px. Everything inside the page shares that measure, which is what lets the 1px cobalt rules run edge to edge of the content and read as one continuous horizon down the page.

Vertical rhythm is band-based rather than card-based. Sections are `2.75rem` tall in the block direction, separated by a single top rule, and each carries `data-phase` which paints a wash rising from its own bottom edge (`linear-gradient(to top, var(--band) 0%, transparent 55%)`) at 10–26% opacity. Stacked, the page reads as the sky getting lighter as you scroll.

Cover grids are `repeat(auto-fill, minmax(148px, 1fr))` with a deliberately uneven gutter — `1.9rem` row, `1.25rem` column — so covers sit close side to side like figures in a line and breathe vertically where their titles are. The `--shelf` variant turns the same grid into a horizontally scrolling batten with `scroll-snap-type: x proximity` and fixed 148px cards. Title pages are a `232px` cover rail beside a fluid column at `2.5rem` gap, the rail sticky at `top: 5rem`.

Below 760px the single breakpoint does real work rather than just stacking: the title page and footer collapse to one column, the cover rail becomes a horizontal 132px-plus-text row, the grid retightens to 108px, nav wraps to its own full-width row beneath the search field, and the hero skyline drops to five covers.

## Elevation & Depth

Nothing in this system is lifted by a conventional drop shadow. Depth comes from **light**, and every shadow is either the dark the light fails to reach or the bloom the light itself throws. Shadows therefore come in pairs: a deep near-black lift and a rose-tinted bloom in the same rule. A surface that carries only a black shadow reads as a cutout; a surface that carries only a bloom reads as a sticker.

Tonal layering does the rest. Three blacks (sunk, ground, raised) are the only fills, and they stack in that order — the masthead and footer are sunk *below* the stage, hover fills come up *above* it.

### Shadow Vocabulary
- **Cover at rest** (`0 18px 30px -16px rgb(3 3 6 / 0.9), 0 10px 28px -14px rgb(224 104 138 / 0.18)`): every cover in a grid.
- **Cover raised to day** (`0 24px 36px -16px rgb(3 3 6 / 0.9), 0 14px 34px -12px rgb(224 104 138 / 0.4)`): on hover or focus, paired with `translate: 0 -4px`, a Dawn border and `brightness(1.07)`. The bloom more than doubles: the cover has moved into the light.
- **Standing on the line** (`0 -14px 44px -12px rgb(5 5 8 / 0.85)`): an *upward* shadow, used on the hero skyline so covers cast shade up into the sky they are standing against.
- **Hero cover** (`0 26px 48px -18px rgb(3 3 6 / 0.95)`): the title-page cover, over a blurred rose-and-cobalt radial backlight rendered behind it.
- **Panel** (`0 24px 48px -12px rgb(0 0 0 / 0.7), 0 8px 30px -12px rgb(22 51 125 / 0.5)`): the search dropdown — the one true floating layer, with a cobalt rather than rose bloom because it is a console, not a lit subject.
- **Gel glow** (`0 3px 8px -1px color-mix(in srgb, var(--mark) 55%, transparent)`): every platform gel throws its own colour.

### Named Rules
**The Backlight Rule.** Depth is light, not weight. Every elevated element carries a black lift *and* a coloured bloom, and the bloom is drawn from the light source behind it — rose for a lit subject, cobalt for a console surface. Never a plain grey `box-shadow`.

**The Standing-On-The-Line Rule.** Cover art rests on a horizon rule; it is never inset in a filled card. When a cover meets the line, its bottom border is dropped so the two become one edge.

## Shapes

Square by default. The stage, the covers, the crosslinks, the empty states and the answer blocks all have zero radius, and their form comes from 1px borders rather than corners. Radius is a signal of interactivity and stays small: `2px` on thumbnails and focus rings, `3px` on chips, gels and portraits, `4px` on inputs and clickable row hit-areas, `6px` on the one floating panel.

Borders carry more of the form language than fills do. Three border weights recur: the `1px solid var(--cobalt)` horizon rule that divides, the `1px solid var(--cobalt-line)` box that surrounds, and the `1px solid rgb(36 65 143 / 0.45)` faint rule for repeating rows inside a block. Two borders are deliberately warm — `rgb(245 236 221 / 0.28–0.3)` on cover art — because a cover is lit and its edge should catch that light.

The recurring silhouette is the 2:3 cover: every comic and anime image in the system is `aspect-ratio: 2 / 3`, character portraits are `3 / 4`, and trailers are `16 / 9`. Those three ratios are the only image shapes in the world.

Hairline grids are built by gap, not border: the genre wall and the appearances list use a `1px` gap over a cobalt-tinted background so the cells' own fills draw the grid.

## Components

### Cue Tag
The signature device. A stencil label — `Cue 10 · Night` — absolutely positioned to straddle a cobalt rule, pulled up 50% and given a `--night` background with left padding so it punches a hole in the line it rides, exactly like an annotation taped to a lighting pipe.
- **Style:** Saira Stencil One, 0.72rem, uppercase, 0.14em tracking, cobalt-bright, `white-space: nowrap`, tabular numerals.
- **Rose variant:** dawn-phase and later tags shift to Rose Soft.
- **Placement:** top-right of a section, straddling its top rule; on an answer block, pushed below the rule it sits under.
- **Rule:** the number ascends in tens down the page (00 blackout, 05, 10, 20 … 60) and the phase word follows the dot.

### Cover Card
- **Corner style:** square (0). The image is the card; there is no container fill, no padding, no wrapper border.
- **Border:** 1px cobalt-line at rest, Dawn on hover.
- **Shadow:** see *Cover at rest* / *Cover raised to day*.
- **Hover / Focus:** rises 4px, brightens 7%, bloom intensifies, title goes to Day. 180ms on `--ease-dawn`.
- **Title:** 0.92rem/600, clamped to two lines.
- **Gel strip:** up to four 15×5px brand bars beneath the title, with a `+n` overflow count or an honest `no official link yet` in Dawn Faint.

### Platform Row
The answer block, and the most important component on the site.
- **Style:** a three-column grid — gel square, name over note, stencil go-label — on a transparent ground with a faint cobalt bottom rule.
- **Hover:** the whole row fills to Raised Black (4px radius) and the go-label steps to Day.
- **Go-label:** Saira Stencil One 0.78rem uppercase with a rose text-shadow glow, so the outbound action looks lit even at rest.

### Chips
- **Style:** 3px radius, 1px cobalt-line border, transparent fill, Dawn Dim stencil caps at 0.8rem.
- **Hover:** full inversion — Dawn fill, Night text, Dawn border. The one place in the system that goes fully light.

### Inputs
- **Style:** Raised Black well, 1px cobalt border, 4px radius, 0.9rem text, Dawn Faint placeholder.
- **Focus:** border shifts to Rose with a soft rose bloom beneath (`0 6px 24px -8px rgb(224 104 138 / 0.35)`). The default outline is suppressed here *because* the border and bloom replace it; everywhere else `:focus-visible` draws a 2px Rose outline at 3px offset.
- **Results panel:** Sunk Black, 6px radius, cobalt-line border, the *Panel* shadow, rows at 4px radius filling to Raised Black on hover.

### Navigation
- **Style:** Saira 0.9rem, Dawn Dim at rest, no underline, with a 2px transparent bottom border reserved from the start so nothing shifts.
- **Hover:** Day.
- **Current:** Day text plus a Rose bottom border — the active state uses both reserved signals at once.
- **Mobile:** the nav wraps to its own full-width row below the search field.

### Empty State
Named after the ghost light left burning on a dark stage. A dashed cobalt-line box with a low cobalt wash rising from its bottom edge, Dawn Dim text, a Dawn `strong` for the honest headline. Empties are styled as part of the world rather than hidden, because "no official link yet" is a true answer and the product depends on saying so.

### Crosslink
The read-side ↔ watch-side bridge: a square-cornered bar with a cobalt-line border and a rising cobalt wash, a 46px cover thumbnail at 2:3, and a lead line above the title. On hover the border goes Rose with a rose bloom.

## Do's and Don'ts

### Do:
- **Do** draw structure with the 1px cobalt horizon rule (`{colors.cobalt}`) and nothing else. It is the only line in the world.
- **Do** give every new section a `data-phase` band *and* a matching stencil cue tag with its number and phase word (The Named Phase Rule).
- **Do** pair a black lift with a coloured bloom on anything elevated (The Backlight Rule) — rose behind a lit subject, cobalt behind a console surface.
- **Do** keep pure white for the active state only (The Reserved Day Rule); reach for Dawn `{colors.dawn}` when you want emphasis at rest.
- **Do** set every comparable number in tabular numerals (The Cue-Sheet Numeral Rule).
- **Do** let cover art stand on a rule at 2:3 with a warm `rgb(245 236 221 / 0.3)` edge, unframed and unfilled.
- **Do** keep prose to 70ch, hero copy to ~52ch, and headlines to 15–18ch.
- **Do** transition on `--ease-dawn` (`cubic-bezier(0.16, 1, 0.3, 1)`) at 140ms for state changes and 180ms for anything that moves, and animate only `translate`, `opacity`, `filter`, `box-shadow`, `border-color` and `background-color`.
- **Do** build atmosphere from gradients, 1px rules and shadows. A single inline `feTurbulence` data-URI supplies the hero's grain; that is the whole texture budget.

### Don't:
- **Don't** set Saira Stencil One in a headline, a sentence, or anything over about four words (The Two Voices Rule).
- **Don't** introduce a colour outside the twelve tokens, with the single exception of a platform's own brand gel where it identifies that platform (The Gel Rule).
- **Don't** put cover art inside a filled card, a rounded frame, or a coloured container. The design frames artwork and does not compete with it.
- **Don't** use a plain grey or neutral `box-shadow`, and don't use a shadow to separate things that a cobalt rule can separate.
- **Don't** let the cobalt rule alone mark an interactive control's edge — a control must also change state on hover and focus (the input's border going to Rose, the row filling to Raised Black).
- **Don't** round anything above 6px, and don't round cover art, answer blocks, crosslinks or empty states at all.
- **Don't** rely on a phase wash, a gel colour, or a glow to carry meaning on its own — every one of them has a text label beside it and must keep it.
- **Don't** add a second display face, a decorative icon font, or a raster texture. The wordmark's lantern mark is inline SVG and is the only icon in the system.
- **Don't** ship motion that survives `prefers-reduced-motion: reduce`; the global override collapses all durations to 0.01ms and nothing may opt out of it.
