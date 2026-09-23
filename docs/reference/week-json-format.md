# 週次 JSON 格式

建立日期：2026-08-31  
最後更新：2026-09-23

---

## 檔案路徑

```
weeks/YYYY-MM-DD.json
weeks/YYYY-MM-DD/<htmlFile>
```

- `YYYY-MM-DD`：該週**週一**日期
- 範例：`weeks/2026-08-24.json`
- HTML 全幅頁檔案放置於該週子目錄，例如 `weeks/2026-08-24/p03.html`

## WeekDocument（根物件）

| 欄位              | 型別         | 必填 | 說明                                        |
| ----------------- | ------------ | ---- | ------------------------------------------- |
| `start`           | `string`     | 是   | 週一，ISO 日期 `YYYY-MM-DD`                 |
| `end`             | `string`     | 是   | 週五，ISO 日期 `YYYY-MM-DD`                 |
| `pages`           | `WeekPage[]` | 是   | 至少一頁                                    |
| `showPageNumbers` | `boolean`    | 否   | Editorial 與 HTML 的全週頁碼預設；未提供時為顯示。`two-column` 不渲染頁碼 |

## WeekPage（discriminated union）

以 `layout` 欄位區分版面模式。共同欄位如下：

| 欄位             | 型別      | 必填 | 說明                                                                                     |
| ---------------- | --------- | ---- | ---------------------------------------------------------------------------------------- |
| `id`             | `string`  | 是   | 頁面識別，如 `p01`；同一 Week Document 內必須唯一；匯出 PNG 檔名之一部分                 |
| `layout`         | `string`  | 是   | `"two-column"`、`"html"`、`"weekly-overview"`、`"evidence-decision"` 或 `"next-actions"` |
| `title`          | `string`  | 是   | 投影片主標（可為空字串）                                                                 |
| `hidden`         | `boolean` | 否   | `true` 時略過 PNG 批次匯出                                                               |
| `notes`          | `string`  | 否   | Speaker notes，不渲染於 stage                                                            |
| `showPageNumber` | `boolean` | 否   | Editorial 與 HTML 的單頁覆蓋；未提供時繼承全週設定。`two-column` 忽略此欄                 |

Parser 會拒絕同一 Week Document 內重複的 `id`。自訂非 `pNN` 的非空 id 仍合法。空白字串仍是合法草稿：schema 接受未完成內容，匯出資格由獨立 readiness 判斷。

### `layout: "two-column"`

傳統雙欄版面（左欄三點 + 右側 panel）。

| 欄位    | 型別          | 必填 | 說明              |
| ------- | ------------- | ---- | ----------------- |
| `items` | `SlideItem[]` | 是   | 固定 **3** 筆     |
| `panel` | `Panel`       | 是   | 右側 card，見下表 |

### `layout: "html"`

16:9 全幅 HTML 逃生口頁面，整頁佔滿，不渲染三點與 panel。

| 欄位       | 型別     | 必填 | 說明                                                                                |
| ---------- | -------- | ---- | ----------------------------------------------------------------------------------- |
| `htmlFile` | `string` | 是   | 相對該週目錄之單一檔名（如 `p03.html`），禁止包含路徑穿越（`..`）、路徑分隔符或空白 |

### `layout: "weekly-overview"`

結論先行的週次總覽。Eyebrow 由 renderer 固定為 `Weekly Overview`，不寫入 JSON。

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

| 欄位          | 型別           | 必填 | 說明   |
| ------------- | -------------- | ---- | ------ |
| `commitments` | `Commitment[]` | 是   | 2–4 筆 |

新增頁預設三個空白 Commitments。

#### Commitment

| 欄位         | 型別     | 必填 |
| ------------ | -------- | ---- |
| `title`      | `string` | 是   |
| `outcome`    | `string` | 是   |
| `checkpoint` | `string` | 是   |

Clone 時保留 collection 長度，清除每個 Commitment 的 title／outcome／checkpoint。

### SlideItem

| 欄位      | 型別     | 必填 |
| --------- | -------- | ---- |
| `heading` | `string` | 是   |
| `body`    | `string` | 是   |

## Panel（discriminated union）

以 `kind` 區分。

### `kind: "table"`

| 欄位      | 型別                                         | 必填          |
| --------- | -------------------------------------------- | ------------- |
| `title`   | `string`                                     | 是            |
| `columns` | `string[]`                                   | 是，至少 1 欄 |
| `rows`    | `{ cells: string[]; emphasis?: number[] }[]` | 是，至少 1 列 |

- `emphasis`：以欄位 index 標記粗體 cell

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

```
{monday}-{page.id}.png
```

範例：`2026-08-24-p02.png`

## 解析實作

`src/lib/week-document.ts` — `parseWeekDocument()`

## 相關文件

- [開發伺服器 API](dev-server-api.md)
- [編輯並儲存週次](../how-to/edit-and-save-a-week.md)
