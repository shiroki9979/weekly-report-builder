# Spec: weekly workshop

Personal weekly-report workshop. Form-edit a week, preview 16:9, export PNG into the team PPT. Solo. Not a presenter, not multi-user, not a CMS.

## Decisions

- One `layout`: `two-column` (three left items + right panel). New layouts are a new `layout` string; unknown layouts skip with a warning.
- v1 `panel.kind`: `chart` | `table` | `flow` | `checklist`.
- `fields` (label + value rows, for mock UI) is specified below and **not built in v1**.
- Workshop chrome: shadcn. 16:9 canvas: existing CSS tokens (`--blue` `#2e75b6` and siblings), no shadcn on the stage.
- Week file: `weeks/YYYY-MM-DD.json` (Monday). Body holds `start` / `end`, pages, hidden flag, notes.
- New week: clone previous structure (page count, panel kinds, hidden); clear titles and body.
- Chart data: generic categories + named series. Commits chart is an example, not a layout.
- Export: per visible page PNG download (`YYYY-MM-DD-p02.png`) and copy-to-clipboard; clipboard failure still allows download.
- **Language**: workshop chrome and in-app UI strings are English; slide copy in `weeks/*.json` is user-authored and may be any language.

## Deferred: `fields` panel

Not v1. When added, `panel.kind` becomes `fields` with `{ rows: { label: string, value: string }[] }`. Render as stacked labeled values on the right card (download-archive mock). Until then, approximate with `table` or `flow`.

## Out of scope

Login, sharing, canvas drag-layout, presenting from the app, localStorage as sole source, replacing the team PPT.
