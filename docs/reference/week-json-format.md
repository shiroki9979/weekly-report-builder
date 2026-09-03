# 週次 JSON 格式

建立日期：2026-08-31  
最後更新：2026-09-03

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

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `start` | `string` | 是 | 週一，ISO 日期 `YYYY-MM-DD` |
| `end` | `string` | 是 | 週五，ISO 日期 `YYYY-MM-DD` |
| `pages` | `WeekPage[]` | 是 | 至少一頁 |

## WeekPage（discriminated union）

以 `layout` 欄位區分版面模式。共同欄位如下：

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | `string` | 是 | 頁面識別，如 `p01`；匯出 PNG 檔名之一部分 |
| `layout` | `string` | 是 | `"two-column"` 或 `"html"` |
| `title` | `string` | 是 | 投影片主標（可為空字串） |
| `hidden` | `boolean` | 否 | `true` 時略過 PNG 批次匯出 |
| `notes` | `string` | 否 | Speaker notes，不渲染於 stage |

### `layout: "two-column"`

傳統雙欄版面（左欄三點 + 右側 panel）。

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `items` | `SlideItem[]` | 是 | 固定 **3** 筆 |
| `panel` | `Panel` | 是 | 右側 card，見下表 |

### `layout: "html"`

16:9 全幅 HTML 逃生口頁面，整頁佔滿，不渲染三點與 panel。

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `htmlFile` | `string` | 是 | 相對該週目錄之單一檔名（如 `p03.html`），禁止包含路徑穿越（`..`）、路徑分隔符或空白 |

### SlideItem

| 欄位 | 型別 | 必填 |
|------|------|------|
| `heading` | `string` | 是 |
| `body` | `string` | 是 |

## Panel（discriminated union）

以 `kind` 區分。

### `kind: "table"`

| 欄位 | 型別 | 必填 |
|------|------|------|
| `title` | `string` | 是 |
| `columns` | `string[]` | 是，至少 1 欄 |
| `rows` | `{ cells: string[]; emphasis?: number[] }[]` | 是，至少 1 列 |

- `emphasis`：以欄位 index 標記粗體 cell

### `kind: "chart"`

| 欄位 | 型別 | 必填 |
|------|------|------|
| `title` | `string` | 是 |
| `categories` | `string[]` | 是 |
| `series` | `{ name: string; color?: string; values: number[] }[]` | 是 |

- `values` 長度應與 `categories` 一致（工坊可編輯對齊）

### `kind: "flow"`

| 欄位 | 型別 | 必填 |
|------|------|------|
| `title` | `string` | 是 |
| `steps` | `{ label: string; caption?: string; variant?: "default" \| "ok" }[]` | 是 |

### `kind: "checklist"`

| 欄位 | 型別 | 必填 |
|------|------|------|
| `title` | `string` | 是 |
| `items` | `{ label: string; checked?: boolean }[]` | 是 |

### `kind: "fields"`（spec only，v1 未渲染）

| 欄位 | 型別 | 必填 |
|------|------|------|
| `title` | `string` | 是 |
| `rows` | `{ label: string; value: string }[]` | 是 |

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
