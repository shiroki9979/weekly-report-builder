# ADR-0002：Deck Theme 為固定清單，token 角色名稱是跨主題契約

建立日期：2026-11-07  
狀態：Accepted

## 背景

Stage 目前只有一套視覺語言：`stage.css` 的 `--blue*` token 對齊團隊 PPT 範本，字型為 Arial 加系統 CJK。作者實際製作的非週報 Deck（面試簡報、個人簡介）全部走 HTML Page，自帶另一套 teal／navy 色票與 Noto Sans TC，Structured Layout 在這些 Deck 裡一頁都沒用。兩套語言並存的代價是：反覆出現的構圖只能手刻，Export Readiness 與 Page Position 管不到它們，頁碼還會和手刻 footer 重疊。

[Stage 設計哲學](../explanation/stage-design-philosophy.md) 定了新語言，[原型](../explanation/stage-theme-prototype.md) 選定 Observatory 表現。要讓它進 production，必須決定主題怎麼存在於 Deck 裡、既有 token 怎麼辦、字型怎麼交付。

## 決策

### 主題是 Deck 層級的固定清單

- Deck JSON 新增選填 `theme`，值為 app 內建的主題名稱：`default`（現行藍色，PPT 相容）與 `observatory`。未提供視為 `default`；未知值拒絕整份 Deck，不靜默退回。
- 沒有單頁覆寫。從 Deck Template 建立新 Deck（含 Weekly Series）沿用主題。
- 作者不能在 JSON 裡填自訂色碼或字型。

取捨：自訂色碼給作者最大自由，但對比（4.5:1）、Status Signal 三種 tone 與「每頁最多一個實色區塊」就無法由系統保證；主題清單讓這些成為主題作者的責任，而不是每份 Deck 的責任。需要第三種語言時新增一個主題，而不是開放欄位。

### token 以語意角色命名，舊名稱保留為別名

- 主題提供的 token 是角色：`--paper`、`--ink`、`--mute`、`--line`、`--accent`、`--accent-deep`、`--accent-soft`、`--accent-wash`、`--ok`、`--ok-ink`、`--ok-wash`、`--warn`、`--warn-ink`。
- 既有 `--blue`、`--blue-deep`、`--blue-soft`、`--blue-wash` 保留，定義為對應 accent 角色的別名。HTML Page 規格第 15 條允許片段引用這些名稱，別名讓既有片段不必改就跟著主題走。
- 角色名稱是 HTML Page 的契約：新增主題不得改名或刪除既有角色，只能新增。

取捨：直接改名最乾淨，但會讓所有引用 `--blue` 的 HTML Page 在切換主題時失去顏色；別名的成本是 `stage.css` 多幾行與兩種名稱並存一段時間。

### 字型：拉丁展示字型自架，CJK 一律系統字型

- `observatory` 主題自架 Instrument Sans（標題、正文的拉丁字）與 IBM Plex Mono（記號、索引、頁碼），OFL 授權檔隨字型進 repo。`@font-face` 只在該主題的樣式表宣告。
- CJK 不內建：字型堆疊為 `"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`。
- PNG 輸出依賴 `html-to-image` 嵌入 `@font-face`；原型已驗證只嵌入該頁用到的字型。

取捨：內建 CJK 字型可讓不同機器輸出一致，但 Noto Sans TC 完整字集每個字重約 10 MB，且無法針對未知內容子集化；接受「CJK 字形隨機器而異」是刻意的。

### 既有 Structured Layout 只接 token，不重排

Two-column、Overview、Evidence-backed Decision、Next Actions、Trend & Target 在 `observatory` 下只改讀主題 token 與 Editorial Frame 的外框處理；構圖不動。想改構圖另開 Layout Variant。

## 後果

- Deck JSON 多一個欄位；`docs/reference/deck-json-format.md` 同步更新。
- 新主題的對比與 tone 由主題樣式表負責，Playwright 在兩個主題下各跑一次 layout fixture。
- HTML Page 作者若要跟隨主題，用角色名稱或既有 `--blue*` 別名即可；寫死色碼的片段不受影響也不跟隨。
- 追蹤規格：[Deck Theme and the Observatory layouts](../specs/deck-theme-and-observatory-layouts.md)，issue [#57](https://github.com/shiroki9979/weekly-report-builder/issues/57)。
