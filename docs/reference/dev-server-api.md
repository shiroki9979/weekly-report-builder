<!-- markdownlint-disable MD024 -->

# 開發伺服器 API

建立日期：2026-08-31  
最後更新：2026-09-10

---

僅在 `pnpm dev` 開發模式下可用。實作：`vite.config.ts`（`weeksStaticPlugin`）、`server/weeks-store.ts`。可用環境變數 `WEEKS_DIR` 覆寫 weeks 目錄；Playwright 以此注入測試專用複本，不寫入 production `weeks/`。

## GET /api/weeks

列出 `weeks/` 目錄下所有週一日期。

### Response 200

```json
{
  "weeks": ["2026-08-24", "2026-08-31"]
}
```

週次依日期升序排列。

## GET /weeks/{monday}.json

靜態讀取週次 JSON（Vite 靜態 middleware）。

| 參數       | 說明         |
| ---------- | ------------ |
| `{monday}` | `YYYY-MM-DD` |

**Response**：週次 JSON 檔案內容；不存在時 404。

## PUT /api/weeks/{monday}

寫入或覆寫週次檔。body 須通過 `parseWeekDocument` 驗證。

**Request body**：`WeekDocument` JSON

### Response 200

```json
{ "ok": true }
```

### Response 400

```json
{ "error": "<message>" }
```

## POST /api/weeks/{monday}

自最新週次 clone 結構並建立新檔。見 [建立新週次](../how-to/create-new-week.md)。

### Response 201

```json
{ "week": {/* WeekDocument */} }
```

**Response 400**：無上一週可 clone、日期非週一等

**Response 409**：`Week already exists: {monday}`

## 客戶端封裝

`src/lib/weeks-client.ts` — `listWeekFiles`、`loadWeekDocument`、`saveWeekDocument`、`createWeekFromPrevious`

## 相關文件

- [週次 JSON 格式](week-json-format.md)
