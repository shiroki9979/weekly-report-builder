# 第一份週報

> 建立日期：2026-08-31  
> 最後更新：2026-09-28

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

`pnpm install` 會在本機還沒有 `weeks/` 時，從公開的 `demo/` 建立初始週報。瀏覽器開啟終端機顯示的本地網址（通常為 `http://localhost:5173`）。左側為編輯區，右側為 **16:9 preview**。

## 步驟 2：確認已開啟最新週次

工坊會列出可用週次並自動開啟最新的 Week Document，不必挑選固定日期。Fresh install 後，這就是剛 seed 進來的 Demo Week Set。

1. 確認 **Week** 下拉選單已選中該週
2. 右側預覽應顯示第一頁 slide

若畫面說明 `weeks/` 沒有 Week Document，先關掉開發伺服器，移除那個空目錄，再執行 `pnpm seed:weeks` 後重新 `pnpm dev`。

## 步驟 3：編輯第一頁標題

1. 確認 **Page** 為第一頁
2. 在 **Title** 欄位將標題改為 `My First Weekly Report`
3. 右側預覽標題應即時更新

## 步驟 4：儲存

點 **Save**。標題旁出現 `Saved` 即表示已寫入目前開啟週次的 `weeks/YYYY-MM-DD.json`（日期隨該週而變）。

## 步驟 5：匯出 PNG

1. 在 **16:9 preview** 區塊點 **Copy to clipboard**
2. 開啟團隊共用 PPT，在空白投影片按 Ctrl+V（macOS：Cmd+V）貼上

若剪貼簿失敗，改點 **Download PNGs**；瀏覽器會下載各可見頁的 PNG，檔名格式見 [匯出 PNG 至團隊簡報](../how-to/export-slides-to-team-deck.md)。

## 下一步

- 建立下週空白結構：[建立新週次](../how-to/create-new-week.md)
- 查 JSON 欄位定義：[週次 JSON 格式](../reference/week-json-format.md)
- 試用公開範例中的 Trend & Target 與 Next Actions Rows：[Author Editorial Layouts](../how-to/author-editorial-layouts.md)
- 查安裝與 seed 指令：[pnpm 指令](../reference/npm-scripts.md)
