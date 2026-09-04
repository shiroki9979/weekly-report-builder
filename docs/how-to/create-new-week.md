# 建立新週次

建立日期：2026-08-31  
最後更新：2026-09-03

---

## 適用情境

每週一需要新週次檔，且希望保留與上週相同的頁數、panel 種類與 hidden 設定。

## 步驟

1. 啟動工坊（`pnpm dev`）
2. 在 **New week (Monday)** 選擇目標週一日期（預設為最新週的下一個週一）
3. 點 **Create week**
4. **Week** 下拉選單會切換至新週次；左側表單內容為空白，結構與上一週相同

## 結果

- 磁碟新增 `weeks/YYYY-MM-DD.json`（`YYYY-MM-DD` 為所選週一）
- 若來源週次包含 `layout: "html"` 逃生口頁面，其引用的 `.html` 檔案會原樣拷貝至新週目錄（`weeks/YYYY-MM-DD/<htmlFile>`）；JSON 內的 `htmlFile` 相對檔名維持不變，`title` 與 `notes` 比照雙欄頁清空
- `start` / `end` 自動設為該週週一至週五

## 常見問題

| 狀況                                   | 處理                                                          |
| -------------------------------------- | ------------------------------------------------------------- |
| `Week already exists`                  | 該週檔已存在，改選其他日期或先刪除舊檔                        |
| `Week file name must be a Monday date` | 所選日期不是週一                                              |
| 尚無任何週次檔                         | 先手動建立第一個 `weeks/*.json`，或複製範例 `2026-08-24.json` |

## 相關文件

- API 細節：[開發伺服器 API — POST](../reference/dev-server-api.md#post-apiweeksmonday)
- 欄位結構：[週次 JSON 格式](../reference/week-json-format.md)
