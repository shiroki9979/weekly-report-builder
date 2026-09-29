# 建立新週次

建立日期：2026-08-31  
最後更新：2026-09-28

---

## 適用情境

每週一需要新週次檔，且希望保留與上週相同的頁數、panel 種類與 hidden 設定。來源是本機 `decks/` 裡最新的 Deck（fresh install 時即為 Demo Deck Set 的副本）。

## 步驟

1. 啟動工坊（`pnpm dev`）
2. 在 **New week (Monday)** 選擇目標週一日期（預設為最新週的下一個週一）
3. 點 **Create week**
4. **Week** 下拉選單會切換至新週次；左側表單內容為空白，結構與上一週相同

## 結果

- 磁碟新增 `decks/YYYY-MM-DD.json`（`YYYY-MM-DD` 為所選週一）
- 若來源週次包含 `layout: "html"` 逃生口頁面，其引用的 `.html` 檔案會原樣拷貝至新週目錄（`decks/YYYY-MM-DD/<htmlFile>`）；JSON 內的 `htmlFile` 相對檔名維持不變，`title` 與 `notes` 比照雙欄頁清空
- 若來源週次包含 Overview，clone 會保留 workstream 與 Supporting 數量，清除當週數字與結論文字
- 若來源週次包含 Evidence-backed Decision，clone 會保留 metric label 與格式，baseline／candidate 重設為 `null`，並清除 verdict 與 interpretations
- 若來源週次包含 Next Actions，clone 會保留 Rows／Columns 選擇與 Commitment 數量，清除每個 Commitment 的 title／outcome／checkpoint
- 若來源週次包含 Trend & Target，clone 會保留帶日期的所有觀測、目標、指標格式與 Measurement Context，清除 Title、Interpretation 與 notes。新週不會自動加週或移除舊週；在編輯頁手動增減端點後填入新結果
- `period` 自動設為該週週一至週五
- 新週不複製上一週的 `showPageNumbers` 與 Editorial 頁的 `showPageNumber`，Editorial 頁碼回到預設顯示；HTML Page 逐頁開啟，沿用上一週該頁的 `showPageNumber`

## 常見問題

| 狀況                                   | 處理                                                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Week already exists`                  | 該週檔已存在，改選其他日期或先刪除舊檔                                                                                                                         |
| `Week file name must be a Monday date` | 所選日期不是週一                                                                                                                                               |
| `decks/` 不存在                        | 執行 `pnpm seed:decks`（與 `pnpm install` 的 `postinstall` 相同）。`pnpm build` 與 `pnpm dev` 都不會自動建立該目錄。                                           |
| `decks/` 存在但沒有週次檔              | 視為有意的空 store；bootstrap 不會補檔。移除這個空目錄後再執行 `pnpm seed:decks`。不要手動複製某個固定日期的週報。工坊會顯示 empty state，不會幫你建立第一週。 |

`demo/` 是 Git 追蹤的公開範例來源；你編輯與 Create week 寫入的永遠是被忽略的本機 `decks/`。忽略該目錄與從目前 index 移除它，不會刪除舊 commits 裡的 Git 物件。

若 Trend & Target 已達 12 週，先確認要移除的最早或最新端點，再補入新週。保留的 Measured／Missing 仍對應原日期；新增位置是 Unfilled，完成量測或明確標記 Missing 後才可匯出。不要把上一週的結論當成新週結論。

## 相關文件

- API 細節：[開發伺服器 API — POST](../reference/dev-server-api.md#post-apiweeksmonday)
- 欄位結構：[週次 JSON 格式](../reference/deck-json-format.md)
- 指令行為：[pnpm 指令](../reference/npm-scripts.md)
