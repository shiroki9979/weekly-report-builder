<!-- markdownlint-disable MD024 -->

# 開發伺服器 API

建立日期：2026-08-31  
最後更新：2026-11-08

---

僅在 `pnpm dev` 開發模式下可用。路徑中的 `{id}` 是 Deck ID：`^[a-z0-9][a-z0-9-]{0,63}$`（`src/lib/deck-id.ts`），週次使用週一日期 `YYYY-MM-DD`，其他 Deck 可用任意符合格式的 slug。實作：`vite.config.ts`（`decksStaticPlugin`）、`server/decks-store.ts`。可用環境變數 `DECKS_DIR` 覆寫 decks 目錄；Playwright 以此注入測試專用複本，不寫入 production `decks/`。

## GET /api/decks

列出 `decks/` 目錄下所有 Deck ID（含週一日期與其他 slug）。

### Response 200

```json
{
  "decks": ["2026-08-24", "2026-08-31", "q4-roadmap"]
}
```

依字串升序排列；週一日期因此依日期排序。

## GET /decks/{id}.json

靜態讀取週次 JSON（Vite 靜態 middleware）。

| 參數   | 說明    |
| ------ | ------- |
| `{id}` | Deck ID |

**Response**：週次 JSON 檔案內容；不存在時 404。

## PUT /api/decks/{id}

寫入或覆寫週次檔。body 須通過 `parseDeck` 驗證。

**Request body**：`Deck` JSON

### Response 200

```json
{ "ok": true }
```

### Response 400

```json
{ "error": "<message>" }
```

## POST /api/decks/{monday}

已有週次時，以最新的週一日期 Deck 為模板；尚無週次時，以 request 的 `templateId` 指定本機已儲存的 Deck。兩者皆沿用 Deck Template 規則清空文案並建立新檔。見 [建立新週次](../how-to/create-new-week.md)。

### Request body（選填）

```json
{ "templateId": "demo-observatory" }
```

`templateId` 須為合法 Deck ID。只在尚無週次時使用；已有週次時仍採最新週次。省略 body 或傳入 `{}` 可沿用舊版建週呼叫，但尚無週次時必須提供既有模板。來源 HTML 檔缺漏時中止建立。

### Response 201

```json
{ "deck": {/* Deck */} }
```

**Response 400**：無週次且未指定模板、模板不存在、非法 body／Deck ID、日期非週一等

**Response 409**：`Deck already exists: {monday}`

## 客戶端封裝

- `src/lib/decks-client.ts` — `fetchDeckIds`、`fetchDeck`、`putDeck`
- `src/lib/weekly-series-client.ts` — `createWeekFromPrevious`（週報流程的建新週）
- `src/lib/deck-store.ts` — `httpWorkshopStore` 把兩者組成 Workshop 使用的 `WorkshopStore`（`DeckStore` 加上 `WeeklySeriesStore`）

## 相關文件

- [Deck JSON 格式](deck-json-format.md)
