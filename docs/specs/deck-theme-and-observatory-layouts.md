# Deck Theme and the Observatory layouts

Status: Approved for implementation (grill consensus 2026-11-07, prototype verdict 2026-11-07, seams and ticket breakdown confirmed 2026-11-07). Published as [specification #57](https://github.com/shiroki9979/weekly-report-builder/issues/57) with a prefactor ticket [#62](https://github.com/shiroki9979/weekly-report-builder/issues/62) and four sequential implementation tickets [#58](https://github.com/shiroki9979/weekly-report-builder/issues/58) → [#59](https://github.com/shiroki9979/weekly-report-builder/issues/59) → [#60](https://github.com/shiroki9979/weekly-report-builder/issues/60) → [#61](https://github.com/shiroki9979/weekly-report-builder/issues/61); all carry `ready-for-agent`.

Created: 2026-11-07
Last updated: 2026-11-08 (Demo Deck Set coverage, #64; naming and first-week workflow consensus)

Upstream: [Stage design philosophy](../explanation/stage-design-philosophy.md), [Stage theme prototype](../explanation/stage-theme-prototype.md), [ADR-0002](../adr/0002-deck-theme.md). Domain terms follow [GLOSSARY.md](../../GLOSSARY.md).

## Problem Statement

The Stage has one visual language, tuned to paste PNGs into a team PowerPoint template. Authors making decks that are not weekly reports have been writing every page as an HTML Page with a second, hand-maintained language (teal/navy, Noto Sans TC, cards, tags, tradeoff callouts, boundary notes, a footer with the deck name). In the two real non-weekly decks, 43 of 43 pages are HTML Pages. Recurring compositions therefore sit outside Export Readiness, Page Position, Deck Template reuse, and the editors; page numbers collide with hand-made footers, so authors switch them off.

The catalogue of those 43 pages shows four compositions that no Structured Layout can express: a cover, a closing page, a two-column qualitative comparison with a chosen option and a trade-off, and a full-width panel (a table today). Two Stage Elements recur across layouts: a one-line Boundary Note and a Tradeoff Callout. Tables also need a cross-reference column that today's panel model cannot mark.

## Solution

Introduce **Deck Theme**: a Deck-level choice from a fixed list, `default` (the current blue, PowerPoint-compatible language) and `observatory` (the Editorial Observatory language selected in the prototype). Theme tokens are semantic roles; the existing `--blue*` names remain as aliases so HTML Pages keep working.

Add four Structured Layouts, each with a named communication job: **Cover** (opening), **Closing** (closing), **Side-by-side Comparison** (qualitative decision between two options), **Full-width Panel** (one table, flow, checklist, or chart panel using the whole body). Add **Boundary Note** as an optional Stage Element on the Editorial Frame, **Tradeoff Callout** as a slot on Side-by-side Comparison, and a **reference column** on table panels. Give the Editorial Frame a footer carrying **Deck Title** and the page label.

Existing Structured Layouts only read theme tokens; their compositions do not change. Spoken presentation and independent reading keep equal priority; the philosophy's contrast and single-emphasis constraints apply to both themes.

## User Stories

### Theme

1. As a deck author, I want to pick a theme once per Deck in the Workshop, so that every page shares one visual language without per-page settings.
2. As a weekly report author, I want decks without a theme to keep today's appearance, so that existing reports and the team template workflow do not change.
3. As a deck author, I want an invalid theme value to be rejected when the Deck loads, so that a typo does not silently fall back to a different look.
4. As a deck author, I want a new Deck created from a Deck Template to keep the template's theme, so that structure reuse includes the visual language.
5. As a weekly report author, I want the next week created by the Weekly Series to keep the theme, so that a themed weekly series stays consistent.
6. As an HTML Page author, I want my fragment's `--blue` and role token references to follow the Deck Theme, so that one-off pages do not drift from the rest of the deck.
7. As an HTML Page author, I want hard-coded colours in my fragment left untouched, so that a page designed on purpose is not restyled.
8. As a deck reader, I want status tones to stay readable in every theme, so that Overview and Trend & Target status labels keep their meaning after switching.
9. As a deck author, I want the `observatory` theme to embed its Latin fonts in PNG output, so that exported pages look the same on a machine without those fonts.
10. As a deck author, I want Chinese text to use the system CJK font in every theme, so that the app does not ship a large font and my machine's rendering is used.

### Deck Title and Editorial Frame

1. As a deck author, I want to set a Deck Title in the Workshop, so that a single exported PNG identifies the deck it came from.
2. As a deck reader, I want the Deck Title in the footer of every Editorial Frame page with the page label on the right, so that I can locate a page in the deck from the image alone.
3. As a deck author, I want pages without a Deck Title or with page numbers hidden to keep the same body height, so that content does not shift between pages.
4. As a deck reader, I want the `observatory` header to show the page index beside the eyebrow when page numbers are on, so that cross-references such as "see 07" are easy to follow.
5. As a deck author, I want an optional Boundary Note on any Editorial Frame page, so that the scope or verification of a page's claim is visible without a speaker.
6. As a deck author, I want the Boundary Note excluded from Content-complete but still subject to the overflow check, so that an optional caveat never blocks export by being absent, and an overlong one is split rather than clipped.
7. As a deck author, I want the Boundary Note cleared when creating from a Deck Template, so that last week's caveat is not reused unread.

### Cover

1. As a deck author, I want a Cover page with a title, optional subtitle and byline, so that a deck opens without a hand-written HTML Page.
2. As a deck reader, I want the Cover to show the Frame Label when the Deck has a period, so that a weekly deck's cover names its week.
3. As a deck reader, I want the Cover to count in Page Position without showing a page number, so that the second page reads `2 / N` like any printed deck.
4. As a deck author, I want only the Cover title required for export, so that a cover with just a title is a complete page.
5. As a deck author, I want the Cover byline kept when creating from a Deck Template, so that stable presenter information is not re-entered.

### Closing

1. As a deck author, I want a Closing page with a headline, up to four takeaways, and an optional closing line, so that a deck ends with what to remember and how to follow up.
2. As a deck author, I want each takeaway to carry an optional short reference such as a page number or a day, so that follow-ups point at where the detail lives.
3. As a deck reader, I want the closing line to follow the takeaways rather than sit at the page bottom, so that a short Closing does not leave a large gap.
4. As a deck author, I want the Closing eyebrow to default to `Closing` but be overridable, so that a Q&A or Next page can say so.
5. As a deck author, I want the closing line kept when creating from a Deck Template, so that contact details carry over.

### Side-by-side Comparison

1. As a deck author, I want a comparison of two labelled columns of points, so that a qualitative decision is shown without inventing numeric metrics.
2. As a deck author, I want one to four points per column, so that the page stays readable at presentation size.
3. As a deck author, I want to mark at most one column as chosen, so that the decision is visible at a glance.
4. As a deck reader, I want the chosen column marked by a rule and a label, not only by colour, so that the choice is legible in print and without colour perception.
5. As a deck author, I want an optional Tradeoff Callout with a reason and a cost, so that the decision is explained in the author's words.
6. As a deck author, I want a comparison with no chosen column and no trade-off to still be exportable, so that an open comparison can be shown before a decision.
7. As a deck author, I want every present point to be non-empty for export, so that an empty bullet never reaches a PNG.

### Full-width Panel

1. As a deck author, I want a page that gives one table, flow, checklist, or chart panel the whole body, so that a wide table does not need three narrative items beside it.
2. As a deck author, I want the Full-width Panel to reuse the Two-column panel editors and rules, so that I do not learn a second table editor.
3. As a deck author, I want the panel title optional on a Full-width Panel, so that the headline is not repeated.
4. As a deck author, I want to mark one table column as the reference column, so that cross-references to other pages stand out and never wrap.
5. As a deck author, I want the reference column kept when a Deck Template is created and adjusted when I remove a column, so that table structure survives without pointing at the wrong column.
6. As a Two-column author, I want the same reference column available on my table panel, so that both table layouts behave alike.

### Workshop, export, and delivery

1. As a deck author, I want Add Page to offer the four new layouts, so that I can build a non-weekly deck entirely from Structured Layouts.
2. As a deck author, I want each new layout to have its own editor with the shared title, notes, hidden, and Boundary Note controls, so that editing feels like the existing layouts.
3. As a deck author, I want Content-complete rules for the new layouts to match their required fields only, so that optional slots never block Copy or batch export.
4. As a deck author, I want overflow at 1280 × 720 to block output for the new layouts as it does for existing ones, so that a long comparison is split rather than clipped.
5. As a deck author, I want Hidden Page, Draft Page, Overflowing Page, and Page Position to behave the same for the new layouts, so that the sharing workflow is unchanged.
6. As a new user, I want a fictional demo deck in the `observatory` theme using the four new layouts, so that I can try the language without private content.
7. As a maintainer, I want the prototype entry removed after the last slice and the decision captured in docs, so that two implementations do not drift.
8. As a maintainer, I want the Stage context to carry typed facts before the theme is added to it, so that the theme does not join the existing display-string sentinels.

## Implementation Decisions

### Prefactor: Stage context as typed facts

Before the theme lands, the Stage context Module is deepened as described in architecture-deepening candidate 4: it returns typed facts (hidden, Page Position and total or none, whether the page number is drawn, Frame Label, document id) instead of the `"Hidden"` and `""` string sentinels, and the page-number policy (deck default, per-page override, HTML Page default, Two-column and Hidden exclusions, template retention) lives in that one module. Preview, Copy, and batch capture build the context through the same function. Theme and Deck Title are then added to the same context as further facts. Author-visible behaviour does not change in this step.

### Deck model

| Field   | Type                         | Rule                                                                                        |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------- |
| `theme` | `"default" \| "observatory"` | Optional. Omitted reads as `default`. Any other value rejects the Deck; no silent fallback. |
| `title` | `string`                     | Optional Deck Title. Trimmed-empty reads as absent. Shown in the Editorial Frame footer.    |

Both are kept by the Deck Template operation and by the Weekly Series flow. Save writes the parsed value as-is: an omitted theme stays omitted and an explicit `default` is preserved, so existing files do not change on save.

### Theme tokens and styles

- The Stage stylesheet defines role tokens on the Stage root for `default`: `--paper`, `--ink`, `--mute`, `--line`, `--accent`, `--accent-deep`, `--accent-soft`, `--accent-wash`, `--ok`, `--ok-ink`, `--ok-wash`, `--warn`, `--warn-ink`. `--blue`, `--blue-deep`, `--blue-soft`, `--blue-wash` become aliases of the accent roles. Five chart series roles `--chart-1` … `--chart-5` carry today's default series colours. Values for `default` are today's values.
- Chart series colours: a series without an explicit `color` takes the theme's chart role for its index (cycling); an explicit `series.color` is kept verbatim in every theme. The stack computation stops embedding hex values for defaults and resolves them through the theme roles.
- A separate theme stylesheet overrides the roles under the Stage root carrying `data-theme="observatory"` with the prototype palette (ink `#20384b`, mute `#5a6e7e`, line `#d6dee4`, accent `#287b78`, accent-deep `#1f5f5c`, accent-soft `#b9d9d6`, accent-wash `#e7f2f1`, ok-ink `#1f7a52`, warn-ink `#8a5508`; `ok`, `ok-wash`, `warn` chosen to keep 4.5:1 for text roles) and five chart series roles built from accent, accent-deep, accent-soft, ink, and mute so stacked bars stay distinguishable without colour alone (names remain in the legend). It declares `@font-face` for self-hosted Instrument Sans (400/700) and IBM Plex Mono (400/700); the OFL licence files live beside the font assets. Family stacks are `"Instrument Sans", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif` and `--mono: "IBM Plex Mono", "Noto Sans TC", monospace`.
- The Stage root receives `data-theme` from the Stage context in preview and in the capture adapter, never from display strings.
- Frame decorations specific to `observatory` (the `§ nn` index, the tick ruler, mono eyebrow and footer, the Overview lead block as a hairline frame with an accent top rule) are CSS on existing frame classes. No layout component branches on the theme.
- Class names are composed with the project's `cn()` helper or whole conditional strings; the Tailwind Prettier plugin strips leading spaces inside `className` template literals (prototype finding).

### Editorial Frame

- Header: eyebrow (fixed per layout, overridable where a layout declares `eyebrow`), Frame Label when the Deck has a period, headline from `title`.
- In `observatory`, the header prefixes the eyebrow with the zero-padded Page Position index (`§ 07`) when the page number is visible; hidden page numbers hide the index as well.
- Body: layout content.
- Boundary Note: optional slot between body and footer, separated by a hairline, rendered from page field `boundary`. It is written for one line but wraps when longer; it is never clamped or truncated, so a long note shrinks the body and the shared overflow gate blocks export when the page no longer fits. Any Editorial Frame layout may carry it: Overview, Evidence-backed Decision, Next Actions, Trend & Target, Closing, Side-by-side Comparison, Full-width Panel. Cover, HTML Page and Two-column do not.
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

In `observatory`, a Full-width Panel table shows a presentation-only row index (`01`, `02`, …) before the first data column. The index is rendering, not data: it is not part of `columns` or `rows`, it does not shift `referenceColumn`, and it is not shown in `default` or on Two-column tables, whose composition is unchanged.

**Table reference column** (shared by Two-column and Full-width Panel tables)

| Field             | Type     | Rule                                                                                                               |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `referenceColumn` | `number` | Optional on the table panel. Zero-based index into `columns`; a non-integer or out-of-range value rejects the Deck |

The reference column holds cross-references such as page numbers. It is rendered right-aligned, non-wrapping, in the accent colour, and in the mono face under `observatory`; it is not a completeness rule. The index always counts data columns only. The table panel editor offers a select (`None` or a column name); removing a column clears a `referenceColumn` that pointed at it and shifts a later one. Deck Template keeps it as panel structure, like `columns`.

All four layouts are supported pages for Page Position and batch export. Parser policy is unchanged: declared fields normalised, extra fields dropped, cardinality violations reject the Deck.

### Deck Template and Weekly Series

Creating from a template keeps layouts, order, `theme`, and Deck Title for every Deck.

For the four new layouts only: Cover keeps `byline` and clears `title` and `subtitle`; Closing keeps `closingLine` and clears `eyebrow`, `title`, and `takeaways`; Side-by-side Comparison clears `title`, both labels, points, `chosen`, and `tradeoff`; Full-width Panel keeps panel structure (columns, `referenceColumn`, step and item counts) under the existing Two-column panel rules. `boundary` is cleared on every layout that carries it.

Existing layouts keep their own retention rules unchanged: the [Editorial Layout Family](editorial-layout-family.md) clone rules (workstream, metric label, and unit retained) and the [Trend & Target](trend-target-and-next-actions-rows.md) rules (metric, target, dated history, and Measurement Context retained).

### Workshop

- Toolbar: a Deck-level theme select (`Default`, `Observatory`) and a Deck Title input, next to the page-number select. Both edit the Editing Session like other Deck-level fields and mark the session dirty.
- Add Page gains Cover, Closing, Side-by-side Comparison, and Full-width Panel (with the panel-kind choice reused from Two-column).
- Each new layout has its own editor module dispatched by the page editor form; the Boundary Note field lives in the shared editorial page chrome. No schema-driven form engine.
- Editors keep the existing readiness path conventions; Export Readiness copy lists missing required fields by name.

### Export

No change to the Export gate contract. The capture library embeds the `@font-face` fonts in use; the browser capture test asserts the output contains the two `observatory` families when the page uses them and none under `default`.

### Demo Deck Set

The Demo Deck Set ships one Deck per Deck Theme, and each Deck shows every Structured Layout and an HTML Page (#64). `demo-default` (Deck Title `Demo · Default`) demonstrates a weekly report under `default` with twelve pages: Cover, Overview, Evidence-backed Decision, Side-by-side Comparison, two Trend & Target pages (at-most; at-least ending in a Missing week), Two-column (chart), Full-width Panel (checklist), HTML Page, Next Actions in Columns and in Rows, and Closing. `demo-observatory` (Deck Title `Demo · Observatory`) is the fictional `observatory` pilot review with ten pages: Cover, Overview, Evidence-backed Decision, Side-by-side Comparison, Trend & Target, Two-column (flow), Full-width Panel (table), an HTML Page that only references colour roles and the `--blue*` aliases, Next Actions, and Closing. Together the two Decks show table, chart, flow, and checklist panels once each.

Naming and first-week workflow decisions (2026-11-08):

- JSON files and HTML resource folders use `demo-default` and `demo-observatory`. Page IDs, slide content, Deck Periods, and layouts stay unchanged.
- With no Weekly Series Deck in the store, **Create week** uses the currently selected, saved Deck as its template. The author enters a Monday manually; the new Deck uses that date as its ID and a Monday-to-Friday Deck Period. Existing Deck Template rules preserve the theme and structure, clear authored copy, and copy referenced HTML files unchanged.
- Once a Weekly Series Deck exists, **Create week** always uses the latest one, regardless of the current selection.
- Startup honours a Deck specified in the URL, then prefers the latest Weekly Series Deck, then the first ID in ascending order. A fresh install therefore opens `demo-default`.
- Seeding behaviour is unchanged. Existing local `decks/` stores are not renamed, merged, or migrated; only new stores receive the renamed Demo Deck Set.
- Verification covers first and subsequent week creation, startup selection, HTML resources, theme/layout coverage, and full PNG export of both Demo Decks.

## Testing Decisions

A good test exercises a seam a caller actually uses and asserts observable behaviour: parsed shapes, readiness verdicts, template results, rendered text and attributes, exported output. It does not assert CSS class names, private component structure, or helper call order. Red → Green → Refactor per vertical slice.

### Seams (confirmed with the author)

1. Deck parsing and the Deck Template operation: `theme`, Deck Title, each new layout's cardinalities, `boundary` acceptance only on Editorial Frame layouts, `referenceColumn` bounds, retention and clearing rules. Prior art: the parse-deck, cardinality, and deck-template unit tests.
2. Content readiness and export eligibility: the Content-complete rules above, including optional slots never blocking completeness, and an overlong Boundary Note blocked by the overflow gate. Prior art: the export-readiness and content-readiness-summary unit tests.
3. Stage context Module: typed facts including theme and Deck Title; Cover counted in Page Position with no page label. Prior art: the editorial-frame and page-lifecycle unit tests, rewritten away from string sentinels in the prefactor.
4. Editor modules for each new layout: add, move, remove within limits; chosen toggle; reference column select and its removal adjustment. Prior art: the overview-editor, next-actions, and chart/flow/checklist editor unit tests.
5. Browser: Playwright fixtures per new layout at min and max content, English, Chinese, and mixed, at 1280 × 720 in both themes, with overflow blocking; Overview and Trend & Target fixtures under `observatory`; a capture test for font embedding. Prior art: the existing per-layout e2e specs, the overflow detector harness, and the export-operation spec.

No new seams are introduced; seam 3 is deepened.

## Delivery slices

Sequential PRs; each must pass lint, format check, typecheck, Vitest, Playwright, and production build. Each slice is a vertical cut through schema, editor, renderer, readiness, export, tests, and docs.

### 0. Prefactor: Stage context typed facts

Candidate 4 from the architecture-deepening review; no author-visible change.

### 1. Deck Theme foundation

`theme` and Deck Title in the Deck model, parser, save, template and Weekly Series; role tokens and `--blue*` aliases; the `observatory` stylesheet with self-hosted fonts; theme through the Stage context; toolbar theme select and Deck Title input; Editorial Frame footer with Deck Title and `observatory` frame decorations; existing layouts including Two-column chart and table verified in both themes; chart series roles; font-embedding capture test; Deck JSON reference and Workshop architecture updated.

### 2. Boundary Note, Cover, Closing

`boundary` on Editorial Frame layouts with the frame slot and shared editor field; Cover and Closing end to end.

### 3. Side-by-side Comparison

The layout end to end, including the Tradeoff Callout and the chosen marker.

### 4. Full-width Panel, reference column, demo deck, retirement

The layout end to end; `referenceColumn` on table panels for both table layouts; the fictional demo deck; README, docs index, how-to updates; removal of the prototype entry and its script, with the prototype record pointing to the throwaway branch.

## Issue plan

Specification issue #57 references this document. Prefactor ticket #62 and implementation tickets #58, #59, #60, #61 match the slices and are its sub-issues. #58 is blocked by #62, #59 by #58, #60 by #59, #61 by #60 (native dependencies). All carry `ready-for-agent`.

## Out of Scope

- Author-defined colours or fonts in Deck JSON; per-page theme overrides.
- Bundled CJK fonts.
- Horizontal step strips and timelines, branching diagrams, the profile "story grid", layer stacks, a dark Cover variant, and appendix page labels such as `B1`. These stay HTML Pages or later Layout Variants.
- Re-composing existing Structured Layouts.
- Migrating existing hand-written HTML Pages.
- A third theme.

## Acceptance Criteria

- Opening any existing deck without `theme` renders identically to before the change; the format check and existing fixtures pass unchanged.
- A Deck with `theme: "observatory"` renders every Structured Layout and HTML Pages referencing `--blue*` in the new palette and fonts; PNG output embeds the Latin fonts.
- The four new layouts can be added, edited, saved, reloaded, cloned through a Deck Template, previewed, copied, and batch-exported with the shared Export gate; Draft, Overflowing, Hidden, and Page Position behaviour matches existing layouts.
- The fictional demo deck opens on a fresh install and exports all pages.
- GLOSSARY.md terms match the implemented behaviour; the Deck JSON reference documents `theme`, `title`, `boundary`, `referenceColumn`, and the four layouts.

## Further Notes

- The prototype that settled the visual direction lives on the throwaway branch named in the prototype record; its stylesheet for variant B is the starting point for the `observatory` stylesheet, rewritten from fixed pixels to the Stage's container units.
- Review findings after the first publication were folded in: the reference column contract, the scoping of template clearing to the new layouts, chart series colours following the theme, the Boundary Note's overflow rule, and the presentation-only row index.
- Appendix labels (`B1`) and a dark Cover are the most likely follow-ups; both should start as Layout Variants, not new layouts.
