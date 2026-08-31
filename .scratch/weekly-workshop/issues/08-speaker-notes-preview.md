# 08: Speaker notes cue in the 16:9 preview chrome

**Status:** ready-for-agent

**Blocked by:** 02: Edit a week in the workshop and save

---

## Problem Statement

While editing or rehearsing a week in the workshop, speaker notes only live in the left editor form. The author must look away from the 16:9 preview (or scroll the sidebar) to read the talking script for the current page. There is no cue card next to the slide for quick reading during edit or dry-run.

## Solution

Show a collapsible **Speaker notes** cue in the preview panel chrome—below the stage and above the page navigator. It displays the selected page’s `notes` as plain text (read-only). Empty notes still show the block with a placeholder. The cue never appears on the stage and is never included in PNG export.

## User Stories

1. As a weekly-report author, I want to read the current page’s speaker notes next to the 16:9 preview, so that I can check the script without leaving the slide.
2. As a weekly-report author, I want the cue to show the same `notes` text as the editor’s Speaker notes field, so that I have a single source of truth.
3. As a weekly-report author, I want the cue to be read-only, so that I keep editing in one place (the left form) and avoid dual-write confusion.
4. As a weekly-report author, I want the cue below the stage and above the page navigator, so that my eye path is slide → script → flip page.
5. As a weekly-report author, I want the cue never rendered on the stage canvas, so that exported PNGs stay slide-only for the team PPT.
6. As a weekly-report author, I want PNG download and clipboard copy to ignore the cue, so that export behavior does not change.
7. As a weekly-report author, I want the cue to be collapsible, so that I can reclaim vertical space when I only need the slide.
8. As a weekly-report author, I want the cue expanded by default, so that notes are visible without an extra click when I open the workshop.
9. As a weekly-report author, I want collapsing or expanding to persist across page changes within the session, so that I am not forced to re-open the cue on every page.
10. As a weekly-report author, I do not need the open/closed state written to storage, so that a fresh load always starts expanded and state stays simple.
11. As a weekly-report author, I want an empty or missing `notes` value to still show the cue block with `No speaker notes`, so that layout does not jump and I can see which pages lack a script.
12. As a weekly-report author, I want notes shown as plain text with line breaks preserved, so that what I typed in the textarea matches what I read in the cue.
13. As a weekly-report author, I want the cue labeled `Speaker notes`, so that it matches the editor field name.
14. As a weekly-report author, I want the whole disclosure row (chevron + title) to toggle open/closed, so that the control is easy to hit.
15. As a weekly-report author, I want the expanded body capped at roughly 7–8 lines (`max-h-36`) with internal scroll, so that long notes do not steal the stage.
16. As a weekly-report author, I want the cue to appear only when a week is loaded and a page is selected (same gate as the page navigator), so that loading and error states do not show an empty cue shell.
17. As a weekly-report author, I want changing the selected page to update the cue text to that page’s notes, so that page navigation and the cue stay in sync.
18. As a weekly-report author, I want editing notes in the left form (when edit mode is unlocked) to update the cue without a reload, so that preview stays live.
19. As a weekly-report author, I want the cue to remain usable when the editor sidebar is collapsed, so that I can rehearse with a preview-heavy layout.
20. As a weekly-report author, I want the cue implemented without a nested vertical ResizablePanel, so that height interaction stays a simple collapse plus scroll.
21. As a weekly-report author, I want workshop chrome (including the cue) to stay on shadcn/Tailwind and leave stage CSS tokens untouched, so that the canvas stays PPT-aligned.
22. As a developer agent, I want a single presentational seam for the cue, so that behavior can be tested without mounting the whole workshop shell.

## Implementation Decisions

- Add a presentational **Speaker notes cue** component in the workshop UI layer (name may be `SpeakerNotesCue` or equivalent). It receives the selected page’s `notes` (optional string) and manages local open/closed state (default open).
- Wire the cue into the preview `ResizablePanel` layout: after the stage region, before the page navigator. Pass `selectedPage.notes` when a page is selected.
- Render the cue only under the same condition used for the page navigator (week present / page available)—do not show during bare loading/error with no selected page.
- Disclosure: one clickable header row with chevron + label `Speaker notes`; expanded region below.
- Empty UI: if `notes` is missing, undefined, or whitespace-only, show the English placeholder `No speaker notes` inside the expanded body.
- Typography: plain text with preserved newlines (e.g. `whitespace-pre-wrap`). No markdown parsing.
- Height: fixed max height around `max-h-36` (~9rem / 7–8 lines) and overflow scroll when content exceeds that. Not a nested `ResizablePanel` / resize handle.
- Collapse state: React local state only; survive in-session page changes; reset to expanded on full remount / reload. No `sessionStorage` / `localStorage`.
- Read-only: no inputs in the cue; do not call week mutation helpers from the cue. Editor form remains the only notes editor; existing edit lock continues to apply only there.
- Data model: reuse existing optional `notes` on the page document. No new fields, no schema/API changes.
- Export: do not place the cue inside the stage frame or capture host; export seams stay unchanged.
- Language: cue chrome strings in English (`Speaker notes`, `No speaker notes`), consistent with workshop chrome policy. Notes body remains user-authored content from the week JSON.
- Docs: if a how-to mentions that speaker notes are only in the sidebar / not shown near preview, update that sentence so it matches the cue. Do not invent a new doc file unless necessary.

## Testing Decisions

- Good tests assert external behavior (visible text, toggle open/closed, empty placeholder), not CSS class names or internal state variable names.
- Primary module under test: the Speaker notes cue presentational component (single seam).
- Prior art: RTL unit tests for panel views (`checklist-panel`, `flow-panel`, `chart-panel`) and other workshop presentational components; use `@testing-library/react` + existing Vitest setup.
- Suggested cases:
  - Renders provided notes text (including multiline).
  - Missing/blank notes → `No speaker notes`.
  - Default expanded; clicking the disclosure hides the body; clicking again shows it again.
  - Accessible name / label includes `Speaker notes` (or equivalent role/name assertion).
- Do not require mounting the full workshop shell, weeks API, or export pipeline for this feature.
- No new tests for week-document parse, week-editor, or export unless accidentally regressing—those seams are unchanged.

## Out of Scope

- Editing notes from the cue; dual-bound forms; bypassing edit lock.
- New week JSON fields (`talkingPoints`, markdown notes, etc.).
- Nesting a vertical ResizablePanel for cue height.
- Persisting open/closed across reloads.
- Overlaying notes on the stage or including them in PNG / clipboard export.
- Presenter / slideshow mode, teleprompter scrolling, timers, or multi-user sharing.
- Markdown / rich text rendering of notes.
- Changing page navigator, keyboard page nav, or export controls beyond layout adjacency.

## Further Notes

- Grilling consensus (2026-08-31): notes-only source; edit + rehearsal; chrome-only; below stage / above navigator; collapsible default open; empty placeholder; display-only; max-h-36 scroll; not ResizablePanel; no storage; plain `pre-wrap`; label `Speaker notes`; full-row disclosure; show when week + selected page.
- Product framing: personal workshop for authoring and PNG into the team PPT—not a presenter app. The cue is a reading aid in chrome, not a second canvas.
- Acceptance checklist for implementers:
  - [ ] Cue shows selected page `notes` below stage, above page navigator
  - [ ] Collapsible, default expanded; in-session page changes keep open/closed
  - [ ] Empty notes → block still visible with `No speaker notes`
  - [ ] Read-only; left form remains the editor
  - [ ] Not on stage; export unchanged
  - [ ] Unit tests on the cue component seam
