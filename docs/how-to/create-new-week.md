# 建立新週次

建立日期：2026-08-31  
最後更新：2026-09-23

---

## 適用情境

每週一需要新週次檔，且希望保留與上週相同的頁數、panel 種類與 hidden 設定。來源是本機 `weeks/` 裡最新的 Week Document（fresh install 時即為 Demo Week Set 的副本）。

## 步驟

1. 啟動工坊（`pnpm dev`）
2. 在 **New week (Monday)** 選擇目標週一日期（預設為最新週的下一個週一）
3. 點 **Create week**
4. **Week** 下拉選單會切換至新週次；左側表單內容為空白，結構與上一週相同

## 結果

- 磁碟新增 `weeks/YYYY-MM-DD.json`（`YYYY-MM-DD` 為所選週一）
- 若來源週次包含 `layout: "html"` 逃生口頁面，其引用的 `.html` 檔案會原樣拷貝至新週目錄（`weeks/YYYY-MM-DD/<htmlFile>`）；JSON 內的 `htmlFile` 相對檔名維持不變，`title` 與 `notes` 比照雙欄頁清空
- 若來源週次包含 Weekly Overview，clone 會保留 workstream 與 Supporting 數量，清除當週數字與結論文字
- 若來源週次包含 Evidence-backed Decision，clone 會保留 metric label 與格式，baseline／candidate 重設為 `null`，並清除 verdict 與 interpretations
- 若來源週次包含 Next Actions，clone 會保留 Commitment 數量，清除每個 Commitment 的 title／outcome／checkpoint
- `start` / `end` 自動設為該週週一至週五
- 新週不複製上一週的 `showPageNumbers` 與各頁 `showPageNumber`，頁碼回到預設顯示

## 常見問題

| 狀況                                   | 處理                                                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Week already exists`                  | 該週檔已存在，改選其他日期或先刪除舊檔                                                                                                                         |
| `Week file name must be a Monday date` | 所選日期不是週一                                                                                                                                               |
| `weeks/` 不存在                        | 執行 `pnpm seed:weeks`（與 `pnpm install` 的 `postinstall` 相同）。`pnpm build` 與 `pnpm dev` 都不會自動建立該目錄。                                           |
| `weeks/` 存在但沒有週次檔              | 視為有意的空 store；bootstrap 不會補檔。移除這個空目錄後再執行 `pnpm seed:weeks`。不要手動複製某個固定日期的週報。工坊會顯示 empty state，不會幫你建立第一週。 |

`demo/` 是 Git 追蹤的公開範例來源；你編輯與 Create week 寫入的永遠是被忽略的本機 `weeks/`。忽略該目錄與從目前 index 移除它，不會刪除舊 commits 裡的 Git 物件。

## 相關文件

- API 細節：[開發伺服器 API — POST](../reference/dev-server-api.md#post-apiweeksmonday)
- 欄位結構：[週次 JSON 格式](../reference/week-json-format.md)
- 指令行為：[pnpm 指令](../reference/npm-scripts.md)
