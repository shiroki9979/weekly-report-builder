# weekly-report-builder

Personal weekly-report workshop: edit the week in a form, preview slides at 16:9, export PNGs, and paste them into the team’s shared deck. Solo use only.

Not a presenter, not multi-user, not a CMS, and not a replacement for the team deck.

## Status

- **Scaffold**: Vite + React + shadcn (`base-nova`) workshop shell is in place (edit placeholder left, 16:9 stage right).
- **Complete**: Tickets 01–07 — workshop authoring, all v1 panels, clone week, PNG export and clipboard.

Agent setup: [AGENTS.md](AGENTS.md).

Documentation (Diátaxis): [docs/](docs/README.md).

## Development

```bash
pnpm install
pnpm dev
```

Also: `pnpm build`, `pnpm lint`, `pnpm test`

Week files: `weeks/YYYY-MM-DD.json` (Monday date as filename).

A disposable layout-family prototype is at `/prototype.html` while `pnpm dev` is running. It is not linked from the workshop. See [Review the layout prototype](docs/how-to/review-layout-prototype.md).

## Architecture

| Area                                                | Stack                                                   |
| --------------------------------------------------- | ------------------------------------------------------- |
| Workshop chrome (editor, sidebar, resizable panels) | shadcn                                                  |
| 16:9 preview stage                                  | `src/styles/stage.css` tokens — no shadcn on the canvas |

## Language

Workshop UI and in-app strings are **English**. Slide copy in `weeks/*.json` is user-authored and may be any language.

## Workflow (when complete)

1. Open the week (`weeks/YYYY-MM-DD.json`; new weeks clone the previous structure with cleared copy).
2. Fill each page: title, three left bullets, right panel (`chart` / `table` / `flow` / `checklist`).
3. Hide pages you will not paste into the team deck.
4. Export visible pages as PNG or copy to the clipboard.

## Out of scope

Login, sharing, drag-layout on the canvas, presenting from this app, localStorage as the sole data store. The `fields` panel kind is spec-only in v1.
