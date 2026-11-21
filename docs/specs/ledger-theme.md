# Ledger Deck Theme

Status: Implemented ([#66](https://github.com/shiroki9979/weekly-report-builder/issues/66)). Decisions confirmed with the author on 2026-11-20.

Created: 2026-11-20

Upstream: [ADR-0002](../adr/0002-deck-theme.md), [Deck Theme and the Observatory layouts](deck-theme-and-observatory-layouts.md), [HTML Page layout](html-page-layout.md). Prerequisites: Two-column as an Editorial Frame ([#67](https://github.com/shiroki9979/weekly-report-builder/issues/67)), the app-drawn HTML Page footer ([#68](https://github.com/shiroki9979/weekly-report-builder/issues/68)), and `--mono` as a cross-theme role ([#69](https://github.com/shiroki9979/weekly-report-builder/issues/69)). Domain terms follow [GLOSSARY.md](../../GLOSSARY.md).

## Problem

From 2026-11-09 the Weekly Series Deck mixed two visual languages. HTML Pages (Gantt charts, batch notes, measurement logs) followed the author's Evidence Ledger style: paper-white ground, graphite text, one signal blue, monospace dates and counts, a date row in the header, and a source note with a stamp in the footer. Structured Layouts used the `default` theme: Arial with system CJK fonts and the presentation-template blue. Turning pages switched fonts, date formats, and footers back and forth. Each HTML Page also embedded a base64 monospace font and hard-coded its colours.

ADR-0002 says a new language becomes a new theme rather than open fields, so `ledger` is a third Deck Theme. The parts that are not specific to this theme are in #67, #68, and #69.

## Theme list

- `DECK_THEMES` includes `ledger`; the Workshop toolbar labels it **Ledger**.
- An unknown theme name still rejects the whole Deck.

## Tokens

`ledger` keeps the `default` values except for the roles below. ADR-0002 makes contrast the theme's responsibility, so every text role keeps 4.5:1 on the surfaces it sits on.

| Role            | `ledger`  | `default` | Why                                                                                                                                       |
| --------------- | --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--line`        | `#c7d9e9` | `#d0d7de` | Blue-tinted hairlines, as in the Evidence Ledger pages.                                                                                   |
| `--accent-wash` | `#dbe8f4` | `#eef4fa` | Stronger wash for the Overview lead, verdict, and flow boxes.                                                                             |
| `--ok-ink`      | `#1c704b` | `#1f7a52` | On the darker wash, `#1f7a52` reaches only 4.25:1, so a positive Status Signal in the Overview lead would fail. `#1c704b` reaches 4.86:1. |
| `--mono`        | see below | system    | Self-hosted IBM Plex Mono.                                                                                                                |

All other roles (`--paper`, `--ink`, `--mute`, `--accent`, `--accent-deep`, `--accent-soft`, `--ok`, `--ok-wash`, `--warn`, `--warn-ink`, and the chart roles) are the `default` values.

- `--mute` stays `#5c5c5c` (6.7:1 on white). The Evidence Ledger pages used `#7a7a7a`, which reaches only 4.3:1.
- `--ok*` and `--warn*` do not become the single signal blue: the three Status Signal tones must stay distinguishable.
- `--ok-ink` was not in the token table confirmed on 2026-11-20. The change keeps the Status Signal contrast check, which is an acceptance criterion, passing under `ledger`.

## Fonts

- Body and headings keep the `default` stack: `Arial, "PingFang TC", "Microsoft JhengHei", sans-serif`.
- `--mono` is `"IBM Plex Mono", "PingFang TC", "Microsoft JhengHei", monospace`. CJK falls back to the same system fonts as the body text.
- IBM Plex Mono reuses the font files and OFL licence already in `src/assets/fonts/`. No font file is added. The `@font-face` rules live in `src/styles/ibm-plex-mono.css`, which `observatory` and `ledger` share, so a capture never embeds the same face twice.
- PNG export embeds IBM Plex Mono only when the page uses it. A `ledger` HTML Page that does not use `var(--mono)` and has no footer embeds no self-hosted font.
- LedgerMono is not used: its source and licence could not be confirmed.

## Frame decoration

Only these Editorial Frame elements switch to `var(--mono)`:

- eyebrow
- Frame Label
- workstream (Overview)
- status (Overview Status Signal)
- footer: Deck Title and Page Position, on Editorial Frame pages and on HTML Pages with the footer on
- Boundary Note

Nothing else changes. `ledger` does not use the `observatory` decorations: no `§ nn` page index, tick ruler, zero-padded numbers, or hairline Lead Outcome frame. Following ADR-0002, the compositions do not change.

The Frame Label keeps the ISO format `2026-11-16 — 2026-11-20`. Only its font changes; it does not switch to `2026.11.16 — 11.20` under this theme.

No separate design-philosophy document and no prototype: `ledger` reuses the `default` colours and compositions.

## Demo Deck Set

`demo/demo-ledger.json` (Deck Title `Demo · Ledger`) is a fictional Tidewater data platform weekly report with ten pages: Cover, Overview, Evidence-backed Decision, Side-by-side Comparison, Trend & Target, Two-column (table), Full-width Panel (chart), HTML Page, Next Actions (Rows), and Closing.

Its HTML Page, `demo/demo-ledger/schedule.html`, is a batch schedule in the Evidence Ledger style. It:

- colours only through Stage roles, with no literal colour values
- sets no `font-family` except `var(--mono)` for dates and counts, and embeds no font
- has an ISO date row in its header and a "Source: …" note in `var(--mute)`
- turns on the app-drawn footer (`showPageNumber: true`) and keeps the bottom `8cqw` clear

`demo-deck-set.test.ts` derives the expected Decks from `DECK_THEMES`, so a new theme without a demo Deck fails the test.

## Existing Decks and switching

- Weekly Series Decks before 2026-11-09 keep their theme. `ledger` starts with the next report.
- Create the first `ledger` report with **Create week** as usual, then switch it with the toolbar's **Theme** menu and save. Later weeks inherit the latest Deck's theme.

## Report generator

The weekly report generator is not in this repo. Its contract is in #68, #69, and [HTML Page layout](html-page-layout.md):

- The header date uses ISO format.
- The fragment draws no footer of its own; the JSON sets `showPageNumber: true`.
- Colours use the role tokens. Fonts are inherited, monospace uses `var(--mono)`, and no font is embedded.
- The "Source: …" note stays inside the HTML, in `var(--mute)`.

## Verification

- `deck-theme.spec` and `editorial-footer-overlap.spec` iterate `DECK_THEMES`. Per-theme expectations live in a `Record<DeckTheme, …>`, so a new theme must declare them. Under `ledger` they cover the role colours, the Status Signal contrast, the mono frame elements, and font embedding.
- `demo-deck-set.spec` exports every `demo-ledger` page at 1280 × 720.
- `parse-deck.test` accepts `ledger` and still rejects unknown names.
- Manual check, not automated: export PNGs of a Deck that mixes Structured Layouts and HTML Pages before and after switching it to `ledger`, and compare the Frame Label, the monospace text, and the footer. Screenshot baselines were rejected because font rendering differs between machines.

## Out of scope

- Changing the report generator.
- Migrating old Weekly Series Decks to `ledger`.
- A screenshot baseline mechanism.
- Changing any Structured Layout composition.
