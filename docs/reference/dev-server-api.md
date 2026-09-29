<!-- markdownlint-disable MD024 -->

# 開發伺服器 API

建立日期：2026-08-31  
最後更新：2026-09-29

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

自最新週次（只看週一日期 id，其他 Deck 不作為範本）clone 結構並建立新檔。見 [建立新週次](../how-to/create-new-week.md)。

### Response 201

```json
{ "deck": {/* Deck */} }
```

**Response 400**：無上一週可 clone、日期非週一等

**Response 409**：`Deck already exists: {monday}`

## 客戶端封裝

`src/lib/decks-client.ts` — `fetchDeckIds`、`fetchDeck`、`putDeck`、`createWeekFromPrevious`

## 相關文件

- [週次 JSON 格式](deck-json-format.md)
