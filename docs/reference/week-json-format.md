# 週次 JSON 格式

建立日期：2026-08-31  
最後更新：2026-08-31

---

## 檔案路徑

```
weeks/YYYY-MM-DD.json
```

- `YYYY-MM-DD`：該週**週一**日期
- 範例：`weeks/2026-08-24.json`

## WeekDocument（根物件）

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `start` | `string` | 是 | 週一，ISO 日期 `YYYY-MM-DD` |
| `end` | `string` | 是 | 週五，ISO 日期 `YYYY-MM-DD` |
| `pages` | `WeekPage[]` | 是 | 至少一頁 |

## WeekPage

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `id` | `string` | 是 | 頁面識別，如 `p01`；匯出 PNG 檔名之一部分 |
| `layout` | `string` | 是 | v1 僅 `"two-column"` |
| `title` | `string` | 是 | 投影片主標（可為空字串） |
| `items` | `SlideItem[]` | 是 | 固定 **3** 筆 |
| `panel` | `Panel` | 是 | 右側 card，見下表 |
| `hidden` | `boolean` | 否 | `true` 時略過 PNG 批次匯出 |
| `notes` | `string` | 否 | Speaker notes，不渲染於 stage |

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
