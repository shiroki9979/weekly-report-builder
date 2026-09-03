# 工坊架構

建立日期：2026-08-31  
最後更新：2026-09-03

---

## 產品定位

個人週報**編輯工坊**：表單編輯 → 16:9 預覽 → 匯出 PNG → 貼入團隊共用 deck。

**不是**：簡報播放器、多人協作、CMS、團隊 deck 替代品。

## 雙層 UI

| 區域                        | 技術                         | 職責                           |
| --------------------------- | ---------------------------- | ------------------------------ |
| 工坊殼（左側編輯、toolbar） | shadcn / Base UI             | 週次選擇、表單、儲存、匯出控制 |
| 16:9 stage（右側預覽）      | `src/styles/stage.css` token | 投影片渲染；**不使用** shadcn  |

取捨：stage 視覺需對齊既有 PPT HTML（`--blue` 等 token），與工坊 chrome 刻意分離，避免 shadcn 主題污染畫布。

## 資料流

```text
weeks/YYYY-MM-DD.json
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

匯出時以 off-screen `StageCaptureHost` 逐頁渲染，經 `html-to-image` 產生 PNG；剪貼簿與下載為獨立 seam，clipboard 失敗不阻擋下載。針對 `layout: "html"` 逃生口頁面，預覽於畫布掛載 **Shadow DOM** 達成樣式隔離，但因截圖庫對 Shadow DOM 支援限制，匯出與複製時改注入至 `StageCaptureHost` 的 **Light DOM** 截圖。

## 頁面模型

工坊支援兩種頁面版面：

- `two-column`：標準雙欄（左欄固定 3 點 + 右側 panel；Panel kinds：`chart` | `table` | `flow` | `checklist`，`fields` 已 spec 未實作）。
- `html`：16:9 全幅 HTML 逃生口。整頁由週資料夾獨立 `.html` 片段鋪滿，不渲染三點與 panel。工坊僅編輯相對檔名路徑、標題、講稿與 hidden，不提供線上 HTML 編輯器。

新 layout 以新 `layout` 字串擴充；未知 layout 在 stage 顯示警告。

## 語言邊界

- 工坊 UI 字串：英文
- `weeks/*.json` slide 內容：使用者自訂，語言不限

## 刻意不在 v1 的範圍

Login、分享、canvas 拖曳排版、從本 app 播放、以 localStorage 為唯一資料源。

## 相關文件

- [週次 JSON 格式](../reference/week-json-format.md)
- [第一份週報](../tutorials/first-weekly-report.md)
- 原始 spec：`.scratch/weekly-workshop/spec.md`
