# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 核准 Editorial Layout Family 的 production adoption 規格、領域語言與四段 sequential delivery 計畫（`docs/specs/editorial-layout-family.md`、`CONTEXT.md`）。
- 可拋棄的 Structured Layout 原型（Weekly Overview、Evidence-backed Decision、Next Actions），獨立入口 `prototype.html`，不接工坊資料與匯出（`src/prototype/`）。
- 記錄 800 × 450 目視驗證結果與後續生產驗證清單（`docs/explanation/layout-prototype.md`）。

### Changed

- 原型狀態小字改用對比達標的 `--ok-ink`／`--warn-ink`；成果改 `h2`、頁碼改 `footer`。

### Fixed

- 修正 Gallery 預覽控制的 HTML 語意，並提高 Gallery 標籤與返回按鈕的文字對比（`src/prototype/`）。

## [0.1.0] - 2026-09-04

### Added

- 個人週報工坊：Vite + React + shadcn（`base-nova`）殼，左編輯、右 16:9 預覽；Edit mode 鎖定、頁面 navigator、左右鍵切頁
- 週次 JSON（`weeks/YYYY-MM-DD.json`）：`two-column` 與 `table` / `chart` / `flow` / `checklist` panel；開發伺服 `GET` / `PUT` / `POST /api/weeks`
- 16:9 stage：PPT token（`stage.css`）；各 panel 渲染與工坊表單編輯
- 新週次自最新週 clone 結構（頁數、panel kind、hidden），清空標題與內文
- PNG 批次下載與預覽頁 copy-to-clipboard（略過 hidden；clipboard 失敗仍可下載）
- Preview chrome：可收合 Speaker notes 小抄（stage 下方；唯讀；不進 PNG）
- `layout: "html"` 全幅 16:9 逃生口：週目錄獨立 `.html`、JSON 只存 `htmlFile`；預覽 Shadow DOM、PNG 匯出 light DOM；clone 連檔拷貝
- 範例週次 `2026-08-24` 追加三頁 diagram HTML（Model archive／Eval gate／Atlas vs Variant B）
- Diátaxis 文件（`docs/`）、Agent 設定與 `.scratch` tickets、`.cursor/rules/language.mdc`
- 專案綁定 diagram-design 皮膚標記（`.diagram-design` → `weekly-report` profile）

### Changed

- 工坊 UI 與 README 改為英文；範例週次含 commits 圖表頁

### Fixed

- 消毒 HTML 逃生口時啟用 DOMPurify SVG profile，避免 inline 圖表被剝成空白投影片
