# 架構加深候選

建立日期：2026-09-27  
最後更新：2026-11-23

---

2026-09-27 審查 `dev @ b42b183`，從 git 熱點（`workshop-shell.tsx`、`week-document.ts`、`page-editor-form.tsx`、`week-editor.ts`、`use-stage-export.ts`）找出可以把 shallow module 加深的地方。本文記錄候選與證據，以及考慮過但判定保留的 module；後續設計與實作狀態見下表。候選依狀態分成〈待處理〉與〈已完成〉兩部分，編號跨部分固定不變，實作完成時整節搬到〈已完成〉。

> **命名對照（2026-10-03）**：[ADR-0001](../adr/0001-decouple-weekly-report-from-slide-core.md) 在 [PR #56](https://github.com/shiroki9979/weekly-report-builder/pull/56) 把 Week 用語改為 Deck。各候選的「問題」與「證據」是審查時的快照，保留當時名稱；「相關 module」與〈考慮過但判定保留〉已改為現行名稱。對照：`week-document.ts` → `deck.ts`（Week Document → Deck）、`week-editor.ts` → `deck-editor.ts`、`weekly-overview-editor.ts` → `overview-editor.ts`、`update-week-page.ts` → `update-deck-page.ts`、`week-clone.ts` → `deck-template.ts`（通用）與 `weekly-series.ts`（週報流程）、`week-export.ts` → `deck-export.ts`、`weeks-client.ts` → `decks-client.ts` 與 `weekly-series-client.ts`、`week-store.ts`（`WeekStore`）→ `deck-store.ts`（`DeckStore`、`WorkshopStore`）、`server/weeks-store.ts` → `server/decks-store.ts`、`week-id.ts` → `deck-id.ts` 與 `calendar-date.ts`、`matchWeekPage` → `matchPage`、`/api/weeks` → `/api/decks`、`seedWeeksFromDemo` → `seedDecksFromDemo`。
>
> **第二次審查（2026-11-09）**：審查 `dev @ de71911`。候選 1、2、4 已完成；本次範圍是 2026-10 之後新增的四個 Structured Layout（Cover、Closing、Side-by-side Comparison、Full-width Panel）、Deck Theme（[ADR-0002](../adr/0002-deck-theme.md)），以及六週熱點（`deck.ts` 13 次、`use-editing-session.ts` 9 次、`trend-target.test.tsx` 10 次）。結果：候選 3、6 的證據已到齊並升為 Strong，候選 5 的伺服端殘餘原地未動，另新增候選 7～11。各候選下方標「2026-11-09 更新」的段落是本次的快照。
>
> **第三次審查（2026-11-22）**：審查 `dev @ 2b34d68`，範圍是 2026-11-09 之後的 44 個 commit：Eyebrow 成為共用 Editorial Frame chrome（#74～#79）、Two-column 納入 Editorial Frame（#67、#70、#71）、HTML Page 頁尾（#68）、`ledger` Deck Theme 與 `--mono` 角色（#66、#69）。結果：候選 3～11 都未實作，其中 3、6、7 問題持平，5、8、9、10 未動，11 的觸發條件已成立；另新增候選 12～16，各開一張 issue（#82～#86，issue 內文稱 C1～C5）。各候選下方標「2026-11-22 更新」的段落是本次的快照。
>
> **第三次審查補遺（2026-11-22）**：同日另一份平行審查的獨有證據併入候選 13～16 與〈其他發現〉，標「2026-11-22 補遺」；那份審查開的 #89～#94 已以 duplicate 關閉，併入 #82～#86。

用語：module、interface、implementation、seam、adapter、depth、leverage、locality 沿用 agent 的 `codebase-design` 詞彙。**Deep** module 是小 interface 後面藏大量行為；**shallow** module 的 interface 幾乎和 implementation 一樣複雜。領域名詞依 [GLOSSARY.md](../../GLOSSARY.md)。

強度分三級：Strong（證據充分，建議做）、Worth exploring（值得討論）、Speculative（視未來需求）。依賴類別決定測試方式：in-process 直接測新 interface；local-substitutable 以本機可跑的真實替身測試（例如 Playwright fixture）；ports & adapters 以 in-memory adapter 取代遠端；mock 以 fake adapter 取代第三方或瀏覽器能力。標「靜態推論」的證據只讀程式推得，未在瀏覽器驗證。

## 總覽

### 待處理

| #   | 候選                                            | 強度                                        | 依賴類別            | 來源                        | 狀態                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------- | ------------------------------------------- | ------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | 每種 Structured Layout 一個 schema module       | Strong                                      | in-process          | 2026-09-27；2026-11-09 升級 | 候選；第二次審查的首選                                                                                                                                                                                                                                         |
| 3   | 以 Page ID 為範圍的頁面編輯                     | Strong                                      | in-process          | 2026-09-27；2026-11-09 升級 | 候選                                                                                                                                                                                                                                                           |
| 7   | Deck lifecycle module：hook 裡的規則搬回 lib    | Strong                                      | in-process          | 2026-11-09                  | 候選；第二次審查的次選，建議與 8 同做                                                                                                                                                                                                                          |
| 13  | 編譯器看得見的 Editorial Frame 成員資格         | Strong（第一步）；Worth exploring（第二步） | in-process          | 2026-11-22                  | 第一步已實作於 [PR #97](https://github.com/shiroki9979/weekly-report-builder/pull/97)（[#83](https://github.com/shiroki9979/weekly-report-builder/issues/83)）；第二步為 [#98](https://github.com/shiroki9979/weekly-report-builder/issues/98)（needs-triage） |
| 8   | Location history adapter                        | Worth exploring                             | ports & adapters    | 2026-11-09                  | 候選                                                                                                                                                                                                                                                           |
| 9   | Trend SVG ink 解析移到 capture adapter          | Worth exploring                             | mock                | 2026-11-09                  | 候選                                                                                                                                                                                                                                                           |
| 10  | Trend chart geometry 成為 pure module           | Worth exploring                             | in-process          | 2026-11-09                  | 候選                                                                                                                                                                                                                                                           |
| 5   | Deck store 成為真的 seam（伺服端殘餘）          | Worth exploring                             | ports & adapters    | 2026-09-27                  | client 端已實作於 [PR #41](https://github.com/shiroki9979/weekly-report-builder/pull/41)（#39）；伺服端路由、錯誤原因與 preview server 仍為候選                                                                                                                |
| 15  | Overflow 保護成為 Editorial Frame 預設          | Worth exploring                             | local-substitutable | 2026-11-22                  | [#85](https://github.com/shiroki9979/weekly-report-builder/issues/85)（needs-triage）                                                                                                                                                                          |
| 16  | Frame chrome 字型成為 Deck Theme 角色           | Worth exploring                             | in-process          | 2026-11-22                  | [#86](https://github.com/shiroki9979/weekly-report-builder/issues/86)（needs-triage）；由 11 的觸發條件衍生                                                                                                                                                    |
| 11  | Observatory 主題檔裡的 layout 結構覆寫（N × M） | Speculative                                 | in-process          | 2026-11-09                  | 候選；2026-11-22 觸發條件已成立，字型部分轉為 16，結構覆寫未變大，維持記錄                                                                                                                                                                                     |

### 已完成

| #   | 候選                                              | 強度            | 依賴類別   | 狀態                                                                                                                                                                                                    |
| --- | ------------------------------------------------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Editing Session module                            | Strong          | in-process | 已實作於 [PR #41](https://github.com/shiroki9979/weekly-report-builder/pull/41)；[規格 #37](https://github.com/shiroki9979/weekly-report-builder/issues/37)、實作票 #38～#40                            |
| 2   | Export gate module                                | Strong          | mock       | 已實作於 [PR #36](https://github.com/shiroki9979/weekly-report-builder/pull/36)；[規格 #31](https://github.com/shiroki9979/weekly-report-builder/issues/31)、實作票 #32～#35                            |
| 4   | Stage context 帶型別事實，頁碼政策收進同一 module | Worth exploring | in-process | 已實作於 `2cb9a80`；2026-11-09 確認無字串哨兵殘留                                                                                                                                                       |
| 12  | 頁尾成為 Stage page context 的一個事實            | Strong          | in-process | 已實作於 `6626d32`；[#82](https://github.com/shiroki9979/weekly-report-builder/issues/82)，行為不變                                                                                                     |
| 14  | 一個 Editorial Frame chrome module                | Worth exploring | in-process | 已實作（[#84](https://github.com/shiroki9979/weekly-report-builder/issues/84)），範圍擴大為 page chrome；本文欄位的空白缺陷轉為 [#101](https://github.com/shiroki9979/weekly-report-builder/issues/101) |

初次審查建議先做 1（現已實作於 [PR #41](https://github.com/shiroki9979/weekly-report-builder/pull/41)）：它是唯一反覆出 bug、orchestration 又沒有測試的地方；完成後削減第一熱點 `workshop-shell.tsx` 的接線，並替 3 鋪好同一個編輯 module。後續設計訪談選定 2，收斂結果記錄於該候選下方。

第二次審查建議先做 6，第一步是 panel-kind matcher：它坐在第一熱點 `deck.ts`，前次審查要求的證據（確定還要新增 Structured Layout）已到齊，且不違反任何 ADR；6 先定下「一個 layout 的事實住哪裡」，3 的 per-layout 更新入口才有地方掛。次選為 7 連同 8。

第三次審查建議先做 12：它是本期改動最頻繁的區域（6 個 commit），改動小、in-process，並修正候選 4 的退化；目前只能從程式行為推出的頁尾規則會變成 context 上的一張表格測試。次選為 13 的第一步：`tests/` 納入 typecheck 後，14、15 與 6 新增的測試才不必再靠 runtime guard 補償。

決定實作時開 GitHub Issue 並在「狀態」欄連結；否決時寫下理由，避免之後的審查重提。第三次審查的候選已先開 issue，標 `needs-triage`。

## 待處理候選

### 3. 以 Page ID 為範圍的頁面編輯

收掉約 60 個 `(week, pageIndex, …)` mutation 函式。

- **相關 module**：`src/lib/deck-editor.ts`、`src/lib/overview-editor.ts`、`src/lib/evidence-decision-editor.ts`、`src/lib/next-actions-editor.ts`、`src/lib/update-deck-page.ts`、`src/components/workshop/page-editor-props.ts`、`src/components/workshop/page-editor-form.tsx` 與各 `*-editor-form.tsx`、`src/lib/editing-session.ts`（`editSessionContent`）。
- **問題**：約 60 個 mutation 函式都吃 `(week, pageIndex, …)` 並回傳整份 Week Document，每個 input 都寫 `onChange(setX(week, pageIndex, …))`。GLOSSARY.md 要求以 Page ID 定址、避免 "Page index"；lifecycle 與 Metric Input 都用 Page ID，唯獨內容編輯用陣列位置：表單以 `pageIndex` 組出整份 Week Document 的 updater，再交給 Editing Session 的一般編輯入口。
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
- **2026-11-09 更新**：問題仍在且變大，強度升為 Strong。
  - 7 個 editor module 共 79 個 exported 函式（`deck-editor` 39、`evidence-decision` 12、`overview` 9、`side-by-side` 7、`next-actions` 6、`closing` 5、`cover` 1），73 個吃 `(deck, pageIndex, …)` 回傳整份 Deck。`page-editor-props.ts:12` 的註解仍在。
  - 三種呼叫慣例並存：`(deck, pageIndex, fromIndex, toIndex)`（deck-editor、overview、next-actions、evidence-decision）、`(deck, pageIndex, move: EntryMove)`（closing、side-by-side）、欄位 bag `setCoverFields(deck, pageIndex, Partial<…>)`／`setTakeaway(deck, pageIndex, {index, text?, ref?})`。
  - readiness path 契約：11 個檔案 33 處 `invalidPaths.has(` 加 `trend-target-editor-form` 6 處 `paths.has(`，約 39 處手拼；只有 3 個單元斷言跨過這條 seam（`page-lifecycle-controls.test.tsx:153,179` 斷言 Title、`full-width-panel-editor.test.tsx:105` 一個反向檢查），改掉一個 path 名稱不會有單元測試失敗。
  - Full-width Panel 重用 panel 表單時沒有開新 seam：`PanelEditorForm` 的 `invalidPaths`／`readOnly` 只傳給 table 表單（`panel-editor-form.tsx:46-57`），chart／flow／checklist 表單各自重算 `issuePathsFor(deck.pages[pageIndex])`；Two-column 或 Full-width chart 頁每次 render 仍算 3 次 readiness。
  - 已改善：`move-entry.ts`（`89b8f83`）收掉 7 份 move，越界改為 throw 並有專屬測試；`panelUpdater` 收掉 guard 重複。但 panel 標題 setter 仍 4 份（`deck-editor.ts:162,276,411,504`）。`EditorialPageEditorChrome` 已服務 10 種 layout 中的 8 種。
  - deletion test 補充：`cover-editor.ts` 單一 spread 是 pass-through；`addComparisonPoint`、`removeTakeaway` 帶 cardinality assert，earn their keep。
  - 做法補充：readiness 以欄位識別回傳事實，表單不再拼字串；三種呼叫慣例在 per-layout 的 Page ID 更新入口下自然消失。
- **2026-11-22 更新**：問題持平。
  - 多一個 setter `setPageEyebrow`：80 個 export、75 個吃 `pageIndex`。
  - readiness path 仍為 12 檔 39 處；chart、checklist、flow 表單仍各自重算 `issuePathsFor(deck.pages[pageIndex])`。
  - Title、Speaker notes、Hide 的手寫份數從 3 降為 2（Two-column 改用共用 chrome，`1ea933a`），剩下 HTML 表單（`page-editor-form.tsx:86-160`）。
  - `EditorialPageEditorChrome` 已服務 10 種 layout 中的 9 種，內有 3 個 page-kind 分支且也服務 Cover，名稱不再貼切。

### 5. Deck store 成為真的 seam

- **相關 module**：`src/lib/decks-client.ts`、`src/lib/weekly-series-client.ts`、`vite.config.ts`（`decksApiMiddleware`、`decksStaticMiddleware`）、`server/decks-store.ts`、`src/lib/html-page.ts`（`resolveHtmlUrl`）、`src/lib/deck-store.ts`（`DeckStore`、`WorkshopStore`、`httpWorkshopStore`）、`tests/unit/support/in-memory-deck-store.ts`（`InMemoryWorkshopStore`）。
- **問題**：同一組路由與回應形狀（`/api/weeks`、`PUT／POST /api/weeks/{monday}`、`/weeks/{monday}.json`、`{ weeks }`、`{ week }`、409）拼寫在 `weeks-client.ts` 與 `vite.config.ts` 兩端；伺服端路由沒有 export，也沒有 unit test。審查時 hooks 直接 import `weeks-client`，只能靠依 URL 分派的 fetch stub 測試（已由 PR #41 解決）。
- **做法**：hooks 接受一個 Week store port（列出、載入、儲存、由上週建立），錯誤模式包含 server 回報的原因。瀏覽器用 HTTP adapter，hook 測試用 in-memory adapter。伺服端路由表搬到 `weeks-store` 旁，對暫存目錄測試。Week store port 與兩個 adapter 已完成；錯誤原因與伺服端路由表仍待處理（見〈狀態〉）。
- **證據**：
  - 審查時 `tests/unit/use-week-editor.test.tsx` 的 `mockWeeksFetch` 重寫一份路由分派器，`use-week-create.test.tsx` 與 `workshop-empty-store.test.tsx` 又各拼一次 URL。PR #41 刪除這些 stub，Week store 路由只剩 `tests/unit/http-week-store.test.ts` 一處測試知道。
  - middleware 與 HTTP 狀態對應沒有 export，也沒有 unit test，只有 e2e 走得到。
  - 錯誤原因在途中遺失：server 回 `{ error }`（[開發伺服器 API](../reference/dev-server-api.md) 有記載），`weeks-client.ts` 失敗時只用狀態碼組訊息，parser 的具體原因（例如 htmlFile 不合法）到不了作者。
  - 審查時建新週會丟掉 client `createWeekFromPrevious` 的回傳值，接著 list 兩次；PR #41 改為直接開啟回傳的 Week Document，只 list 一次。client 與 server 仍各有一個同名、簽名不同的 `createWeekFromPrevious`。
  - production build 只有一半的 adapter：plugin 只註冊 `configureServer`，沒有 preview server 的 middleware，而 Workshop 啟動必打 `/api/weeks`，所以 build 產物無法列出或儲存週次；`closeBundle` 也寫死複製到 `dist/weeks`（靜態推論）。
- **收益**：兩個 adapter 讓 seam 從假設變真；locality，路由只剩一處拼寫；hook 測試不再知道 URL；middleware 可以單元測試；錯誤原因傳得到作者。
- **既有決定**：`3bb7a71`（#26）刻意把 build 複製留在 `vite.config.ts` 內，避免第二條 bootstrap seam；本候選只動 API 路由，不碰 build 複製與 `seedDecksFromDemo`。
- **狀態**：client 端已於 [PR #41](https://github.com/shiroki9979/weekly-report-builder/pull/41)（[#39](https://github.com/shiroki9979/weekly-report-builder/issues/39)）完成：四個操作的 Week store port、HTTP 與 in-memory adapter，由 App 注入。伺服端路由表與 middleware 測試、server 錯誤原因傳到作者、preview server adapter 仍為候選。
- **2026-11-09 更新**：伺服端殘餘原地未動，另發現 seam 兩側的錯誤模式不一致。
  - 路由拼三處：`decks-client.ts:4,17,37` 與 `weekly-series-client.ts:8`、`vite.config.ts:25-27`（`DECK_API_ROUTE`／`DECK_JSON_ROUTE`／`DECK_HTML_ROUTE`）、`html-page.ts:38`（`/decks/{id}/{file}`）。
  - middleware 仍為 `vite.config.ts` 私有（86-143、202-224），請求形狀解析 `parseWeekTemplateId`（145-157）與狀態對應（121、136）也在那裡，沒有單元測試；`decks-store.test.ts` 14 個 temp-dir 測試只蓋 `server/decks-store.ts` 的檔案函式，`production-build-decks.test.ts` 只測缺 store 的 build 失敗。
  - `{ error }` 仍被丟掉（`decks-client.ts:46-48`、`weekly-series-client.ts:15-17`）。但 `InMemoryWorkshopStore` 會 throw 真正原因（`in-memory-deck-store.ts:35`："Deck already exists: …"），所以 `use-editing-session.test.tsx:470` 斷言的訊息是 HTTP adapter 永遠不會產生的：測試通過在作者看不到的行為上。兩個 adapter 的錯誤模式應一致。
  - `pnpm preview` 仍沒有 `/api/decks`：plugin 只有 `configureServer` 與 `closeBundle`，沒有 `configurePreviewServer`。
  - 已確認不是問題：Weekly Series 的建立規則 `planWeekFromPrevious`（`weekly-series.ts:58-74`）由 server 與 in-memory adapter 共用，client 只負責 POST。
- **2026-11-22 更新**：未動。

### 6. 每種 Structured Layout 一個 schema module

- **相關 module**：`src/lib/deck.ts`、`src/lib/page-lifecycle.ts`、`src/components/workshop/page-lifecycle-controls.tsx`、`src/lib/deck-template.ts`、`src/lib/export-readiness.ts`、`src/components/stage/panels/stage-panel.tsx`、各 `*-editor.ts`。
- **問題**：每種 Structured Layout 的 schema 事實（parse、空白頁、clone 清除、readiness、頁碼參與、可否新增）依關注點分散在 6 個 module。新增一種 Structured Layout 要改 8 個既有檔案（含 `editorial-layouts.css`）、加 3 個新檔；`matchWeekPage` 讓分派點受編譯器檢查，頁碼參與已改走 `hasPageNumberSlot`，新增選單與字串 guard 也已由同一張工廠表產生；`isStructuredWeekPage` 的 OR 清單仍不受窮舉檢查。Panel kind 連中央 matcher 都沒有。
- **做法**：每種 Structured Layout 一個 module 持有自己的 schema 事實，並登錄於一張表；表單與 renderer 維持各自手寫。不與規格衝突的第一步：panel kind 比照 `matchWeekPage` 加一個會窮舉的 matcher，並讓「Two-column 支援哪些 panel」只有一份。
- **證據**：
  - 實際紀錄：Evidence-backed Decision（`0773cfb`）改了 17 個 src 檔，Weekly Overview（`104bec3`）改了 13 個。
  - `blankCommitment` 由 `next-actions-editor.ts` 出口給 `week-clone.ts` 與 `page-lifecycle.ts`，`blankMetric`、`blankOutcome` 同理，editor module 兼當 schema module。
  - Panel kind 的 dispatch 有 9 處、分在 8 個檔案；「Two-column 支援 table、chart、flow、checklist，不支援 fields」寫在 6 處。`export-readiness.ts` 的 panel switch 不窮舉：新 kind 若加進 `SUPPORTED_TWO_COLUMN_PANEL_KINDS` 卻漏改 switch，內容檢查會被靜默跳過。
  - 曾有兩套 layout 判斷標準：`matchWeekPage` 看結構 guard，`isPageNumberVisible` 看原始字串；現已改為 `hasPageNumberSlot` 透過 `matchPage` 分派，兩者不再分歧。
  - 空 table 是 parse error，空 chart、flow、checklist 卻是 Draft Page。
- **收益**：locality，新版面集中在一個 module；分派點全受編譯器檢查；editor 不再兼 schema 出口；實作 spec-only 的 `fields` panel 時只動一處。
- **既有決定**：與規格〈Module design〉按關注點切分（Readiness Module 隱藏各 layout 的 completeness 規則）衝突；只有確定還要新增 Structured Layout 時才值得重開。panel matcher 那一步不衝突。
- **2026-11-09 更新**：前次要求的證據已到齊，升為 Strong，列為第二次審查首選。
  - `deck.ts` 1455 行、83 個 export，實為四個 module 黏在一檔：Page schema type（8-320）、layout identity（guard、`isEditorialFramePage`、`isStructuredPage`、`isSupportedStagePage`、`matchPage`，326-471）、Cardinality（474-585）、JSON parser（589-1455）。83 個 export 中 14 個沒有 src importer、24 個只有一個；寬度多在 type，行為集中在後三段。
  - 新增 Side-by-side（`6193f2a`）的實際改動：`deck.ts` 12 處（`SlideLayout`、`Page`、`StructuredPage`、`EditorialFramePage` 四個聯集、guard、`isEditorialFramePage` OR 清單、`isSupportedStagePage`、`PageMatchers` key、`matchPage` if 鏈、`CARDINALITY` 兩條、parser、`PAGE_PARSERS`）、`deck-template.ts` 的 `clearPageContent` arm、`page-lifecycle.ts` 的 blank 工廠／`AddableLayout`／`BLANK_PAGE_FACTORIES`、`page-lifecycle-controls.tsx` 的 `LAYOUT_LABELS`、`export-readiness.ts` 的 `assessSideBySide` 與 matcher arm、`stage-page-context.ts` 的 `hasPageNumberSlot` arm、`stage-slide.tsx` 與 `page-editor-form.tsx` 各一 arm、`editorial-layouts.css` +102、`observatory-theme.css` +27。共 8 個共用 src 檔 + 2 個共用 CSS + 3 個新檔 + 4 個測試檔。Cover／Closing（`d0ff4b3`）與 Full-width Panel（`28cb8b7`）碰同一組 8 檔。
  - 「新增一種 layout 要改什麼」沒有寫在任何文件；`workshop-architecture.md` 只說「以新 layout 字串擴充」。
  - 受編譯器檢查的分派點：`matchPage` 的 7 個呼叫端（`PageMatchers` key）、`PAGE_PARSERS`（`Record<SlideLayout>`）、`BLANK_PAGE_FACTORIES` 與 `LAYOUT_LABELS`（`Record<AddableLayout>`）。不受檢查的手寫清單 5 張：`Page`／`StructuredPage`／`EditorialFramePage` 三個聯集、`isEditorialFramePage` 與 `isStructuredPage` 的 OR 清單（`deck.ts:391,403`）、`AddableLayout`（與 `SlideLayout` 獨立的第二張 layout 清單，`page-lifecycle.ts:217`）；加上 `matchPage` 自己的 if 鏈：新增 `PageMatchers` key 不會強迫加分支，漏寫就落到 `matchers.unknown`（靜態推論，無測試）。
  - Panel kind：7 個 switch 分在 8 檔（`deck.ts:777` parsePanel、`deck.ts:1223` Full-width 拒絕 fields、`deck-template.ts:14`、`page-lifecycle.ts:55`、`export-readiness.ts:285`、`stage-panel.tsx:22`、`panel-editor-form.tsx:45`），`deck-editor.ts` 另對 table／chart／flow／checklist 各實例化一次 `panelUpdater`。「支援哪些 kind」寫 9 次。修正前次審查：在 strict 與明確回傳型別下每個 switch 現已對 Panel 聯集窮舉，新 kind 不會再被靜默跳過；剩下的盲點是 `SUPPORTED_TWO_COLUMN_PANEL_KINDS` 是 `Set<string>`（`deck.ts:409`），編譯器不知道它與聯集的關係。
  - 新增一條 locality 證據：「空白選填文字視為缺席」寫在 `deck-editor.ts:65`（`absentWhenBlank`）、`deck.ts:1380`、`deck.ts:1420`、`stage-panel.tsx:21`、`closing-slide.tsx:10` 五處；`dfb96dd` 修 editor 側、`e03d9f8` 再修 parser 側；`cover-slide.tsx:11` 用 truthiness，空白 subtitle 會渲染空 `<p>`（靜態推論）。schema module 是放這條 normaliser 的位置。
  - `588c2c2` 揭露一條不成文契約：Export Readiness 的「fits」量測依賴每個 layout 的 body CSS 不縮到 content 以下。目前只存在於 commit message；schema module 是寫下它的位置。
  - 測試已經是一 layout 一檔（parse、readiness、template、blank 同檔），module 邊界對上去即可。
  - deletion test：把 parser 從 type 拆出來只是搬動（pass-through）；按 layout 分組才會集中複雜度。做法維持：每種 layout 一個 module 持有 type、guard、parser、cardinality、blank、clear、readiness，登錄一張表，聯集、`AddableLayout`、`PAGE_PARSERS` 由表派生；`matchPage` 保留為唯一 dispatch；表單與 Stage renderer 維持手寫，不碰規格的「每個 layout 自有 editor」。
- **2026-11-22 更新**：問題持平，根因見 13。
  - `deck.ts` 從 1455 行增為 1486 行。
  - `isStructuredPage` 已改由 `isCoverPage || isEditorialFramePage` 派生；但 `hasPageNumberSlot` 從會窮舉的 `matchPage` 移到不受檢查的 OR 鏈（`c93c83f`），不受檢查的清單淨數不變。
  - 新的 layout 清單出現在 CSS（`:has()`，見 15）與測試（4 張以 Editorial Frame layout 為 key 的 table）。
  - Two-column 納入 Editorial Frame 改了 7 個 src 檔。
  - 13 的第二步就是本候選「登錄表派生聯集」那一塊，可以先落地；14 讓每 layout module 只剩本文。

### 7. Deck lifecycle module：hook 裡的規則搬回 lib

候選 1 讓 `editing-session.ts` 變深，但 `use-editing-session.ts` 長成三個 module。

- **相關 module**：`src/hooks/use-editing-session.ts`（507 行）、`src/lib/editing-session.ts`（509 行、26 個 export）、`src/lib/weekly-series.ts`、`src/components/workshop/workshop-shell.tsx:192-273`。
- **問題**：hook 的 507 行中約 330 行（177-507）是 lib 不知道的規則：latest-wins 的 staleness 政策（三個 sequence counter，`claimLatest`／`whenLatest`／`expireOpenedDeckResults`，345-387）、create → list → open 一行串三個 lib 轉換（495-499）、Weekly Series 政策（`suggestedMonday`、`defaultDeckId`，196-205、297、400，從 `weekly-series.ts` import 進通用 session hook）、URL／history 同步（283-332、389-403，見 8）、view policy（載入中 `deck` 置 null、`selectedPageIndex` 退回 0 並反推 `selectedPageId`，189-202，過渡期間 view 與 `session.selectedPageId` 可不一致）。
- **做法**：lib 的 12 個裸狀態轉換（`createEditingSession`、`openSessionDeck`、`begin`／`finish`／`fail` × `Open`／`Save`／`Create`，94-198）加 staleness 與 create → list → open 編排收成一個 deck lifecycle module，interface 只剩 open、save、createWeek 三個操作，跑在 `WorkshopStore` 之上、不依賴 React；Weekly Series 政策搬回 `weekly-series.ts`；hook 只剩 React 綁定與 view policy。
- **Deletion test**：今天刪掉 hook 的 lifecycle 程式碼只會搬到 shell（pass-through）；成為自己的 module 後集中。
- **證據**：
  - hook 回傳 17 個頂層 key、34 個葉（`layoutControls.evidenceDecision` 6、`.trendTarget` 8、`save` 4、`create` 3）；`workshop-shell.tsx` 是唯一消費者，全拉再重組成 `EditorSidebar` 的 10 個 props 與 `WorkshopPreview` 的 6 個。toolbar、preview、page-editor-form 看不到 hook。
  - 呼叫端得記的 ordering constraint 與哨兵：`canSaveSession` 回傳 `{session, allowed}`，要先寫回 session 再讀 `allowed`（lib 495-501；hook 449-451）；`beginSessionOpen` 必須先於 `finishSessionOpen`，否則 Deck ID 錯（lib 註解 120）；`suggestedMonday === ""` 代表「沒有 Weekly Series」，同時當 React key 與 input default（toolbar 263、280；測試 262、430 斷言它）；`readiness` 在兩個 control bundle 各出現一次呼叫同一函式（hook 137、155）。
  - `openSessionDeck` 沒有 src 呼叫端，只剩測試。
  - `editSessionContent`（lib 231-339）以 diff 輸出守不變條件，約 85 行啟發式（參照同一性的重排檢查 302-310、「several metrics」欄位 diff 313-321）。守衛不完整：`changesTrendRange`（256-265）只比 `observations.length`，一般編輯改到 Trend start 或 observation 值時 pending Metric Input 會靜默失步。今日沒有表單這樣做，屬潛伏。
  - Editing Session 核心在 3 處列舉 layout（save gate 504-507、content guard 243-252、`requireMetric` 220-229）：第三種帶 pending input 的 layout 要改 lib、hook 的 `LayoutEditorControls`、`page-editor-form`，再加一個 `*-session.ts`。
  - `8d6f90e`（first-week creation）一次改 `server/decks-store.ts`、`use-editing-session.ts`、`deck-store.ts`、`weekly-series-client.ts`、`weekly-series.ts`、`vite.config.ts` 六檔。
  - 測試：`editing-session.test.ts` 16 個測試透過 interface；`use-editing-session.test.tsx` 34 個測試中 15 個在測 URL，deferred-promise 測試（392-418、487-547）在 pending promise 前後排 `saveDeck`／`selectDeck`，之所以存在是因為 staleness 政策沒有自己的 interface。
  - 已確認不是問題：Trend & Target 沒有第二個 store，pending 文字與 Comparison Metric 共用同一張 `MetricInputMap`（`metric-input.ts:7-15`）、一個 save gate；Deck Theme 與頁碼切換都走 `editContent(setDeckTheme)` → `editSessionContent`。
- **收益**：staleness 有自己的 interface，測試不必排 deferred promise；ADR-0001 的 Weekly Series 切分歸位；12 個 lib export 轉為 implementation；locality，`8d6f90e` 類的改動不再橫跨六檔。
- **既有決定**：ADR-0001 把 Weekly Series 流程從通用 Deck Template 切開；本候選讓它不再經由 hook 回流。候選 1 的 Editing Session interface 與 operation snapshot 契約不變。
- **2026-11-22 更新**：未動。旁證：5 個測試檔為了渲染 `PageEditorForm` 必須 stub 兩個 `layoutControls` bundle，其中一個已漂移（`unusedTrendControls` 少 `setCadence`，見 13）。

### 8. Location history adapter

- **相關 module**：`src/hooks/use-editing-session.ts:267-332,389-403`、`src/lib/deck-url.ts`（32 行、純函式、7 個測試）、`tests/setup.ts`、`tests/unit/use-editing-session.test.tsx`。
- **問題**：全 app 只有這支 hook 碰 `window.history`／`window.location`（7 處）。push-vs-replace 政策分散在 `writeDeckLocation`（312-325）、`pushPageNumber`（328-332）、`restoreLocation`（267-278）與兩條註解（310-311、327），沒有任何地方能看見或替換它；34 個 hook 測試中 15 個只能驅動真的 history（`popTo` helper，測試 59-65），`tests/setup.ts` 每個測試前重設 location。
- **做法**：比照 `WorkshopStore`，注入一個 location history port（read、replace、push、onPop）；瀏覽器與 in-memory 兩個 adapter。hook（或 7 的 lifecycle module）保留政策。
- **Deletion test**：今天刪掉只會從 hook 消失；成為 adapter 後是真的 seam，兩個 adapter 讓它成立。
- **收益**：15 個 URL 測試不再動 `window`；`tests/setup.ts` 的 location reset 可刪；與 5 同一種 ports & adapters 風格。
- **備註**：與 7 同一次做最划算；單獨做也成立。

### 9. Trend SVG ink 解析移到 capture adapter

- **相關 module**：`src/components/stage/trend-target-slide.tsx:57-118`、`src/lib/browser-capture-adapter.tsx`、`tests/unit/trend-target-ink.test.tsx:33-39`；相關 commit `89b8f83`、`e03d9f8`。
- **問題**：`html-to-image` 深複製 SVG 時不帶子元素的 computed style，這是 capture adapter 的限制，卻由 Stage renderer 補償：slide 在無依賴的 `useLayoutEffect` 以 `getComputedStyle` 讀 `--line`、`--mute`、`--accent`、`--warn-ink`、`--paper`，寫成字面 SVG 顏色（註解在 57）。已修兩次；測試得注入全域 `<style>` 才能在 jsdom 跑。chart panel 沒有這問題只因為它用 div 與 `var(--chart-n)`（`chart-stack.ts:24`）。
- **做法**：在 `browser-capture-adapter` 對 capture clone 內的 SVG 子節點解析 `var()`；slide 回到純 `var()`，與 chart panel 一致。測試成為 adapter 測試，不渲染 slide。
- **Deletion test**：行為 earns its keep，只是放在錯的 seam。
- **收益**：capture 限制與補償同住一處；slide 少一個 effect 與一次 DOM 讀取；下一個用 SVG 的 layout 免費受惠。
- **既有決定**：候選 2 的 export gate 讓 browser adapter 擁有 capture 關注點；本候選把最後一塊搬進去。

### 10. Trend chart geometry 成為 pure module

- **相關 module**：`src/components/stage/trend-target-slide.tsx`（576 行）、`src/lib/trend-input.ts`（13 個 export）、`src/lib/trend-session.ts`（`TrendEditorControls`）、`src/components/workshop/trend-target-editor-form.tsx:15-48`、`tests/unit/trend-target.test.tsx`（1200 行、65 個測試）。
- **問題**：chart 幾何 inline 在 renderer：約 30 個常數（24-56）、`axisLabel`／`axisOffsetFor`（144-166）、`chartGeometry`（168-201）、`showsDateLabel`（340-344），涵蓋 scale、5-tick 產生與去重、窄範圍偏移、科學記號門檻、密集 x 軸跳點，沒有一個有自己的測試；四個「y-axis ticks」測試（`trend-target.test.tsx:145-227`）用 DOM query 斷言渲染後的 SVG。2026-09-28 的 fix commit 有四個（`1160661`、`d1748ce`、`a7123be`、`69dc46d`）都是刻度標籤。另有 `ResizeObserver` 量 plot box（386-424）與 9 的 ink 解析同住一支 renderer。
- **做法**：抽出純 chart-geometry module（bounds → ticks、labels、offset、positions、path），表格化單元測試；slide 只剩 markup 與量測。同時讓 `TrendEditorControls` 直接提供 `canChangeTrendEndpoint`／`isStartSettled`／`isRedateProposal` 等派生事實，`trend-input.ts` 其餘成為 `trend-session` 的私有 implementation。
- **Deletion test**：`trend-session` 與 `trend-target` 是兩個真的 module。`trend-input` 是雜物袋：三個 importer（`trend-session`、`export-readiness`、form）各取不同子集，表單的查詢又鏡射 `TrendEditorControls` 的操作；單獨刪它只是搬動，折進 controls 後才集中。
- **證據**：
  - 表單從四個 trend module 加 `deck` import，必須知道哪個事實住哪裡：`TREND_CADENCE_LOCKED` 在 `trend-session`、`isStartSettled` 在 `trend-input`、`trendCadenceRule` 在 `trend-target`、`observationPath` 在 `metric-input`。
  - `trend-target.test.tsx` 一檔橫跨 parser（4 次 `parseDeck`）、session 操作（34 次）、readiness（12）、export gate（9）、slide render（12）；任何一層改動都碰它，六週改 10 次。依 seam 拆成 geometry、session、readiness，gate 案例移到 export 測試，churn 會隨 seam 分散。
  - 已確認不是問題：Cadence 規則只有一張表 `TREND_CADENCE_RULES`（`trend-target.ts:54-93`），parser、input、session、readiness、form、slide 都讀它；Observation 三態 type 定義一次（`deck.ts:204-208`），判定只在 parser 與 edit 兩路，文案集中 `UNMEASURED_COPY`；兩套數字文法（`parseTrendNumber` 有號、科學記號 vs `parseMetricInput` 非負）刻意分開並藏在 session 後面。
- **收益**：刻度 bug 在表格化單元測試現形；leverage，slide 與未來 Layout Variant 共用幾何；表單 import 從 5 個 module 降為 2；測試 churn 隨 seam 分散。

### 11. Observatory 主題檔裡的 layout 結構覆寫（N × M）

- **相關 module**：`src/styles/observatory-theme.css`（token 34-57；結構覆寫 120-196）、`src/styles/editorial-layouts.css`、[ADR-0002](../adr/0002-deck-theme.md)。
- **問題**：ADR-0002 說既有 layout「只接 token，不重排」，主題檔檔頭也自稱「只覆寫角色與外框裝飾」，但檔內有 23 條 layout 專屬的結構宣告（Cover meta 的 grid／padding／font-size 120-147、Side-by-side points 152-177、Full-width row index 184-196）。每個 layout commit 各加 +27／+45／+21 行；新 layout 要寫兩份 CSS，新主題要為每個 layout 再寫一份。
- **做法**：二擇一。A：擴大 token 角色詞彙（meta-label 字級、list-index 樣式等成為角色），layout 讀角色，主題檔維持 token-only，成本 N + M。B：接受 N × M，把「主題可覆寫 layout 結構」寫進 ADR-0002，讓新 layout 的 checklist 明列第二次 CSS pass。
- **收益**：A 是 locality，layout 構圖只寫一次；B 讓決定可見，不再靠檔頭註解。
- **既有決定**：觸及 ADR-0002 的精神（token 角色是跨主題契約），不違反字面。今天只有兩個主題，矩陣還小；第三個 Deck Theme 進入視野前只需記錄，不必動手。
- **已確認不是問題**：theme 經單一 `data-theme` 屬性進 Stage（`stage-frame.tsx:21`，由 `workshop-preview.tsx:204` 與 `browser-capture-adapter.tsx:114` 餵入）；`editorial-layouts.css` 零硬編碼色票；`DECK_THEMES` 驅動 type、parser 與 toolbar label，新增主題受編譯器引導。
- **2026-11-22 更新**：第三個 Deck Theme（`ledger`，#66）已加入，觸發條件成立。結構覆寫沒有變大：`ledger` 只有 token 加一條字型規則；observatory 的結構覆寫移到 100-182，內容未變。新出現的重複是等寬字 chrome selector 清單，轉為候選 16。A／B 二擇一留到第一個需要改構圖的主題出現時再決定。

### 13. 編譯器看得見的 Editorial Frame 成員資格

- **相關 module**：`src/lib/deck.ts`（`UnknownPage`、`Page`、`EditorialFramePage`、`isEditorialFramePage`、`matchPage`）、`src/lib/stage-page-context.ts`、`src/lib/page-chrome.ts`（原 `src/lib/eyebrow.ts`）、`tests/unit/support/editorial-frame-layouts.ts`、`tsconfig.app.json`、`tsconfig.node.json`。
- **問題**：「哪些 Structured Layout 屬於 Editorial Frame」由聯集加 8 個結構 guard 的手寫 OR 鏈表示（`deck.ts:385-408`）。TS 不檢查 `page is EditorialFramePage` 這個宣稱，src 也沒有 runtime 清單。這條鏈是被最多 module 依賴的 layout 事實：parse chrome、template chrome、頁碼 slot、`isStructuredPage`（再餵給 Export Readiness、export gate、Editing Session 的 save gate、readiness summary）、編輯器的 Eyebrow／Boundary Note 欄位。新 layout 漏加進鏈仍會編譯通過：parse 時 Eyebrow 與 Boundary Note 靜默丟失、沒有頁碼 slot、Export Readiness 判定不能匯出（靜態推論）。
- **根因**：`UnknownPage`（`deck.ts:270-275`，`layout: string` 加 index signature）與每個 layout literal 重疊，`Page` 不是 discriminated union。所以 guard 只能寫成結構判斷，成員資格無法由 const 清單派生，`matchPage` 也是不受窮舉檢查的 if 鏈。6 的 2026-11-09 更新列出了不受檢查的手寫清單，但沒有點出這個根因。
- **做法**：第一步，讓每個 layout 都必須明確決定成員資格（例如像以前的 `hasPageNumberSlot` 一樣經 `matchPage` 派生），並把 `tests/` 納入 typecheck。第二步，unknown layout 移出已知 literal，`Page`、`StructuredPage`、`EditorialFramePage` 與 runtime 的 Editorial Frame layout 清單由同一張 const 清單派生（比照 `DECK_THEMES`），`matchPage` 成為窮舉 switch。
- **Deletion test**：`editorial-frame-layouts.ts` 與 3 個 runtime guard 純屬補償，第二步之後消失；OR 鏈由派生清單取代。
- **證據**：
  - `c93c83f` 把 `hasPageNumberSlot` 從會窮舉的 `matchPage` 移到 OR 鏈（`stage-page-context.ts:66-68`）。
  - `tests/` 不在任何 tsconfig：`tsconfig.app.json` 只含 `src`，`tsconfig.node.json` 只含 `vite.config.ts`、`scripts/`、`server/`；`pnpm build`（`tsc -b`）與 CI 都不檢查測試型別。測試裡的 `Record<EditorialFrameLayout, …>` 只在 IDE 報錯，所以 `7d5bcfd`、`fade87b` 只能加 runtime guard（`editorial-frame-chrome.test.tsx:17`、`editorial-eyebrow-editor.test.tsx:20`、`deck-template.test.ts:26`），`editorial-frame-layouts.ts` 再從 `ADDABLE_LAYOUTS` × `createBlankAddablePage` × `isEditorialFramePage` 反推清單。
  - 以暫存 tsconfig 對 `tests/unit` 跑型別檢查得 60 個錯誤：47 個來自 `UnknownPage` 阻斷 narrowing（`page.layout === "next-actions"` 不會縮小型別）；約 6 個是真漂移：`unusedTrendControls` 少 `setCadence`、`workshop-preview.test.tsx:22` 少必填的 `documentId`、`use-stage-export.test.tsx:228` 回傳型別不符、evidence-decision 與 next-actions 測試在 Deck 上傳入過時的 `start`、`side-by-side-editor.test.tsx:108,111` overload 不符。
  - ADR-0002〈後果〉說 `Record<DeckTheme, …>` 會讓漏掉主題的測試失敗；這成立只是因為那些 spec 迭代 `DECK_THEMES`，不是因為有型別檢查。
- **收益**：leverage 最大的 layout 事實受編譯器檢查；測試能依 `layout` narrowing；Record 檢查從 IDE 進入 CI；6 的「登錄表派生聯集」先落地。
- **代價**：第二步需要處理存檔：目前直接 `JSON.stringify`（`decks-io.ts:7`、`decks-client.ts:42`），unknown page 要有 serializer 才能原樣 round-trip（`parse-deck.test.ts:295`）。
- **狀態**：第一步為 [#83](https://github.com/shiroki9979/weekly-report-builder/issues/83)，已實作於 [PR #97](https://github.com/shiroki9979/weekly-report-builder/pull/97)，issue 已結案；第二步拆到 [#98](https://github.com/shiroki9979/weekly-report-builder/issues/98)（needs-triage）。第一步 Strong，第二步 Worth exploring。
  - 第一步已實作：`EDITORIAL_FRAME_MEMBERSHIP` 以 `PageMatchers` 為鍵，每個 `matchPage` 分支都必須表態，且每格只收字面值 `true`／`false`（回傳 `boolean` 的條件式會讓型別與執行期分歧）；`EditorialFramePage` 聯集與 `isEditorialFramePage` 都由這張表派生，OR 鏈刪除。`tsconfig.test.json` 把 `tests/` 納入 `tsc -b`，`tsconfig.node.json` 補上 `vitest.config.ts` 與 `playwright.config.ts`；61 個錯誤已清除，測試改用 guard narrowing。
  - `editorial-frame-layouts.ts` 與 3 個 runtime guard 在第一步就刪除：聯集已由表派生，`Record<EditorialFrameLayout, …>` 也進了 `tsc -b`。它們原本還順帶擋下一種型別擋不到的情況：`PageMatchers` 新增 key 卻漏寫 `matchPage` 分支，頁面落到 `unknown`、被判成非成員。這部分改由 `tests/unit/match-page.test.ts` 直接檢查：樣本表以 `PageKind` 為 key，執行期確認每個分支都收到自己的頁面。
  - 第二步仍待處理（[#98](https://github.com/shiroki9979/weekly-report-builder/issues/98)）：`UnknownPage` 仍與 layout literal 重疊；`matchPage` 自己的 if 鏈仍不受編譯器窮舉檢查（漏寫分支目前由 `match-page.test.ts` 在執行期擋下）；新增 layout 若只加進 `Page` 與 `PAGE_PARSERS`、沒加進 `PageByKind`，仍不會被要求表態；`isStructuredPage` 仍是 `isCoverPage || isEditorialFramePage`，非 Frame、非 Cover 的新 Structured Layout 不會被要求表態。
- **2026-11-22 補遺**：
  - 型別檢查連 `tests/e2e` 一起跑（關閉 `noUnusedLocals`／`noUnusedParameters`）：22 個檔案共 61 個錯誤，與上方 `tests/unit` 的 60 個一致，多出的是 e2e（例如 `tests/e2e/trend-target.spec.ts:135` 的 `getScreenCTM`）。
  - 六則測試註解宣稱「漏列時型別檢查會失敗」，實際不會：`deck-template.test.ts:25`、`editorial-frame-chrome.test.tsx:16`、`editorial-eyebrow-editor.test.tsx:19`、`demo-deck-set.test.ts:33,40`、`e2e/deck-theme.spec.ts:114`。（第一步之後成立：`tsc -b` 已涵蓋 `tests/`。）
  - 沒有任何 runtime guard 的表：`EVERY_LAYOUT: Record<SlideLayout, …>`（`demo-deck-set.test.ts:41`），新的 Structured Layout 不會被要求出現在 Demo Deck Set；`cover-closing.test.ts:39-48` 另有一份手寫的 Editorial Frame 版型清單。

### 15. Overflow 保護成為 Editorial Frame 預設

- **相關 module**：`src/styles/editorial-layouts.css:571-583`、`tests/e2e/editorial-footer-overlap.spec.ts`、`demo/*.json`。
- **問題**：Export Readiness 的「fits」量測依賴本文不縮到內容高度以下（`588c2c2`，見 6 與〈其他發現〉）。這層保護是 opt-in：`:has()` 手寫 4 種本文 class（`.stage-cols`、`.editorial-comparison`、`.editorial-closing`、`.editorial-full-width-panel`），守它的 e2e（21-125）寫死同 4 種 layout。下一個不會自行縮放的 layout 兩份都漏加時，CI 照樣通過，內容蓋住頁尾仍判定 fit（靜態推論）。
- **做法**：「本文不縮到內容以下」改為 Editorial Frame 本文的預設，只讓真的會自行縮放的 layout opt out（大概只有 Trend & Target）；e2e 改由所有 Editorial Frame layout 驅動（接 13 的 runtime 清單）。
- **Deletion test**：CSS 清單與 e2e 副本消失；失敗模式從靜默的 fit 翻成看得見的 Overflowing Page。
- **證據**：
  - Two-column 在 `6190cea` 加進 `:has()` 清單，e2e 同步手改。
  - 第 576 行已對所有帶 Boundary Note 的頁面套用這條規則；demo 的 Overview、Evidence-backed Decision、Next Actions 頁帶 Boundary Note，已經在跑。Trend & Target（以 `ResizeObserver` 量 plot box）尚未驗證。
- **收益**：不成文契約寫進預設；CSS 清單與 e2e 副本刪除。
- **狀態**：[#85](https://github.com/shiroki9979/weekly-report-builder/issues/85)（needs-triage）。依賴類別 local-substitutable（Playwright fixture）。
- **2026-11-22 補遺**：預設 `min-content` 只擋「本文蓋住頁尾」（`588c2c2` 那一類），還有另一類沒擋。
  - `f875fbe`（11-20）：四個 demo 頁把 Boundary Note 與頁尾推進底部保留帶 2～26 px，Export Readiness 仍回報 fit。內容仍在 1280 × 720 內，而 `overflow-measurement.ts:70-102` 只比對 capture root 的邊界。修法是縮短 demo 文案，並加一個只檢查 Demo Deck Set 的 e2e；[PR #72](https://github.com/shiroki9979/weekly-report-builder/pull/72) 的合併風險與 `demo-deck-set.spec.ts:159-160` 的註解都寫明作者的 Deck 仍沒有把關。
  - 保留帶的用途是讓 PNG 貼進團隊簡報範本時不壓到範本頁尾（`editorial-layouts.css:3`）；`demo-deck-set.spec.ts:208` 以 `720 - 64` 重寫 `--editorial-frame-padding`；HTML Page 的頁尾 overlay 需要同樣留白，但 HTML Page 不量測。
  - 做法補充：範圍可擴大為「Editorial Frame 擁有放得進外框的規則」，量測比對外框基準線而不只是 capture root（經 export gate 既有的 measure adapter，單元測試可餵 fake 量測）。這會改變 GLOSSARY 的 Overflowing Page（現為「超出 1280 × 720 capture Stage」）；HTML Page 是否量測頁尾屬 export gate 政策，待決。

### 16. Frame chrome 字型成為 Deck Theme 角色

- **相關 module**：`src/styles/ledger-theme.css`、`src/styles/observatory-theme.css`、`src/styles/editorial-layouts.css`、[ADR-0002](../adr/0002-deck-theme.md)。
- **問題**：11 的觸發條件已成立（#66 新增 `ledger`）。結構覆寫的 N × M 沒有變大，但「哪些 Editorial Frame chrome 用等寬字」這份清單寫了兩次：`ledger-theme.css:10-15` 與 `observatory-theme.css:43-47, 94` 列出同樣 6 個 selector（eyebrow、period、workstream、status、page-number、boundary）。新增 chrome 欄位若要用等寬字，必須改每個主題檔。
- **做法**：新增一個 Editorial Frame chrome 字型角色，由 `editorial-layouts.css` 讀取，各主題只提供值。這是 11 方案 A 的最小一步。
- **收益**：`ledger` 成為 token-only；新增 chrome 欄位不必碰主題檔；下一個 Deck Theme 只寫 token。
- **既有決定**：ADR-0002 規定 token 角色「只能新增」，新增角色依其修訂規則原地修訂即可；`--mono`（#69）是前例，不衝突。
- **狀態**：[#86](https://github.com/shiroki9979/weekly-report-builder/issues/86)（needs-triage）。待決：`default` 主題的角色值要沿用內文字型，確認不改變現有外觀；角色只管字型，或一併涵蓋 chrome 的字級與字距。
- **2026-11-22 補遺**：
  - 兩份主題清單其實已經不同：observatory 的第二條規則（`observatory-theme.css:94-96`）另含 `.editorial-takeaway-ref` 與 `.editorial-closing-line`，ledger 沒有。e2e 的 furniture 清單（`deck-theme.spec.ts:386-394`，另含 `.editorial-deck-title`、`.editorial-page-label`）是第三份，`deck-json-format.md:43` 的文字描述是第四份。
  - `cover-closing`、`side-by-side`、`full-width-panel` 三個 e2e 寫死 `["default", "observatory"]` 並以 `theme === "observatory"` 分支，從不在 ledger 下跑；ledger 的等寬字會改變文字寬度，影響這些 spec 檢查的 fit。
  - `stage-frame.tsx:5-9` 手動 import 主題樣式表，`deck.ts:307` 的註解卻說新增主題時型別檢查會提示補樣式表。
  - ADR-0002:54 說 `editorial-footer-overlap.spec` 以 `Record<DeckTheme, …>` 宣告預期值，實際沒有；`Record<DeckTheme, …>` 只出現在 `deck-theme.spec.ts` 與 `demo-deck-set.test.ts`。
  - 〈其他發現〉的 `describe.each(DECK_THEMES)` 一條已驗證：預設主題下的 DOM 同樣含 observatory 的標記（Closing 的 eyebrow 文字為 `§ 01 Closing`，頁尾文字為 `Deck1 / 101 / 01`），測試以 `eyebrowText()`（`editorial-frame-chrome.test.tsx:171-190`）與 `stage-slide.test.tsx:384` 的 regex 濾掉。

## 已完成候選

### 1. Editing Session module

typed Week Document、Metric Input 與存檔狀態同住一處。原名「Week 草稿 module」，因與 Draft Page 撞名而改名；Editing Session 與 Metric Input 的定義見 [GLOSSARY.md](../../GLOSSARY.md)。

- **審查時相關 module（歷史快照）**：`src/components/workshop/workshop-shell.tsx`（`WorkshopShellBody`）、已刪除的 `metric-draft-context.tsx`、`metric-draft-buffer.ts`、`use-week-editor.ts`、`use-week-save.ts`、`use-week-create.ts`，以及 `evidence-decision-editor-form.tsx`。當時 `metricBuffer` 參數另穿過 export 與 editor chrome；現由 `src/lib/editing-session.ts`、`src/hooks/use-editing-session.ts` 及 `src/lib/deck-store.ts` 負責編輯狀態與 Deck 存取，Export hook 只接收 snapshot 來源。
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
- **既有決定**：保留 [Export gate](../reference/export-gate.md#metric-input) 規定的 Page ID 與 field path 鍵值，改由 Editing Session 持有 Metric Input。
- **狀態**：2026-09-27 設計定案，規格見 [#37](https://github.com/shiroki9979/weekly-report-builder/issues/37)，實作票 [#38](https://github.com/shiroki9979/weekly-report-builder/issues/38) → [#39](https://github.com/shiroki9979/weekly-report-builder/issues/39) → [#40](https://github.com/shiroki9979/weekly-report-builder/issues/40) 已納入 [PR #41](https://github.com/shiroki9979/weekly-report-builder/pull/41)。Editing Session 供應唯讀 operation snapshot，Export gate 契約維持不變。
- **2026-11-09 追蹤**：lib 維持深；`editing-session.test.ts` 16 個測試透過 interface，舊的 delete → prune → add 重演已改為 delete → add 的 session 操作（36-57）。hook 側長出的規則另立為候選 7。

### 2. Export gate module

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
  - module 介面與失敗政策見 [Export gate](../reference/export-gate.md)。完整規格為 [#31](https://github.com/shiroki9979/weekly-report-builder/issues/31)；四張實作票依 [共用截圖流程 #32](https://github.com/shiroki9979/weekly-report-builder/issues/32) → [失敗政策 #33](https://github.com/shiroki9979/weekly-report-builder/issues/33)／[操作快照 #34](https://github.com/shiroki9979/weekly-report-builder/issues/34) → [結果摘要 #35](https://github.com/shiroki9979/weekly-report-builder/issues/35) 完成，整體實作見 [PR #36](https://github.com/shiroki9979/weekly-report-builder/pull/36)。
- **2026-11-09 追蹤**：capture 關注點只剩一塊留在 renderer 外（Trend SVG ink），另立為候選 9。`use-stage-export.test.tsx` 與 `export-operation.test.tsx` 仍各 `vi.mock` 三個 module，本次未深究。

### 4. Stage context 帶型別事實，頁碼政策收進同一 module

- **相關 module**：`src/lib/stage-page-context.ts`（`createStagePageContext`）、`src/components/stage/stage-slide.tsx`、`src/components/stage/editorial-frame.tsx`、`src/lib/deck.ts`（`hasPageNumberSlot`、`defaultPageNumberVisibility`、`isPageNumberVisible`）、`src/lib/deck-template.ts`、`src/components/workshop/page-number-select.tsx`、`src/components/workshop/page-navigator.tsx`、`src/components/workshop/workshop-preview.tsx`。
- **問題**：`StagePageContext` 把狀態藏進顯示字串：`StageSlide` 以 `pageLabel === "Hidden"` 判斷 Hidden Page，HTML Page 需要的 Monday 則從 Week Label `slice(0, 10)` 取回。頁碼可見性（週預設、單頁覆寫、HTML Page 預設不疊、Two-column 與 Hidden Page 不畫、clone 保留或丟棄）散在 6 個檔案，預設值 `showPageNumbers ?? true` 在 shell 又寫一次。
- **做法**：Stage context module 回傳型別事實（是否 Hidden、Monday、Page Position 序號與總數、是否畫頁碼），renderer 只負責畫。Week Label 格式與頁碼的預設、覆寫、clone 規則移進同一個 module。
- **證據**：
  - `pageLabel` 一個欄位有三種意思：`"1 / 3"`、`"Hidden"`、`""`。
  - HTML Page 的 Monday 取自 Week Label，匯出檔名與 Save URL 卻用 `selectedMonday`，parser 也不檢查 `start` 是否等於檔名的週一；手改 JSON 讓兩者不一致時，HTML Page 會到錯的資料夾抓檔（靜態推論）。
  - Week Label 有兩種寫法：Stage 用 em dash（`—`），標題列用 en dash（`–`）。
  - `PageNavigator` 顯示陣列位置（`selectedPageIndex + 1 / pages.length`），和 Stage 上的 Page Position 是不同數字；GLOSSARY.md 的 Page Position 明列 _Avoid_: Array index。
  - 頁碼功能 `4ddbe1d`（#30）一次改了 22 個檔案，之後又有 `c819ed5`、`e5a6d2b`、`8fca8e8` 三次修補；`StageSlide`（HTML Page）與 `EditorialFrame` 各自決定畫不畫頁碼。
  - `stage-slide.test.tsx` 手造 `pageLabel: "Hidden"`，和 `stage-page-context.ts` 各自寫死同一個字串，改一邊，另一邊的測試不會失敗。
- **收益**：字串哨兵退場；HTML Page 的路徑不再取自顯示字串；locality，頁碼規則集中一處；renderer 不再各自判斷；測試斷言事實而非顯示字串。
- **既有決定**：規格〈Stage context Module〉已把這裡指定為 Preview、Copy、batch 共用的 seam；本候選只加深它。
- **狀態**：已實作於 `2cb9a80`（centralize typed page context and numbering policy）。2026-11-09 確認：`StagePageContext` 為 7 個型別事實（`documentId`、`theme`、`deckTitle?`、`frameLabel`、`hidden`、`position`、`showPageNumber`），12 個消費檔，無字串哨兵；`PageNavigator` 已改用 `getPagePosition`。殘尾：`PagePicker` 仍以 `String(index)` 選頁（`page-picker.tsx:32,57`），見〈其他發現〉。

### 12. 頁尾成為 Stage page context 的一個事實

- **相關 module**：`src/lib/stage-page-context.ts`、`src/components/stage/editorial-frame.tsx`、`src/components/stage/stage-slide.tsx`、`src/components/stage/cover-slide.tsx`、`src/components/stage/editorial-footer.tsx`、`src/components/workshop/editorial-page-editor-chrome.tsx`、`src/components/workshop/page-number-select.tsx`。
- **問題**：候選 4 讓 renderer 只負責畫；#68 的 HTML Page 頁尾（`2e222d7`）之後，「畫不畫頁尾、頁尾放什麼」又由 renderer 各自決定，Cover 還手抄一份 `EditorialFooter` 的 markup。組合出的規則沒有寫在任何一處：Hidden Page 上 Editorial Frame 與 Cover 仍畫 Deck Title，HTML Page 什麼都不畫；HTML Page 的 Deck Title 跟著頁碼開關，Editorial Frame 不跟。
- **做法**：`createStagePageContext` 直接回傳要畫的頁尾（或沒有頁尾），已依頁面種類、Hidden、Deck Title 與單頁覆寫解析完成，並提供 `§ nn` 索引所需的可見 Page Position。三個 renderer 只畫 `EditorialFooter`，Cover 刪掉副本；slot 判斷 export 給 Workshop。
- **Deletion test**：`EditorialFooter` earns its keep，Cover 的副本就是刪掉它之後 markup 重新出現的樣子；`showPageNumber`／`position` 在 interface 上是 pass-through，之後轉為 implementation。
- **證據**：
  - 4 處決定頁尾：`isPageNumberVisible`（`stage-page-context.ts:65-93`）；`EditorialFrame` 以 `showPageNumber ? position : null` 決定位置，但一律傳 Deck Title（`editorial-frame.tsx:23,50`）；`StageSlide` 只在 `isHtmlPage && showPageNumber` 時疊頁尾（`stage-slide.tsx:71-78`）；`CoverSlide` 手抄 markup（`cover-slide.tsx:31-40`）。
  - Workshop 以 `!isCoverPage(page)` 重述 slot 規則（`editorial-page-editor-chrome.tsx:87`）；Stage 端的 `hasPageNumberSlot` 是私有的。
  - `context.position` 與 `context.showPageNumber` 只有上述 2 個 src 消費者。
  - 本期 6 個 commit 動過頁尾：`6190cea`、`2e222d7`、`ce332ae`、`5d79c99`、`c93c83f`、`f875fbe`。
  - 沒有單元測試斷言 Cover 的 Deck Title；`stage-slide.test.tsx:332-490` 的 6 個 HTML 頁尾測試為了檢查政策而 stub `fetch`。
- **收益**：locality，頁尾政策收進一個 module；政策成為 context 的表格測試（頁面種類 × Hidden × 單頁覆寫 × Deck Title），HTML 頁尾測試收斂為一個 render 測試；Cover 的副本刪除。
- **既有決定**：preview 與 capture 仍共用同一個工廠（`workshop-preview.tsx:198`、`browser-capture-adapter.tsx:108`），Export gate 契約不變。
- **狀態**：已實作於 `6626d32`（[#82](https://github.com/shiroki9979/weekly-report-builder/issues/82)），行為不變。兩條隱含規則經查是刻意的，已寫在 [HTML Page](../reference/html-page.md) 與 [Deck JSON 格式](../reference/deck-json-format.md)；Cover 計入 Page Position 但不顯示，同樣已有文件。
  - `StagePageContext` 以 `footer: { deckTitle?, position } | null` 取代 `deckTitle`、`position`、`showPageNumber`；`resolveFooter` 一處寫下規則：Editorial Frame 與 Cover 一律有頁尾，頁碼關閉時只少 Page Position；HTML Page 只在顯示頁碼時才有頁尾。
  - 三個 renderer 都只畫 `EditorialFooter {...context.footer}`，Cover 的副本刪除；`§ nn` 讀 `footer.position`。`isPageNumberVisible` 轉為私有，`hasPageNumberSlot` export 給 `editorial-page-editor-chrome.tsx`。`page-editor-form.tsx:138` 是 HTML Page 的表單，一律有頁碼位置，不需判斷。
  - 政策成為 `stage-page-context.test.ts` 的表格測試；HTML 頁尾測試收斂為一個 render 測試，Cover 補上第一個 Deck Title render 測試。
  - 仍可另議：Hidden 的 Editorial 頁畫 Deck Title，開了頁尾的 Hidden HTML Page 什麼都不畫；統一會改變 #68 的文件化行為。

### 14. 一個 Editorial Frame chrome module

- **相關 module**：`src/lib/deck-template.ts`、`src/lib/export-readiness.ts`、`src/lib/deck.ts`（`EditorialPageChrome`、`parsePageChrome`、`withEditorialFrameChrome`）、`src/lib/deck-editor.ts`、`src/lib/page-chrome.ts`（原 `src/lib/eyebrow.ts`）、`src/components/workshop/editorial-page-editor-chrome.tsx`。
- **問題**：#76 把 Eyebrow 與 Boundary Note 的 Deck Template 清除收成共用步驟，#75 讓 Editorial Frame 從頁面讀取 chrome；但 headline、Hidden、Title 必填與「空白視為缺席」仍按 layout 重寫。6 個 `clearPage` arm 以 `...page` 沿用、5 個重建頁面，所以沒列進共用步驟的選填 chrome 欄位，會在 Full-width Panel、Side-by-side Comparison、Closing、Trend & Target 保留，在 Overview、Evidence-backed Decision、Next Actions、Two-column 丟失（靜態推論）。
- **做法**：一個 module 持有 Editorial Frame chrome 的欄位清單、空白規則、預設 Eyebrow、每個欄位的 Deck Template 政策、headline 的 readiness 規則與 setter；每個 layout 的 clear 與 assess 只處理本文；`eyebrow.ts` 併入。
- **Deletion test**：刪掉 11 個 title 清除與 8 個 Title 檢查，複雜度收進一個步驟，不會散回 N 個呼叫端。
- **證據**：
  - `deck-template.ts:111-177` 寫了 11 次 `title: ""`；5 個重建的 arm 手抄 `hidden`（131、139、152、160、173）。
  - "Title is required" 在 `export-readiness.ts` 寫了 8 次（213-449）。
  - 「空白視為缺席」在 chrome 上又寫 3 處：`readOptionalChromeText`（`deck.ts:1408`）、`absentWhenBlank`（`deck-editor.ts:65`）、`resolveEyebrow` 的 `trim() ||`（`eyebrow.ts:19`）；6 已記錄同一條規則在本文欄位的 5 處。
  - 編輯器以假頁面取預設 Eyebrow：`resolveEyebrow({...page, eyebrow: undefined})`（`editorial-page-editor-chrome.tsx:157-165`）。
  - 存檔 key 順序隨建構方式漂移：parser 以 `as` cast 把 eyebrow 排在 title 後（`deck.ts:1395-1404`），`setPageEyebrow` 的 spread 把它附加在末尾（`deck-editor.ts:116-121`）；重新載入再存檔會產生多餘 diff（靜態推論）。
- **收益**：locality，新增 chrome 欄位只改一處；chrome 的 template 與 readiness 規則只測一次；6 的每 layout module 變小。
- **既有決定**：與 6 互補：chrome 歸 Editorial Frame，本文歸各 layout。
- **狀態**：已實作（[#84](https://github.com/shiroki9979/weekly-report-builder/issues/84)）。2026-11-23 grilling 的決議見 [#84 的留言](https://github.com/shiroki9979/weekly-report-builder/issues/84#issuecomment-7107406600)，實作結果見下方「2026-11-23 實作」。
- **2026-11-22 補遺**：
  - Deck Template 分歧已實測：在頁面加一個未列名的 chrome key 後套 `createDeckFromTemplate`，closing、side-by-side、full-width-panel、trend-target 保留它，two-column、overview、evidence-decision、next-actions 丟掉它。
  - 存檔欄位順序漂移已實測：parse → `setPageEyebrow` → save 寫出 `…, notes, eyebrow`；再 parse → save 寫出 `title, eyebrow, …`。沒有編輯的第二次存檔產生 diff，正是 `dfb96dd` 修過的行為。
  - 同一條空白規則在本文欄位造成可見缺陷（jsdom 渲染驗證）：只有空白的 `closingLine` 畫出有上框線、沒有文字的 `.editorial-closing-line`（`deck.ts:1387` 註解替 Boundary Note 擋下的同一種缺陷）；只有空白的 `byline` 畫出「Presented by」標籤；只有空白的 tradeoff `cost` 畫出沒有內容的「Cost」。Export Readiness 不檢查這些選填欄位，所以會進 PNG（PNG 一步為靜態推論）。根源是缺席有兩種表示：`readOptionalString`（`deck.ts:626-629`）保留空白並以 `""` 表示缺席，chrome 用 `undefined`。本文欄位不屬於 chrome，可留給 6 或另開。
  - 同一類修正已有三次：`dfb96dd`、`e03d9f8`（11-08）、`d4e4a23`（11-21）。

- **2026-11-23 更新**：grilling 定案，實作排在 #83 第二步與 6 之前。
  - 範圍從 Editorial Frame 擴大為 page chrome，分三層：每一頁（title 文字欄位、講稿、Hidden、頁碼覆寫）、Structured Layout（Headline 必填）、Editorial Frame（Eyebrow、Boundary Note）。module 改名 `src/lib/page-chrome.ts`，`eyebrow.ts` 併入。原因是 title 的規則本來就不只屬於 Editorial Frame：Deck Template 清空每一頁的 title（含 HTML Page 與 unknown），Export Readiness 要求 Cover 與 8 個 Editorial Frame 版型都有 title。GLOSSARY 新增 **Headline**（`e976734`）。
  - module 只持有規則，執行期不直接或間接 import `deck.ts`：parser 在 `deck.ts` 要呼叫它，setter 需要 `isEditorialFramePage`，兩者放在一起會形成執行期循環。setter 留在 `deck-editor.ts`；頁碼覆寫的 Deck Template 政策留在 `stage-page-context.ts`（候選 4），政策表只標委派。
  - 「空白視為缺席」放在獨立的 `src/lib/optional-text.ts`，chrome、Deck Title 共用，[#101](https://github.com/shiroki9979/weekly-report-builder/issues/101) 之後也可用；講稿也改用這條規則。
  - 存檔欄位順序的漂移比原先記錄的範圍大（vitest 實測）：
    - Deck Template 的輸出本身就會漂移。從未編輯的 `demo/demo-default.json` 建立新 Deck，存檔、重新載入、再存檔，`two-column` 的 `eyebrow` 從最後移到 `title` 之後，`next-actions` 的 `variant,title` 變成 `title,variant`。
    - 新增頁也會漂移：8 個 Editorial Frame 版型的空白頁加上 Eyebrow 後，存檔、重新載入、再存檔，`eyebrow` 從最後移到 `title` 之後。
    - 修法是固定每個 chrome 欄位的位置，缺席時仍保留 key（值為 `undefined`），parser、Deck Template、空白頁工廠都經同一個組裝函式。
  - 本文欄位的空白缺陷（`closingLine`、`byline`、tradeoff `cost`）移到 #101。
- **2026-11-23 實作**：
  - `src/lib/page-chrome.ts` 持有存檔欄位順序（`PAGE_CHROME_SLOTS`、`EDITORIAL_FRAME_CHROME_SLOTS` 以欄位為 key，新增 chrome 欄位漏排位置即編譯失敗；由 `deck.ts` 的 `inSavedKeyOrder` 依成員分派）、Deck Template 政策（`pageTemplateChrome`、`editorialFrameTemplateChrome`，回傳型別要求列出每個 chrome 欄位）、`headlineIssues`、預設 Eyebrow 與 `resolveEyebrow`；`eyebrow.ts` 刪除。module 只 import `deck.ts` 的型別。
  - `clearPageContent` 的 arm 只清本文：11 個 `title: ""` 與 5 個手抄的 `hidden` 刪除。8 個 assess 函式不再檢查 title，Cover 沒有自己的內容規則。
  - `src/lib/optional-text.ts` 的 `isBlank`／`absentWhenBlank` 取代 `deck-editor.ts` 的 `absentWhenBlank`、`export-readiness.ts` 的 `isBlank`、parser 的 `trim() === ""` 與 speaker notes cue 的同一判斷。只含空白的講稿改為缺席。Deck Title parser 的 trim 行為未動。
  - 實作時另外發現：新增頁先寫講稿再設 Hidden，存檔後 `notes` 與 `hidden` 也會換位置，已一併修正。
  - 測試：`tests/unit/page-chrome.test.ts` 以三個入口測存檔、重新載入、再存檔的位元組相同，以 `PageKind` 表格測 Deck Template 政策，以每個 Structured Layout 測 Headline，以每個選填 chrome 文字欄位測空白規則。刪除的重複斷言：`deck-template.test.ts` 的逐版型 Eyebrow／Boundary Note／頁碼檢查、`cover-closing.test.ts` 的 Cover／Closing title 與空白 Eyebrow／Boundary Note、`side-by-side.test.ts` 的 template title／Boundary Note／講稿、`deck-editor.test.ts` 的空白 Boundary Note。各版型「依 schema 順序列出 issue」的測試保留，因為它們斷言的是整份輸出順序。
  - 未收緊的地方：`clearPageContent` 的 arm 以寬型別 `PageContent` 回傳，漏寫本文必填欄位不會編譯失敗。這與基準相同：`UnknownPage` 的 `layout: string` 加 index signature 讓舊的 `matchPage<Page>` 也接受缺欄位的 arm（以 `a253207` 刪掉 Overview arm 的 `lead` 實測，`tsc` 通過）。要等 13 的第二步讓 `Page` 成為真正的 discriminated union 才能逐 arm 檢查。

## 考慮過但判定保留

deletion test 判定以下 module earns its keep，之後的審查不必再提：

- `matchPage`（`deck.ts`）：matcher 物件型別讓 5 個呼叫端在新增 layout 時編譯失敗；刪掉就失去窮舉保護。（2026-11-09：呼叫端已有 7 個，全部 exhaustive。）（2026-11-22 補遺：`c93c83f` 後剩 5 個；2026-11-09 記的 7 個在 `de71911` 時實為 6 個。）
- `typedPageUpdater`（`update-deck-page.ts`）：取代 4 個 editor module 各自的型別檢查與錯誤訊息。
- `CARDINALITY` 與 `canAddEntry`、`canRemoveEntry`、`assert*`：parser、reducer、表單按鈕與錯誤訊息的單複數共用同一份數量規則。
- `deck-id.ts`：Deck ID 格式由 dev server 路由、`decks-io.ts`、`decks-store.ts`、`html-page.ts` 共用；週一日期規則另由 `calendar-date.ts` 供週報流程與 Trend & Target 使用。
- `validateHtmlFileName`：防路徑穿越的規則集中一處，跨 seam 有 4 個呼叫端。
- `stage-capture.ts`、`clipboard-image.ts`、`download-blob.ts`：外部依賴的 adapter；`exportVisiblePages` 以 deps 注入，production 與測試各一個 adapter，是真的 seam。
- `createStagePageContext`：保證 preview 與 capture 的 Frame Label、Page Position 一致；摩擦只在輸出用字串承載語意（見 4，已解決）。（2026-11-22：仍為單一工廠、兩個呼叫端；頁尾政策回流 renderer 見 12。）
- `metric-input.ts`（原 `metric-draft-buffer.ts`）：路徑編解碼與 remap 集中在這裡；原本的同步問題已由 Editing Session 承擔（見 1）。
- `deck-template.ts` 的 `clearPage`：會窮舉的 matcher，每種 layout 的沿用規則集中一處。（2026-11-09：保留 Trend observations，符合 GLOSSARY。）
- `EditorialPageEditorChrome`：3 個 Editorial 表單共用。（2026-11-09：已服務 10 種 layout 中的 8 種。2026-11-22：9 種，名稱問題見 3。）
- `usePageKeyboardNav`：只有一個呼叫端，但集中「焦點在輸入框時不攔截方向鍵」的規則，且有專屬測試。
- `seedDecksFromDemo`：atomic rename 與並行處理集中一處，是 bootstrap 唯一的 seam。
- 2026-11-09 新增：
  - `moveEntry`（`move-entry.ts`）：7 個 move 共用，越界 throw，有專屬測試。
  - `panelUpdater`、`PAGE_PARSERS`、`BLANK_PAGE_FACTORIES`、`LAYOUT_LABELS`、`DECK_THEMES`：都是 `Record`，新增 layout 或主題受編譯器引導。
  - 每個 panel-kind `switch`：在 strict 與明確回傳型別下已對 Panel 聯集窮舉；剩下的盲點只有 `SUPPORTED_TWO_COLUMN_PANEL_KINDS`（見 6）。
  - `TREND_CADENCE_RULES`（`trend-target.ts`）與 `UNMEASURED_COPY`：Cadence 規則與 Observation 三態文案各只有一處。
  - `trend-session.ts`、`trend-target.ts`：兩個真的 module；兩套數字文法刻意分開並藏在 session 後面。
  - `deck-url.ts`：純函式、7 個測試；摩擦在 hook 側的 history 存取（見 8）。
  - `planWeekFromPrevious`（`weekly-series.ts`）：server 與 in-memory adapter 共用。
  - `server/decks-store.ts` 的檔案函式：接 `decksDir`，14 個 temp-dir 測試。
  - `path-containment.ts`：8 行、有測試。
  - `useCollapsiblePanel`：兩個呼叫端。
  - Deck Theme 與頁碼切換：都經 `editSessionContent`，沒有繞過 Editing Session。
  - `data-theme` 單一屬性進 Stage；`editorial-layouts.css` 零硬編碼色票。
- 2026-11-22 新增：
  - 各 `*-slide.tsx` 的 frame 接線：自 `71d7aaf` 起每支只剩一行 `<EditorialFrame page={page} context={context}>`；把包裝移進 `StageSlide` 反而要再判斷一次成員資格。
  - `eyebrow.ts` 與 `DEFAULT_EYEBROWS`：Stage 與 Workshop 共用預設 Eyebrow，表受聯集檢查；刪掉會複製這張表（14 是併入 chrome module，不是刪除）。
  - `EditorialFooter`、`--editorial-frame-padding`、`ibm-plex-mono.css`：各自單一來源。
  - `templatePageNumberOverride`：頁碼的 Deck Template 規則留在 context module。
  - `ledger` 的加入受編譯器引導（`DECK_THEMES` → label `Record`），並有測試要求每個主題都有 Demo Deck。

## 其他發現

不屬於加深候選，但值得處理：

- `src/lib/preview-page.ts` 的 `getPreviewPage` 沒有任何呼叫端。
- `tests/` 不在任何 tsconfig 的 `include`，`pnpm typecheck` 不檢查測試碼的型別。（2026-11-09 具體後果：`tests/unit/support/editor-controls.ts` 的 `unusedTrendControls` 有 7 個 key，`TrendEditorControls` 有 8 個，少 `setCadence`，照樣編譯通過。2026-11-22：納入候選 13，以暫存 tsconfig 量得 60 個型別錯誤；已由 13 的第一步解決，`tsconfig.test.json` 納入 `tsc -b`。）
- `tsconfig.node.json`（`vite.config.ts`、`server/`、`scripts/`）沒有開 `strict`。
- 2026-11-09 新增：
  - `588c2c2` 揭露的不成文契約：Export Readiness 的「fits」量測依賴每個 layout body 的 CSS 不縮到 content 以下；目前只存在於 commit message（寫下的位置見 6）。2026-11-22：`editorial-layouts.css:573-575` 已有註解，opt-in 清單的問題見 15。
  - `WorkshopPreview` 仍把 Deck ID 叫 `documentId`（`workshop-preview.tsx:36,45`），與 GLOSSARY 不符。
  - `PagePicker` 以 `String(index)` 選頁（`page-picker.tsx:32,57`），是候選 4 的殘尾。
  - `workshop-shell.tsx` 的 disabled 政策在 5 處各算一次（112-113、134-154）；edit-mode 鎖靠 `key={selectedDeckId}` remount 重設，只有註解說明。
  - `speaker-notes-cue.tsx` 保留 controlled／uncontrolled 雙模式（37-38），只有一個呼叫端。
  - 每個新 layout 的 e2e spec 376～577 行，是單一 layout 最大的成本；`5ce4adf` 已把四份各約 41 行的 capture 檢查抽到 `tests/e2e/stage-capture.ts`。
- 2026-11-22 新增：
  - `editorial-frame-chrome.test.tsx` 以 `describe.each(DECK_THEMES)` 把同一組 DOM 斷言跑 3 次；jsdom 不套 CSS，markup 也不依主題分支（2026-11-22 補遺：已在 jsdom 驗證，見 16）。
  - `stage-page-context.ts:60` 說補零規則只定一次，但 `table-panel.tsx:48`、`side-by-side-slide.tsx:35`、`next-actions-slide.tsx:13` 各自補零（補遺；相關 #87）。
  - `documentId` 的範圍比 2026-11-09 記錄的更廣：還有 `StagePageContext.documentId`（`stage-page-context.ts:15`）與 `html-slide.tsx:9`（補遺）。
  - `tsconfig.node.json` 也不涵蓋 `vitest.config.ts` 與 `playwright.config.ts`（補遺；已由 13 的第一步補上）。
  - ADR-0002:54 的〈後果〉描述與測試不符，`deck.ts:307` 的主題樣式表註解與實際不符（補遺，見 16）。

## 相關文件

- [工坊架構](workshop-architecture.md)
- [ADR-0001：把週報流程從 slide 核心解耦](../adr/0001-decouple-weekly-report-from-slide-core.md)
- [ADR-0002：Deck Theme 為固定清單](../adr/0002-deck-theme.md)
- [Deck JSON 格式](../reference/deck-json-format.md)
- [Export gate](../reference/export-gate.md)
- [GLOSSARY.md](../../GLOSSARY.md)
