# 工坊架構

建立日期：2026-08-31  
最後更新：2026-09-29

---

## 產品定位

個人 slide **編輯工坊**：表單編輯 → 16:9 預覽 → 匯出 PNG → 貼入團隊共用 deck。週報是內建的一種流程（Weekly Series），核心的 Deck、Page 與版型不依賴週次；決策見 [ADR-0001](../adr/0001-decouple-weekly-report-from-slide-core.md)。

**不是**：簡報播放器、多人協作、CMS、團隊 deck 替代品。

## 雙層 UI

| 區域                        | 技術                                         | 職責                            |
| --------------------------- | -------------------------------------------- | ------------------------------- |
| 工坊殼（左側編輯、toolbar） | shadcn / Base UI                             | Deck 選擇、表單、儲存、匯出控制 |
| 16:9 stage（右側預覽）      | `stage.css` 與 `editorial-layouts.css` token | 投影片渲染；**不使用** shadcn   |

取捨：stage 視覺需對齊既有 PPT HTML（`--blue` 等 token），與工坊 chrome 刻意分離，避免 shadcn 主題污染畫布。

## 目錄所有權

公開與私有資料刻意拆成兩個目錄，執行期路徑則維持不變。

- **`demo/`**（tracked）：可公開的 Demo Deck Set。它是 `postinstall`／`pnpm seed:decks` 的複製來源，不是執行期寫入目標，也不是產品領域模型。
- **`decks/`**（ignored）：本機 authoring store。真實週報只活在這裡。Git 忽略整個目錄，並從目前 index 移除既有 tracked paths；這一步**不重寫 Git history**，也不會刪除舊 commits 內的物件。
- **Runtime 契約不變**：瀏覽器走 `/decks/...` URL；save／clone API、HTML 相對路徑與 `DECKS_DIR` 覆寫繼續指向這個 runtime store。`DECKS_DIR` 只給開發伺服器與測試隔離，bootstrap 不讀它。

Fresh checkout 靠 install bootstrap 取得可開啟的 `decks/`。Workshop 透過 Deck store 列出可用 Deck，再由 Editing Session 開啟最新一週（沒有週次時開啟最後一份 Deck），因此 demo 日期可以演進，程式不必寫死某個週一。若 `decks/` 已存在但沒有 Deck，那是有意的空 store：bootstrap 與 `build` 都不會補檔或 seed；操作者須自行移除空目錄後再 `pnpm seed:decks`。`build` 只複製既有 `decks/`，缺少該目錄時失敗並提示手動 seed。

## 資料流

```text
demo/                          （tracked bootstrap 來源；不接受 runtime 寫入）
        │  僅在 decks/ 不存在時複製
        ▼
decks/<id>.json                （ignored authoring store）
decks/<id>/*.html
        │
        ├─ GET /decks/{monday}.json        ──► 工坊載入
        ├─ GET /decks/{monday}/{htmlFile}  ──► HTML 頁預覽 fetch
        │
        ├─ 表單編輯（React state）
        │
        ├─ PUT /api/decks/{monday}         ──► 儲存
        │
        └─ POST /api/decks/{monday}        ──► clone 新週（連同 html 檔拷貝）
```

Editing Session 持有開啟中的 Deck、Metric Input、選取的 Page ID 與載入／儲存／建立狀態；Deck store 封裝 Deck 讀寫路由。Copy 與 batch 在操作開始時取得 Editing Session 的唯讀快照，包含 Deck、Metric Input、選取頁面與 Deck ID；後續編輯或切換 Deck 不改變執行中的操作。匯出時以離屏 capture host 逐頁渲染，經 `html-to-image` 產生 PNG；剪貼簿與下載為獨立 seam。針對 `layout: "html"` 逃生口頁面，預覽於畫布掛載 **Shadow DOM** 達成樣式隔離，匯出與複製時則在 capture host 的 **Light DOM** 截圖。Copy 與 batch 共用單頁 Export gate；不符合內容或量測條件的頁面不會輸出。Preview、Copy 與 batch 都透過 `createStagePageContext` 取得相同 Frame Label 與 Page Position。

## 頁面模型

工坊支援下列頁面版面：

- `two-column`：標準雙欄（左欄固定 3 點 + 右側 panel；Panel kinds：`chart` | `table` | `flow` | `checklist`，`fields` 已 spec 未實作）。Workshop 可新增空白 Two-column 頁、刪除目前選取頁（不可刪最後一頁）並以上下移動排序；選取以 Page ID 保存。間距見下方「Two-column 間距」。不渲染頁碼。
- `overview`：Editorial Layout。共用 Editorial Frame（eyebrow、headline、週次範圍、頁碼）。作者編輯一個 Lead Outcome 與 1–3 個 Supporting Outcomes，並可 Make lead。空白 Draft Page 可 Save；Copy 與 batch export 仍走 Export Readiness。
- `evidence-decision`：Editorial Layout。裁決條 + 1–2 個 Comparison Metric 與 1–2 則 interpretation。Metric Input 由 Editing Session 持有；非法非空輸入擋 Save／Copy，batch 略過該頁。
- `next-actions`：Editorial Layout。2–4 個 Commitment；顯示編號由順序派生。空白 Draft Page 可 Save；Copy 與 batch export 仍走 Export Readiness。
- `html`：16:9 全幅 HTML 逃生口。整頁由週資料夾獨立 `.html` 片段鋪滿，不渲染三點與 panel。工坊僅編輯相對檔名路徑、標題、講稿與 hidden，不提供線上 HTML 編輯器。HTML Page 不套用 Structured Layout 的 completeness 或 overflow gate。

新 layout 以新 `layout` 字串擴充；未知 layout 在 stage 顯示警告，且不可匯出。

Draft Structured Layout 可 Save，但 Copy 與 batch export 不輸出。Canonical overflow 量測使用固定 1280 × 720 capture Stage。Responsive preview overflow 僅為提示。

## Two-column 間距

左欄把主標、項目標題、內文視為同一條起始邊，圓點懸掛在這條邊的左側。關係只由版面決定，不看文案或語言。預覽與 PNG 共用 `src/styles/stage.css`。

- `.stage-slide` 內距與 Editorial Frame 相同：上 `4.4%`、左右 `5%`、下 `3.2%`。兩種版型混排時，翻頁的邊界不會跳動。主標與右側 panel 都落在左右內距裡，所以標題、左欄、右欄共用同一條格線。
- 主標下方留 `4.6%`，等於 Editorial 標題到本文的距離（分隔線上下 `1.8%` + `2.8%`），明顯大於項目之間的間距。
- `.stage-item` 是兩欄 grid：圓點欄 `0.55em`、間距 `0.65em`，合計 `1.2em`。`margin-left: -1.2em` 把項目標題與內文拉回主標的起始邊，圓點落在左側 `5%` 內距裡。

## 語言邊界

- 工坊 UI 字串：英文
- `decks/*.json` slide 內容：使用者自訂，語言不限

## 刻意不在 v1 的範圍

Login、分享、canvas 拖曳排版、從本 app 播放、以 localStorage 為唯一資料源。

## 相關文件

- [週次 JSON 格式](../reference/deck-json-format.md)
- [pnpm 指令](../reference/npm-scripts.md)
- [第一份週報](../tutorials/first-weekly-report.md)
- [HTML 全幅頁規格](../specs/html-page-layout.md)
- [Layout 家族原型（歷史）](layout-prototype.md)
- [Editorial Layout Family production adoption 規格](../specs/editorial-layout-family.md)
