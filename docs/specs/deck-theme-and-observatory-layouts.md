# Deck Theme and the Observatory layouts

Status: Approved for implementation (grill consensus 2026-11-07, prototype verdict 2026-11-07). Published as [specification #57](https://github.com/shiroki9979/weekly-report-builder/issues/57) with four sequential implementation tickets [#58](https://github.com/shiroki9979/weekly-report-builder/issues/58) → [#59](https://github.com/shiroki9979/weekly-report-builder/issues/59) → [#60](https://github.com/shiroki9979/weekly-report-builder/issues/60) → [#61](https://github.com/shiroki9979/weekly-report-builder/issues/61); all carry `ready-for-agent`.

Created: 2026-11-07
Last updated: 2026-11-07

Upstream: [Stage design philosophy](../explanation/stage-design-philosophy.md), [Stage theme prototype](../explanation/stage-theme-prototype.md), [ADR-0002](../adr/0002-deck-theme.md). Domain terms follow [CONTEXT.md](../../CONTEXT.md).

## Problem Statement

The Stage has one visual language, tuned to paste PNGs into a team PowerPoint template. Authors making decks that are not weekly reports have been writing every page as an HTML Page with a second, hand-maintained language (teal/navy, Noto Sans TC, cards, tags, tradeoff callouts, boundary notes, a footer with the deck name). In the two real non-weekly decks, 43 of 43 pages are HTML Pages. Recurring compositions therefore sit outside Export Readiness, Page Position, Deck Template reuse, and the editors; page numbers collide with hand-made footers, so authors switch them off.

The catalogue of those 43 pages shows four compositions that no Structured Layout can express: a cover, a closing page, a two-column qualitative comparison with a chosen option and a trade-off, and a full-width panel (table today). Two Stage Elements recur across layouts: a one-line Boundary Note and a Tradeoff Callout.

## Solution

Introduce **Deck Theme**: a Deck-level choice from a fixed list, `default` (the current blue, PowerPoint-compatible language) and `observatory` (the Editorial Observatory language selected in the prototype). Theme tokens are semantic roles; the existing `--blue*` names remain as aliases so HTML Pages keep working.

Add four Structured Layouts, each with a named communication job: **Cover** (opening), **Closing** (closing), **Side-by-side Comparison** (qualitative decision between two options), **Full-width Panel** (one table, flow, checklist, or chart panel using the whole body). Add **Boundary Note** as an optional Stage Element on the Editorial Frame, and **Tradeoff Callout** as a slot on Side-by-side Comparison. Give the Editorial Frame a footer carrying **Deck Title** and the page label.

Existing Structured Layouts only read theme tokens; their compositions do not change. Spoken presentation and independent reading keep equal priority; the philosophy's contrast and single-emphasis constraints apply to both themes.

## Goals

- A non-weekly deck can be authored entirely from Structured Layouts in the `observatory` theme, with Export Readiness, Page Position, and Deck Template reuse applying to every page.
- `default` output is pixel-compatible with today's output for existing decks.
- HTML Pages that reference `--blue*` or role tokens follow the Deck Theme without edits.

## Non-goals

- Author-defined colours or fonts in Deck JSON; per-page theme overrides.
- Bundled CJK fonts.
- Horizontal step strips and timelines, branching diagrams, the profile "story grid", layer stacks, a dark Cover variant, and appendix page labels such as `B1`. These stay HTML Pages or later Layout Variants.
- Re-composing existing Structured Layouts.
- Migrating existing hand-written HTML Pages.

## User Stories

1. As a deck author, I want to pick a theme once per Deck in the Workshop, so that every page shares one visual language without per-page settings.
2. As a weekly report author, I want decks without a theme to keep today's appearance, so that existing reports and the team template workflow do not change.
3. As a deck author, I want a new Deck created from a Deck Template to keep the template's theme and Deck Title, so that structure reuse includes the visual language.
4. As an HTML Page author, I want my fragment's `--blue` and role token references to follow the Deck Theme, so that one-off pages do not drift from the rest of the deck.
5. As a deck author, I want a Deck Title shown in the footer of every Editorial Frame page, so that a single PNG identifies the deck it came from.
6. As a deck author, I want a Cover page with a title, optional subtitle and byline, and the Frame Label when the Deck has a period, so that a deck opens without a hand-written HTML Page.
7. As a deck reader, I want the Cover to count in Page Position without showing a page number, so that the second page reads `2 / N` like any printed deck.
8. As a deck author, I want a Closing page with a headline, up to four takeaways, and an optional closing line, so that a deck ends with what to remember and how to follow up.
9. As a deck author, I want a Side-by-side Comparison with two labelled columns of points, an optional chosen column, and an optional Tradeoff Callout, so that a qualitative decision is shown without inventing numeric metrics.
10. As a deck reader, I want the chosen column marked by a rule and a label, not only by colour, so that the choice is legible in print and without colour perception.
11. As a deck author, I want a Full-width Panel that reuses the Two-column panel kinds and editors, so that a wide table or flow does not need three narrative items beside it.
12. As a deck author, I want an optional Boundary Note on any Editorial Frame page, so that the scope or verification of a page's claim is visible without a speaker.
13. As a deck author, I want Content-complete rules for the new layouts to match their required fields only, so that optional slots never block Copy or batch export.
14. As a deck author, I want overflow at 1280 × 720 to block output for the new layouts as it does for existing ones, so that a long comparison is split rather than clipped.
15. As a deck author, I want the `observatory` theme to embed its Latin fonts in PNG output, so that exported pages look the same on a machine without those fonts.
16. As a maintainer, I want the theme's status tones and contrast checked in both themes, so that Overview and Trend & Target stay legible after switching.
17. As a new user, I want a fictional demo deck in the `observatory` theme using the four new layouts, so that I can try the language without private content.
18. As a maintainer, I want the prototype entry removed after the fourth slice and the decision captured in docs, so that two implementations do not drift.

## Implementation Decisions

### Deck model

| Field   | Type                         | Rule                                                                                        |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| `theme` | `"default" \| "observatory"` | Optional. Omitted reads as `default`. Any other value rejects the Deck; no silent fallback. |
| `title` | `string`                     | Optional Deck Title. Trimmed-empty reads as absent. Shown in the Editorial Frame footer.    |

Both are kept by `createDeckFromTemplate` and by the Weekly Series flow. Save writes the parsed value as-is: an omitted theme stays omitted and an explicit `default` is preserved, so existing files do not change on save.

### Theme tokens and styles

- `stage.css` defines role tokens on `.stage-root` for `default`: `--paper`, `--ink`, `--mute`, `--line`, `--accent`, `--accent-deep`, `--accent-soft`, `--accent-wash`, `--ok`, `--ok-ink`, `--ok-wash`, `--warn`, `--warn-ink`. `--blue`, `--blue-deep`, `--blue-soft`, `--blue-wash` become aliases of the accent roles. Values for `default` are today's values.
- `src/styles/themes/observatory.css` overrides the roles under `.stage-root[data-theme="observatory"]` with the prototype palette (ink `#20384b`, mute `#5a6e7e`, line `#d6dee4`, accent `#287b78`, accent-deep `#1f5f5c`, accent-soft `#b9d9d6`, accent-wash `#e7f2f1`, ok-ink `#1f7a52`, warn-ink `#8a5508`; `ok`, `ok-wash`, `warn` chosen to keep 4.5:1 for text roles) and declares `@font-face` for Instrument Sans (400/700) and IBM Plex Mono (400/700) from `src/styles/fonts/`, with the OFL files alongside. The family stacks are `"Instrument Sans", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif` and `--mono: "IBM Plex Mono", "Noto Sans TC", monospace`.
- The Stage root carries `data-theme` from the Deck; preview and the capture adapter set it the same way through the Stage context Module, never from display strings.
- Frame decorations specific to `observatory` (the `§ nn` index, the tick ruler, mono eyebrow and footer, the lead block as a hairline frame with an accent top rule) are CSS on existing frame classes. No layout component branches on the theme.
- Class names are composed with `cn()` or whole conditional strings; `prettier-plugin-tailwindcss` strips leading spaces inside `className` template literals.

### Editorial Frame

- Header: eyebrow (fixed per layout, overridable where a layout declares `eyebrow`), Frame Label when the Deck has a period, headline from `title`.
- In `observatory`, the header prefixes the eyebrow with the zero-padded Page Position index (`§ 07`) when the page number is visible; hidden page numbers hide the index as well.
- Body: layout content.
- Boundary Note: optional one-line slot between body and footer, separated by a hairline, rendered from page field `boundary`. Any Editorial Frame layout may carry it: Overview, Evidence-backed Decision, Next Actions, Trend & Target, Closing, Side-by-side Comparison, Full-width Panel. Cover, HTML Page and Two-column do not.
- Footer: Deck Title on the left (omitted when the Deck has none), page label on the right. The footer keeps its height when either side is empty so the body does not shift between pages. The page label is `n / N` as today; `observatory` renders it zero-padded.
- Cover never renders the footer page label and ignores `showPageNumber`; it still counts in Page Position.

### Page contracts

Common fields follow the existing table (`id`, `layout`, `title`, `hidden`, `notes`, `showPageNumber`), plus `boundary?: string` on Editorial Frame layouts.

**Cover** (`layout: "cover"`)

| Field      | Type     | Rule                                    |
| ---------- | -------- | --------------------------------------- |
| `title`    | `string` | Headline; required for Content-complete |
| `subtitle` | `string` | Optional                                |
| `byline`   | `string` | Optional; presenter or team             |

The Frame Label is shown from the Deck period; the meta row in `observatory` shows byline and the Deck period as labelled cells. No `boundary`.

**Closing** (`layout: "closing"`)

| Field         | Type                               | Rule                                                             |
| ------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `eyebrow`     | `string`                           | Optional; defaults to `Closing`                                  |
| `title`       | `string`                           | Required for Content-complete                                    |
| `takeaways`   | `{ ref?: string; text: string }[]` | 0–4 items; every present `text` must be non-empty to be complete |
| `closingLine` | `string`                           | Optional; contact or next step, rendered after the takeaways     |

**Side-by-side Comparison** (`layout: "side-by-side"`)

| Field      | Type                             | Rule                                                                            |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------- |
| `columns`  | `[Column, Column]`               | Exactly two. `Column = { label: string; points: string[] }`, 1–4 points each    |
| `chosen`   | `0 \| 1`                         | Optional; marks one column with an accent top rule and a `Chosen` tag           |
| `tradeoff` | `{ why: string; cost?: string }` | Optional Tradeoff Callout; when present, `why` must be non-empty to be complete |

Content-complete: `title`, both `label`s, and at least one non-empty point per column; every present point non-empty.

**Full-width Panel** (`layout: "full-width-panel"`)

| Field   | Type    | Rule                                                                                |
| ------- | ------- | ----------------------------------------------------------------------------------- |
| `panel` | `Panel` | One of the existing `table`, `flow`, `checklist`, `chart` panels; `fields` excluded |

Panel `title` may be empty and is then not rendered. Completeness reuses the Two-column panel rules; the three narrative items do not exist.

All four are supported pages for Page Position and batch export. Parser policy is unchanged: declared fields normalised, extra fields dropped, cardinality violations reject the Deck.

### Deck Template and Weekly Series

Creating from a template keeps layouts, order, `theme`, Deck Title, Cover `byline`, and Closing `closingLine`; it clears every other authored string (titles, subtitle, points, labels, tradeoff, takeaways, boundary) and keeps panel structure under the existing Two-column rules.

### Workshop

- Toolbar: a Deck-level theme select (`Default`, `Observatory`) and a Deck Title input, next to the page-number select. Both edit the Editing Session like other Deck-level fields and mark the session dirty.
- Add Page gains Cover, Closing, Side-by-side Comparison, and Full-width Panel (with the panel-kind choice reused from Two-column).
- Each new layout has its own editor module dispatched by `PageEditorForm`; the Boundary Note field lives in the shared editorial page chrome.
- Editors keep the existing readiness path conventions; Export Readiness copy lists missing required fields by name.

### Export

No change to the Export gate contract. `html-to-image` embeds the `@font-face` fonts in use; the browser capture test asserts the SVG contains the two `observatory` families when the page uses them and none under `default`.

### Demo Deck Set

Add `demo/harbor-pilot-review.json` (fictional, `observatory`, Deck Title set) with Cover, Overview, Side-by-side Comparison, Full-width Panel (table), and Closing, using the prototype's fictional copy. Seeding behaviour is unchanged.

## Testing Decisions

Red → Green → Refactor on public seams; no assertions on CSS class names or private component structure.

### Vitest seams

- `parseDeck`: `theme` omitted/`default`/`observatory`/invalid; Deck Title trimming; each new layout's required fields, cardinalities, and `boundary` acceptance only on Editorial Frame layouts.
- `createDeckFromTemplate` and the Weekly Series flow: theme, Deck Title, byline and closing line retained; other copy cleared.
- `assessContentReadiness`: the Content-complete rules above, including optional slots never blocking.
- Stage context: theme and Deck Title exposed as typed facts; Cover counted in Page Position with no page label.
- Editor modules: add/move/remove points and takeaways within limits.

### Browser seam

- Playwright fixtures render each new layout at min and max content, English, Chinese, and mixed, at 1280 × 720 in both themes; overflow blocks export.
- Overview and Trend & Target fixtures run under `observatory` to confirm tone contrast and unchanged composition.
- A capture test checks font embedding as described under Export.

## Delivery slices

Sequential PRs; each must pass lint, format check, typecheck, Vitest, Playwright, and production build.

### 1. Deck Theme foundation

- `theme` and Deck Title in the Deck model, parser, save, template and Weekly Series.
- Role tokens and `--blue*` aliases in `stage.css`; `themes/observatory.css` with self-hosted fonts.
- `data-theme` through the Stage context Module; toolbar theme select and Deck Title input.
- Editorial Frame footer with Deck Title; `observatory` frame decorations; existing layouts verified in both themes.
- Font embedding capture test. Docs: Deck JSON reference, Workshop architecture.

### 2. Boundary Note, Cover, Closing

- `boundary` on Editorial Frame layouts; the frame slot and shared editor field.
- Cover and Closing: model, parser, factory/template, editor, renderer, readiness, Page Position, Playwright fixtures in both themes.

### 3. Side-by-side Comparison

- Model, parser, factory/template, editor (two columns, chosen, Tradeoff Callout), renderer, readiness, fixtures.

### 4. Full-width Panel, demo deck, retirement

- Model, parser, editor reuse, renderer, readiness, fixtures.
- `demo/harbor-pilot-review.json`; README and how-to updates.
- Remove `prototype.html`, `src/prototype/`, and the `prototype` script; keep `docs/explanation/stage-theme-prototype.md` as the pointer to the throwaway branch.

## Issue plan

Specification issue #57 references this document; implementation issues #58, #59, #60, #61 match the slices and are linked as its sub-issues. #59 is blocked by #58, #60 by #59, #61 by #60. All four carry `ready-for-agent`.

## Acceptance Criteria

- Opening any existing deck without `theme` renders identically to before the change; the format check and existing fixtures pass unchanged.
- A Deck with `theme: "observatory"` renders every Structured Layout and HTML Pages referencing `--blue*` in the new palette and fonts; PNG output embeds the Latin fonts.
- The four new layouts can be added, edited, saved, reloaded, cloned through a Deck Template, previewed, copied, and batch-exported with the shared Export gate; Draft, Overflowing, Hidden, and Page Position behaviour matches existing layouts.
- The fictional demo deck opens on a fresh install and exports all pages.
- CONTEXT.md terms match the implemented behaviour; the Deck JSON reference documents `theme`, `title`, `boundary`, and the four layouts.
