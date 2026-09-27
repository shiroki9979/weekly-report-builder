# 匯出 PNG 至團隊簡報

建立日期：2026-08-31  
最後更新：2026-09-27

---

## 方式 A：複製目前預覽頁（單張）

1. **Page** 切換至要貼上的那一頁
2. 在 **16:9 preview** 區塊點 **Copy to clipboard**
3. 至 PowerPoint / Google Slides 貼上

剪貼簿寫入完成後才會顯示複製成功。HTML 載入、截圖或剪貼簿寫入失敗時，畫面會顯示目前 Page ID、週次與原因；可改用法 B。

## 方式 B：批次下載所有可見頁

1. 確認已 **Save** 最新內容
2. 點 **Download PNGs**
3. 瀏覽器下載多個 PNG，檔名格式：`YYYY-MM-DD-p01.png`（週一日期 + 頁面 id）
4. 查看原週次的結果摘要：**Downloads triggered**、**Skipped**、**Failed**、**Not attempted**。瀏覽器可能阻擋下載，因此 Downloads triggered 不保證檔案已儲存。
5. 依團隊 deck 順序插入各 PNG

## 匯出範圍

- **包含**：未隱藏、內容完整、且能量測為符合 1280 × 720 capture Stage 的 Structured Layout；以及成功載入的 HTML Page。
- **排除**：已勾選 **Hide page from export** 的頁面（靜默略過；見 [隱藏不需匯出的頁面](hide-pages-from-export.md)）
- **略過並列出原因**：未知 layout、`fields` panel、Draft Page、Overflowing Page、非法 metric 草稿、HTML 載入失敗，以及量測或 PNG 產生失敗。其餘合格頁仍會輸出。

下載觸發或共用 capture 設施發生錯誤時，批次停止；摘要保留已觸發下載與已略過頁、標示失敗的當頁和後續未處理頁。失敗原因以 `Download trigger failed:` 開頭時，代表瀏覽器下載觸發失敗而非頁面內容問題；Copy 的 `Clipboard write failed:` 同理。全數略過或沒有可見頁時，摘要會明確顯示 **Downloads triggered: 0**。匯出途中可繼續編輯或切週；結果仍歸屬開始匯出時的週次。

Copy 目前頁時，若該頁是 Draft、Overflowing、量測／PNG 產生失敗或 HTML 載入失敗，會阻擋並顯示原因。HTML Page 不套用 Structured Layout 的內容與 overflow gate。

## 排除匯出阻擋

### Draft Page

1. 解鎖 **Edit**
2. 依 readiness alert 填完缺少的必填欄位
3. **Save**
4. 再點 **Copy to clipboard** 或 **Download PNGs**

### Overflowing Page

1. 縮短標題、Outcome、Comparison Metric 或 Commitment，直到 Copy／Download 不再回報 1280 × 720 overflow（800 × 450 預覽警告只是 advisory）
2. **Save**
3. 再點 **Copy to clipboard** 或 **Download PNGs**

### 非法 Comparison Metric

1. 把非數字輸入改成有限非負數，或清空該欄
2. **Save**
3. 再點 **Copy to clipboard** 或 **Download PNGs**

## 相關文件

- 檔名規則細節：[週次 JSON 格式 — 頁面 id](../reference/week-json-format.md#page)
