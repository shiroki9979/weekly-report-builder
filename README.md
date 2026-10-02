# weekly-report-builder

Created: 2026-08-31
Last updated: 2026-09-29

Personal slide workshop: edit a deck in a form, preview slides at 16:9, export PNGs, and paste them into the team’s shared deck. The weekly report is the built-in workflow; other decks work the same way ([ADR-0001](docs/adr/0001-decouple-weekly-report-from-slide-core.md)). Solo use only.

Not a presenter, not multi-user, not a CMS, and not a replacement for the team deck.

## Status

- **Workshop**: edit a deck, preview at 16:9, export PNGs or copy one page to the clipboard.
- **Structured Layouts**: Two-column, Overview, Evidence-backed Decision, Next Actions (Rows or Columns), and Trend & Target (weekly or monthly), plus HTML Pages.

Agent setup: [AGENTS.md](AGENTS.md).

Documentation (Diátaxis): [docs/](docs/README.md).

## Development

```bash
pnpm install
pnpm dev
```

`pnpm install` runs `postinstall`, which copies the public **Demo Deck Set** from `demo/` into a local `decks/` store **only when `decks/` does not already exist**. If lifecycle scripts were skipped, run `pnpm seed:decks` (the same bootstrap). An existing `decks/` directory, including an empty one, is never merged or overwritten.

Upgrading from the `weeks/` store: `seed:decks` moves `weeks/` to `decks/` unchanged when `decks/` does not exist yet. If both exist, it stops and asks you to merge them yourself.

Also: `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`

`pnpm build` copies the local `decks/` store into `dist/decks/`. It does not seed. If `decks/` is missing, the build fails and tells you to run `pnpm seed:decks`.

Deck files: `decks/<id>.json`, where the id uses lowercase letters, digits, and hyphens. Weekly reports use their Monday date (`decks/2026-08-24.json`); other decks can use any id (`decks/q4-roadmap.json`). The Workshop lists every deck and opens the latest weekly one; demo Mondays can change and are not a required startup date.

**Privacy:** `demo/` is tracked, fictional, and public. `decks/` is the ignored runtime authoring store for your real decks. Ignoring `decks/` and dropping it from the current Git index does not rewrite history or delete objects in old commits.

If `decks/` exists but has no decks, remove that empty directory and run `pnpm seed:decks`. The Workshop will not create a first deck for you.

The public fictional Demo Deck Set opens in the Workshop on a fresh install. Pages 6–8 show Trend & Target with both target directions and a missing final week; pages 4 and 9 compare identical Next Actions Commitments in Columns and Rows. Page 10 shows longer Rows. See [Author Editorial Layouts](docs/how-to/author-editorial-layouts.md) and the [prototype decision record](docs/explanation/trend-target-layout-prototype.md).

## Architecture

| Area                                                | Stack                                                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Workshop chrome (editor, sidebar, resizable panels) | shadcn                                                                                                      |
| 16:9 preview stage                                  | `src/styles/stage.css` tokens, plus `editorial-layouts.css` for Editorial Layouts — no shadcn on the canvas |

## Language

Workshop UI and in-app strings are **English**. Slide copy in `decks/*.json` is user-authored and may be any language.

## Workflow

1. Open a deck. For the weekly report, create the new week from the latest one (`decks/YYYY-MM-DD.json`); it keeps the previous structure with cleared copy.
2. Fill each page. Two-column pages use three left items and a right panel (`chart` / `table` / `flow` / `checklist`). Structured Layout pages include Overview, Evidence-backed Decision, Next Actions, and Trend & Target — see [Author Editorial Layouts](docs/how-to/author-editorial-layouts.md).
3. Hide pages you will not paste into the team deck. Draft and Overflowing Pages cannot be copied or batch-exported until they are Content-complete and fit the 1280 × 720 capture Stage.
4. Review each page both as a spoken slide and as a standalone image: check the conclusion, dated evidence, status, source, and action checkpoints. Export ready pages as PNG or copy the current page to the clipboard.

## Out of scope

Login, sharing, drag-layout on the canvas, presenting from this app, localStorage as the sole data store. The `fields` panel kind is spec-only in v1.
