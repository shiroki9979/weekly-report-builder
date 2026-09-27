# Editorial Layout Family production adoption

建立日期：2026-09-10

最後更新：2026-09-27

狀態：approved

Grill 共識（2026-09-09～2026-09-10）。本文件是實作 Weekly Overview、Evidence-backed Decision 與 Next Actions 的 source of truth。

---

## Problem Statement

獨立 prototype 已驗證三種溝通職能在 800 × 450 Stage 上的構圖、層級與家族一致性，但它使用寫死內容、prototype-only types、獨立 CSS 與獨立入口。Week Document parser、Workshop editor、clone、Stage dispatch 與 PNG export 仍只把 `two-column` 與 `html` 視為正式 page types。

要讓週報作者真正採用這三種 layout，不能只搬 renderer。每種 layout 都必須成為可建立、可編輯、可保存、可 clone、可預覽、可 Copy、可批次匯出的 Structured Layout，並在內容未完成或超出 16:9 Stage 時阻止錯誤輸出。

## Goals

- 將 Weekly Overview、Evidence-backed Decision 與 Next Actions 納入正式 Structured Layout。
- 與 Two-column Layout、HTML Page 共存，不遷移或取代既有 week files。
- 讓作者從 Workshop 安全新增、刪除及排序 Week Pages，不提供 layout conversion。
- 允許保存 Draft Page，但只輸出 Content-complete 且不 overflow 的 Structured Layout。
- Preview、Copy 與 batch export 共用相同 renderer 與 page context；editor 與 export 共用 content rules，Copy 與 batch export 再共用 canonical capture readiness。Responsive preview 只提供 advisory overflow。
- 支援英文、中文與混合內容，並在真實 browser 驗證 1280 × 720 capture Stage。
- Production adoption 完成後移除獨立 prototype 入口與重複模型。

## Non-goals

- 取代或棄用 Two-column Layout。
- 改變 HTML Page 的載入、消毒、錯誤或匯出行為。
- 在 layouts 之間轉換既有頁面。
- Autosave、全域 dirty indicator 或離開頁面確認。
- Drag-and-drop 排序。
- 通用 schema-driven form/page builder。
- 支援負數 Comparison Metric、跨 metric 共用刻度或 locale-aware number formatting。
- 實作 `fields` panel。
- 完整 accessibility certification 或自動化 screenshot diff。

## Domain language

Canonical terms and definitions live in [`CONTEXT.md`](../../CONTEXT.md). Implementations、tests 與文件必須使用 `Structured Layout`、`Editorial Layout Family`、`Outcome`、`Status Signal`、`Comparison Metric`、`Commitment`、`Draft Page`、`Content-complete Page`、`Overflowing Page`、`Page ID` 與 `Page Position`。

## User Stories

1. 身為週報作者，我要用溝通職能而非欄位幾何選擇 Structured Layout。
2. 身為週報作者，我要從 Workshop 新增 Two-column Layout 或 Editorial Layout Family 頁面，而不手改 JSON。
3. 身為週報作者，我要在目前頁面之後插入新頁，並立即開始編輯它。
4. 身為週報作者，我要刪除或重新排序頁面，同時保持目前選取的 Page identity。
5. 身為週報作者，我不要透過 layout dropdown 轉換既有頁面，以免不相容內容被靜默丟棄。
6. 身為週報作者，我要保存未完成的 Draft Page，以便跨工作階段繼續撰寫。
7. 身為週報作者，我要清楚看見 Draft Page 缺少哪些內容，而不是在匯出時才猜測。
8. 身為週報作者，我不要 Copy 或批次匯出未完成或 overflow 的 Structured Layout。
9. 身為週報作者，我要 batch export 略過不能輸出的頁面並繼續其他頁面，同時列出 page ID 與原因。
10. 身為週報作者，我要 Weekly Overview 保有一個 Lead Outcome，並能增刪、排序或更換 Supporting Outcomes。
11. 身為週報作者，我要 Evidence-backed Decision 從實際數值產生一致的 baseline/candidate bars。
12. 身為週報作者，我要 Next Actions 的 Commitment 編號隨順序自動更新。
13. 身為週報作者，我要 clone 保留穩定結構，但清除上週結論、數值、狀態與講稿。
14. 身為 viewer，我要 Editorial Frame 顯示正確的 reporting week 與最終匯出順序。
15. 身為 maintainer，我要 prototype 在 production parity 驗證後退場，避免兩套 schema、renderer 與 CSS 漂移。

## Page model

### Common fields

所有已辨識 Week Pages 共用：

| Field    | Type      | Rule                                                        |
| -------- | --------- | ----------------------------------------------------------- |
| `id`     | `string`  | 非空，且在同一 Week Document 中唯一                         |
| `layout` | `string`  | Discriminator                                               |
| `title`  | `string`  | 可為空草稿；Editorial Layout 中作為 conclusion-led headline |
| `hidden` | `boolean` | Optional；batch export 排除                                 |
| `notes`  | `string`  | Optional；不渲染於 Stage                                    |

正式 layout discriminators 為：

- `two-column`
- `html`
- `weekly-overview`
- `evidence-decision`
- `next-actions`

未知 layout 仍保留既有 fallback，不誤判為任何已知 Structured Layout。

Parser 延續既有 compatibility policy：已辨識 layout 驗證並正規化 declared fields，common、layout 與 nested objects 的額外 fields 都不進入解析結果；未知 layout 保留 raw payload，但由 parser 正規化後的 `id`、`layout`、`title`、`hidden` 與 `notes` 覆蓋同名欄位。Required field 缺失、型別錯誤或 cardinality 違規會拒絕整份 Week Document；optional common `hidden`／`notes` 則沿用現況，未提供或型別錯誤都正規化為 `undefined`。

### Weekly Overview

```ts
type StatusTone = "positive" | "caution" | "neutral"

type StatusSignal = {
  label: string
  tone: StatusTone
}

type Outcome = {
  workstream: string
  figure: string
  result: string
  impact: string
  status: StatusSignal
}

type WeeklyOverviewPage = CommonWeekPage & {
  layout: "weekly-overview"
  lead: Outcome
  supporting: Outcome[] // 1–3
}
```

Add Page 預設建立一個 Lead Outcome 與兩個 Supporting Outcomes。所有文字為空，tone 為 `neutral`。

Editor 為 Supporting Outcomes 提供 Add、Move Up、Move Down、Remove 與 Make lead。Make lead 將選定的 Supporting Outcome 與原 Lead Outcome 交換。

### Evidence-backed Decision

```ts
type UnitPosition = "before" | "after"
type UnitSpacing = "none" | "space"

type ComparisonMetric = {
  label: string
  baselineValue: number | null
  candidateValue: number | null
  unit: string
  unitPosition: UnitPosition
  unitSpacing: UnitSpacing
  precision: 0 | 1 | 2
}

type EvidenceDecisionPage = CommonWeekPage & {
  layout: "evidence-decision"
  verdict: string
  metrics: ComparisonMetric[] // 1–2
  interpretations: string[] // 1–2
}
```

Add Page 預設建立兩個 metrics 與兩個 interpretations。文字與 unit 為空，數值為 `null`，`unitPosition` 為 `after`，`unitSpacing` 為 `space`，`precision` 為 `1`。

數值必須是 finite、非負 number；`0` 是合法完成值，`null` 表示尚未輸入。Unit 可為空，代表無單位；baseline 與 candidate 必須共用同一格式。

Renderer 以 `toFixed(precision)` 產生數值文字並保留尾端零，再依 `unitPosition` 與 `unitSpacing` 組合 unit。`null` 顯示為 em dash（`—`），保留 bar track，但 fill 為 0%；不得把未輸入值顯示為數值零。

- `null` 一律只顯示 `—`，不附加 unit。
- Unit 為空字串時不加入 spacing，輸出不得帶前後空白。
- 一側為正數、另一側為 `null` 時，正數側為 100%、`null` 側為 0%。
- 一側為 `0`、另一側為 `null` 時，兩側皆為 0%。

每個 metric 以較大數值作 100%，另一數值按比例縮放；兩者皆為 `0` 時兩條 bar 都是 0%。Baseline/Candidate label 由 renderer 固定產生，不寫入 JSON。

Caller-facing formatter seams：

```ts
type MetricFormat = Pick<
  ComparisonMetric,
  "unit" | "unitPosition" | "unitSpacing" | "precision"
>

type MetricBarPercents = {
  baseline: number
  candidate: number
}

type MetricInputResult =
  | { status: "empty"; value: null }
  | { status: "valid"; value: number }
  | { status: "invalid"; message: string }

function formatMetricValue(value: number | null, format: MetricFormat): string

function calculateMetricBarPercents(
  baseline: number | null,
  candidate: number | null
): MetricBarPercents

function parseMetricInput(raw: string): MetricInputResult
```

### Next Actions

```ts
type Commitment = {
  title: string
  outcome: string
  checkpoint: string
}

type NextActionsPage = CommonWeekPage & {
  layout: "next-actions"
  commitments: Commitment[] // 2–4
}
```

Add Page 預設建立三個空白 Commitments。顯示編號由陣列順序派生，不寫入 JSON。

### Cardinality

Parser 必須拒絕超出下列範圍的已辨識 Editorial Layout；空白字串與 `null` metric values 則屬合法 Draft Page：

| Layout                   | Collection          | Min | Max | Default |
| ------------------------ | ------------------- | --: | --: | ------: |
| Weekly Overview          | Supporting Outcomes |   1 |   3 |       2 |
| Evidence-backed Decision | Comparison Metrics  |   1 |   2 |       2 |
| Evidence-backed Decision | Interpretations     |   1 |   2 |       2 |
| Next Actions             | Commitments         |   2 |   4 |       3 |

每個 collection 都提供 Add、Move Up、Move Down 與 Remove。到達 max 時停用 Add，到達 min 時停用 Remove，首尾項目停用相應 Move control。此規則適用 Supporting Outcomes、Comparison Metrics、Interpretations 與 Commitments；Supporting Outcomes 另提供 Make lead。

## Editorial Frame

- `title` 是作者儲存的 headline。
- Eyebrow 由 layout 固定為 `Weekly Overview`、`Evidence-backed Decision` 或 `Next Actions`。
- Week Label 由 Week Document 的 Monday/Friday 派生為 ISO 範圍，例如 `2026-08-24 — 2026-08-28`。
- Page Position 依全部已支援且未 hidden 的 Week Pages 計算，不限 Editorial Layout Family，也不因頁面處於 Draft 或 Overflowing 狀態而改變。Supported 明確包含三個 Editorial Layout、HTML Page 與 panel 為 table／chart／flow／checklist 的 Two-column Layout；排除 unknown layout 與 `fields` panel。Batch export 略過頁面時可保留編號缺口。
- Hidden Page 在 preview 與 Copy 顯示 `Hidden`，batch export 靜默排除。
- Preview、Copy 與 batch export 必須使用同一個 Stage context Module；caller 不得自行拼 week/page label。

建議 Interface：

```ts
type StagePageContext = {
  weekLabel: string
  pageLabel: string
}

function createStagePageContext(
  week: WeekDocument,
  pageId: string
): StagePageContext
```

`StageSlide` 接收 page 與單一 context，而不是整份 Week Document 或一組散落 metadata props。

## Page management

### Add Page

- Add Page 在目前選取頁面之後插入，成功後選取新頁。
- 可選 Two-column Layout 與三個 Editorial Layout；HTML Page 不列入。
- Two-column 需再選 `table`、`chart`、`flow` 或 `checklist` panel；不提供 `fields`。
- 新頁以空白結構建立，不寫入 prototype demo copy。
- Page ID generator 取既有 `pNN` 最大數字加一並補足至少兩位，例如 `p09` → `p10`、`p99` → `p100`。若產生碰撞則繼續遞增。
- 若 Week Document 沒有任何 `pNN`，generator 從 `p01` 開始。
- 自訂非空 Page ID 仍合法；parser 只新增 Week Document 內唯一性驗證，不強制所有 ID 使用 `pNN`。
- Add Page 省略 optional `hidden` 與 `notes`，沿用既有 parser defaults。

Two-column panel 的最小初始結構：

- Table：一個 column 與一個 row/cell；editor 新增 row/column controls，移除時不得低於 1，並保持矩形資料。
- Chart：一個 category 與一個 series/value。
- Flow：一個 step。
- Checklist：一個 item。

### Delete Page

- 使用 Workshop application dialog，顯示 page title 與 layout。
- Delete control 只作用於目前 selected page，不在其他 page list rows 提供刪除操作。
- 不得刪除 Week Document 的最後一頁。
- 刪除 selected page 後選下一頁；若無下一頁則選前一頁。
- 只修改本地 state，作者仍須按 Save 才持久化。

### Reorder Pages

- 使用 Move Up／Move Down controls，不加入 drag-and-drop。
- 到達首尾時停用相應 control。
- Selection 以 Page ID 保存，reorder 後仍跟隨同一 Week Page；需要 array index 時才派生。

### Save model

沿用現有手動 Save。Add、Delete、Reorder 與內容編輯都只修改本地 Week Document。本功能不新增 autosave、全域 dirty indicator 或 navigation guard。

## Clone behavior

Clone 指整份 Week Document 跨週複製；Page ID 只需在各自 Week Document 內唯一，因此可在新週保留。Clone 保留 Page ID、layout、hidden 與 collection 長度，清除 `title`、`notes` 及週次內容；`notes` 沿用既有行為設為 `undefined`：

- Weekly Overview：保留 workstream；清除 figure、result、impact、status label，tone 重設為 `neutral`。
- Evidence-backed Decision：保留 metric label、unit、unitPosition、unitSpacing、precision；baseline/candidate 重設為 `null`；清除 verdict 與 interpretations 文字。
- Next Actions：清除每個 Commitment 的 title、outcome、checkpoint。
- Two-column 與 HTML Page 維持既有 clone 行為。

## Content completeness

Schema validity 與 content completeness 是兩個不同判斷：parser 接受合法空白草稿；獨立 readiness Module 判斷是否可輸出。

Interface：

```ts
type ExportIssueCode =
  | "unsupported"
  | "missing-content"
  | "invalid-content"
  | "overflow"
  | "measurement-failed"

type ExportIssue = {
  code: ExportIssueCode
  path?: string
  message: string
}

type CaptureAssessment =
  | { status: "fit" }
  | { status: "overflow"; axes: ("horizontal" | "vertical")[] }
  | { status: "measurement-failed"; message: string }

type ExportAssessment = {
  eligible: boolean
  issues: ExportIssue[]
}

type StructuredWeekPage =
  | TwoColumnWeekPage
  | WeeklyOverviewPage
  | EvidenceDecisionPage
  | NextActionsPage

function assessContentReadiness(page: StructuredWeekPage): ExportIssue[]

function assessExportEligibility(
  page: WeekPage,
  capture?: CaptureAssessment
): ExportAssessment
```

`assessContentReadiness` 是不依賴 DOM 的純函式，只接受 recognized Structured Layout。`assessExportEligibility` 是判定 support boundary 與最終資格的單一入口：unknown layout 或 `fields` panel 回傳 `unsupported`；HTML Page 進入既有 capture policy，不套用 Structured Layout completeness 或 overflow gate；其他 Structured Layout 先取得全部 content issues，只有無 content issue 時才 render 並傳入 `CaptureAssessment`。Content-complete Structured Layout 未提供 capture 時，必須 fail closed，回傳 `measurement-failed`，不得視為 eligible。

Reason 順序固定為 `unsupported`、依欄位路徑排列的 content issues、最後才是 `overflow` 或 `measurement-failed`。同一頁有 content issues 時不執行 capture，因此不會同時回傳 content 與 render-time issues。Hidden 是 batch selection policy，不是 Export Readiness issue。

Issue path 使用不含 `$` 的 JSON-style path：object fields 以 dot 分隔，array index 使用 brackets，例如 `title`、`lead.workstream`、`supporting[0].status.label`、`metrics[0].baselineValue`。排序先 common fields，再依各 schema declaration order 深度優先遍歷，同一 collection 依 array index 排列。

- `missing-content`：trim 後空白的 required string、required `null` metric value，或缺少必要 collection entry。Collection-level paths 使用 `panel.columns`、`panel.rows`、`panel.categories`、`panel.series`、`panel.steps` 或 `panel.items`。
- `invalid-content`：in-memory finite／non-negative numeric invariant、矩形／對齊 invariant 或其他已存在但 shape 不合法的資料。Table row cell count mismatch 使用 `panel.rows[i].cells`；chart value count mismatch 使用 `panel.series[i].values`；個別非法 numeric value 使用完整 index path，例如 `panel.series[0].values[1]`。

### Common rules

- 所有 Structured Layout 的 `title` trim 後必須非空。
- 所有實際渲染的主要文案 trim 後必須非空。
- `notes`、hidden 與純 presentation defaults 不影響完整度。
- HTML Page 不使用 Structured Layout completeness rules。

### Editorial Layout rules

- Weekly Overview：Lead 與每個 Supporting Outcome 的 workstream、figure、result、impact、status label 必須非空。Tone 預設 `neutral` 即合法。
- Evidence-backed Decision：verdict、metric label、interpretations 必須非空；baseline/candidate 不得為 `null`，且必須 finite、非負。Unit 可空。
- Next Actions：每個 Commitment 的 title、outcome、checkpoint 必須非空。

### Two-column rules

- 三個 items 的 heading/body 必須非空。
- Panel title 必須非空。
- Table：column labels 與 cell values 必須非空；每列 cell 數等於 column 數。
- Chart：至少一個 category/series；category labels、series names 必須非空；values 必須完整對齊 categories、finite 且非負。
- Flow：至少一個 step；step label 必須非空。Caption optional。
- Checklist：至少一個 item；item label 必須非空。Checked state 不影響完整度。
- `fields` 仍是不支援匯出的 panel，不納入 Add Page。

### Workshop feedback

- Selected Draft Page 的 editor 顯示缺少欄位摘要。
- 尅读取 `assessContentReadiness` 的結果；不得在 form 內複製 validation logic。
- 對應 controls 設定 `aria-invalid`；錯誤摘要使用可被輔助技術宣告的語意。
- 合法 Draft Page 的 Save 仍可用；Copy 阻擋並顯示原因。
- Editing Session 持有以 Page ID 與 field path 為 key 的 Metric Input，切換頁面後仍保留輸入文字，例如 `1.50`。空白輸入寫為 `null`；只有可解析為 finite、非負 number 的輸入才更新 typed Week Document。其他非空輸入顯示 `invalid-content`、設定 `aria-invalid`，並阻擋 Save 與 Copy；batch export 將該 Page 視為 invalid 並略過，避免保存非法 schema 或輸出舊值。Parser、`parseMetricInput` 與 readiness 共用 numeric validation helper，不各自重寫規則。

## Overflow readiness

- 所有 Structured Layout 都以固定 1280 × 720 capture Stage 判斷 overflow。
- Capture 結果是 Copy 與 batch export 的權威；responsive preview measurement 只提供即時提示。
- Overflowing Page 可保存與預覽，但 Copy 阻擋、batch export 略過。
- HTML Page 不納入此 gate，維持既有 Shadow DOM／Light DOM 行為。
- Overflow measurement 應集中於 capture pipeline 的一個 Module；不得由每個 layout 自行決定。
- Canonical measurement root 是 Stage 固定 1280 × 720 的 capture viewport，透過 production data attribute 取得；以 root-relative coordinates 判定，不受 capture portal 位於螢幕外或使用 `opacity: 0` 影響。
- Detector 最多等待 5 秒；期限內等待 `document.fonts.ready`，再等待兩個 animation frames，讓 fonts、CSS 與 layout 穩定。
- Detector 同時檢查 root 的 `scrollWidth`／`clientWidth`、`scrollHeight`／`clientHeight`，以及 descendants 的 bounding rectangles 是否超出 root。只排除 `display: none`、`visibility: hidden` 或沒有 layout box 的 descendants；不得依 opacity 或 viewport page coordinates 排除 capture portal 內容。水平與垂直 overflow 都必須回報。
- 容許 1 CSS px 的 subpixel tolerance。找不到 measurement root、取得非 finite dimensions、等待逾時或 browser measurement 拋錯時，回傳 `measurement-failed` 並 fail closed。
- 有 content issues 的 Draft Page 不進入 render-time measurement。
- Responsive preview 可用相同 detector 對目前 viewport 顯示 advisory warning，但不得取代 1280 × 720 的 canonical Export Readiness 結果。
- 以上行為必須由真實 browser tests 驗證，不依賴 jsdom layout metrics。

## Export behavior

- Hidden Page：batch export 靜默排除；preview/Copy 顯示 `Hidden`。
- Unsupported layout/panel、Draft Page、Overflowing Page：batch export 略過，繼續輸出其他頁面。
- Capture measurement failure：視為不可匯出，batch 略過、Copy 阻擋，不得猜測為 fit。
- Export warning 列出被略過的 Page IDs 與結構化原因。
- Copy current page 若是 Draft、Overflowing 或 measurement-failed，必須阻擋並顯示具體原因。
- 本功能不改變 HTML Page fetch error 目前的處理；另案追蹤，見 [HTML Page error-PNG](html-page-error-png.md)。

## Module design

### Page lifecycle Module

一個深 Module 負責 Page ID 生成、Add、Delete、Move 與不可刪最後一頁的不變條件。Workshop hook 以 selected Page ID 保存 identity；caller 不直接操作 array/index 後再修補 selection。

### Readiness Module

純函式 `assessContentReadiness` 隱藏各 layout 的 completeness 規則，供 editor 與 export 使用。`assessExportEligibility` 統一 content 與 capture assessment；Copy 與 batch 不得自行重建 rules。Overflow 是 render-time assessment，不塞入 parser。Hidden exclusion 留在 batch selection policy。

### Stage context Module

一個 Interface 集中 Week Label、Page Position 與 Hidden label。Preview、Copy、batch capture 都透過此 Seam 取得相同 context。

### Editors

每個 layout 有自己的 editor Module，由 `PageEditorForm` dispatch。共用 Module 僅承載真正重複的 Add／Move／Remove controls；不建立 schema-driven form engine。

### Renderers and styles

- Production Editorial Frame 與 layout renderers 放入 Stage 相關 modules。
- Editorial styles 放入獨立 `editorial-layouts.css`，由 production Stage 載入。
- 不從 `src/prototype/` import production code，也不直接沿用 prototype types。
- Preview 與 capture 繼續共用 `StageSlide` dispatch。

## Testing Decisions

所有 implementation slices 使用 Red → Green → Refactor，測試 caller 使用的 Interface，而非內部 helpers 或 CSS class names。

### Vitest seams

1. `parseWeekDocument`：三個 discriminators、cardinality、numeric/null rules、Page ID uniqueness 與 unknown fallback。
2. Page lifecycle Module：ID generation、insert/select、cannot-delete-last、delete selection、move while preserving identity。
3. Layout mutation Interfaces：所有文字、status、metric formatting、collection bounds/reorder/Make lead、table row/column矩形規則。
4. Metric formatter：`toFixed` trailing zero、before/after、none/space、空 unit、`null` em dash 與 zero/null bar 差異。
5. `assessContentReadiness`／`assessExportEligibility`：每個 layout 的 required content、structured reason codes、reason order、content short-circuit 與 measurement failure fail-closed。
6. `createStagePageContext`：ISO week range、所有 supported non-hidden Page Position、Draft/Overflow 編號穩定、Hidden label。
7. `StageSlide`：三個 renderer 的外部語意與 context；不測 exact pixels/class names。
8. Export orchestration：hidden exclusion、draft/overflow/unsupported/measurement-failed reasons、Copy blocking、remaining pages continue。
9. Workshop integration：Add Page choices、layout-specific editor dispatch、Delete dialog、Move controls、manual Save。
10. Clone：各 Editorial Layout 保留結構與穩定 labels/format，清除週次內容及 metric values。

### Browser seam

新增 Playwright dev dependency，因 jsdom 無法提供真實 layout metrics。Browser tests 至少驗證：

- Add → edit → Save → reload 的端到端行為。
- 1280 × 720 capture Stage 對 fit/overflow fixture 的判斷。
- Fonts settle、兩個 animation frames、雙軸與 descendant overflow、1px tolerance、timeout 與 measurement failure 的 deterministic 行為。
- Copy 與 batch export gate 使用 capture-size 結果。
- 每個 Editorial Layout 的 min/default/max cardinality。
- 英文、中文與混合內容 fixture 在 800 × 450 preview 與 1280 × 720 capture 的 wrapping。
- Keyboard access、focus order、dialog 與 validation summary 的基本語意。
- Preview、Copy 與 batch capture 對相同頁面使用一致的 renderer 與 Stage context；Copy 與 batch 使用相同 canonical Export Readiness，responsive preview warning 僅為 advisory。
- Existing Two-column／HTML fixtures 維持既有 preview、Copy、batch 與 clone 行為。

Playwright 使用 test-only weeks-directory injection，不得讀寫 production `weeks/`。Global setup 建立一次性 fixture copy，整個 browser suite 使用單一 worker，寫入型測試在每個 test 前還原 fixture，global teardown 清除該目錄；clean CI 不依賴未提交的本機資料。

Playwright 的引入只服務真實 browser layout 與 Workshop flow；純 domain 行為仍由 Vitest 覆蓋。

## Delivery slices

以下是四個依序交付的 PR，不是可平行或彼此無依賴的工作。每個新 layout 在自己的 slice 內完成 min/default/max、英文、中文、混合內容與 overflow browser validation，通過後才可合併。

### 1. Page lifecycle and Export Readiness foundation

- Page ID uniqueness、ID-based selection、Add/Delete/Move。
- Add Page 支援 Two-column panel 選擇。
- Two-column completeness、table row/column controls。
- Stage context、readiness 與 capture-size overflow infrastructure。
- Playwright 基礎與相關文件。

### 2. Weekly Overview

- Schema/parser、factory/clone、editor mutations/form、renderer/styles、readiness、preview/export 與 tests。
- 建立 shared Editorial Frame。
- 完成 Weekly Overview 的 min/default/max、CJK、overflow 與 accessibility browser validation。

### 3. Evidence-backed Decision

- Schema/parser、numeric formatting/bar calculation、factory/clone、editor、renderer、readiness、preview/export 與 tests。
- 完成 Evidence-backed Decision 的 min/default/max、CJK、overflow 與 accessibility browser validation。

### 4. Next Actions and family completion

- Schema/parser、factory/clone、editor、renderer、readiness、preview/export 與 tests。
- 完成 Next Actions 的 min/default/max、CJK、overflow 與 accessibility browser validation，再執行全家族 consistency review。
- 移除 prototype 入口與重複程式；完成文件遷移。

每個 slice 都必須通過 lint、format check、typecheck、Vitest、Playwright 與 production build 才能合併。

## Issue plan after approval

取得明確 implementation approval 後建立四個 sequential GitHub implementation issues，分別對應上述 delivery slices。第二個 issue blocked by 第一個，第三個 blocked by 第二個，第四個 blocked by 第三個；每個 issue 對應一個 PR。

另建立第五個獨立 discovery／technical-debt issue，盤點並規格化 HTML Page 現有 error-PNG 行為；在另一次設計決策前不標示為 ready-for-agent，也不預設修正方向。該 issue 不屬於 Editorial Layout Family 的四個 PR，也不擴大 foundation slice。

## Prototype retirement

第四個 slice 完成 production parity 與 browser validation 後：

- 移除 `prototype.html`、Vite 第二入口與 package format 特例。
- 移除 prototype Gallery shell、prototype-only content types/data、tests 與 CSS。
- 保留 `docs/explanation/layout-prototype.md`，改寫為歷史驗證與 production adoption pointer。
- 移除 `docs/how-to/review-layout-prototype.md`，以 production Editorial Layout 操作／驗證 how-to 取代。
- 更新 README、docs index、npm scripts reference、Workshop architecture 與 Week JSON reference。

## Documentation migration

各 slice 合併時同步文件，不提前把 proposed schema 寫成 current reference：

- `docs/reference/week-json-format.md`：新增已實作 layout schema、cardinality、Page ID uniqueness 與 draft values。
- `docs/explanation/workshop-architecture.md`：更新 page lifecycle、readiness、Stage context 與 export flow。
- How-To：新增 Add/Delete/Reorder、Editorial Layout 編輯與 export blocker 排除步驟。
- `docs/how-to/hide-pages-from-export.md`：說明 Hidden label、Copy 與 Page Position。
- README：prototype 退場後改為 production Editorial Layout 入口。
- `CHANGELOG.md`：各 slice 記入 Added／Changed／Fixed。

## Acceptance Criteria

- 三個 Editorial Layout 都能由 Workshop 建立、編輯、儲存、reload、clone、preview、Copy 與 batch export。
- Existing Two-column 與 HTML week files 無需 migration 且仍可載入、編輯與輸出。
- Page ID 在 Week Document 內唯一；Add/Delete/Reorder 符合 selection 與至少一頁的不變條件。
- Editorial collection cardinality 與數值規則由 parser 和 editor controls 共同維持。
- Draft Page 可儲存，但 editor 顯示具體缺失，Copy/batch export 不輸出。
- 所有 Structured Layout 以 1280 × 720 判斷 overflow；不能輸出的頁面不阻擋其他合格頁面。
- Week Label 與 Page Position 在 preview、Copy、batch capture 一致；Hidden Page 在 preview/Copy 顯示 `Hidden` 且不進 batch export。
- Page Position 對所有 supported non-hidden pages 保持穩定；Draft／Overflow 被略過時允許 batch 輸出保留編號缺口。
- Copy 與 batch 使用同一組 typed Export Readiness reason codes；capture measurement failure 必須 fail closed。
- 合法 Draft 可 Save；Editing Session 保留未完成的 Metric Input，但非法非空輸入阻擋 Save 與 Copy，batch export 略過該 Page。
- Clone 保留結構、清除週次內容，且 Decision 的未填數值為 `null`。
- Decision metric 依 precision、unit position 與 spacing 決定顯示；`null` 顯示 em dash 且不得冒充數值零。
- Stage 在 min/default/max cardinality 與英文、中文、混合 fixtures 下無未偵測裁切。
- Prototype-only runtime/build/test paths 在 family completion slice 移除。
- Repo lint、format check、typecheck、Vitest、Playwright 與 production build 全綠。

## Further Notes

- 1280 × 720 是 export-readiness 的 canonical capture size；800 × 450 用於 Workshop 可讀性與 wrapping review，不是匯出資格來源。
- Content completeness 是 authoring/export policy，不是 schema validity；不要讓 parser 拒絕合法 Draft Page。
- HTML Page 的既有 error-PNG 行為不是本功能的一部分，應另案追蹤。
- 本設計沒有 ADR：明確 discriminated schemas、集中 context/readiness Modules 與 prototype 退場都延續既有架構，沒有難以逆轉且令人意外的偏離。
