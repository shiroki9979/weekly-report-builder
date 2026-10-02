# Trend & Target and Next Actions Rows

Status: Approved for implementation. Published as [specification #42](https://github.com/shiroki9979/weekly-report-builder/issues/42) with five implementation tickets; all carry `ready-for-agent`. Testing seams and ticket dependencies were confirmed on 2026-09-28. Implementation in [PR #48](https://github.com/shiroki9979/weekly-report-builder/pull/48).

Created: 2026-09-27
Last updated: 2026-10-03

## Problem Statement

Weekly report authors lack a Structured Layout for showing how one metric changes across weeks relative to a fixed target. A generic chart does not supply the latest-week conclusion, inclusive target comparison, missing-observation meaning, and visible measurement context needed for both spoken presentation and independent reading.

Next Actions currently uses side-by-side columns. Longer English, Chinese, or mixed-language Commitments separate an action from its verification checkpoint and leave little horizontal space for its intended outcome. Authors need an alternative composition without re-entering their content or changing older reports.

The disposable prototype demonstrated these compositions, but it is not connected to production page creation, authoring, persistence, weekly reuse, or PNG export.

## Solution

Add Trend & Target as a production Structured Layout with a full-width weekly line chart and a summary below. Authors enter one metric, two to twelve consecutive weekly positions, a fixed inclusive target, a conclusion, an interpretation, and visible Measurement Context. Measured, explicitly missing, and unfilled observations remain distinct. The last displayed week determines the summary, even when it has no measurement.

Add Rows as a manually selectable Layout Variant of Next Actions. New pages start in Rows; existing pages retain Columns. Both variants share the same ordered Commitments and preserve the author's selection on save and weekly cloning.

Integrate both directions into the existing Workshop, shared Stage renderer, Export Readiness, Copy, and batch export. Spoken presentation and independent reading have equal priority.

## User Stories

1. As a report author, I want to add a Trend & Target page in the Workshop, so that I can report a metric's weekly trajectory without writing HTML.
2. As a report reader, I want a conclusion-led headline above a full-width chart, so that I can identify the main point before reading the detail.
3. As a report author, I want one metric and one series per page, so that its evidence stays focused and readable.
4. As a report author, I want two to twelve consecutive weekly positions, so that the page covers a useful period without crowding the chart.
5. As a report author, I want to choose a starting Monday and enter values in weekly rows, so that dates advance consistently.
6. As a report author, I want measured, missing, and unfilled observations represented separately, so that unfinished work is not mistaken for unavailable data.
7. As a report author, I want to explicitly mark a week as having no observation, so that I can report a gap without inventing a zero.
8. As a report reader, I want missing weeks to retain their positions and break the line, so that the chart does not imply an unsupported change across a gap.
9. As a report author, I want signed finite values, including zero, so that the same layout can represent durations, rates, balances, or net changes.
10. As a report author, I want a fixed target with either an at-most or at-least direction, so that the desired outcome is explicit.
11. As a report reader, I want equality to count as meeting either inclusive target, so that target status follows the displayed operator.
12. As a report reader, I want the last displayed week's date, value, target, and status summarized, so that I do not have to infer the latest result from the chart alone.
13. As a report reader, I want an explicitly missing last week to show No data, so that an earlier measurement does not masquerade as this week's result.
14. As a report author, I want an unfilled last week to remain a draft, so that an incomplete report cannot be exported accidentally.
15. As a report author, I want unit and display-precision controls, so that the metric uses an appropriate visible format.
16. As a report reader, I want an exact comparison when rounding hides a meaningful difference from the target, so that the shown figures and status do not appear contradictory.
17. As a report reader, I want axes that include every measured value and the target, so that the plot never clips inconvenient evidence.
18. As a report reader, I want readable ticks and an explicit observed date range, so that small changes and year boundaries can be interpreted correctly.
19. As a report reader, I want a visible interpretation and Measurement Context, so that the slide remains understandable without a speaker.
20. As a report author, I want to save structurally valid drafts, so that I can complete the page over more than one authoring session.
21. As a report author, I want invalid numeric or date input to remain visible with an error, so that a previous valid value is not silently saved or exported instead.
22. As a report author, I want at least two measured observations required for export, so that an exported trend contains evidence of change or stability across weeks.
23. As a report author, I want Copy and batch export to use the same content rules and reporting-week context, so that a page has a consistent readiness decision.
24. As a report author, I want canonical Stage overflow to block output, so that authored content is not clipped or hidden in a PNG.
25. As a report author, I want batch export to skip an unready page and continue with ready pages, so that one unfinished page does not prevent useful output.
26. As a report author, I want export to use the operation's starting data and context, so that later edits or week switches do not alter a running capture.
27. As a report author, I want creating the next week to retain the metric, target, dated history, and Measurement Context, so that I do not re-enter stable information.
28. As a report author, I want a new week's conclusion and interpretation cleared, so that old conclusions are not reused without review.
29. As a report author, I want to append or prepend an unfilled week and trim either endpoint, so that I can maintain the displayed range while retained measurements keep their dates.
30. As a report author, I want the twelve-week limit enforced without automatic eviction, so that removing historical content remains my decision.
31. As a report author, I want to review and confirm re-dating an entered series, so that a changed starting date does not silently change what the observations mean.
32. As a report author, I want invalid pending input to stay attached to its page and week through range edits, so that another observation is never blocked or changed by stale input.
33. As a report author, I want new Next Actions pages to start in Rows, so that longer Commitments have enough horizontal space.
34. As a report author, I want existing Next Actions pages to retain Columns, so that opening an older report preserves its appearance.
35. As a report author, I want to switch between Rows and Columns while preserving all Commitments and their order, so that I can compare compositions without re-entering content.
36. As a report author, I want the selected Next Actions variant preserved on save and weekly cloning, so that my composition choice is remembered.
37. As a report reader, I want each row to align its sequence number, action and intended outcome, and verification checkpoint, so that I can connect a commitment with its evidence of completion.
38. As a report author, I want English, Chinese, and mixed-language content checked at presentation and reading sizes, so that the layout remains usable with real reporting text.
39. As a report reader, I want target status and missing observations identified by text and line treatment as well as color, so that their meaning does not depend on color perception.
40. As a report author, I want page numbering and Hidden Page behavior to remain consistent, so that the new layouts fit the existing sharing workflow.
41. As a new user, I want public demo examples and authoring guidance for both directions, so that I can try them without private authoring data.
42. As a maintainer, I want the selected designs delivered through the production renderer and the experiment archived separately, so that two competing implementations do not drift.

## Implementation Decisions

### Page contracts and compatibility

- Add the `trend-target` discriminator and integrate it with Structured Layout parsing, page matching, creation, editing, supported-page classification, Page Position, and the shared Stage renderer. A Next Actions variant stays within `next-actions`; it is not a separate Add Page type.
- A Trend page carries the common page metadata, conclusion title, metric label and format, nullable starting Monday, two-to-twelve observations, nullable target, inclusive direction, interpretation, and Measurement Context.
- Each observation has one explicit state: Unfilled, Missing, or Measured. Only Measured carries a finite number. Missing and Unfilled must not preserve a hidden measurement in serialized data.
- The starting Monday is null for an undated draft or a real ISO calendar Monday. Following positions advance by seven days using UTC calendar arithmetic. A null start is valid only when all positions are Unfilled.
- Structurally invalid documents are rejected; structurally valid incomplete drafts remain saveable. Known layouts keep the existing declared-field normalization policy. Invalid supplied enum values are rejected rather than silently defaulted.
- Next Actions persists `columns` or `rows`. An omitted variant on an older document is read as Columns; new-page creation explicitly chooses Rows. Switching variants preserves the same two-to-four ordered Commitments.
- Signed measurement support is specific to Trend & Target. Existing Comparison Metric and Two-column chart numeric constraints remain unchanged. No new chart library, generic form engine, server endpoint, or broad authoring refactor is required.

### Authoring, dates, and invalid input

- New Trend pages start with eight Unfilled positions, no starting Monday or target, blank authored text, at-most direction, and the existing formatting defaults: one decimal, unit after the value, and a separating space. Unit text may be empty for a dimensionless metric.
- Authors choose the starting Monday before entering Measured or Missing observations. Row-content and dated-range operations require a valid start. Dates are validated rather than silently shifted to Monday.
- Clearing a measured number returns the row to Unfilled. Choosing No observation clears its value and any pending input error. Returning from Missing to numeric entry starts Unfilled.
- Accept finite signed decimal and scientific-notation input. Invalid or partial input remains visible with contextual feedback and does not replace the last valid persisted number.
- Any invalid pending numeric/date input blocks saving the Week Document. Copy blocks the affected page, and batch export skips that page with a reason while continuing other eligible pages. Save or output must never silently use a stale value in place of the author's invalid input.
- Clearing the starting date is saveable as null only when every row is Unfilled. Otherwise retain the observations and last valid dating, show the invalid pending edit, and apply the Save/Copy/batch gates until it is resolved.
- Extend or trim only the range endpoints. New positions are Unfilled. Removing the first position advances the starting Monday and preserves every retained observation's date; interior weeks remain represented explicitly.
- Extension stops at twelve positions and trimming stops at two. At capacity, the author removes an endpoint before extending; there is no automatic rolling window or silent eviction.
- Re-dating a series containing Measured or Missing observations shows the old and proposed date ranges and requires confirmation. Cancel preserves the original dates and values. Re-dating an entirely Unfilled series needs no confirmation.
- A series may end before the Week Document's reporting week, but a series ending later is not exportable. The observed date range stays visible and distinct from the reporting week. Readiness uses the document's reporting Monday, not the system clock or a parsed display string.
- Pending input stays with its page and observation through structural edits. Page deletion, Page ID reuse, and week switching must not leave stale field errors attached to new content. Extend the authoring owner present in the integration branch rather than creating a second owner for Trend input.

### Chart and latest-week summary

- Use the selected full-width chart with latest value, fixed target, and interpretation below. Retain the existing Editorial Frame, typography, palette, and stage styling.
- The horizontal axis has equal weekly spacing. Measured points form one line; Missing and Unfilled positions break it. Only explicit Missing observations use the missing marker in exportable output; neither state becomes a zero.
- Both target directions are inclusive. Compare the last displayed position's original numeric value with the original target; do not search backward for another measurement or store the derived status redundantly.
- A measured last position shows Target met or Target missed when a target exists. A Missing last position shows an em dash and No data. An Unfilled last position shows Not entered in preview; a measured value without a target shows Target not set. Incomplete cases remain blocked for export.
- Reuse unit placement/spacing and zero-, one-, or two-decimal display formatting. Formatting does not round stored values or decide target status; normalize displayed negative zero to zero.
- When display rounding changes the apparent relation between the latest value and target, include an exact comparison on the Stage using unrounded number representations and the same units. For example, a value of 8.04 seconds against a target of at most 8 seconds remains Target missed at one-decimal precision, with a visible Exact: 8.04 s > 8 s comparison. It participates in normal fit measurement and PNG capture.
- Compute linear vertical bounds from every measured value plus the target, padding each side by ten percent of the span. Zero is not forcibly included. For a constant value, pad symmetrically by the greater of ten percent of its absolute value or one unit. Empty drafts use a neutral placeholder axis.
- All finite input values and the target must remain visible inside the plot. Calculation failure must be surfaced and must prevent misleading capture; it must not yield non-finite SVG coordinates or a silently empty chart.
- Axis tick formatting is independent of the headline's selected precision so labels remain distinct. Scientific notation is allowed for extreme magnitudes. Keep every weekly position, label fewer dates when needed, and retain the first and last labels plus a full date range with year.
- Keep the metric label/unit, target line and direction, legend, latest date/status, interpretation, and Measurement Context visible. Provide accessible SVG labels/descriptions and redundant text/line treatment for color-coded meaning.

### Persistence, cloning, and export

- Saving and reloading preserve both new page data and the selected Next Actions variant through the existing Week Document store.
- Creating a week from a previous one retains Trend's metric/format, target/direction, starting date, all observation states/values, and Measurement Context. Clear the conclusion, interpretation, and notes for fresh authoring. Preserve existing common clone rules for identity, hidden state, and page-number defaults. Do not append, evict, or re-date observations automatically.
- Next Actions cloning preserves its selected composition while retaining existing behavior for its content: keep the Commitment count and clear authored title/outcome/checkpoint text and notes. Other page types, including HTML source-file handling, keep their current clone behavior.
- Trend content completeness requires nonblank title, metric label, interpretation, and Measurement Context; a valid dated two-to-twelve-position series ending no later than the reporting week; at least two Measured values; a finite target and valid direction/format; and no Unfilled position or invalid pending input. A Missing last position can therefore be exportable when other requirements pass.
- Next Actions variants share Commitment completeness rules, but fit is measured for the selected composition. Neither the item count nor the twelve-week cap proves that text fits.
- Editor assessment, Copy, and batch use the same Week Document reporting context and content rules. Preview and capture reuse the production renderer. Export still requires actual 1280 × 720 capture-stage fit; preserve existing PNG density, filenames, snapshot semantics, Hidden Page behavior, and Page Position rules.
- A page's content/readiness failure blocks Copy and is reported as a skipped page in batch. Shared capture infrastructure and output failures retain the existing operation-level policy. Do not change that policy as part of layout adoption.
- Production delivery includes public demo examples and authoring guidance. Archive the prototype and selected verdict on its throwaway branch before retiring the experimental route, controls, fixtures, and task command from production changes. Keep the source available for comparison; do not turn the experiment directly into production code without production validation.

## Testing Decisions

- Primary seam: the existing Workshop authoring-to-output journey. Drive page creation and editing, Save/reload, creation of another week, Preview, Copy, and batch export as a user does. Assert visible content, persisted Week Documents, original observation dates, readiness reasons, and produced or skipped output.
- Complement that journey with the existing shared single-page Export gate and batch operation seam for deterministic fit/overflow, invalid-input, and snapshot cases. Use fake capture/output adapters there; use real browser capture for geometry and actual PNG evidence.
- Reuse existing public parser, page-lifecycle, clone, and content-readiness behavior tests when they localize contract failures efficiently. Do not create a separate test-only interface for each helper or assert private state shape, internal SVG path strings, or component structure as substitutes for user-visible results.
- Prior art is the existing Next Actions and Evidence-backed Decision create/edit/save/reload browser coverage, Workshop lifecycle and multilingual Stage checks, clone/known-layout parsing tests, and Export gate tests for blocked pages, batch continuation, output naming, and operation snapshots.
- Verify legacy Columns versus new Rows, content-preserving toggles, variant save/clone retention, and two-to-four long multilingual Commitments using the same authored content.
- Verify inclusive equality in both directions; positive, negative, and measured-zero values; visible exact comparison for 8.04 against at most 8 at one-decimal precision; and unchanged Comparison Metric restrictions.
- Verify interior and last-week Missing states, at least two Measured values, all-Missing and one-measurement drafts, Unfilled versus invalid input, and rejection of stale-value Save or output.
- Verify adding/removing endpoints preserves retained dates and pending-input ownership; re-dating confirmation/cancel; clone retention with cleared conclusions; year transitions; minimum/maximum capacity; and a date range later than the reporting week.
- Verify constant/all-zero/signed/extreme finite series, readable distinct ticks, no clipping or date-label overlap, and the full measurement/interpretation context at both 800 × 450 and 1280 × 720. Real PNG output must contain required labels and exact comparisons.
- Each ticket follows Red → Green → Refactor and validates its own complete path. Run affected unit/integration tests, type checking, lint, production build, and focused isolated Playwright scenarios. Use synthetic/public demo data; private author weeks are not fixtures. Prototype checks do not substitute for production tests or audience comprehension review.

## Out of Scope

- Multiple series, multiple metrics on one Trend page, changing targets, target bands, arbitrary non-weekly intervals, more than twelve positions, and historical aggregation across Week Documents.
- Spreadsheet paste/import, CSV ingestion, remote data fetching, manual axis bounds, logarithmic axes, chart zoom, arbitrary interior-week removal, and automatic eviction or rolling windows.
- Automatic generation of conclusions, interpretations, or Measurement Context; unsupported claims about audience comprehension based only on successful capture.
- Broad Editing Session, Week store, Export gate, or Stage-context refactors; changes to existing failure policies, date/filename ownership, or non-Trend numeric contracts.
- Autosave, generic navigation guards, undo, layout conversion, global theming changes, a general chart engine, and new dependencies without a demonstrated need.
- Rewriting private authoring weeks, publishing a deployment, changing unrelated issues, or merging implementation under this specification-publication request.

## Further Notes

- Q1–Q22 were settled during the design discussion. Full-width Trend & Target and Next Actions Rows were selected from the four-view prototype. Numeric formatting, automatic bounds, explicit date-edit behavior, and persistence defaults were made concrete in the final design brief and are carried forward here without another feature interview.
- The prototype previously passed 32 composition/scenario/size checks. Existing unit tests passed 273 cases after reducing parallelism; these are prototype-era observations, not proof that the new production feature is implemented.
- Reuse the Export gate contract described in #31. The current checkout already includes its shared capture implementation. Coordinate with the separate Editing Session work in #37–#40 if it lands first; neither workstream is a substitute for the new layout behavior, and open tracker state alone does not create a dependency.
- No existing parent issue is modified or closed. The published specification and each approved implementation ticket receive the ready-for-agent label; ticket blockers identify the actual implementation frontier.
- Initial ticket plan: Next Actions Rows and the measured Trend journey can start independently; missing-observation authoring and dated-range maintenance follow the measured Trend journey; public demo delivery and prototype retirement follow both completed feature directions.

### Published implementation tickets

GitHub Issues is the implementation tracker. Native sub-issue and blocking relationships were verified after publication.

| Ticket                                                                | Delivery                                                           | Blocked by                                                                                                                                                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#43](https://github.com/shiroki9979/weekly-report-builder/issues/43) | Add persistent Rows and Columns variants to Next Actions           | None                                                                                                                                                                                                                |
| [#44](https://github.com/shiroki9979/weekly-report-builder/issues/44) | Author and export a measured Trend & Target page                   | None                                                                                                                                                                                                                |
| [#45](https://github.com/shiroki9979/weekly-report-builder/issues/45) | Author and export explicit missing weekly observations             | [#44](https://github.com/shiroki9979/weekly-report-builder/issues/44)                                                                                                                                               |
| [#46](https://github.com/shiroki9979/weekly-report-builder/issues/46) | Maintain dated Trend windows across weekly reports                 | [#44](https://github.com/shiroki9979/weekly-report-builder/issues/44)                                                                                                                                               |
| [#47](https://github.com/shiroki9979/weekly-report-builder/issues/47) | Ship public demo reports for both layouts and retire the prototype | [#43](https://github.com/shiroki9979/weekly-report-builder/issues/43), [#45](https://github.com/shiroki9979/weekly-report-builder/issues/45), [#46](https://github.com/shiroki9979/weekly-report-builder/issues/46) |

### Prototype record

The selected A/D verdict and the archived four-view source are recorded in [Trend & Target layout prototype](../explanation/trend-target-layout-prototype.md). Author and export the implemented layouts through the normal Workshop.

### Amendment: cadence (2026-09-29)

[#54](https://github.com/shiroki9979/weekly-report-builder/issues/54) generalizes the weekly-only rules above (see [ADR-0001](../adr/0001-decouple-weekly-report-from-slide-core.md)):

- A Trend page has `cadence: "week" | "month"` and a nullable `start` instead of `startMonday`. A weekly start is a real Monday; a monthly start is the first day of a month. Positions advance by one week or one calendar month in UTC. Legacy `startMonday` files load as weekly series.
- Editor, slide, and readiness copy follow the cadence (for example, Starting month, Add later month, Latest month, Monthly target). Weekly copy is unchanged.
- Monthly x-axis labels use month abbreviations (`Jan`), and the observed range below the chart carries the years. This deviates from #54, which asked for year/month axis labels: `YYYY-MM` labels were clipped at the chart's right edge.
- The cadence can change only while every position is Unfilled; the start is aligned to the new cadence. Once observations are entered, the select is disabled and the editor explains that they must be cleared first. This deviates from #54, which asked for the same confirmation as re-dating the start: re-dating only shifts the dates of entered values, whereas a cadence switch would change what each entered value measures.
- Readiness compares the final position's start with the Deck's `period.end` instead of its reporting Monday. For weekly series this is equivalent. A Deck without a period skips this check.
