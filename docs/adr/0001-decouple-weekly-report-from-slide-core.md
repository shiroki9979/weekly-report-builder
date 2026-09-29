# ADR-0001：把週報流程從 slide 核心解耦

建立日期：2026-09-29  
狀態：Accepted

## 背景

專案目前的定位是「個人週報工坊」，但長期方向是擴充成不限於週報的 slide 工具。盤點後，「週」在程式碼裡分成三種耦合：

1. **結構耦合**：文件 id 必須是週一日期（`src/lib/week-id.ts`），並一路貫穿檔名、`server/weeks-store.ts` 的路徑安全檢查、`vite.config.ts` 的路由與 build 複製、HTML Page 的資源路徑。`WeekDocument` 的 `start`／`end` 是必填的週一到週五區間。
2. **流程耦合**：自上一週 clone 並清空內容、建議下一個週一、週一加 4 天的區間（`src/lib/week-clone.ts`、`src/hooks/use-editing-session.ts`）。這是週報情境真正需要的功能。
3. **命名耦合**：`WeekPage`、`matchWeekPage`、`week-editor.ts` 等，邏輯本身與週無關。

版型中，只有 Trend & Target 在語意上綁定週（`startMonday`、7 天間隔、readiness 以報告週一比較觀測區間）；Weekly Overview 只有名稱帶週。

另有一個與泛化無關、但本來就不該存在的漏洞：`stage-slide.tsx` 從顯示用的 `weekLabel` 以 `slice(0, 10)` 反推文件 id，再拿去組 HTML Page 的資源路徑。

## 決策

### 用語

| 現在            | 之後                                |
| --------------- | ----------------------------------- |
| Week Document   | **Deck**                            |
| Week Page       | **Page**                            |
| 週一日期作為 id | **Deck ID**（不透明字串）           |
| Week Label      | **Frame Label**（由 Deck 期間產生） |
| Weekly Overview | **Overview**                        |
| Demo Week Set   | **Demo Deck Set**                   |

`CONTEXT.md` 在改名步驟一併更新；在那之前，程式碼仍使用舊名稱。

### 儲存

- `weeks/` 改名為 `decks/`；路由改為 `/api/decks`、`/decks/:id.json`、`/decks/:id/*.html`；環境變數改為 `DECKS_DIR`。
- Deck ID 格式為 `^[a-z0-9][a-z0-9-]{0,63}$`。現有的 `YYYY-MM-DD` 檔名本身就符合，不需改檔名。路徑安全檢查只看這個格式，不再判斷是否為週一。
- 遷移：`decks/` 不存在而 `weeks/` 存在時，`seed:weeks`（改名為 `seed:decks`）把 `weeks/` 整個改名為 `decks/`；兩者都存在時報錯，不合併。
- 匯出 PNG 檔名維持 `<Deck ID>-<Page ID>.png`，現有週報的輸出檔名不變。

### Deck 格式

```ts
type Deck = {
  period?: { start: string; end: string }
  showPageNumbers?: boolean
  pages: Page[]
}
```

- `period` 是選填 metadata。parser 仍接受舊格式的頂層 `start`／`end`，讀入時轉成 `period`；存檔一律寫新格式。
- Editorial Frame 上的 Frame Label 由 `period` 產生；沒有 `period` 時不顯示。
- Stage 需要的 Deck ID 由呼叫端明確傳入，不從任何顯示文字推導。

### 週報流程

- 「自上一份 clone 並清空內容」抽成通用的「從模板建立 Deck」。
- 週報專屬的部分（建議下一個週一、週一到週五的 `period`、以週一日期當 Deck ID）集中在週報流程模組；Workshop 的「New week」入口保留，改走這個模組。

### 版型

- Weekly Overview 改名為 Overview，layout id 改為 `overview`；parser 繼續接受 `weekly-overview` 並轉成新 id。
- Trend & Target 支援週以外的週期：
  - 新增 `cadence: "week" | "month"`；`startMonday` 改為 `start`（週期起點：`week` 為週一，`month` 為當月 1 日）。舊文件的 `startMonday` 讀成 `start` 加 `cadence: "week"`。
  - Readiness 的比較基準改為 Deck 的 `period.end`：最後一個觀測週期的起點不得晚於它。以週為單位時，這與現行「不得晚於報告週一」等價。Deck 沒有 `period` 時略過這項檢查。
  - 投影片文案隨 cadence 變化（例如 Latest week／Latest month），不再寫死「Weekly target」。

## 執行順序

先切接縫，最後才做機械式改名，讓每一步的 diff 都看得出結構改動。追蹤 issue 為 [#50](https://github.com/shiroki9979/weekly-report-builder/issues/50)。

1. Stage 改由呼叫端傳入 Deck ID，移除 `mondayFromWeekLabel`。**已完成。**
2. [#51](https://github.com/shiroki9979/weekly-report-builder/issues/51) Deck ID 改為不透明字串；儲存層、路由與 HTML Page 路徑改用 Deck ID 格式檢查。
3. [#52](https://github.com/shiroki9979/weekly-report-builder/issues/52) 拆出 Deck 格式：`period` 選填、舊格式相容、Frame Label 由 `period` 產生。
4. [#53](https://github.com/shiroki9979/weekly-report-builder/issues/53) 抽出週報流程模組與通用的「從模板建立 Deck」。
5. [#54](https://github.com/shiroki9979/weekly-report-builder/issues/54) Trend & Target 支援 `cadence`，readiness 改以 `period.end` 比較。
6. [#55](https://github.com/shiroki9979/weekly-report-builder/issues/55) 一次性改名：型別、檔名、`weeks/` → `decks/`、路由、環境變數、Weekly Overview → Overview、`CONTEXT.md` 與 `docs/`。

## 後果

- 舊的 `weeks/*.json` 不需手動遷移就能讀取；第一次存檔後會改寫成新格式。
- 在第 6 步之前，程式碼中新舊用語會並存一段時間。
- `docs/explanation/workshop-architecture.md` 的產品定位（「個人週報工坊」）在第 6 步改寫。
