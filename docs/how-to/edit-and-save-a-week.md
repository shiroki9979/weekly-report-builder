# 編輯並儲存週次

建立日期：2026-08-31  
最後更新：2026-09-10

---

## 步驟

1. **Week** 選擇要編輯的週一日期
2. **Page** 選擇要編輯的頁面
3. 修改以下欄位（右側 16:9 預覽即時同步）：
   - **Title**：投影片主標；Weekly Overview 作為 conclusion-led headline
   - Two-column：**Item 1–3** 與右側 panel 區塊（依 `chart` / `table` / `flow` / `checklist`）
   - Weekly Overview：Lead Outcome 與 1–3 個 Supporting Outcomes（Add / Move / Remove / Make lead）
   - **Speaker notes**：備忘，不顯示於 stage；右側 preview 在投影片下方有可收合的 **Speaker notes** 小抄（唯讀，與表單同源）
4. 點 **Save**

## 驗證

重新整理頁面或切換至其他 Week 再切回，內容應與儲存前一致。

## 注意

- Slide 內文（`weeks/*.json`）語言不限；工坊 UI 為英文
- Hidden 頁面仍可在編輯器選取與修改，僅匯出 PNG 時略過（見 [隱藏不需匯出的頁面](hide-pages-from-export.md)）
- Draft Two-column 或 Weekly Overview 頁可 Save；編輯器會列出缺少欄位，Copy 會被阻擋

## 相關文件

- [週次 JSON 格式](../reference/week-json-format.md)
- [開發伺服器 API — PUT](../reference/dev-server-api.md#put-apiweeksmonday)
