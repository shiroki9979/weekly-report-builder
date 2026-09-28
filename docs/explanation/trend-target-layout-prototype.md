# Trend & Target / Next Actions layout decision

Created: 2026-09-28

Last updated: 2026-09-28

The four-view comparison prototype is preserved at [commit `bed7803`](https://github.com/shiroki9979/weekly-report-builder/tree/bed7803/src/components/stage/prototype) on the remote `prototype/trend-target-actions-rows` branch. It compared A, a full-width Trend chart with a summary below; B, a chart with a side summary; C, Next Actions Columns; and D, Next Actions Rows. The approved production choices were **A and D**. The experimental route, fixtures, controls, and script were removed after the source was verified on the remote branch. The supported path is the normal Workshop using the public fictional [Demo Week Set](../../demo/2026-01-05.json).

The full-width chart gives a single metric, all dated observations, the target, and the latest-week conclusion separate readable space. Rows keep each Commitment's action, intended outcome, and checkpoint together. The demo retains the old Columns composition on `p04` and presents identical Commitments as Rows on `p09`, allowing a direct comparison. `p06`–`p08` cover an at-most target with exact comparison, an at-least target with negative and zero measurements, and a missing last week. `p10` covers longer mixed-language actions.

## Verification and reading observations

- The isolated browser journey opens the tracked demo in the Workshop, checks all six selected pages at 800 × 450, and captures them at the canonical 1280 × 720 Stage. The 12-week dated Trend clone test trims the first week, appends the next, saves/reloads, and exports a real 2560 × 1440 PNG. It checks the retained missing date, latest status, exact comparison, and visible context before capture.
- Agent visual inspection of the 800 × 450 screenshots found English and Chinese Trend pages, the missing-week case, legacy Columns, and mixed Chinese/English Rows legible without clipped text. Inspection of the actual canonical PNGs found the exact comparison, source context, missing markers, and checkpoints visible. The 1280 px Workshop preview itself can be masked by the sidebar; the PNGs are the capture evidence.
- Capture proves the Stage rendered and that output bytes have the expected PNG dimensions. It does not prove that every reader understands the story. Human review for a spoken presentation and independent reading remains a separate editorial check before sharing a real report. The [authoring guide](../how-to/author-editorial-layouts.md#分享前檢查) names those checks.
- The examples are fictional and use scripted sources. Their numbers and source text should be replaced together for a real report; neither the trend nor the conclusion should be presented as observed production data.
