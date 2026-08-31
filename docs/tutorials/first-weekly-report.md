# 第一份週報

> 建立日期：2026-08-31  
> 最後更新：2026-08-31

---

## 事前準備

- 已安裝 Node.js 與 pnpm
- 已 clone 本 repo 至本機

## 步驟 1：啟動工坊

在 repo 根目錄執行：

```bash
pnpm install
pnpm dev
```

瀏覽器開啟終端機顯示的本地網址（通常為 `http://localhost:5173`）。左側為編輯區，右側為 **16:9 preview**。

## 步驟 2：開啟範例週次

1. 在 **Week** 下拉選單選 `2026-08-24`
2. 右側預覽應顯示第一頁 slide

## 步驟 3：編輯第一頁標題

1. 確認 **Page** 為第一頁
2. 在 **Title** 欄位將標題改為 `My First Weekly Report`
3. 右側預覽標題應即時更新

## 步驟 4：儲存

點 **Save**。標題旁出現 `Saved` 即表示已寫入 `weeks/2026-08-24.json`。

## 步驟 5：匯出 PNG

1. 在 **16:9 preview** 區塊點 **Copy to clipboard**
2. 開啟團隊共用 PPT，在空白投影片按 Ctrl+V（macOS：Cmd+V）貼上

若剪貼簿失敗，改點 **Download PNGs**；瀏覽器會下載各可見頁的 PNG，檔名格式見 [匯出 PNG 至團隊簡報](../how-to/export-slides-to-team-deck.md)。

## 下一步

- 建立下週空白結構：[建立新週次](../how-to/create-new-week.md)
- 查 JSON 欄位定義：[週次 JSON 格式](../reference/week-json-format.md)
