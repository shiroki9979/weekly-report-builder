<!-- markdownlint-disable MD024 -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- 文件 id 改為 Deck ID（小寫英數與連字號），不再限定週一日期；儲存、路由與 HTML Page 路徑只做這項路徑安全檢查。建新週與開啟時的預設週次只看週一日期 id（[#51](https://github.com/shiroki9979/weekly-report-builder/issues/51)）。
- 文件期間改為選填的 `period: { start, end }`；舊格式的頂層 `start`／`end` 仍可讀取，存檔後改寫為新格式。沒有期間的 Deck 可正常預覽與匯出，Editorial Frame 不顯示期間；公開 Demo 改用新格式（[#52](https://github.com/shiroki9979/weekly-report-builder/issues/52)）。
- 「保留結構、清空內容建立新文件」抽成通用的 `createDeckFromTemplate`，不依賴日期；週報專屬規則（最新週次當範本、下一個週一、週一到週五期間）集中在 `weekly-series`。建新週的行為不變（[#53](https://github.com/shiroki9979/weekly-report-builder/issues/53)）。
- Trend & Target 支援每月序列：新增 `cadence`（week／month）並以 `start` 取代 `startMonday`，舊檔自動讀成每週序列。編輯器可在尚未輸入觀測時切換 cadence；文案、軸標籤與日期檢查依 cadence 調整。Readiness 改與 Deck 的 `period.end` 比較，沒有期間時略過（[#54](https://github.com/shiroki9979/weekly-report-builder/issues/54)）。
- 用語與儲存改為 Deck：`weeks/` → `decks/`（`seed:decks` 會在 `decks/` 不存在時自動搬移舊目錄，兩者並存時停止並請作者處理）、`/api/weeks` → `/api/decks`、`WEEKS_DIR` → `DECKS_DIR`、`seed:weeks` → `seed:decks`。Weekly Overview 改名為 Overview（layout id `overview`，舊 id 仍可讀取）。Workshop 的 Week 選單改稱 Deck；週報專屬的 New week 流程保留（[#55](https://github.com/shiroki9979/weekly-report-builder/issues/55)）。
- Stage 改由呼叫端明確傳入文件 id，HTML Page 不再從投影片上顯示的週次文字反推資源路徑；為週報與 slide 核心解耦的第一步（[ADR-0001](docs/adr/0001-decouple-weekly-report-from-slide-core.md)、[#50](https://github.com/shiroki9979/weekly-report-builder/issues/50)）。

## [0.3.0] - 2026-09-28

### Added

- 新增 Trend & Target：以 2–12 個連續週次呈現單一量測與固定目標，區分已量測、缺測與未填；支援日期範圍維護、跨週沿用、儲存及 PNG 匯出（[#42](https://github.com/shiroki9979/weekly-report-builder/issues/42)、[#44](https://github.com/shiroki9979/weekly-report-builder/issues/44)～[#46](https://github.com/shiroki9979/weekly-report-builder/issues/46)）。
- Next Actions 新增可保存的 Rows／Columns 版型選擇；新頁預設 Rows，既有頁維持 Columns，週次複製保留選擇（[#43](https://github.com/shiroki9979/weekly-report-builder/issues/43)）。
- 公開 Demo Week Set 新增 Trend & Target 的雙向目標、缺測末週（英文、中文與中英混排各一頁）與 Next Actions 版型對照，並補上首次使用及分享檢查指引（[#47](https://github.com/shiroki9979/weekly-report-builder/issues/47)）。
- 新增共用 Export gate，讓 Copy 與批次匯出使用相同的頁面就緒及截圖規則；批次可略過未就緒頁面並回報部分結果（[#31](https://github.com/shiroki9979/weekly-report-builder/issues/31)～[#35](https://github.com/shiroki9979/weekly-report-builder/issues/35)）。
- Workshop 支援週次與單頁頁碼顯示切換；Editorial 頁預設顯示頁碼，HTML 頁可選擇疊印頁碼且新週沿用該設定（工具列註明 HTML 頁需逐頁開啟），Two-column 不顯示頁碼（[#28](https://github.com/shiroki9979/weekly-report-builder/issues/28)）。
- 新增雙情境 Slide 設計研究及 Trend & Target／Next Actions Rows 實作規格，記錄口頭報告與自行閱讀的版型依據（[研究筆記](docs/explanation/slide-design-research.md)、[#42](https://github.com/shiroki9979/weekly-report-builder/issues/42)）。

### Changed

- 編輯與週次存取改由 Editing Session 和 Week store 管理；Copy／批次匯出使用開始操作時的資料快照，後續切週或編輯不會改動正在執行的輸出（[#37](https://github.com/shiroki9979/weekly-report-builder/issues/37)～[#40](https://github.com/shiroki9979/weekly-report-builder/issues/40)）。
- 匯出結果區分頁面就緒問題、剪貼簿／下載失敗及尚未處理的頁面；批次摘要保留已觸發下載與略過原因（[#31](https://github.com/shiroki9979/weekly-report-builder/issues/31)、[#35](https://github.com/shiroki9979/weekly-report-builder/issues/35)）。
- 封存版型比較原型及 A/D 決策紀錄，移除開發用入口與指令，改由 Workshop 提供正式示例（[#47](https://github.com/shiroki9979/weekly-report-builder/issues/47)）。
- 統一 Two-column 投影片左側內距為 5% 並採用懸掛縮排，使項目標題與內文對齊主標基準線（[#29](https://github.com/shiroki9979/weekly-report-builder/issues/29)）。
- Week JSON parser 拒絕非數值的 chart value 與缺少的 chart／flow／checklist 陣列，錯誤訊息附欄位路徑，不再靜默轉成 `NaN`／空陣列。
- `pnpm typecheck` 改用 `tsc -b --noEmit`，實際檢查 app 與 node 兩個 TypeScript project。
- Chart、Flow、Checklist panel 的刪除 reducer 與 Table 一致，至少保留一筆；數量規則與錯誤訊息（含單複數）統一由 `CARDINALITY` 產生。

### Fixed

- Trend & Target 須先設定起始週一才能輸入觀測值；拒絕不存在的週一日期及數值下溢輸入；修正補填起始週後的資料顯示、極端／近值縱軸刻度與等值目標線的呈現；圖表維持全寬並依可用高度重算比例，空間不足時由 overflow 擋下匯出，不再縮小圖表或壓到摘要；缺測標記改用灰色，與目標線區分（[#42](https://github.com/shiroki9979/weekly-report-builder/issues/42)）。
- 修正複製新週後，無標題頁面在 Page 選單中的顯示，以及空白 chart 類別造成的重複 React key（[#47](https://github.com/shiroki9979/weekly-report-builder/issues/47)）。
- 背景分頁未派送動畫影格時，截圖準備不再無限等待；準備階段中止或逾時後會清理臨時 capture host 與晚到的 session（[#33](https://github.com/shiroki9979/weekly-report-builder/issues/33)）。
- 視窗高度不足時 16:9 預覽不再覆蓋 Speaker notes；Speaker notes 面板可拖曳調整高度並由標題列收合。
- 預覽的 overflow 量測失敗時改為顯示提示，不再當成版面合格而無聲略過。
- 切換或建立週次後才失敗的舊週載入、儲存與建立結果，改為留下 console 警告，不再無聲丟棄。
- 修正 Comparison Metric 非法草稿在含 `:` 的 Page ID、移動／刪除項目、刪除頁面或切換週次時的歸屬；Save 與 Copy 不會誤用舊值（[#13](https://github.com/shiroki9979/weekly-report-builder/issues/13)）。
- Two-column chart 的非法值不再被 readiness 標題稱為 Comparison Metric（[#12](https://github.com/shiroki9979/weekly-report-builder/issues/12)）。

## [0.2.0] - 2026-09-18

### Added

- Workshop 在既有 `weeks/` 沒有 Week Document 時顯示英文 empty state，說明需移除空目錄後執行 `pnpm seed:weeks`，且不會建立第一週（[#21](https://github.com/shiroki9979/weekly-report-builder/issues/21)）。
- 新增 tracked Demo Week Set 與原子 bootstrap，讓 `pnpm install`／`pnpm seed:weeks` 只在 `weeks/` 不存在時複製虛構 Harbor Grid 週報（[#20](https://github.com/shiroki9979/weekly-report-builder/issues/20)）。
- 核准 Demo Week Set bootstrap 規格，定義私有 `weeks/`、tracked `demo/`、atomic seed、latest-week 啟動與四段 delivery 計畫（[#19](https://github.com/shiroki9979/weekly-report-builder/issues/19)）。
- 核准 Editorial Layout Family 的 production adoption 規格、領域語言與四段 sequential delivery 計畫（`docs/specs/editorial-layout-family.md`、`CONTEXT.md`）。
- 記錄 800 × 450 目視驗證結果與後續生產驗證清單（`docs/explanation/layout-prototype.md`）。
- Workshop 頁面生命週期：以 Page ID 選取，可新增空白 Two-column、刪除目前頁與上下移動；Draft Page 可存但 Copy／批次匯出會阻擋或略過（`src/lib/page-lifecycle.ts`）。
- Two-column Export Readiness：內容完整性、1280 × 720 overflow 量測與 fail-closed 資格判定；Playwright 使用隔離 weeks 目錄（`src/lib/export-readiness.ts`）。
- 生產 Weekly Overview Structured Layout：schema、空白工廠、clone、專屬 editor、Editorial Frame renderer 與 Export Readiness（`src/components/stage/weekly-overview-slide.tsx`）。
- 生產 Evidence-backed Decision Structured Layout：metric formatter、raw numeric buffer、專屬 editor 與 Editorial Frame renderer（`src/lib/metric-format.ts`）。
- 生產 Next Actions Structured Layout：2–4 個 Commitment、派生編號、專屬 editor 與 Editorial Frame renderer（`src/components/stage/next-actions-slide.tsx`）。
- HTML Page error-PNG 後續規格：盤點 Preview／Copy／batch 對 fetch、消毒、timeout 與 capture 失敗的現況，並提出待 triage 的政策（`docs/specs/html-page-error-png.md`）。
- 隔離 Playwright 覆蓋 HTML Page 的 preview／Copy／batch／clone，以及 Delete dialog、鍵盤焦點與 800 × 450 wrapping。

### Changed

- production build 的 weeks 複製收回 Vite plugin 內部，安裝公開 seam 仍只有 `pnpm install`／`pnpm seed:weeks`；缺 store 由 build 行程與 CI 驗證，不斷言內部 copy 步驟（[#26](https://github.com/shiroki9979/weekly-report-builder/issues/26)）。
- Week-editor 改以單一 load status 表達 empty store 與清單失敗，兩者在型別上互斥（[#25](https://github.com/shiroki9979/weekly-report-builder/issues/25)）。
- CI 在成功 production build 前驗證缺少 `weeks/` 時以非零結束並提示 `pnpm seed:weeks`；Demo bootstrap 規格改以五個具名 layout 稱呼，不再使用 Production layout。
- 改為忽略整個本機 `weeks/` 並從目前 index 移除作者週報，Demo Week Set 維持公開於 `demo/`；README 與 Diátaxis 文件對齊自動 bootstrap、手動 seed 與隱私邊界（[#23](https://github.com/shiroki9979/weekly-report-builder/issues/23)）。
- 單元測試改讀 `tests/fixtures/`，不再依賴 runtime `weeks/` 作者週報，讓 clean CI 不必帶本機私有檔（[#22](https://github.com/shiroki9979/weekly-report-builder/issues/22)）。
- Workshop 啟動改為先列出可用週次再開啟最新 Week Document，不再依賴硬編碼日期；清單失敗維持 error，不與 empty store 混用（[#21](https://github.com/shiroki9979/weekly-report-builder/issues/21)）。
- 工坊就緒摘要與批次略過原因改用 Draft Page／Overflowing Page，不以 invalid page 稱呼 Draft Page。
- Editorial Layout Family 編輯器共用 week-page updater 與 Title／notes／Hide chrome；preview／editor／clone／readiness／Add page 共用 `matchWeekPage`。
- Comparison Metric raw draft 以具名 path 型別鍵入，Move／Remove 仍重對 buffer。
- README 工作流程改為涵蓋 Editorial Layout Family，不再只描述 Two-column 三欄加 panel。
- 匯出 How-To 補上 Draft Page、Overflowing Page 與非法 Comparison Metric 的排除步驟。
- Workshop empty state 不再預設「既有 `weeks/` 目錄」，`weeks/` 缺失與空目錄都提示先移除空目錄（若存在）再 `pnpm seed:weeks`。

### Fixed

- 修復切換週次後過期的儲存結果可能覆蓋新選取 Week Document 的競態；week-editor 僅公開單一 load status（[#25](https://github.com/shiroki9979/weekly-report-builder/issues/25)）。
- production build 在缺少 `weeks/` 時改為提示執行 `pnpm seed:weeks` 並以非零結束，不再隱含 seed 或丟出原始檔案系統錯誤（[#22](https://github.com/shiroki9979/weekly-report-builder/issues/22)）。
- Copy／批次匯出改由單一 Export Readiness 入口合併非法 metric draft；Move／Remove comparison metric 時 raw buffer 會跟著重對路徑（`src/lib/export-readiness.ts`）。
- Week Page 找不到或型別不符時不再使用 Page index 錯誤字串；型別不符會帶 Page ID（`src/lib/week-editor.ts`、`src/lib/update-week-page.ts`）。

## [0.1.0] - 2026-09-04

### Added

- 個人週報工坊：Vite + React + shadcn（`base-nova`）殼，左編輯、右 16:9 預覽；Edit mode 鎖定、頁面 navigator、左右鍵切頁
- 週次 JSON（`weeks/YYYY-MM-DD.json`）：`two-column` 與 `table` / `chart` / `flow` / `checklist` panel；開發伺服 `GET` / `PUT` / `POST /api/weeks`
- 16:9 stage：PPT token（`stage.css`）；各 panel 渲染與工坊表單編輯
- 新週次自最新週 clone 結構（頁數、panel kind、hidden），清空標題與內文
- PNG 批次下載與預覽頁 copy-to-clipboard（略過 hidden；clipboard 失敗仍可下載）
- Preview chrome：可收合 Speaker notes 小抄（stage 下方；唯讀；不進 PNG）
- `layout: "html"` 全幅 16:9 逃生口：週目錄獨立 `.html`、JSON 只存 `htmlFile`；預覽 Shadow DOM、PNG 匯出 light DOM；clone 連檔拷貝
- 範例週次 `2026-08-24` 追加三頁 diagram HTML（Model archive／Eval gate／SolarDB vs M2）
- Diátaxis 文件（`docs/`）、Agent 設定與 `.scratch` tickets、`.cursor/rules/language.mdc`
- 專案綁定 diagram-design 皮膚標記（`.diagram-design` → `weekly-report` profile）

### Changed

- 工坊 UI 與 README 改為英文；範例週次含 commits 圖表頁

### Fixed

- 消毒 HTML 逃生口時啟用 DOMPurify SVG profile，避免 inline 圖表被剝成空白投影片

[Unreleased]: https://github.com/shiroki9979/weekly-report-builder/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/shiroki9979/weekly-report-builder/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/shiroki9979/weekly-report-builder/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/shiroki9979/weekly-report-builder/releases/tag/v0.1.0
