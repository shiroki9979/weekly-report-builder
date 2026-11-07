# Deck JSON 格式

建立日期：2026-08-31  
最後更新：2026-11-07

---

## 檔案路徑

```text
decks/<id>.json
decks/<id>/<htmlFile>
```

- `<id>`：Deck ID，格式 `^[a-z0-9][a-z0-9-]{0,63}$`
- 週次以該週**週一**日期當 id，例如 `decks/2026-08-24.json`；建新週、開啟時預設的最新週只看這類 id
- 其他 Deck 可用任意符合格式的 slug，例如 `decks/q4-roadmap.json`
- HTML 全幅頁檔案放置於同名子目錄，例如 `decks/2026-08-24/p03.html`

## Deck（根物件）

| 欄位              | 型別                         | 必填 | 說明                                                                                           |
| ----------------- | ---------------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| `theme`           | `"default" \| "observatory"` | 否   | Deck Theme；未提供時呈現 `default`，其他值拒絕整份 Deck                                        |
| `title`           | `string`                     | 否   | Deck Title；去除前後空白，空白標題視為未提供，顯示於 Editorial Frame 頁尾                      |
| `period`          | `object`                     | 否   | 期間 `{ start, end }`，兩者皆為非空字串；週次為週一到週五。未提供時 Editorial Frame 不顯示期間 |
| `pages`           | `Page[]`                     | 是   | 至少一頁                                                                                       |
| `showPageNumbers` | `boolean`                    | 否   | Editorial 的全 Deck 頁碼預設；未提供時為顯示。HTML Page 不繼承此值，`two-column` 不渲染頁碼    |

舊格式把期間放在頂層 `start`／`end`。Parser 仍接受並轉成 `period`，存檔後改寫為新格式；同時提供兩種格式時拒絕。

```json
{
  "period": { "start": "2026-08-24", "end": "2026-08-28" },
  "pages": []
}
```

### Deck Theme 與 Deck Title

Workshop 的 Theme 與 Deck Title 控制項修改目前的 Editing Session。Save 保留原有表示：省略的 `theme` 不會補成 `default`，明確寫入的 `default` 仍保留。Deck Template 與 Weekly Series 均沿用主題與 Deck Title；單頁 `title` 仍是投影片主標，與 Deck Title 分開。

`default` 保留既有藍色與版面留白。`observatory` 使用 Instrument Sans 與 IBM Plex Mono 的自架拉丁字型；CJK 依序使用系統 Noto Sans TC、PingFang TC、Microsoft JhengHei。PNG 嵌入該頁用到的拉丁字型，CJK 字形仍隨機器而異。

Stage 以語意 token 提供 `--paper`、`--ink`、`--mute`、`--line`、`--accent`、`--accent-deep`、`--accent-soft`、`--accent-wash`、`--ok`、`--ok-ink`、`--ok-wash`、`--warn`、`--warn-ink`；舊 `--blue*` 名稱是對應 accent token 的相容別名。HTML Page 引用這些角色時跟隨 Deck Theme；寫死的色碼不被改寫。Chart 未提供系列 `color` 時，依序循環使用 `--chart-1` 至 `--chart-5`，明確指定的顏色維持原值。

Editorial Frame 頁尾左側顯示 Deck Title、右側顯示頁碼；缺少任一側仍保留同高空間。Observatory 頁碼補零，標頭也在顯示頁碼時出現 `§ nn` 索引。

## Page（discriminated union）

以 `layout` 欄位區分版面模式。共同欄位如下：

| 欄位             | 型別      | 必填 | 說明                                                                                                                                                                |
| ---------------- | --------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `string`  | 是   | 頁面識別，如 `p01`；同一 Deck 內必須唯一；匯出 PNG 檔名之一部分                                                                                                     |
| `layout`         | `string`  | 是   | `"two-column"`、`"html"`、`"overview"`、`"evidence-decision"`、`"next-actions"`、`"trend-target"`、`"cover"`、`"closing"`、`"side-by-side"` 或 `"full-width-panel"` |
| `title`          | `string`  | 是   | 投影片主標（可為空字串）                                                                                                                                            |
| `hidden`         | `boolean` | 否   | `true` 時略過 PNG 批次匯出                                                                                                                                          |
| `notes`          | `string`  | 否   | Speaker notes，不渲染於 stage                                                                                                                                       |
| `showPageNumber` | `boolean` | 否   | 單頁覆蓋。Editorial 未提供時繼承 Deck 層級設定；HTML Page 未提供時不疊頁碼，需設為 `true` 才顯示。`two-column` 與 `cover` 忽略此欄                                  |

Parser 會拒絕同一 Deck 內重複的 `id`。自訂非 `pNN` 的非空 id 仍合法。空白字串仍是合法草稿：schema 接受未完成內容，匯出資格由獨立 readiness 判斷。

### Boundary Note

`boundary?: string` 是 Editorial Frame 頁面可選的一行條件說明，適用於 Overview、Evidence-backed Decision、Next Actions、Trend & Target、Closing、Side-by-side Comparison 與 Full-width Panel。Parser 在 Cover、HTML Page 與 Two-column 會移除此欄位。Boundary Note 顯示於正文之下、頁尾之上，以細線分隔；長文字可換行，不會截斷。

空白或省略 Boundary Note 不影響 Content-complete；內容過長導致 Stage 溢出時仍阻擋 Copy，batch 略過該頁。Deck Template 與 Weekly Series 會清除此欄位；既有版型的其他保留規則不變。

### `layout: "cover"`

Deck 開場頁；只有共用 `title` 是 Content-complete 必填內容。

| 欄位       | 型別     | 必填 | 說明                           |
| ---------- | -------- | ---- | ------------------------------ |
| `subtitle` | `string` | 否   | 副標；省略時解析為空字串       |
| `byline`   | `string` | 否   | 講者或團隊；省略時解析為空字串 |

Deck 有期間時顯示 Frame Label。Cover 計入 Page Position，但不顯示頁碼，也不接受 `showPageNumber` 的顯示覆寫；後續頁因此可顯示 `2 / N`。Deck Template 保留 byline，清空 title 與 subtitle。

### `layout: "closing"`

Deck 收尾頁；共用 `title` 為必要內容，takeaways 可為空陣列。

| 欄位          | 型別                               | 必填 | 說明                                                     |
| ------------- | ---------------------------------- | ---- | -------------------------------------------------------- |
| `eyebrow`     | `string`                           | 否   | 空白或省略時呈現 `Closing`                               |
| `takeaways`   | `{ ref?: string; text: string }[]` | 是   | 0–4 筆；每筆 text 都須非空白才能匯出，ref 為自由文字參照 |
| `closingLine` | `string`                           | 否   | 聯絡或下一步說明，緊接 takeaways 呈現，不固定在頁底      |

Parser 拒絕超過四筆 takeaways；未填文字仍可儲存為草稿。Deck Template 保留 closingLine，清空 title、eyebrow 與 takeaways，並清除 Boundary Note。

### `layout: "side-by-side"`

質性比較兩個選項；不使用 Comparison Metric。共用 `title`、兩欄 label 與每個已加入的 point 都須非空白，才能匯出。

| 欄位       | 型別                             | 必填 | 說明                                                                   |
| ---------- | -------------------------------- | ---- | ---------------------------------------------------------------------- |
| `columns`  | `[Column, Column]`               | 是   | 固定兩欄；每欄 `{ label: string, points: string[] }`，points 為 1–4 筆 |
| `chosen`   | `0 \| 1`                         | 否   | 選定的欄索引；以強調色上緣線與 Chosen 標籤呈現                         |
| `tradeoff` | `{ why: string; cost?: string }` | 否   | 存在時 why 必須非空白才能匯出；cost 可省略                             |

省略 chosen 與 tradeoff 仍是有效的開放比較。Parser 拒絕欄數、點數或 chosen 超出範圍；空白文案仍可儲存為草稿。支援 Boundary Note、Hidden Page 與 Page Position；兩欄等寬，Observatory 為每欄的點加上呈現用序號。

Deck Template 清空標題、兩欄 label 與 points 的文字，保留各欄點數；chosen、tradeoff、Boundary Note 與 notes 清除。

### `layout: "full-width-panel"`

| 欄位    | 型別     | 必填 | 說明                                                     |
| ------- | -------- | ---- | -------------------------------------------------------- |
| `title` | `string` | 是   | 頁面結論；Content-complete 時不可空白                    |
| `panel` | `Panel`  | 是   | `table`、`flow`、`checklist` 或 `chart`；不接受 `fields` |

共用 Editorial Frame 與選填 Boundary Note。Panel 的 `title` 可為空字串，空白時不渲染 panel 標題；其他內容完整性規則與 Two-column 的同類 panel 相同，不需要三個 narrative items。

`observatory` 的 Full-width Panel 表格在資料欄之前顯示 `01`、`02`… 列索引。這是呈現用索引，不寫入 `columns`／`rows`，不改變 `referenceColumn`，也不出現在 `default` 或 Two-column 表格。Deck Template 沿用既有 panel 結構保留規則，清空頁面標題、Boundary Note 與 authored copy。

### `layout: "two-column"`

傳統雙欄版面（左欄三點 + 右側 panel）。

| 欄位    | 型別          | 必填 | 說明              |
| ------- | ------------- | ---- | ----------------- |
| `items` | `SlideItem[]` | 是   | 固定 **3** 筆     |
| `panel` | `Panel`       | 是   | 右側 card，見下表 |

### `layout: "html"`

16:9 全幅 HTML 逃生口頁面，整頁佔滿，不渲染三點與 panel。

| 欄位       | 型別     | 必填 | 說明                                                                                    |
| ---------- | -------- | ---- | --------------------------------------------------------------------------------------- |
| `htmlFile` | `string` | 是   | 相對該 Deck 目錄之單一檔名（如 `p03.html`），禁止包含路徑穿越（`..`）、路徑分隔符或空白 |

### `layout: "overview"`

結論先行的總覽。Eyebrow 由 renderer 固定為 `Overview`，不寫入 JSON。

| 欄位         | 型別        | 必填 | 說明                       |
| ------------ | ----------- | ---- | -------------------------- |
| `lead`       | `Outcome`   | 是   | 一個 Lead Outcome          |
| `supporting` | `Outcome[]` | 是   | 1–3 筆 Supporting Outcomes |

新增頁預設 1 個 Lead 與 2 個 Supporting；文字可為空草稿，tone 預設 `neutral`。Parser 拒絕超出 1–3 的 supporting 數量。

#### Outcome

| 欄位         | 型別           | 必填 |
| ------------ | -------------- | ---- |
| `workstream` | `string`       | 是   |
| `figure`     | `string`       | 是   |
| `result`     | `string`       | 是   |
| `impact`     | `string`       | 是   |
| `status`     | `StatusSignal` | 是   |

#### StatusSignal

| 欄位    | 型別                                       | 必填 |
| ------- | ------------------------------------------ | ---- |
| `label` | `string`                                   | 是   |
| `tone`  | `"positive"` \| `"caution"` \| `"neutral"` | 是   |

Clone 時保留 workstream 與 collection 長度，清除 figure／result／impact／status label，tone 重設為 `neutral`。

### `layout: "evidence-decision"`

Evidence-backed Decision。Eyebrow 固定為 `Evidence-backed Decision`。Baseline／Candidate 標籤由 renderer 產生。

| 欄位              | 型別                 | 必填 | 說明     |
| ----------------- | -------------------- | ---- | -------- |
| `verdict`         | `string`             | 是   | 裁決結論 |
| `metrics`         | `ComparisonMetric[]` | 是   | 1–2 筆   |
| `interpretations` | `string[]`           | 是   | 1–2 筆   |

新增頁預設兩個 metrics 與兩個 interpretations。數值可為 `null` 草稿。非法非空 metric 輸入會擋 Save／Copy，batch 略過該頁。

#### ComparisonMetric

| 欄位             | 型別                    | 必填 |
| ---------------- | ----------------------- | ---- |
| `label`          | `string`                | 是   |
| `baselineValue`  | `number \| null`        | 是   |
| `candidateValue` | `number \| null`        | 是   |
| `unit`           | `string`                | 是   |
| `unitPosition`   | `"before"` \| `"after"` | 是   |
| `unitSpacing`    | `"none"` \| `"space"`   | 是   |
| `precision`      | `0` \| `1` \| `2`       | 是   |

Clone 時保留 label／unit／format，baseline／candidate 重設為 `null`，清除 verdict 與 interpretations 文字。

### `layout: "next-actions"`

Next Actions。Eyebrow 固定為 `Next Actions`。Commitment 編號由陣列順序派生，不寫入 JSON。

| 欄位          | 型別                    | 必填 | 說明                                            |
| ------------- | ----------------------- | ---- | ----------------------------------------------- |
| `variant`     | `"rows"` \| `"columns"` | 否   | 既有文件省略時讀為 `columns`；新增頁預設 `rows` |
| `commitments` | `Commitment[]`          | 是   | 2–4 筆                                          |

新增頁預設三個空白 Commitments。

#### Commitment

| 欄位         | 型別     | 必填 |
| ------------ | -------- | ---- |
| `title`      | `string` | 是   |
| `outcome`    | `string` | 是   |
| `checkpoint` | `string` | 是   |

在編輯器的 **Composition** 可手動切換 Rows／Columns，不更動 Commitments 的內容或順序。Clone 時保留 variant 與 collection 長度，清除每個 Commitment 的 title／outcome／checkpoint。

### `layout: "trend-target"`

Trend & Target 呈現單一指標依週或月的量測與固定目標。新頁有八個 `unfilled` 位置；編輯器可填入 `measured` 值或明確標記 `missing`。

| 欄位                 | 型別                        | 必填 | 說明                                                                                                                            |
| -------------------- | --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| `metric`             | `object`                    | 是   | `label`、`unit`、`unitPosition`、`unitSpacing`、`precision`；格式選項同 Comparison Metric，預設為一位小數、單位置後、以空格分隔 |
| `cadence`            | `"week" \| "month"`         | 是   | 觀測週期                                                                                                                        |
| `start`              | `string \| null`            | 是   | 第一個觀測週期的起點：`week` 為真實 ISO 週一，`month` 為當月 1 日；未設定時只能有 `unfilled` 位置                               |
| `observations`       | `TrendObservation[]`        | 是   | 2–12 個連續位置；日期由 `start` 起以 UTC 每次加一週或一個月                                                                     |
| `target`             | `number \| null`            | 是   | 有限的固定門檻；`null` 是草稿                                                                                                   |
| `direction`          | `"at-most"` \| `"at-least"` | 是   | 包含等號的比較方向                                                                                                              |
| `interpretation`     | `string`                    | 是   | 對趨勢的文字解讀                                                                                                                |
| `measurementContext` | `string`                    | 是   | 投影片上可見的量測來源／條件                                                                                                    |

舊文件只有 `startMonday`、沒有 `cadence`／`start`：Parser 讀成 `cadence: "week"` 與 `start`，存檔後改寫為新欄位；同時提供兩種格式時拒絕。

每個觀測位置是 `{ "state": "measured", "value": <finite number> }`、`{ "state": "missing" }` 或 `{ "state": "unfilled" }`。只有 `measured` 能有 `value`；允許負數與零。Parser 拒絕無效日期、列舉值、非有限數字及非量測狀態中隱藏的數值。

公開虛構示例在 [`demo/2026-01-05.json`](../../demo/2026-01-05.json)：`p06` 為 12 週 at-most 與精確比較、`p07` 為含負數和零的 at-least、`p08` 為末週 Missing。`p04` 未設 variant，對照 `p09` 的相同 Commitments、Rows 版面；`p10` 為較長的 Rows 文字。

可儲存結構合法的草稿。匯出則需要必填文字、有效目標、至少兩個量測、沒有 `unfilled`、觀測終點（最後一個週期的起點）不晚於 Deck 的 `period.end`；沒有 `period` 時略過這項比較，且通過 Stage fit。`missing` 保留觀測位置並切斷折線；最後一個位置為 `missing` 時摘要顯示 No data。Clone 保留 metric、目標、觀測日期與所有狀態、Measurement Context，清空 title、interpretation、notes；不自動延伸或裁剪觀測位置。

### SlideItem

| 欄位      | 型別     | 必填 |
| --------- | -------- | ---- |
| `heading` | `string` | 是   |
| `body`    | `string` | 是   |

## Panel（discriminated union）

以 `kind` 區分。以下 `title` 欄位仍是字串；Two-column 要求非空標題才可匯出，Full-width Panel 允許空字串。

### `kind: "table"`

| 欄位      | 型別                                         | 必填          |
| --------- | -------------------------------------------- | ------------- |
| `title`   | `string`                                     | 是            |
| `columns` | `string[]`                                   | 是，至少 1 欄 |
| `rows`    | `{ cells: string[]; emphasis?: number[] }[]` | 是，至少 1 列 |

- `emphasis`：以欄位 index 標記粗體 cell
- `referenceColumn?: number`：選填的零起算資料欄索引，須為整數且落在 `columns` 範圍內；無效值拒絕整份 Deck。適用於 Two-column 與 Full-width Panel。
- 參照欄靠右、不換行並使用 accent 色；`observatory` 使用 mono 字型。參照欄不是內容完整性條件。
- 表格編輯器可選 None 或欄名。刪除被參照的欄時清除設定；刪除它之前的欄時索引減一。Deck Template 保留參照欄設定與欄數，但沿用既有規則清空欄名與儲存格文案。

### `kind: "chart"`

| 欄位         | 型別                                                   | 必填 |
| ------------ | ------------------------------------------------------ | ---- |
| `title`      | `string`                                               | 是   |
| `categories` | `string[]`                                             | 是   |
| `series`     | `{ name: string; color?: string; values: number[] }[]` | 是   |

- `values` 長度應與 `categories` 一致（工坊可編輯對齊）

### `kind: "flow"`

| 欄位    | 型別                                                                 | 必填 |
| ------- | -------------------------------------------------------------------- | ---- |
| `title` | `string`                                                             | 是   |
| `steps` | `{ label: string; caption?: string; variant?: "default" \| "ok" }[]` | 是   |

### `kind: "checklist"`

| 欄位    | 型別                                     | 必填 |
| ------- | ---------------------------------------- | ---- |
| `title` | `string`                                 | 是   |
| `items` | `{ label: string; checked?: boolean }[]` | 是   |

### `kind: "fields"`（spec only，v1 未渲染）

| 欄位    | 型別                                 | 必填 |
| ------- | ------------------------------------ | ---- |
| `title` | `string`                             | 是   |
| `rows`  | `{ label: string; value: string }[]` | 是   |

## 匯出 PNG 檔名

```text
{monday}-{page.id}.png
```

範例：`2026-08-24-p02.png`

## 解析實作

`src/lib/deck.ts` — `parseDeck()`

## 相關文件

- [開發伺服器 API](dev-server-api.md)
- [編輯並儲存 Deck](../how-to/edit-and-save-a-deck.md)
