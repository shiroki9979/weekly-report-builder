# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 範例週次 `2026-08-24` 追加三頁 `layout: html` 全幅圖（Model archive／Eval gate／Atlas vs Variant B）
- 專案綁定 diagram-design 皮膚標記（`.diagram-design` → `weekly-report` profile）
- Preview chrome：可收合的 **Speaker notes** 小抄（stage 下方、navigator 上方；唯讀；不進 PNG）
- 個人週報工坊：Vite + React + shadcn（`base-nova`）工坊殼，左編輯、右 16:9 預覽
- `weeks/YYYY-MM-DD.json` 週次檔案格式與解析（`two-column` layout；`table` / `chart` / `flow` / `checklist` panel 型別）
- 16:9 stage 預覽：`two-column` 雙欄版面與 PPT token（`stage.css`，畫布不用 shadcn）
- `table` panel：右側表格渲染
- `chart` panel：依 categories + named series 堆疊長條圖；工坊可增刪類別與系列
- `flow` panel：有序步驟（title + caption）；工坊可增刪、編輯與 reorder
- `checklist` panel：右側核取清單；工坊可增刪、編輯項目與勾選狀態
- 新週次：自最新週次 clone 結構（頁數、panel kind、hidden），清空標題與內文；`POST /api/weeks/:monday`
- PNG 匯出：略過 hidden 頁；批次下載 `YYYY-MM-DD-p02.png`；預覽頁 copy-to-clipboard（失敗時仍保留下載）
- 工坊編輯：週次列表、頁面選擇、標題／三點／表格或圖表／speaker notes、hide page
- 開發時透過 `GET/PUT /api/weeks` 讀寫 `weeks/*.json`
- Agent 設定（`AGENTS.md`）、`.scratch/weekly-workshop` spec 與 tickets
- `.cursor/rules/language.mdc`：工坊 UI 英文、slide 內容不限語言

### Fixed

- 消毒 HTML 逃生口片段時啟用 DOMPurify SVG profile，避免 inline 圖表被剝成空白投影片（`src/lib/html-page.ts`）

### Changed

- 工坊 UI 與 README 改為英文；範例週次 `2026-08-24.json` 含 commits 圖表範例頁
- 新增 Diátaxis 文件：`docs/`（tutorial、how-to、reference、explanation）
