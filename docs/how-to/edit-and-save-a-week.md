# 編輯並儲存週次

建立日期：2026-08-31  
最後更新：2026-08-31

---

## 步驟

1. **Week** 選擇要編輯的週一日期
2. **Page** 選擇要編輯的頁面
3. 修改以下欄位（右側 16:9 預覽即時同步）：
   - **Title**：投影片主標
   - **Item 1–3**：左欄三點（heading + body）
   - 右側 panel 區塊（依 `chart` / `table` / `flow` / `checklist` 顯示對應表單）
   - **Speaker notes**：備忘，不顯示於 stage
4. 點 **Save**

## 驗證

重新整理頁面或切換至其他 Week 再切回，內容應與儲存前一致。

## 注意

- Slide 內文（`weeks/*.json`）語言不限；工坊 UI 為英文
- Hidden 頁面仍可在編輯器選取與修改，僅匯出 PNG 時略過（見 [隱藏不需匯出的頁面](hide-pages-from-export.md)）

## 相關文件

- [週次 JSON 格式](../reference/week-json-format.md)
- [開發伺服器 API — PUT](../reference/dev-server-api.md#put-apiweeksmonday)
