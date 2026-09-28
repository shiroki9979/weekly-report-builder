# 架構加深候選

建立日期：2026-09-27  
最後更新：2026-09-28

---

2026-09-27 審查 `dev @ b42b183`，從 git 熱點（`workshop-shell.tsx`、`week-document.ts`、`page-editor-form.tsx`、`week-editor.ts`、`use-stage-export.ts`）找出可以把 shallow module 加深的地方。本文記錄候選與證據，以及考慮過但判定保留的 module；後續設計與實作狀態見下表。

用語：module、interface、implementation、seam、adapter、depth、leverage、locality 沿用 agent 的 `codebase-design` 詞彙。**Deep** module 是小 interface 後面藏大量行為；**shallow** module 的 interface 幾乎和 implementation 一樣複雜。領域名詞依 [CONTEXT.md](../../CONTEXT.md)。

強度分三級：Strong（證據充分，建議做）、Worth exploring（值得討論）、Speculative（視未來需求）。依賴類別決定測試方式：in-process 直接測新 interface；ports & adapters 以 in-memory adapter 取代遠端；mock 以 fake adapter 取代第三方或瀏覽器能力。標「靜態推論」的證據只讀程式推得，未在瀏覽器驗證。

## 總覽

| #   | 候選                                              | 強度            | 依賴類別         | 狀態                                                                                                                                                                         |
| --- | ------------------------------------------------- | --------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Editing Session module                            | Strong          | in-process       | 已實作於 [PR #41](https://github.com/shiroki9979/weekly-report-builder/pull/41)；[規格 #37](https://github.com/shiroki9979/weekly-report-builder/issues/37)、實作票 #38～#40 |
| 2   | Export gate module                                | Strong          | mock             | 已實作於 [PR #36](https://github.com/shiroki9979/weekly-report-builder/pull/36)；[規格 #31](https://github.com/shiroki9979/weekly-report-builder/issues/31)、實作票 #32～#35 |
| 3   | 以 Page ID 為範圍的頁面編輯                       | Worth exploring | in-process       | 候選                                                                                                                                                                         |
| 4   | Stage context 帶型別事實，頁碼政策收進同一 module | Worth exploring | in-process       | 候選                                                                                                                                                                         |
| 5   | Week store 成為真的 seam                          | Worth exploring | ports & adapters | client 端已實作於 [PR #41](https://github.com/shiroki9979/weekly-report-builder/pull/41)（#39）；伺服端路由、錯誤原因與 preview server 仍為候選                              |
| 6   | 每種 Structured Layout 一個 module                | Speculative     | in-process       | 候選                                                                                                                                                                         |

初次審查建議先做 1（現已實作於 [PR #41](https://github.com/shiroki9979/weekly-report-builder/pull/41)）：它是唯一反覆出 bug、orchestration 又沒有測試的地方；完成後削減第一熱點 `workshop-shell.tsx` 的接線，並替 3 鋪好同一個編輯 module。後續設計訪談選定 2，收斂結果記錄於該候選下方。

決定實作時開 GitHub Issue 並在「狀態」欄連結；否決時寫下理由，避免之後的審查重提。

## 1. Editing Session module

typed Week Document、Metric Input 與存檔狀態同住一處。原名「Week 草稿 module」，因與 Draft Page 撞名而改名；Editing Session 與 Metric Input 的定義見 [CONTEXT.md](../../CONTEXT.md)。

- **審查時相關 module（歷史快照）**：`src/components/workshop/workshop-shell.tsx`（`WorkshopShellBody`）、已刪除的 `metric-draft-context.tsx`、`metric-draft-buffer.ts`、`use-week-editor.ts`、`use-week-save.ts`、`use-week-create.ts`，以及 `evidence-decision-editor-form.tsx`。當時 `metricBuffer` 參數另穿過 export 與 editor chrome；現由 `src/lib/editing-session.ts`、`src/hooks/use-editing-session.ts` 及 `src/lib/week-store.ts` 負責編輯狀態與週次存取，Export hook 只接收 snapshot 來源。
- **問題**：編輯中的 Week Document 分住兩個倉：`useWeekEditor` 的 `week` 與 `MetricDraftProvider` 的 buffer。兩倉的不變條件由呼叫端手動維持：shell 負責切週清空、lifecycle 後 `pruneMetricDrafts`、Save 前 `weekHasInvalidMetricDrafts`；Evidence-backed Decision 表單負責 Move／Remove 時 remap。存檔與建週的狀態又分在 `useWeekSave`、`useWeekCreate` 與 shell 的 `draftSaveError`，切週時沒有人重設。
- **做法**：Editing Session 同時持有 typed Week Document、Metric Input、選取的 Page ID 與載入／存檔／建週狀態。編輯、lifecycle、切週、Save 都穿過它，清理、重新對應與重設成為 implementation 細節；對外提供已套 Metric Input 的 readiness 與 Copy／batch 使用的唯讀 operation snapshot。
- **證據**：
  - Evidence-backed Decision 上線（`0773cfb`）後，三個 fix commit 各補一個漏接點：`06fdda6`（Move／Remove remap）、`c819ed5`（草稿改以 Page ID 分層）、`e5a6d2b`（lifecycle 後 prune、切週清空）。`e5a6d2b` 的修正全落在 shell，沒動 buffer module。
  - Remove 先 remap buffer，再跑可能 throw 的 reducer（`assertCanRemoveEntry`）；兩倉不是原子更新，只靠按鈕 disabled 擋住。
  - 切週後 shell 的 `draftSaveError` 與 `useWeekSave` 的 "Saved"／錯誤訊息會殘留在新週的 toolbar；建新週會清掉 "Saved"，切週不會（靜態推論）。
  - `useWeekSave`、`useWeekCreate` 各只有 `useWeekEditor` 一個呼叫端，deletion test 判定為 shallow；它們以 callback 把「過期結果怎麼擋」與「訊息何時清」交回呼叫端。
  - `useWeekEditor` 直接回傳 React 的 `setWeek`，shell 原樣交給表單當 `onChange`，任何呼叫端都能繞過規則換掉整份 Week Document。
  - `tests/unit/evidence-decision.test.ts` 的 "does not revive a deleted page's invalid draft…" 手動重演 shell 的 delete → prune → add 順序，shell 漏呼叫 prune 時它照樣通過。沒有任何測試渲染 `MetricDraftProvider`；context 預設值是 no-op，`page-lifecycle-controls.test.tsx` 在 provider 外渲染表單，草稿寫入在那裡被靜默丟掉。切週清空、Save 擋下與 lifecycle prune 都沒有測試。
- **收益**：locality，Week Document 與 Metric Input 的不變條件只在一處；更新成為原子操作；切週不再殘留舊訊息；Export hook 不再接收獨立 Metric Input；漏接類 bug 在 module 的 interface 測試中現形。
- **既有決定**：保留 [Editorial Layout Family 規格](../specs/editorial-layout-family.md) 規定的 Page ID 與 field path 鍵值，改由 Editing Session 持有 Metric Input。
- **狀態**：2026-09-27 設計定案，規格見 [#37](https://github.com/shiroki9979/weekly-report-builder/issues/37)，實作票 [#38](https://github.com/shiroki9979/weekly-report-builder/issues/38) → [#39](https://github.com/shiroki9979/weekly-report-builder/issues/39) → [#40](https://github.com/shiroki9979/weekly-report-builder/issues/40) 已納入 [PR #41](https://github.com/shiroki9979/weekly-report-builder/pull/41)。Editing Session 供應唯讀 operation snapshot，Export gate 契約維持不變。

## 2. Export gate module

Copy 與 batch export 共用同一條單頁流程。

- **審查時相關 module**：`src/lib/export-readiness.ts`（`assessExportEligibility`、`formatExportIssues`）、`src/lib/week-export.ts`（`exportVisiblePages`、`listExportablePages`、`listSkippedPages`）、`src/hooks/use-stage-export.ts`（`blockedBeforeCapture`、`copyCurrentPage`）、`src/lib/overflow-measurement.ts`、`src/components/workshop/export-controls.tsx`（`StageCaptureHost`）、`src/components/stage/html-slide.tsx`、`src/lib/content-readiness-copy.ts`。以下問題與證據均為審查時的歷史快照。
- **問題**：`assessExportEligibility(page, capture?, buffer)` 的 interface 夾帶一個兩段協定：先不帶 capture 呼叫，把 `measurement-failed` 當成「還沒量」濾掉，HTML Page 跳過量測，渲染並量測後再呼叫一次。Copy 與 batch 各寫一份，capture host 掛載、HTML 載入完成的判定與 issue 文案也由呼叫端各自拼湊。
- **做法**：一個 export gate module 擁有單頁完整流程（判定 → 渲染 → 量測 → 再判定 → 截圖）。render、measure、capture 以 adapter 注入，capture host 掛載、HTML settle 協定與 capture root 查找都藏在瀏覽器 adapter 內。batch 逐頁跑 gate 後下載，Copy 跑一次 gate 後寫入剪貼簿，兩者與編輯器摘要共用同一份 issue 文案。
- **證據**：
  - `exportVisiblePages` 與 `copyCurrentPage` 加 `blockedBeforeCapture` 是同一段協定的兩份拷貝；「HTML Page 不量測」寫了三次（`assessExportEligibility`、`exportVisiblePages`、`copyCurrentPage`）。
  - `measurement-failed` 同時代表「未提供量測」與真正的量測失敗。
  - 同一個 capture root 用兩種 selector 找：`use-stage-export.ts` 用 `.stage-root`，`overflow-measurement.ts` 用 `[data-stage-capture-root]`。
  - HTML 載入完成靠隱藏的 DOM 協定：`use-stage-export.ts` 讀 `[data-status]`，對應 `html-slide.tsx` 寫入的值。
  - `useStageExport` 的 interface 有順序約束：呼叫端自己建 `captureHostRef`，並用回傳的 `capturePage` 掛上 `StageCaptureHost`。
  - 同一組 `ExportIssue[]` 有三種寫法：Copy 用 `formatExportIssues`，batch 用 `formatExportIssueReason`，編輯器摘要用 `contentReadinessHeading`。
  - `week-export.test.ts` 的 "skips unknown layouts from batch export" 完全沒呼叫 `exportVisiblePages`，只測沒有 production 呼叫端的 `listExportablePages`、`listSkippedPages`；`use-stage-export.test.tsx` 得重建 shell 的接線並 `vi.mock` 三個 module。
- **收益**：「還沒量」的哨兵不再外漏；locality，HTML Page 例外只寫一次；capture root 與 settle 協定藏進 adapter；瀏覽器 DOM 與測試 fake 兩個 adapter 讓 seam 成真；Copy 的測試不必掛 DOM；issue 文案一處產生；刪掉兩個只剩測試在用的函式。
- **既有決定**：落實規格〈Module design〉的「Copy 與 batch 不得自行重建 rules」。
- **設計訪談（2026-09-27，Q1～Q11 已收斂）**：
  - 已確認：本次同時調整匯出失敗政策與重構共用流程。
  - 已確認：browser adapter 封裝 capture host 生命週期、HTML 載入等待與 capture root 查找，收回呼叫端的掛載與順序約束。
  - 已確認：HTML Load Failure（非法檔案參照、404／其他載入失敗、載入逾時）阻擋 Copy，batch 略過並列出原因，不再輸出錯誤畫面的 PNG；預覽維持既有行為。
  - 已確認：單頁 HTML 載入逾時、量測失敗或 PNG 產生失敗，Copy 阻擋、batch 記錄 Page ID 與原因後繼續；共用 capture host／root 不存在或輸出寫入拋錯則停止操作，保留先前處理結果。
  - 已確認：固定操作開始時的 Week Document、raw 草稿與頁面脈絡，允許繼續編輯／切週；結果標示原週次。HTML 檔案仍在處理該頁時載入，不屬於資料快照。
  - 已確認：Copy 與 batch 共用互斥限制；忙碌時拒絕新請求、不排隊，UI 同步停用按鈕。
  - 已確認：`html-load-failed`、`measurement-failed`、`capture-failed` 分別代表 HTML 載入、量測與 PNG 產生失敗；共用設施與輸出寫入錯誤屬整次操作失敗。
  - 已確認：batch 顯示原週次、已觸發下載／略過／失敗／未處理數量及異常 Page ID／原因；Hidden Page 不計入，不宣稱檔案已儲存。
  - 已確認：HTML 載入與量測上限維持 3 秒／5 秒，PNG 產生新增 15 秒上限；PNG 逾時後隔離舊頁，丟棄遲到結果，batch 繼續。
  - 已確認：Copy、batch 與編輯器共用原因文字，各自保留前綴與摘要；編輯器不因此執行正式截圖。
  - 已確認：browser adapter 為每次單頁 capture session 自行建立並清理臨時 React root；shell 不再掛 capture host／ref／Provider。沿用既有 Stage renderer 與 CSS，adapter 負責 commit、unmount 與遲到結果隔離。
  - module 介面、失敗政策與驗收設計見 [HTML Page export failure policy](../specs/html-page-error-png.md)。完整規格為 [#31](https://github.com/shiroki9979/weekly-report-builder/issues/31)；四張實作票依 [共用截圖流程 #32](https://github.com/shiroki9979/weekly-report-builder/issues/32) → [失敗政策 #33](https://github.com/shiroki9979/weekly-report-builder/issues/33)／[操作快照 #34](https://github.com/shiroki9979/weekly-report-builder/issues/34) → [結果摘要 #35](https://github.com/shiroki9979/weekly-report-builder/issues/35) 完成，整體實作見 [PR #36](https://github.com/shiroki9979/weekly-report-builder/pull/36)。

## 3. 以 Page ID 為範圍的頁面編輯

收掉約 60 個 `(week, pageIndex, …)` mutation 函式。

- **相關 module**：`src/lib/week-editor.ts`、`src/lib/weekly-overview-editor.ts`、`src/lib/evidence-decision-editor.ts`、`src/lib/next-actions-editor.ts`、`src/lib/update-week-page.ts`、`src/components/workshop/page-editor-props.ts`、`src/components/workshop/page-editor-form.tsx` 與各 `*-editor-form.tsx`、`src/lib/editing-session.ts`（`editSessionContent`）。
- **問題**：約 60 個 mutation 函式都吃 `(week, pageIndex, …)` 並回傳整份 Week Document，每個 input 都寫 `onChange(setX(week, pageIndex, …))`。CONTEXT.md 要求以 Page ID 定址、避免 "Page index"；lifecycle 與 Metric Input 都用 Page ID，唯獨內容編輯用陣列位置：表單以 `pageIndex` 組出整份 Week Document 的 updater，再交給 Editing Session 的一般編輯入口。
- **做法**：表單只拿到自己那一頁、該頁的 readiness 與一個以 Page ID 為範圍的更新入口，week 層級的寫回只在編輯 module 發生一次。維持不變條件的操作留下，一行 spread 的 setter 併入各版面自己的更新。
- **Deletion test**：刪 `setChartPanelTitle`、`setFlowStepLabel`，複雜度直接消失，屬 shallow pass-through；刪 `addChartCategory`、`removeTableColumn`，series 對齊與 emphasis 重排會散回表單，值得留下。
- **證據**：
  - chart、flow、checklist 表單各自以 `issuePathsFor(week.pages[pageIndex])` 反推頁面，一個 Two-column chart 頁每次 render 要算 3 次 readiness。
  - 8 個表單檔共 29 處手拼 readiness path 字串（例如 `` `panel.series[${i}].name` ``）去比對 `export-readiness.ts` 的輸出；aria-invalid 的測試只斷言 Title。
  - Move 邏輯有 7 份，越界處理不一：`moveItems` 不檢查，4 個版面 editor 的 move 各抄一份檢查，`moveSelectedPage` 回傳原狀，Metric Input remap 則補空位照搬。
  - 4 個一模一樣的「設定 panel 標題」函式；Title、Speaker notes、Hide 三個共用欄位手寫 3 份（`EditorialPageEditorChrome`、HTML 表單、Two-column 表單）。
  - 表單重寫 parser 的合法值：tone（對應 `isStatusTone`）、unitPosition、unitSpacing、precision。
  - `page-editor-props.ts` 的註解自承 panel 子表單「只改 panel，但寫回仍要整份 week 與頁面位置」。
  - 沒有任何測試的 setter：`setDecisionVerdict`、`setDecisionMetricLabel`、`setDecisionMetricUnit`、`setDecisionMetricFormat`、`setDecisionInterpretation`、`moveDecisionMetric`、`moveDecisionInterpretation`、`setFlowStepVariant`、`setTablePanelColumn`。
- **收益**：interface 縮小，implementation 吸收 setter；定址統一為 Page ID；表單不再傳遞整份 week；locality，path 字串的對應與 move 規則各收進一處；可併入 1 已實作的 Editing Session。
- **既有決定**：保留規格〈Editors〉的「每個 layout 自有 editor module，不做 schema-driven form engine」。

## 4. Stage context 帶型別事實，頁碼政策收進同一 module

- **相關 module**：`src/lib/stage-page-context.ts`（`createStagePageContext`、`mondayFromWeekLabel`）、`src/components/stage/stage-slide.tsx`、`src/components/stage/editorial-frame.tsx`、`src/lib/week-document.ts`（`PAGE_NUMBER_LAYOUTS`、`defaultPageNumberVisibility`、`isPageNumberVisible`）、`src/lib/week-clone.ts`、`src/components/workshop/page-number-select.tsx`、`src/components/workshop/page-navigator.tsx`、`src/components/workshop/workshop-shell.tsx`。
- **問題**：`StagePageContext` 把狀態藏進顯示字串：`StageSlide` 以 `pageLabel === "Hidden"` 判斷 Hidden Page，HTML Page 需要的 Monday 則從 Week Label `slice(0, 10)` 取回。頁碼可見性（週預設、單頁覆寫、HTML Page 預設不疊、Two-column 與 Hidden Page 不畫、clone 保留或丟棄）散在 6 個檔案，預設值 `showPageNumbers ?? true` 在 shell 又寫一次。
- **做法**：Stage context module 回傳型別事實（是否 Hidden、Monday、Page Position 序號與總數、是否畫頁碼），renderer 只負責畫。Week Label 格式與頁碼的預設、覆寫、clone 規則移進同一個 module。
- **證據**：
  - `pageLabel` 一個欄位有三種意思：`"1 / 3"`、`"Hidden"`、`""`。
  - HTML Page 的 Monday 取自 Week Label，匯出檔名與 Save URL 卻用 `selectedMonday`，parser 也不檢查 `start` 是否等於檔名的週一；手改 JSON 讓兩者不一致時，HTML Page 會到錯的資料夾抓檔（靜態推論）。
  - Week Label 有兩種寫法：Stage 用 em dash（`—`），標題列用 en dash（`–`）。
  - `PageNavigator` 顯示陣列位置（`selectedPageIndex + 1 / pages.length`），和 Stage 上的 Page Position 是不同數字；CONTEXT.md 的 Page Position 明列 _Avoid_: Array index。
  - 頁碼功能 `4ddbe1d`（#30）一次改了 22 個檔案，之後又有 `c819ed5`、`e5a6d2b`、`8fca8e8` 三次修補；`StageSlide`（HTML Page）與 `EditorialFrame` 各自決定畫不畫頁碼。
  - `stage-slide.test.tsx` 手造 `pageLabel: "Hidden"`，和 `stage-page-context.ts` 各自寫死同一個字串，改一邊，另一邊的測試不會失敗。
- **收益**：字串哨兵退場；HTML Page 的路徑不再取自顯示字串；locality，頁碼規則集中一處；renderer 不再各自判斷；測試斷言事實而非顯示字串。
- **既有決定**：規格〈Stage context Module〉已把這裡指定為 Preview、Copy、batch 共用的 seam；本候選只加深它。

## 5. Week store 成為真的 seam

- **相關 module**：`src/lib/weeks-client.ts`、`vite.config.ts`（`weeksApiMiddleware`、`weeksStaticMiddleware`）、`server/weeks-store.ts`、`src/lib/html-page.ts`（`resolveHtmlUrl`）、`src/lib/week-store.ts`（`WeekStore`、`httpWeekStore`）、`tests/unit/support/in-memory-week-store.ts`（`InMemoryWeekStore`）。
- **問題**：同一組路由與回應形狀（`/api/weeks`、`PUT／POST /api/weeks/{monday}`、`/weeks/{monday}.json`、`{ weeks }`、`{ week }`、409）拼寫在 `weeks-client.ts` 與 `vite.config.ts` 兩端；伺服端路由沒有 export，也沒有 unit test。審查時 hooks 直接 import `weeks-client`，只能靠依 URL 分派的 fetch stub 測試（已由 PR #41 解決）。
- **做法**：hooks 接受一個 Week store port（列出、載入、儲存、由上週建立），錯誤模式包含 server 回報的原因。瀏覽器用 HTTP adapter，hook 測試用 in-memory adapter。伺服端路由表搬到 `weeks-store` 旁，對暫存目錄測試。Week store port 與兩個 adapter 已完成；錯誤原因與伺服端路由表仍待處理（見〈狀態〉）。
- **證據**：
  - 審查時 `tests/unit/use-week-editor.test.tsx` 的 `mockWeeksFetch` 重寫一份路由分派器，`use-week-create.test.tsx` 與 `workshop-empty-store.test.tsx` 又各拼一次 URL。PR #41 刪除這些 stub，Week store 路由只剩 `tests/unit/http-week-store.test.ts` 一處測試知道。
  - middleware 與 HTTP 狀態對應沒有 export，也沒有 unit test，只有 e2e 走得到。
  - 錯誤原因在途中遺失：server 回 `{ error }`（[開發伺服器 API](../reference/dev-server-api.md) 有記載），`weeks-client.ts` 失敗時只用狀態碼組訊息，parser 的具體原因（例如 htmlFile 不合法）到不了作者。
  - 審查時建新週會丟掉 client `createWeekFromPrevious` 的回傳值，接著 list 兩次；PR #41 改為直接開啟回傳的 Week Document，只 list 一次。client 與 server 仍各有一個同名、簽名不同的 `createWeekFromPrevious`。
  - production build 只有一半的 adapter：plugin 只註冊 `configureServer`，沒有 preview server 的 middleware，而 Workshop 啟動必打 `/api/weeks`，所以 build 產物無法列出或儲存週次；`closeBundle` 也寫死複製到 `dist/weeks`（靜態推論）。
- **收益**：兩個 adapter 讓 seam 從假設變真；locality，路由只剩一處拼寫；hook 測試不再知道 URL；middleware 可以單元測試；錯誤原因傳得到作者。
- **既有決定**：`3bb7a71`（#26）刻意把 build 複製留在 `vite.config.ts` 內，避免第二條 bootstrap seam；本候選只動 API 路由，不碰 build 複製與 `seedWeeksFromDemo`。
- **狀態**：client 端已於 [PR #41](https://github.com/shiroki9979/weekly-report-builder/pull/41)（[#39](https://github.com/shiroki9979/weekly-report-builder/issues/39)）完成：四個操作的 Week store port、HTTP 與 in-memory adapter，由 App 注入。伺服端路由表與 middleware 測試、server 錯誤原因傳到作者、preview server adapter 仍為候選。

## 6. 每種 Structured Layout 一個 module

- **相關 module**：`src/lib/week-document.ts`、`src/lib/page-lifecycle.ts`、`src/components/workshop/page-lifecycle-controls.tsx`、`src/lib/week-clone.ts`、`src/lib/export-readiness.ts`、`src/components/stage/panels/stage-panel.tsx`、各 `*-editor.ts`。
- **問題**：每種 Structured Layout 的 schema 事實（parse、空白頁、clone 清除、readiness、頁碼參與、可否新增）依關注點分散在 6 個 module。新增一種 Structured Layout 要改 8 個既有檔案（含 `editorial-layouts.css`）、加 3 個新檔；`matchWeekPage` 讓 5 個分派點受編譯器檢查，但 `PAGE_NUMBER_LAYOUTS`、新增選單的字串 guard 與 `isStructuredWeekPage` 的 OR 清單不受檢查。Panel kind 連中央 matcher 都沒有。
- **做法**：每種 Structured Layout 一個 module 持有自己的 schema 事實，並登錄於一張表；表單與 renderer 維持各自手寫。不與規格衝突的第一步：panel kind 比照 `matchWeekPage` 加一個會窮舉的 matcher，並讓「Two-column 支援哪些 panel」只有一份。
- **證據**：
  - 實際紀錄：Evidence-backed Decision（`0773cfb`）改了 17 個 src 檔，Weekly Overview（`104bec3`）改了 13 個。
  - `blankCommitment` 由 `next-actions-editor.ts` 出口給 `week-clone.ts` 與 `page-lifecycle.ts`，`blankMetric`、`blankOutcome` 同理，editor module 兼當 schema module。
  - Panel kind 的 dispatch 有 9 處、分在 8 個檔案；「Two-column 支援 table、chart、flow、checklist，不支援 fields」寫在 6 處。`export-readiness.ts` 的 panel switch 不窮舉：新 kind 若加進 `SUPPORTED_TWO_COLUMN_PANEL_KINDS` 卻漏改 switch，內容檢查會被靜默跳過。
  - 判斷 layout 有兩套標準：`matchWeekPage` 看結構 guard，`isPageNumberVisible` 看原始字串。`workshop-page-numbers.test.tsx` 的 fixture 有一頁只帶 `agenda: []` 的 `weekly-overview`，前者當成 unknown，後者照樣畫頁碼。
  - 空 table 是 parse error，空 chart、flow、checklist 卻是 Draft Page。
- **收益**：locality，新版面集中在一個 module；分派點全受編譯器檢查；editor 不再兼 schema 出口；實作 spec-only 的 `fields` panel 時只動一處。
- **既有決定**：與規格〈Module design〉按關注點切分（Readiness Module 隱藏各 layout 的 completeness 規則）衝突；只有確定還要新增 Structured Layout 時才值得重開。panel matcher 那一步不衝突。

## 考慮過但判定保留

deletion test 判定以下 module earns its keep，之後的審查不必再提：

- `matchWeekPage`（`week-document.ts`）：matcher 物件型別讓 5 個呼叫端在新增 layout 時編譯失敗；刪掉就失去窮舉保護。
- `typedPageUpdater`（`update-week-page.ts`）：取代 4 個 editor module 各自的型別檢查與錯誤訊息。
- `CARDINALITY` 與 `canAddEntry`、`canRemoveEntry`、`assert*`：parser、reducer、表單按鈕與錯誤訊息的單複數共用同一份數量規則。
- `week-id.ts`：週一 id 格式由 dev server 路由、`weeks-io.ts`、`weeks-store.ts`、`html-page.ts`、`week-clone.ts` 共用。
- `validateHtmlFileName`：防路徑穿越的規則集中一處，跨 seam 有 4 個呼叫端。
- `stage-capture.ts`、`clipboard-image.ts`、`download-blob.ts`：外部依賴的 adapter；`exportVisiblePages` 以 deps 注入，production 與測試各一個 adapter，是真的 seam。
- `createStagePageContext`：保證 preview 與 capture 的 Week Label、Page Position 一致；摩擦只在輸出用字串承載語意（見 4）。
- `metric-input.ts`（原 `metric-draft-buffer.ts`）：路徑編解碼與 remap 集中在這裡；原本的同步問題已由 Editing Session 承擔（見 1）。
- `week-clone.ts` 的 `clearPage`：會窮舉的 matcher，每種 layout 的沿用規則集中一處。
- `EditorialPageEditorChrome`：3 個 Editorial 表單共用。
- `usePageKeyboardNav`：只有一個呼叫端，但集中「焦點在輸入框時不攔截方向鍵」的規則，且有專屬測試。
- `seedWeeksFromDemo`：atomic rename 與並行處理集中一處，是 bootstrap 唯一的 seam。

## 其他發現

不屬於加深候選，但值得處理：

- `src/lib/preview-page.ts` 的 `getPreviewPage` 沒有任何呼叫端。
- `tests/` 不在任何 tsconfig 的 `include`，`pnpm typecheck` 不檢查測試碼的型別。
- `tsconfig.node.json`（`vite.config.ts`、`server/`、`scripts/`）沒有開 `strict`。

## 相關文件

- [工坊架構](workshop-architecture.md)
- [Editorial Layout Family production adoption](../specs/editorial-layout-family.md)
- [CONTEXT.md](../../CONTEXT.md)
