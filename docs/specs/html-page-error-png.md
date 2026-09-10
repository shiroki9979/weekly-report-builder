# HTML Page error-PNG behavior

建立日期：2026-09-10  
最後更新：2026-09-10  
狀態：draft（policy pending triage; do not mark `ready-for-agent` until policy is confirmed）

Follow-up to [`docs/specs/html-page-layout.md`](html-page-layout.md) and the non-goal in [`docs/specs/editorial-layout-family.md`](editorial-layout-family.md): Editorial Layout Family production adoption does not change HTML Page fetch, sanitization, timeout, or capture-failure handling.

This spec inventories current Preview / Copy / batch behavior, then proposes a policy for a later implementation ticket. **This document does not authorize runtime changes.**

---

## Problem Statement

HTML Pages skip Structured Layout completeness and overflow gates. Preview, Copy, and batch still fetch, sanitize, wait for settle, and capture. Failures today are inconsistent: a 404 becomes an error PNG and other pages continue; a hung fetch aborts the whole batch; sanitization never throws; `html-to-image` throws fail the operation.

Authors cannot tell from docs whether a broken HTML Page should appear as a warning slide in the team deck, be skipped with a Page ID reason, or stop export.

## Inventory (current, 2026-09-10)

Seams: `src/lib/html-page.ts`, `src/components/stage/html-slide.tsx`, `src/hooks/use-stage-export.ts` (`waitForSlideSettled`, 3000 ms), `src/lib/week-export.ts`, `src/lib/export-readiness.ts` (`assessExportEligibility` lets HTML through), `src/lib/stage-capture.ts`.

HTML Pages are **not** Overflowing Pages. `assessExportEligibility` returns `{ eligible: true }` without capture. Copy and batch still render the page, wait until `data-status` is not `loading`, then capture.

| Failure                                 | Preview                                                                                                                                       | Copy                                                                                       | Batch                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Invalid `htmlFile` (path, `..`, empty)  | Immediate `data-status="error"` warning. No fetch.                                                                                            | Captures the warning as PNG.                                                               | Captures the warning as PNG; remaining pages continue.                   |
| Fetch non-OK (e.g. 404)                 | `data-status="error"` warning with `Failed to load HTML file: {file} (status {n})`.                                                           | Same: waits for error, captures warning PNG.                                               | Same: warning PNG; remaining pages continue.                             |
| Fetch hang (never settles)              | Loading placeholder until unmount.                                                                                                            | After 3000 ms throws `Timed out waiting for HTML slide to load`; `clipboardError`; no PNG. | Same throw becomes `exportError`; **remaining pages are not processed**. |
| Abort on unmount                        | Ignored (`signal.aborted`).                                                                                                                   | Not a user-facing path.                                                                    | Not a user-facing path.                                                  |
| Sanitization                            | `sanitizeHtmlFragment` does not throw. Scripts/`on*`/dangerous tags stripped; empty or style-only input can yield `""`. Preview may be blank. | Captures whatever remains (including empty).                                               | Same.                                                                    |
| Capture library throw (`html-to-image`) | N/A                                                                                                                                           | `clipboardError`; no skip list.                                                            | `exportError`; remaining pages are not processed.                        |

Tests that lock this inventory:

- `tests/unit/html-slide.test.tsx`: invalid path and 404 → error status.
- `tests/unit/use-stage-export.test.tsx`: 404 waits for error then captures the warning; hang → `exportError` timeout, `captureStageToPng` not called.
- `tests/unit/html-page.test.ts`: sanitizer strips executable content and does not throw.

## Domain language

Use existing glossary: HTML Page, Copy, batch export, Export Readiness, Overflowing Page (HTML is **not** one). Do not call a captured warning slide an Overflowing Page.

Proposed HTML-only terms for the follow-up (add to `CONTEXT.md` only after triage confirms):

**HTML Load Failure**:
Fetch non-OK, invalid `htmlFile`, or settle timeout before `data-status` leaves `loading`.

**Error PNG**:
A PNG of the production `stage-warning` (or equivalent) captured instead of the HTML fragment.

## Goals

- One documented policy per failure for Preview (advisory), Copy, and batch.
- Batch must not abort remaining eligible pages because one HTML Page hung or failed capture, unless triage explicitly keeps fail-the-operation.
- Reason codes and fixtures so a later ticket can implement without rediscovering this inventory.
- No change to Structured Layout Export Readiness, overflow measurement, or Editorial Layout Family behavior.

## Non-goals

- Changing fetch, sanitize, timeout, or capture in the same PR as this spec.
- Applying Structured Layout completeness or overflow gates to HTML Pages.
- Online HTML editing, relative images, or external CSS files.
- Replacing DOMPurify or `html-to-image`.

## Proposed policy (pending triage)

Recommendations below are the default if triage accepts them. Until then, **keep current runtime**.

### 1. Invalid `htmlFile` and fetch non-OK

**Keep Error PNG** for Preview (warning), Copy, and batch.

Rationale: `html-page-layout.md` already requires an English stage warning, not a silent blank. Capturing that warning matches Copy/batch with Preview and is locked by existing tests.

Do **not** skip these pages in batch. Do **not** introduce a new Export Issue for 404.

### 2. Fetch hang (settle timeout)

**Change (follow-up):** treat as ineligible, do not capture a loading placeholder.

- Copy: block; show a structured reason (not a raw thrown `exportError` string only).
- Batch: skip the page with Page ID + reason; **continue** remaining pages.
- Preview: keep the loading placeholder; optional advisory after the same timeout is out of scope unless triage asks for it.

Timeout budget: keep **3000 ms** for HTML settle (distinct from overflow measurement’s 5000 ms). Document both constants in the implementation ticket.

### 3. Sanitization

**Keep non-throwing.** Empty or fully stripped fragments remain eligible HTML Pages. No Error PNG solely because sanitization removed scripts.

If sanitization ever threw, that would be a bug; the follow-up must not add a throw path.

### 4. Capture library failure

**Change (follow-up):** align with Structured Layout measurement-failed: Copy blocks; batch skips and continues. Do not abort the whole batch.

HTML still skips overflow measurement. This only covers `captureStageToPng` throwing after the slide has settled.

### Policy summary

| Failure            | Preview              | Copy              | Batch (proposed)                |
| ------------------ | -------------------- | ----------------- | ------------------------------- |
| Invalid `htmlFile` | Warning              | Error PNG         | Error PNG, continue             |
| Fetch non-OK       | Warning              | Error PNG         | Error PNG, continue             |
| Fetch hang         | Loading (unchanged)  | Block, no PNG     | Skip + continue; no loading PNG |
| Sanitize           | Blank or stripped OK | Capture remainder | Capture remainder               |
| Capture throw      | N/A                  | Block             | Skip + continue                 |

## Reason codes

Do not overload `overflow`. HTML remains outside overflow.

For hang and capture-library failure only (404 stays Error PNG, no skip reason):

| Code                 | When                                             | Message (English)                                                                                                                                         |
| -------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `measurement-failed` | HTML settle timeout or `captureStageToPng` throw | Reuse existing code. Timeout: `Timed out waiting for HTML slide to load`. Capture throw: existing `Failed to capture stage as PNG` or the thrown message. |

Triage alternative: a dedicated `html-load-failed` code. Prefer **reusing `measurement-failed`** so Copy/batch skip formatting stays one list. If reused, implementation must still skip HTML hang **before** calling `html-to-image`, and must not call overflow measurement.

404 / invalid path: **no** Export Issue; they produce Error PNGs.

## Module design

Keep HTML out of `assessContentReadiness`. Follow-up should:

1. Keep `waitForSlideSettled` as the HTML settle seam (3 s).
2. On timeout, return a `CaptureAssessment`-compatible `{ status: "measurement-failed", message }` (or throw a typed error that export orchestration maps to `measurement-failed`) instead of failing `exportVisiblePages` entirely.
3. Catch `capture` throws per page in `exportVisiblePages` / Copy, map to skip / block, continue batch.
4. Leave `preloadHtmlFragment` and `sanitizeHtmlFragment` signatures unchanged.

Copy and batch must share this mapping; Preview stays advisory.

## Testing Decisions (follow-up implementation)

Vitest, no Playwright required unless hang-in-browser is added later.

1. Invalid `htmlFile` and 404: Copy and batch still capture warning PNG; other pages continue. (Keep existing tests.)
2. Hung fetch: Copy sets `clipboardError` with the timeout message / `measurement-failed`; `captureStageToPng` not called. Batch skips that Page ID, downloads later eligible pages, no `exportError`.
3. Sanitizer still does not throw; empty fragment still captured.
4. `capture` rejection on an HTML Page: batch skip + continue; Copy blocks.
5. Structured Layout overflow/draft skip tests remain green.

Fixtures: missing `htmlFile`, in-flight never-resolving `fetch`, existing 404 mock, capture mock that rejects.

## Delivery

One follow-up ticket after triage confirms the table in **Proposed policy**. That ticket may be labelled `ready-for-agent` only after policy is confirmed. This spec stays `needs-triage` until then.

## Open questions for triage

1. Confirm Error PNG for 404 vs skip-with-reason (recommendation: keep Error PNG).
2. Confirm hang and capture-throw skip remaining pages instead of failing the operation (recommendation: skip).
3. Reuse `measurement-failed` vs add `html-load-failed` (recommendation: reuse).
4. Whether Preview should stop showing a spinner after 3 s (recommendation: no, out of scope).

## Related

- [HTML 全幅頁](html-page-layout.md)
- [Editorial Layout Family production adoption](editorial-layout-family.md)
- [工坊架構](../explanation/workshop-architecture.md)
