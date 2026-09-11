# 匯出 PNG 至團隊簡報

建立日期：2026-08-31  
最後更新：2026-09-10

---

## 方式 A：複製目前預覽頁（單張）

1. **Page** 切換至要貼上的那一頁
2. 在 **16:9 preview** 區塊點 **Copy to clipboard**
3. 至 PowerPoint / Google Slides 貼上

剪貼簿失敗時，畫面會顯示錯誤訊息；可改用法 B，**Download PNGs** 不受影響。

## 方式 B：批次下載所有可見頁

1. 確認已 **Save** 最新內容
2. 點 **Download PNGs**
3. 瀏覽器下載多個 PNG，檔名格式：`YYYY-MM-DD-p01.png`（週一日期 + 頁面 id）
4. 依團隊 deck 順序插入各 PNG

## 匯出範圍

- **包含**：未隱藏、內容完整、且能量測為符合 1280 × 720 capture Stage 的 Structured Layout；以及 HTML Page（維持既有 capture 行為）
- **排除**：已勾選 **Hide page from export** 的頁面（靜默略過；見 [隱藏不需匯出的頁面](hide-pages-from-export.md)）
- **略過並警告**：未知 layout、`fields` panel、Draft Page、Overflowing Page、capture 量測失敗。警告會列出 Page ID 與原因，其餘合格頁仍會輸出。

Copy 目前頁時，若該頁是 Draft、Overflowing 或量測失敗，會阻擋並顯示原因。HTML Page 不套用這組 Structured Layout gate。

## 相關文件

- 檔名規則細節：[週次 JSON 格式 — 頁面 id](../reference/week-json-format.md#page)
