# weekly-report-builder

Personal weekly-report workshop: edit the week in a form, preview slides at 16:9, export PNGs, and paste them into the team’s shared deck. Solo use only.

Not a presenter, not multi-user, not a CMS, and not a replacement for the team deck.

## Status

- **Workshop**: edit a week, preview at 16:9, export PNGs or copy one page to the clipboard.
- **Structured Layouts**: Two-column, Weekly Overview, Evidence-backed Decision, Next Actions (Rows or Columns), and Trend & Target, plus HTML Pages.

Agent setup: [AGENTS.md](AGENTS.md).

Documentation (Diátaxis): [docs/](docs/README.md).

## Development

```bash
pnpm install
pnpm dev
```

`pnpm install` runs `postinstall`, which copies the public **Demo Week Set** from `demo/` into a local `weeks/` store **only when `weeks/` does not already exist**. If lifecycle scripts were skipped, run `pnpm seed:weeks` (the same bootstrap). An existing `weeks/` directory, including an empty one, is never merged or overwritten.

Also: `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`

`pnpm build` copies the local `weeks/` store into `dist/weeks/`. It does not seed. If `weeks/` is missing, the build fails and tells you to run `pnpm seed:weeks`.

Week files: `weeks/YYYY-MM-DD.json` (Monday date as filename). The Workshop lists available weeks and opens the latest; demo Mondays can change and are not a required startup date.

**Privacy:** `demo/` is tracked, fictional, and public. `weeks/` is the ignored runtime authoring store for your real reports. Ignoring `weeks/` and dropping it from the current Git index does not rewrite history or delete objects in old commits.

If `weeks/` exists but has no Week Documents, remove that empty directory and run `pnpm seed:weeks`. The Workshop will not create a first week for you.

The public fictional Demo Week Set opens in the Workshop on a fresh install. Pages 6–8 show Trend & Target with both target directions and a missing final week; pages 4 and 9 compare identical Next Actions Commitments in Columns and Rows. Page 10 shows mixed-language Rows. See [Author Editorial Layouts](docs/how-to/author-editorial-layouts.md) and the [prototype decision record](docs/explanation/trend-target-layout-prototype.md).

## Architecture

| Area                                                | Stack                                                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Workshop chrome (editor, sidebar, resizable panels) | shadcn                                                                                                      |
| 16:9 preview stage                                  | `src/styles/stage.css` tokens, plus `editorial-layouts.css` for Editorial Layouts — no shadcn on the canvas |

## Language

Workshop UI and in-app strings are **English**. Slide copy in `weeks/*.json` is user-authored and may be any language.

## Workflow

1. Open the latest week (`weeks/YYYY-MM-DD.json`; new weeks clone the previous structure with cleared copy).
2. Fill each page. Two-column pages use three left items and a right panel (`chart` / `table` / `flow` / `checklist`). Structured Layout pages include Weekly Overview, Evidence-backed Decision, Next Actions, and Trend & Target — see [Author Editorial Layouts](docs/how-to/author-editorial-layouts.md).
3. Hide pages you will not paste into the team deck. Draft and Overflowing Pages cannot be copied or batch-exported until they are Content-complete and fit the 1280 × 720 capture Stage.
4. Review each page both as a spoken slide and as a standalone image: check the conclusion, dated evidence, status, source, and action checkpoints. Export ready pages as PNG or copy the current page to the clipboard.

## Out of scope

Login, sharing, drag-layout on the canvas, presenting from this app, localStorage as the sole data store. The `fields` panel kind is spec-only in v1.
