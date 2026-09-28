# Weekly Report Builder

Created: 2026-09-09

Last updated: 2026-09-28

Weekly Report Builder is an authoring workspace for composing Week Pages, reviewing them on a presentation Stage, and exporting them for a shared deck.

## Page layouts

**Structured Layout**:
A reusable Week Page format organized around a recurring communication job and supported throughout authoring, preview, weekly reuse, and export.
_Avoid_: Production layout, template

**Layout Variant**:
An alternative composition of a Structured Layout that preserves its communication job and content meaning.
_Avoid_: New layout, theme

**Editorial Layout Family**:
The three Structured Layouts—Weekly Overview, Evidence-backed Decision, and Next Actions—that communicate what changed, what the evidence supports, and what happens next.
_Avoid_: Prototype layouts, three layouts

**Two-column Layout**:
The existing general-purpose Structured Layout that presents three narrative items beside a panel. It coexists with the Editorial Layout Family.
_Avoid_: Legacy layout, deprecated layout

**Trend & Target**:
A Structured Layout that presents one metric's weekly time series against a fixed target threshold.
_Avoid_: Trend panel, KPI dashboard

**HTML Page**:
A one-off Week Page whose Stage content is supplied as standalone HTML instead of a Structured Layout.
_Avoid_: Structured Layout, HTML layout

## Editorial content

**Outcome**:
A reported change that pairs a result with its impact and associates them with a secondary workstream and Status Signal.
_Avoid_: Task, activity, update

**Status Signal**:
An author-written label paired with one of three semantic tones: positive, caution, or neutral.
_Avoid_: Status color, traffic light

**Comparison Metric**:
A named measure that compares numeric baseline and candidate values expressed with one shared unit and display format.
_Avoid_: Bar, chart value

**Weekly Observation**:
A position in a Trend & Target series associated with one reporting week. It contains a measured value, a Missing Observation, or an Unfilled Observation.
_Avoid_: Chart point, data row

**Missing Observation**:
An author's explicit statement that a weekly measurement is unavailable. It differs from both a measured zero and unfinished authoring.
_Avoid_: Empty value, zero

**Unfilled Observation**:
A Weekly Observation for which neither a measured value nor an explicit missing state has been authored.
_Avoid_: Missing observation, zero

**Measurement Context**:
Visible author-written context describing the source or measurement conditions of a Trend & Target series, so its evidence can be understood without a speaker.
_Avoid_: Speaker notes, hidden metadata

**Commitment**:
A priority action that pairs an intended outcome with a verification checkpoint.
_Avoid_: Task, to-do

**Editorial Frame**:
The shared context around an Editorial Layout Family page: its communication job, central conclusion, reporting week, and page position.
_Avoid_: Header, wrapper

## Editorial layouts

**Weekly Overview**:
A Structured Layout containing one Lead Outcome and between one and three Supporting Outcomes.
_Avoid_: Overview grid, status dashboard

**Lead Outcome**:
The single Outcome that carries the strongest visual priority on a Weekly Overview.
_Avoid_: Primary card, first item

**Supporting Outcome**:
An Outcome that adds evidence or context beneath the Lead Outcome without competing for visual priority.
_Avoid_: Secondary card, extra item

**Evidence-backed Decision**:
A Structured Layout that presents a verdict before one or two Comparison Metrics and one or two short interpretations.
_Avoid_: Comparison chart, decision dashboard

**Next Actions**:
A Structured Layout containing between two and four ordered Commitments.
_Avoid_: Task board, checklist

**Next Actions Rows**:
A Layout Variant of Next Actions that presents ordered Commitments in full-width rows, with each action and intended outcome beside its verification checkpoint.
_Avoid_: Action table, task list

## Page context

**Page ID**:
A non-empty identifier that is unique within a Week Document and remains attached to the same Week Page when pages are reordered.
_Avoid_: Page index, array position

**Hidden Page**:
A Week Page retained for authoring and individual preview or copy, but excluded from batch export and Page Position.
_Avoid_: Deleted page, unsupported page

**Draft Page**:
A Structured Layout with required authored content still missing. It can be saved and previewed, but cannot be copied or included in batch export.
_Avoid_: Invalid page, broken page

**Content-complete Page**:
A Structured Layout whose visible authored fields are populated and whose numeric content satisfies its layout rules.
_Avoid_: Valid page, finished slide

**Overflowing Page**:
A Content-complete Page whose rendered content exceeds the canonical 1280 × 720 capture Stage. It remains editable and previewable, but cannot be copied or included in batch export.
_Avoid_: Long page, invalid page

**Export Readiness**:
The assessment that a page is supported and either its Structured Layout is Content-complete and measurably fits the canonical capture Stage, or its HTML Page content has loaded successfully. It is required for individual copy and batch export independently of whether the page is hidden; a failed capture measurement or HTML Load Failure is not ready.
_Avoid_: Schema validity, preview status

**HTML Load Failure**:
A failure to obtain an HTML Page's referenced content because its file reference is invalid, its load request fails, or loading does not finish within the allowed time.
_Avoid_: Overflowing Page, missing authored content

**Page Position**:
A Week Page's stable order among all supported, non-hidden pages in its Week Document, regardless of whether those pages are Draft or Overflowing. Editorial Layout Family pages, HTML Pages, and Two-column Layouts with table, chart, flow, or checklist panels are supported; unknown layouts and the fields panel are not. A hidden page has no Page Position.
_Avoid_: Array index, layout page number

**Week Label**:
The ISO date range from Monday through Friday that identifies the reporting week.
_Avoid_: Stored week text, localized date label

## Authoring

**Editing Session**:
The Workshop's unsaved working state for one open Week Document, lasting from opening that week until another week is opened; saving does not end it.
_Avoid_: Week Draft, working copy, unsaved week

**Metric Input**:
The verbatim text an author typed for a Comparison Metric value or a Trend & Target numeric or date field (target, Weekly Observation value, or starting Monday), kept for the rest of the Editing Session. An invalid Metric Input blocks Save and Copy, and batch export skips its page.
_Avoid_: Metric draft, raw buffer
