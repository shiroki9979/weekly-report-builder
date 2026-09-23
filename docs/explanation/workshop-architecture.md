# 工坊架構

建立日期：2026-08-31  
最後更新：2026-09-23

---

## 產品定位

個人週報**編輯工坊**：表單編輯 → 16:9 預覽 → 匯出 PNG → 貼入團隊共用 deck。

**不是**：簡報播放器、多人協作、CMS、團隊 deck 替代品。

## 雙層 UI

| 區域                        | 技術                                         | 職責                           |
| --------------------------- | -------------------------------------------- | ------------------------------ |
| 工坊殼（左側編輯、toolbar） | shadcn / Base UI                             | 週次選擇、表單、儲存、匯出控制 |
| 16:9 stage（右側預覽）      | `stage.css` 與 `editorial-layouts.css` token | 投影片渲染；**不使用** shadcn  |

取捨：stage 視覺需對齊既有 PPT HTML（`--blue` 等 token），與工坊 chrome 刻意分離，避免 shadcn 主題污染畫布。

## 目錄所有權

公開與私有資料刻意拆成兩個目錄，執行期路徑則維持不變。

- **`demo/`**（tracked）：可公開的 Demo Week Set。它是 `postinstall`／`pnpm seed:weeks` 的複製來源，不是執行期寫入目標，也不是產品領域模型。
- **`weeks/`**（ignored）：本機 authoring store。真實週報只活在這裡。Git 忽略整個目錄，並從目前 index 移除既有 tracked paths；這一步**不重寫 Git history**，也不會刪除舊 commits 內的物件。
- **Runtime 契約不變**：瀏覽器仍走 `/weeks/...` URL；save／clone API、HTML 相對路徑與 `WEEKS_DIR` 覆寫繼續指向這個 runtime store。`WEEKS_DIR` 只給開發伺服器與測試隔離，bootstrap 不讀它。

Fresh checkout 靠 install bootstrap 取得可開啟的 `weeks/`。Workshop 先列出可用週次再開最新一週，因此 demo 日期可以演進，程式不必寫死某個週一。若 `weeks/` 已存在但沒有 Week Document，那是有意的空 store：bootstrap 與 `build` 都不會補檔或 seed；操作者須自行移除空目錄後再 `pnpm seed:weeks`。`build` 只複製既有 `weeks/`，缺少該目錄時失敗並提示手動 seed。

## 資料流

```text
demo/                          （tracked bootstrap 來源；不接受 runtime 寫入）
        │  僅在 weeks/ 不存在時複製
        ▼
weeks/YYYY-MM-DD.json          （ignored authoring store）
weeks/YYYY-MM-DD/*.html
        │
        ├─ GET /weeks/{monday}.json        ──► 工坊載入
        ├─ GET /weeks/{monday}/{htmlFile}  ──► HTML 頁預覽 fetch
        │
        ├─ 表單編輯（React state）
        │
        ├─ PUT /api/weeks/{monday}         ──► 儲存
        │
        └─ POST /api/weeks/{monday}        ──► clone 新週（連同 html 檔拷貝）
```

匯出時以 off-screen `StageCaptureHost` 逐頁渲染，經 `html-to-image` 產生 PNG；剪貼簿與下載為獨立 seam，clipboard 失敗不阻擋下載。針對 `layout: "html"` 逃生口頁面，預覽於畫布掛載 **Shadow DOM** 達成樣式隔離，但因截圖庫對 Shadow DOM 支援限制，匯出與複製時改注入至 `StageCaptureHost` 的 **Light DOM** 截圖。Structured Layout 的 Copy 與 batch export 共用 `assessExportEligibility`：內容未完成、overflow、或量測失敗會阻擋 Copy，batch 則略過該頁並繼續其他頁。Preview、Copy 與 batch 都透過 `createStagePageContext` 取得相同 Week Label 與 Page Position。

## 頁面模型

工坊支援下列頁面版面：

- `two-column`：標準雙欄（左欄固定 3 點 + 右側 panel；Panel kinds：`chart` | `table` | `flow` | `checklist`，`fields` 已 spec 未實作）。Workshop 可新增空白 Two-column 頁、刪除目前選取頁（不可刪最後一頁）並以上下移動排序；選取以 Page ID 保存。左欄間距見下方「Two-column 左側間距」。不渲染頁碼。
- `weekly-overview`：Editorial Layout。共用 Editorial Frame（eyebrow、headline、週次範圍、頁碼）。作者編輯一個 Lead Outcome 與 1–3 個 Supporting Outcomes，並可 Make lead。空白 Draft Page 可 Save；Copy 與 batch export 仍走 Export Readiness。
- `evidence-decision`：Editorial Layout。裁決條 + 1–2 個 Comparison Metric 與 1–2 則 interpretation。Metric 數值用 editor-local raw buffer；非法非空輸入擋 Save／Copy。
- `next-actions`：Editorial Layout。2–4 個 Commitment；顯示編號由順序派生。空白 Draft Page 可 Save；Copy 與 batch export 仍走 Export Readiness。
- `html`：16:9 全幅 HTML 逃生口。整頁由週資料夾獨立 `.html` 片段鋪滿，不渲染三點與 panel。工坊僅編輯相對檔名路徑、標題、講稿與 hidden，不提供線上 HTML 編輯器。HTML Page 不套用 Structured Layout 的 completeness 或 overflow gate。

新 layout 以新 `layout` 字串擴充；未知 layout 在 stage 顯示警告，且不可匯出。

Draft Structured Layout 可 Save，但 Copy 與 batch export 不輸出。Canonical overflow 量測使用固定 1280 × 720 capture Stage。Responsive preview overflow 僅為提示。

## Two-column 左側間距

左欄把主標、項目標題、內文視為同一條起始邊，圓點懸掛在這條邊的左側。關係只由版面決定，不看文案或語言。預覽與 PNG 共用 `src/styles/stage.css`。

- `.stage-slide` 左右內距都是 `5%`。主標與右側 panel 都落在這個內距裡，所以標題、左欄、右欄共用同一條格線。
- `.stage-item` 是兩欄 grid：圓點欄 `0.55em`、間距 `0.65em`，合計 `1.2em`。`margin-left: -1.2em` 把項目標題與內文拉回主標的起始邊，圓點落在左側 `5%` 內距裡。

## 語言邊界

- 工坊 UI 字串：英文
- `weeks/*.json` slide 內容：使用者自訂，語言不限

## 刻意不在 v1 的範圍

Login、分享、canvas 拖曳排版、從本 app 播放、以 localStorage 為唯一資料源。

## 相關文件

- [週次 JSON 格式](../reference/week-json-format.md)
- [pnpm 指令](../reference/npm-scripts.md)
- [第一份週報](../tutorials/first-weekly-report.md)
- [HTML 全幅頁規格](../specs/html-page-layout.md)
- [Layout 家族原型（歷史）](layout-prototype.md)
- [Editorial Layout Family production adoption 規格](../specs/editorial-layout-family.md)
