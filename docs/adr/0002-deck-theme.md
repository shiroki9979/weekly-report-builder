# ADR-0002：Deck Theme 為固定清單，token 角色名稱是跨主題契約

建立日期：2026-11-07  
修訂日期：2026-11-20（新增 `--mono` 角色，[#69](https://github.com/shiroki9979/weekly-report-builder/issues/69)；新增 `ledger` 主題，[#66](https://github.com/shiroki9979/weekly-report-builder/issues/66)；Two-column 納入 Editorial Frame，[#67](https://github.com/shiroki9979/weekly-report-builder/issues/67)）；2026-11-21（已退役的規格連結改指 reference 與 issue）；2026-11-22（定義「構圖」與主題對 Stage Element 的處理，[#73](https://github.com/shiroki9979/weekly-report-builder/issues/73)）；2026-11-23（新增 `--frame-font` 角色並修正〈後果〉的測試描述，[#86](https://github.com/shiroki9979/weekly-report-builder/issues/86)）；2026-11-24（三個版型 e2e 改為迴圈 `DECK_THEMES`，主題預期值抽成共用表，[#103](https://github.com/shiroki9979/weekly-report-builder/issues/103)）  
狀態：Accepted

## 背景

Stage 目前只有一套視覺語言：`stage.css` 的 `--blue*` token 對齊團隊 PPT 範本，字型為 Arial 加系統 CJK。作者實際製作的非週報 Deck（面試簡報、個人簡介）全部走 HTML Page，自帶另一套 teal／navy 色票與 Noto Sans TC，Structured Layout 在這些 Deck 裡一頁都沒用。兩套語言並存的代價是：反覆出現的構圖只能手刻，Export Readiness 與 Page Position 管不到它們，頁碼還會和手刻 footer 重疊。

[Stage 設計哲學](../explanation/stage-design-philosophy.md) 定了新語言，[原型](../explanation/stage-theme-prototype.md) 選定 Observatory 表現。要讓它進 production，必須決定主題怎麼存在於 Deck 裡、既有 token 怎麼辦、字型怎麼交付。

## 決策

### 主題是 Deck 層級的固定清單

- Deck JSON 新增選填 `theme`，值為 app 內建的主題名稱：`default`（現行藍色，PPT 相容）與 `observatory`。未提供視為 `default`；未知值拒絕整份 Deck，不靜默退回。
- 2026-11-20 修訂：依本節「需要第三種語言時新增一個主題」新增 `ledger`（Evidence Ledger），讓 Weekly Series 的 Structured Layout 與 HTML Page 共用同一套色票、等寬字與頁尾。它沿用 `default` 的色彩與構圖，只改 `--line`、`--accent-wash`、`--ok-ink` 與 `--mono`，並把 Editorial Frame 的外框元素改為等寬字（2026-11-23 起以 `--frame-font` 角色表達，主題樣式表只有 token）。token 值與對比理由見 [Deck JSON 格式](../reference/deck-json-format.md#deck-theme-與-deck-title)，決策脈絡見 [#66](https://github.com/shiroki9979/weekly-report-builder/issues/66)。
- 沒有單頁覆寫。從 Deck Template 建立新 Deck（含 Weekly Series）沿用主題。
- 作者不能在 JSON 裡填自訂色碼或字型。

取捨：自訂色碼給作者最大自由，但對比（4.5:1）、Status Signal 三種 tone 與「每頁最多一個實色區塊」就無法由系統保證；主題清單讓這些成為主題作者的責任，而不是每份 Deck 的責任。需要第三種語言時新增一個主題，而不是開放欄位。

### token 以語意角色命名，舊名稱保留為別名

- 主題提供的 token 是角色：`--paper`、`--ink`、`--mute`、`--line`、`--accent`、`--accent-deep`、`--accent-soft`、`--accent-wash`、`--ok`、`--ok-ink`、`--ok-wash`、`--warn`、`--warn-ink`。
- 2026-11-20 修訂：新增字型角色 `--mono`（等寬字堆疊），每個主題都必須定義。HTML Page 的等寬字一律用 `var(--mono)`，才能跟著主題換字型；內文字型不設角色，靠 `.stage-root` 繼承。依本節「只能新增」的規則原地修訂，不另開 ADR。
- 2026-11-23 修訂：新增字型角色 `--frame-font`。讀這個角色的元素（Editorial Frame 的 Eyebrow、Frame Label、Boundary Note 與頁尾，以及 Overview Outcome 的 workstream 與 Status Signal）只列在 `editorial-layouts.css`，主題只提供值：`default` 設為 `initial`，`var()` 在計算值時失效，外框沿用內文字型；`observatory` 與 `ledger` 設為 `var(--mono)`。角色只管字型：沒有主題改動這些元素的字級或字距。這個角色只給上述元素讀，HTML Page 的等寬字仍用 `var(--mono)`。主題對單一版型本文元素的字型處理（例如 `observatory` 的 Closing takeaway ref 與 closing line）屬於下節的 Stage Element 處理，不併入這個角色。依本節「只能新增」的規則原地修訂。
- 既有 `--blue`、`--blue-deep`、`--blue-soft`、`--blue-wash` 保留，定義為對應 accent 角色的別名。[HTML Page](../reference/html-page.md#色彩與字型) 允許片段引用這些名稱，別名讓既有片段不必改就跟著主題走。
- 角色名稱是 HTML Page 的契約：新增主題不得改名或刪除既有角色，只能新增。

取捨：直接改名最乾淨，但會讓所有引用 `--blue` 的 HTML Page 在切換主題時失去顏色；別名的成本是 `stage.css` 多幾行與兩種名稱並存一段時間。

### 字型：拉丁展示字型自架，CJK 一律系統字型

- `observatory` 主題自架 Instrument Sans（標題、正文的拉丁字）與 IBM Plex Mono（記號、索引、頁碼），OFL 授權檔隨字型進 repo。`@font-face` 只在該主題的樣式表宣告；多個主題共用的字型（2026-11-20 起為 IBM Plex Mono）改放共用字型樣式表 `ibm-plex-mono.css`，避免同一字型重複宣告、匯出時重複嵌入。
- CJK 不內建：字型堆疊為 `"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`。
- `--mono`（2026-11-20 修訂）：`default` 用系統等寬字堆疊，不自架字型，CJK 退回與內文相同的系統字型；`observatory` 與 `ledger` 用自架的 IBM Plex Mono。
- PNG 輸出依賴 `html-to-image` 嵌入 `@font-face`；原型已驗證只嵌入該頁用到的字型。

取捨：內建 CJK 字型可讓不同機器輸出一致，但 Noto Sans TC 完整字集每個字重約 10 MB，且無法針對未知內容子集化；接受「CJK 字形隨機器而異」是刻意的。

### 既有 Structured Layout 只接 token，不重排

Two-column、Overview、Evidence-backed Decision、Next Actions、Trend & Target 在 `observatory` 下只改讀主題 token 與 Editorial Frame 的外框處理；構圖不動。想改構圖另開 Layout Variant。

- 2026-11-20 修訂：Two-column 在所有主題下都納入 Editorial Frame（Frame Label、headline、Boundary Note、頁尾），見 [#67](https://github.com/shiroki9979/weekly-report-builder/issues/67)。這屬於外框處理，不是構圖變更：項目欄與 panel 的格線、項目樣式與 panel 都不動，因此不需要 Layout Variant。
- 2026-11-22 修訂：「構圖」指 Stage body 內區塊的格線、位置、數量與順序，例如 Two-column 的項目欄與 panel 欄。主題對 Stage Element 本身的處理（標記、字型、字級、色彩角色）由主題樣式表負責，不算重排，也不需要 Layout Variant；`observatory` 的 Lead Outcome 細線框就是先例。依此，`observatory` 下 Two-column 項目的圓點換成與 Side-by-side point 相同的補零等寬索引，項目標題改用 `--ink`；`default` 保持 PPT 相容的圓點，`ledger` 依其「沿用 `default` 構圖、不帶入補零編號」的前提不動。索引只是視覺處理，不表示項目有順序。見 [#73](https://github.com/shiroki9979/weekly-report-builder/issues/73)。

## 後果

- Deck JSON 多一個欄位；`docs/reference/deck-json-format.md` 同步更新。
- 新主題的對比與 tone 由主題樣式表負責，Playwright 依 `DECK_THEMES` 在每個主題下各跑一次 layout fixture。
- HTML Page 作者若要跟隨主題，用角色名稱或既有 `--blue*` 別名即可；寫死色碼的片段不受影響也不跟隨。
- 追蹤規格：issue [#57](https://github.com/shiroki9979/weekly-report-builder/issues/57)（Observatory）、[#66](https://github.com/shiroki9979/weekly-report-builder/issues/66)（Ledger）。
- 新增主題時：`DECK_THEMES` 是唯一清單。各主題的預期值只宣告在 `tests/e2e/theme-expectations.ts` 的 `Record<DeckTheme, …>`，`deck-theme`、`cover-closing`、`side-by-side`、`full-width-panel` 四個 e2e 讀它的欄位而不以主題名稱分支；`demo-deck-set.test.ts` 要求每個主題都有一份 Demo Deck，Workshop 的主題選單標籤也是 `Record<DeckTheme, …>`，漏掉這幾項會讓型別檢查或測試失敗；`editorial-footer-overlap` 與上述四個 e2e 迴圈 `DECK_THEMES`，新主題自動納入。型別檢查不會提示的一處：主題樣式表要在 `stage-frame.tsx` 手動 import。（2026-11-23 修訂：原文誤稱 `editorial-footer-overlap.spec` 也以 `Record` 宣告預期值。）
