# HTML Page export failure policy

建立日期：2026-09-10  
最後更新：2026-09-27

狀態：implemented（Q1–Q11 recorded; #32–#35 delivered）

Follow-up to [`docs/specs/html-page-layout.md`](html-page-layout.md) and the non-goal in [`docs/specs/editorial-layout-family.md`](editorial-layout-family.md): Editorial Layout Family production adoption does not change HTML Page fetch, sanitization, timeout, or capture-failure handling.

This spec records the 2026-09-10 baseline and decisions confirmed during the Export gate module design interview on 2026-09-27. The shared export flow, failure policy, operation snapshot, and partial-result summary are implemented.

---

## Problem Statement

HTML Pages skip Structured Layout completeness and overflow gates. Preview, Copy, and batch fetch, sanitize, wait for settle, and capture. At the 2026-09-10 baseline, a 404 became an error PNG and other pages continued; a hung fetch aborted the whole batch; sanitization did not throw; `html-to-image` failures stopped the operation.

The confirmed policy blocks individual copy of an HTML Load Failure and skips it in batch export, without producing a warning PNG. Page failures and operation failures need distinct handling so a failed page does not discard previously accumulated results.

## Historical inventory (2026-09-10 baseline)

Baseline seams: `src/lib/html-page.ts`, `src/components/stage/html-slide.tsx`, `src/hooks/use-stage-export.ts` (`waitForSlideSettled`, 3000 ms), `src/lib/week-export.ts`, `src/lib/export-readiness.ts` (`assessExportEligibility` lets HTML through), `src/lib/stage-capture.ts`.

HTML Pages are **not** Overflowing Pages. `assessExportEligibility` returns `{ eligible: true }` without capture. Copy and batch still render the page, wait until `data-status` is not `loading`, then capture.

| Failure                                 | Preview                                                                                                                                       | Copy                                                                                       | Batch                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Invalid `htmlFile` (path, `..`, empty)  | Immediate `data-status="error"` warning. No fetch.                                                                                            | Captures the warning as PNG.                                                               | Captures the warning as PNG; remaining pages continue.                   |
| Fetch non-OK (e.g. 404)                 | `data-status="error"` warning with `Failed to load HTML file: {file} (status {n})`.                                                           | Same: waits for error, captures warning PNG.                                               | Same: warning PNG; remaining pages continue.                             |
| Fetch hang (never settles)              | Loading placeholder until unmount.                                                                                                            | After 3000 ms throws `Timed out waiting for HTML slide to load`; `clipboardError`; no PNG. | Same throw becomes `exportError`; **remaining pages are not processed**. |
| Abort on unmount                        | Ignored (`signal.aborted`).                                                                                                                   | Not a user-facing path.                                                                    | Not a user-facing path.                                                  |
| Sanitization                            | `sanitizeHtmlFragment` does not throw. Scripts/`on*`/dangerous tags stripped; empty or style-only input can yield `""`. Preview may be blank. | Captures whatever remains (including empty).                                               | Same.                                                                    |
| Capture library throw (`html-to-image`) | N/A                                                                                                                                           | `clipboardError`; no skip list.                                                            | `exportError`; remaining pages are not processed.                        |

Historical tests that locked this inventory before implementation:

- `tests/unit/html-slide.test.tsx`: invalid path and 404 → error status.
- `tests/unit/use-stage-export.test.tsx`: 404 waits for error then captures the warning; hang → `exportError` timeout, `captureStageToPng` not called.
- `tests/unit/html-page.test.ts`: sanitizer strips executable content and does not throw.

## Domain language

Use [CONTEXT.md](../../CONTEXT.md): HTML Page, HTML Load Failure, Export Readiness, and Overflowing Page. HTML Load Failure is not overflow. A warning PNG describes the old output behavior, not a successful HTML Page export under the confirmed policy.

## Confirmed scope

- Combine the Export gate module refactor with failure-policy changes.
- Copy and batch share the complete single-page flow; a browser adapter owns capture host lifecycle, HTML settle handling, and capture root lookup.
- Keep Structured Layout content and overflow rules. HTML Pages remain outside those rules.
- Keep Preview behavior and sanitization behavior. Empty or fully stripped HTML remains capturable; it is not a load failure.
- Keep Hidden Page exclusion in batch selection; individual Copy may process Hidden Pages.
- Do not add HTML editing, replace DOMPurify or `html-to-image`, or expand into the other architecture candidates.

## Confirmed failure policy

These decisions replace the earlier proposed policy that retained warning PNGs and reused `measurement-failed` for unrelated failures.

| Situation                                                             | Copy                              | Batch                                       |
| --------------------------------------------------------------------- | --------------------------------- | ------------------------------------------- |
| Invalid HTML file reference, HTTP failure, or other HTML load failure | Block with reason; no warning PNG | Skip with Page ID and reason; continue      |
| HTML load timeout                                                     | Block with reason; no loading PNG | Skip with Page ID and reason; continue      |
| Structured Layout measurement failure                                 | Block with reason                 | Skip with Page ID and reason; continue      |
| PNG generation failure on either page type                            | Block with reason                 | Skip with Page ID and reason; continue      |
| Shared capture host or capture root missing                           | Stop and report operation failure | Stop; preserve previously processed results |
| Clipboard write or download-trigger exception                         | Report write failure              | Stop; preserve previously processed results |

Existing unsupported, Draft Page, invalid raw input, and Overflowing Page blocks remain. Page failures must not erase earlier skipped-page reasons. Stopping an operation cannot undo downloads already triggered.

Preview continues to show its existing error warning or loading placeholder. The export timeout does not impose a new timeout on Preview.

## Confirmed operation behavior

- Fix the Week Document, raw metric drafts, selected Copy page, reporting week, and page context at operation start.
- Editing and switching weeks remain available. Subsequent changes do not alter the running operation; results identify the original week.
- HTML assets are loaded when their page is processed, rather than included in the authoring-data snapshot.
- Copy and batch share one mutual-exclusion guard. Reject requests while busy; do not queue them. The UI also disables the export buttons while busy.
- The browser adapter renders from the operation snapshot rather than the currently selected week.

## Confirmed reason codes

| Code                 | Meaning                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `unsupported`        | Unsupported layout or panel                                            |
| `missing-content`    | Required authored content is missing                                   |
| `invalid-content`    | Authored content or raw metric input violates content rules            |
| `overflow`           | Structured Layout exceeds the canonical capture Stage                  |
| `html-load-failed`   | Invalid HTML file reference, failed load request, or HTML load timeout |
| `measurement-failed` | Actual Structured Layout measurement failure                           |
| `capture-failed`     | PNG generation rejection or timeout, for either page type              |

Missing measurement is an internal workflow state, not an actual measurement failure to expose or filter out at Copy/batch call sites. HTML Pages do not undergo Structured Layout measurement. Missing shared host/root and output-write exceptions are operation failures, distinct from the page issues above.

## Confirmed result presentation

- Show a compact summary for the original reporting week, with counts for downloads triggered, skipped pages, failed pages, and pages not attempted.
- List Page ID and reason for exceptions, rather than listing every successful page. Hidden Pages do not participate in the counts.
- Use wording such as `Downloads triggered`, not `Files saved`: the browser download adapter cannot verify file persistence.
- Preserve earlier outcomes when an operation stops. The stopped page and the reason for stopping remain visible alongside previous skipped-page reasons.
- Copy, batch, and editor summaries share individual reason wording. Each surface retains its own heading and context; batch adds Page IDs, while Copy identifies the target page and reporting week.
- Editor summaries remain content checks plus advisory preview measurements; sharing wording does not cause canonical capture or HTML loading in the editor.

## Confirmed timeout policy

| Phase                         | Limit    | Failure handling                                  |
| ----------------------------- | -------- | ------------------------------------------------- |
| HTML load                     | 3000 ms  | `html-load-failed`; block Copy or skip in batch   |
| Structured Layout measurement | 5000 ms  | `measurement-failed`; block Copy or skip in batch |
| PNG generation                | 15000 ms | `capture-failed`; block Copy or skip in batch     |

PNG's 15-second limit is an initial policy value, not a measured performance guarantee. It starts when PNG generation begins and does not include previous loading or measurement phases.

The screenshot library cannot guarantee complete cancellation. On timeout, isolate the old page, discard any late resolution or rejection, and continue batch without sending the late PNG to a download or clipboard sink. Late work must not mutate the next page's host, clear a newer operation's state, or release another operation's mutual-exclusion guard.

These limits do not impose new timeouts on Preview or clipboard writes. A clipboard write remains busy until the platform promise settles; disposal behavior is defined in the module design below. The phase limits are not a guarantee of a fixed total operation duration.

Capture preparation has a separate 5000 ms safety bound. If a background tab suppresses animation frames, the browser adapter proceeds with its committed DOM after at most 1000 ms; abort removes the temporary host. A stalled adapter that exceeds the safety bound stops the operation, and any session returned later is disposed without capture or output.

## Module design

The single-page gate and its browser adapter implement the confirmed behavior. The browser adapter owns a temporary React root for each prepared capture session, as selected in Q11.

### Shared single-page interface

Copy and batch call one DOM-independent single-page gate with the page, Stage context, and raw metric drafts from the operation snapshot. Its result distinguishes a captured PNG, a blocked page with structured issues, and an operation failure. A captured PNG is not yet a completed download or clipboard write.

The gate owns support/content checks, HTML versus Structured Layout policy, measurement assessment, and PNG generation sequencing. It reuses existing content rules and stops before rendering when content is invalid. Callers do not filter a synthetic `measurement-failed` issue to discover whether they should render.

The browser adapter prepares a page capture session and hides its DOM nodes, HTML status/error protocol, canonical root lookup, and disposal. The gate may measure or capture that prepared session; tests supply an in-memory fake at the same seam. HTML load failure is communicated explicitly rather than inferred by parsing English error text. No Week JSON schema change is needed.

Check shared host/root availability before measurement or PNG generation. A missing shared root must remain an operation failure even though the current low-level measurement helper reports a missing root as `measurement-failed`.

### Operation and output ownership

The operation controller owns the start snapshot, Copy/batch mutual exclusion, result state, and disposal on unmount. Batch selects non-hidden pages and sends captured PNGs to the existing download adapter; Copy sends one captured PNG to the existing clipboard adapter. Neither output flow rebuilds page eligibility rules.

Each request made while busy receives an explicit busy result without clearing or replacing the active operation's progress/result. Request queues, automatic retry, resume, and a new cancellation button are outside this scope. A new user-triggered operation takes a fresh snapshot.

Switching weeks does not dispose the active operation. Unmounting the owning Workshop does: abort owned HTML requests, release hosts, stop scheduling pages or output writes, and suppress late state updates. An output write already invoked cannot be undone. Timed-out page work must use a distinct session from subsequent work; its cleanup cannot touch the new session.

Snapshot both the selected Monday and the Week Document. Continue to obtain Stage context from the existing `createStagePageContext` using the snapshot; preserve current filename and HTML-resource date semantics. Resolving mismatched document dates versus selected Monday belongs to architecture candidate 4 and is excluded here.

### Browser host ownership

Use an **adapter-owned temporary React root**. Create an offscreen host for each prepared capture session, render the existing Stage renderer, then unmount and remove that host on disposal. The shell passes data and invokes commands; it supplies no capture ref, capture page, host JSX, or additional capture Provider.

Current Stage renderers have no React Provider dependency, and their CSS is available in the same document. The adapter must explicitly own commit and cleanup behavior; a new root does not inherit the application's StrictMode wrapper. Reuse `StageFrame`/`StageSlide`, the canonical capture dimensions, and the existing production capture-root data attribute. Copy/batch must not query DOM status or locate roots themselves.

The alternative was a Provider with an internal portal, preserving ancestry and lifecycle/context behavior in the application's React tree. It was not selected because it adds a required shell wrapper without satisfying a current Stage dependency. Revisit that trade-off only if a real Stage Provider dependency appears.

### Result accounting and wording

The terminal batch result assigns each non-hidden page exactly one outcome:

- Download triggered: the download adapter returned without throwing.
- Skipped: the gate returned page issues, including HTML load, measurement, and PNG generation failure.
- Failed: the page being processed when an operation-level failure occurred.
- Not attempted: remaining pages after that stop.

These counts sum to the snapshot's non-hidden page count. Preserve Page IDs and structured reasons for skipped/failed pages, plus the stop reason. A shared operation failure before any page begins has no failed page; all selected pages remain not attempted.

Keep only the current or most recent operation result, labelled with its source week; a new accepted operation replaces it. A history screen and complete per-page success table are outside this scope. An all-skipped or empty selection must say that no downloads were triggered, rather than claiming files were exported. Copy reports success only after clipboard writing resolves.

One issue formatter supplies code/path/message wording. Copy and batch provide their own context; editor summaries retain their content-specific headings and consume the same individual reason wording. Keep existing content issue order; new runtime failures appear only when the operation reaches that phase.

## Acceptance scenarios to carry into implementation

1. Invalid HTML references, 404, network failure, and hung HTML loads block Copy and skip in batch without calling PNG capture; later pages continue.
2. Sanitization remains non-throwing; empty sanitized content is still capturable.
3. PNG generation rejection skips the page in batch and blocks Copy for HTML and Structured Layouts.
4. Missing shared capture infrastructure or a download-trigger exception stops batch while preserving previous results.
5. Hidden exclusion, Draft Page, invalid raw input, overflow, and genuine measurement-failure rules remain covered.
6. Editing, page reordering/deletion, and week switching during export do not change the operation's data or page context.
7. Overlapping Copy/batch requests do not overwrite the active capture host or enqueue work.
8. PNG generation exceeding 15 seconds skips/blocks with `capture-failed`; a subsequent late resolve/reject neither writes output nor changes the next page's host or operation state.
9. Summary counts cover all and only non-hidden snapshot pages; an all-skipped or empty batch does not report successful file export.
10. Workshop unmount disposes hosts and owned HTML requests; late work does not schedule further pages or output writes. An already-invoked output write is not rolled back.
11. Shared wording preserves Page ID, field path, and actionable reason while editor summaries remain independent of capture execution.

### Validation plan

- Use Red → Green → Refactor vertical slices through the shared gate and operation interface. Fake capture sessions and output adapters cover phase failures, ordering, timeouts, result accounting, snapshot isolation, mutual exclusion, and late completion.
- Browser-adapter integration tests cover actual host creation/disposal, HTML loading/error/ready signals, and the canonical root contract. Existing HTML warning-PNG tests must change to assert block/skip and no capture.
- A focused Playwright check covers a successful real PNG, Structured Layout fit/overflow, HTML failure with batch continuation, and editing/week switching while an operation uses its original context. This exercises browser ownership and layout behavior that a DOM-free fake cannot validate.
- Run the affected unit/integration tests, typecheck, lint, production build, and focused browser checks.

## Delivery status

Q1–Q11 are recorded and the design interview has no remaining open decisions. The complete spec is published as [#31](https://github.com/shiroki9979/weekly-report-builder/issues/31), labelled `ready-for-agent`.

The ticket breakdown and blocking edges are confirmed. All four implementation issues are published with `ready-for-agent`:

| Issue                                                                 | Delivers                                                                     | Blocked by |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------- |
| [#32](https://github.com/shiroki9979/weekly-report-builder/issues/32) | Behavior-preserving shared capture flow with adapter-owned roots             | None       |
| [#33](https://github.com/shiroki9979/weekly-report-builder/issues/33) | Recoverable page-failure policies, bounded capture waits, and shared reasons | #32        |
| [#34](https://github.com/shiroki9979/weekly-report-builder/issues/34) | Stable operation snapshots, mutual exclusion, and disposal                   | #32        |
| [#35](https://github.com/shiroki9979/weekly-report-builder/issues/35) | Partial-result summaries and combined regression coverage                    | #33, #34   |

Blocking edges use GitHub native issue dependencies and are also recorded in each ticket body. The implementation followed #32, then #33 and #34, then #35.

## Related

- [HTML 全幅頁](html-page-layout.md)
- [Editorial Layout Family production adoption](editorial-layout-family.md)
- [工坊架構](../explanation/workshop-architecture.md)
