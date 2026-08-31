# 工坊架構

建立日期：2026-08-31  
最後更新：2026-08-31

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
        │
        ├─ GET /weeks/{monday}.json  ──► 工坊載入
        │
        ├─ 表單編輯（React state）
        │
        ├─ PUT /api/weeks/{monday}   ──► 儲存
        │
        └─ POST /api/weeks/{monday}  ──► clone 新週
```

匯出時以 off-screen `StageCaptureHost` 逐頁渲染，經 `html-to-image` 產生 PNG；剪貼簿與下載為獨立 seam，clipboard 失敗不阻擋下載。

## 頁面模型（v1）

- 單一 layout：`two-column`（左三點 + 右 panel）
- Panel kinds：`chart` | `table` | `flow` | `checklist`
- `fields` 已 spec、未實作

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
