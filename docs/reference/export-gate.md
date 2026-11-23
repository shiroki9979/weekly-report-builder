# Export gate

建立日期：2026-11-21  
最後更新：2026-11-23

---

Copy（目前頁）與 batch export（全部未隱藏頁）共用同一個單頁 Export gate，判斷一頁能否輸出 PNG、不能時回報什麼原因。Schema 合法與可匯出是兩件事：parser 接受空白草稿，可匯出與否由本頁的規則決定。各版型欄位見 [Deck JSON 格式](deck-json-format.md)，HTML Page 的載入與掛載見 [HTML Page](html-page.md)。

| 模組                                  | 職責                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `src/lib/export-readiness.ts`         | `assessContentReadiness`、`assessExportEligibility`                            |
| `src/lib/page-chrome.ts`              | `headlineIssues`：每個 Structured Layout 的 Headline 必填，排在本文 issue 之前 |
| `src/lib/overflow-measurement.ts`     | 1280 × 720 capture Stage 的 overflow 量測                                      |
| `src/lib/export-page-gate.ts`         | 單頁 gate：支援度、內容、量測、PNG 產生的順序與逾時                            |
| `src/lib/capture-limits.ts`           | HTML 載入與 capture 準備的時間上限                                             |
| `src/lib/browser-capture-adapter.tsx` | 離屏 capture host、HTML 載入訊號與清理                                         |
| `src/lib/deck-export.ts`              | batch 的頁面選取、輸出與結果計數                                               |

## 判斷順序

1. **Hidden**：batch 靜默排除，不計入結果；預覽與 Copy 顯示 `Hidden`。Hidden 是 batch 的選頁政策，不是 readiness issue。
2. **支援度**：未知 layout 或 `fields` panel 回報 `unsupported`。
3. **內容**：Structured Layout 跑內容規則；有任何 content issue 時不渲染、不量測。HTML Page 不套用內容規則。
4. **準備與量測**：Structured Layout 在 capture Stage 量測 overflow；HTML Page 載入片段，不做 overflow 量測。
5. **PNG 產生**。

原因順序固定：`unsupported`、依欄位路徑排列的 content issues，最後才是 runtime issues。同一頁不會同時出現 content issue 與 render-time issue。內容完整但沒有量測結果的頁面 fail closed，回報 `measurement-failed`，不得當作 fit。

## Reason codes

| Code                 | 意義                                            |
| -------------------- | ----------------------------------------------- |
| `unsupported`        | 不支援的 layout 或 panel                        |
| `missing-content`    | 必填內容缺漏                                    |
| `invalid-content`    | 內容或 Metric Input 違反規則                    |
| `overflow`           | Structured Layout 超出 1280 × 720 capture Stage |
| `html-load-failed`   | HTML 檔名不合法、請求失敗或載入逾時             |
| `measurement-failed` | Structured Layout 量測真的失敗                  |
| `capture-failed`     | 任一頁面類型的 PNG 產生失敗或逾時               |

「尚未量測」是內部狀態，不是 `measurement-failed`；Copy 與 batch 的呼叫端不需要過濾它來決定要不要渲染。

## 內容規則

### Issue path

Issue path 是不含 `$` 的 JSON-style path：物件欄位以 `.` 分隔，陣列索引用方括號，例如 `title`、`lead.workstream`、`supporting[0].status.label`、`metrics[0].baselineValue`。排序先共用欄位，再依各 schema 的宣告順序深度優先，同一 collection 依索引排列。

- `missing-content`：trim 後空白的必填字串、必填但為 `null` 的 metric 值，或缺少必要的 collection 項目。Collection 層級使用 `panel.columns`、`panel.rows`、`panel.categories`、`panel.series`、`panel.steps`、`panel.items` 等路徑。
- `invalid-content`：數值不是有限非負數、表格或圖表不成矩形，或其他存在但形狀不合法的資料。表格列的格數不符用 `panel.rows[i].cells`，圖表值的數量不符用 `panel.series[i].values`，個別非法值用完整路徑，例如 `panel.series[0].values[1]`。

### 共用規則

- 所有 Structured Layout 的 `title` trim 後必須非空（Full-width Panel 的 panel `title` 例外，可為空）。
- 實際渲染的主要文案 trim 後必須非空。
- `notes`、`hidden`、Eyebrow、Boundary Note 與純呈現用預設值不影響完整度。

### 各版型

| Layout                                                    | 匯出前必須                                                                                                                                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two-column                                                | 三個 items 的 heading 與 body、panel title 非空；panel 依下表                                                                                                                     |
| Overview                                                  | Lead 與每個 Supporting Outcome 的 workstream、figure、result、impact、status label 非空；tone 預設 `neutral` 即合法                                                               |
| Evidence-backed Decision                                  | verdict、metric label、interpretations 非空；baseline 與 candidate 不為 `null` 且為有限非負數；unit 可空                                                                          |
| Next Actions                                              | 每個 Commitment 的 title、outcome、checkpoint 非空；Rows 與 Columns 共用規則，但 fit 依所選 composition 量測                                                                      |
| Trend & Target                                            | title、metric label、interpretation、Measurement Context 非空；有 `start`、至少兩個 Measured、沒有 Unfilled、target 有限；觀測終點不晚於 Deck 的 `period.end`（無 period 時略過） |
| Cover、Closing、Side-by-side Comparison、Full-width Panel | 見 [Deck JSON 格式](deck-json-format.md) 各版型段落                                                                                                                               |

Panel 規則（Two-column 與 Full-width Panel 共用）：

- Table：欄名與每個儲存格非空，每列格數等於欄數。
- Chart：至少一個 category 與一個 series；category 與 series 名稱非空；values 與 categories 對齊，且為有限非負數。
- Flow：至少一個 step，step label 非空；caption 可省略。
- Checklist：至少一個 item，item label 非空；勾選狀態不影響完整度。

### Metric Input

Editing Session 以 Page ID 與 field path 為鍵保存 Metric Input，切頁後仍保留作者輸入的原字串（例如 `1.50`）。空白寫為 `null`；只有可解析為合法數字的輸入才更新 Deck。其他非空輸入回報 `invalid-content`、對應控制項設 `aria-invalid`，並擋下 Save 與 Copy，batch 略過該頁。這樣 Save 或輸出不會悄悄改用舊值。Parser、`parseMetricInput` 與 readiness 共用同一個數值驗證 helper。Trend & Target 的觀測值與日期輸入走同一套規則，但允許負數。

Editor 的缺漏摘要直接讀 `assessContentReadiness` 的結果，表單內不另寫驗證邏輯。

## Overflow 量測

- 以固定 1280 × 720 的 capture Stage 為準；量測根節點以 `data-stage-capture-root` 取得，用相對於根節點的座標判斷，不受 capture host 在螢幕外或 `opacity: 0` 影響。
- 最多等 5 秒：先等 `document.fonts.ready`，再等兩個 animation frame，讓字型、CSS 與 layout 穩定。
- 同時檢查根節點的 `scrollWidth`／`clientWidth`、`scrollHeight`／`clientHeight`，以及所有子孫元素的 bounding rect 是否超出根節點；只排除 `display: none`、`visibility: hidden` 或沒有 layout box 的元素。水平與垂直都回報。
- 容許 1 CSS px 的 subpixel 誤差。
- 找不到根節點、尺寸非有限值、等待逾時或量測拋錯時回報 `measurement-failed`，fail closed。
- 預覽可以用同一個 detector 對目前尺寸顯示提示，但只是 advisory，不取代 capture Stage 的結果。
- 這些行為以真實瀏覽器（Playwright）驗證，不依賴 jsdom 的 layout 數值。

## 失敗政策

| 情況                                     | Copy                           | Batch                                 |
| ---------------------------------------- | ------------------------------ | ------------------------------------- |
| HTML 檔名不合法、HTTP 失敗或其他載入失敗 | 阻擋並顯示原因，不產生警告 PNG | 略過並記錄 Page ID 與原因，繼續下一頁 |
| HTML 載入逾時                            | 阻擋並顯示原因                 | 略過，繼續                            |
| Structured Layout 量測失敗               | 阻擋並顯示原因                 | 略過，繼續                            |
| 任一頁面類型的 PNG 產生失敗              | 阻擋並顯示原因                 | 略過，繼續                            |
| 共用 capture host 或根節點不存在         | 停止並回報操作失敗             | 停止，保留已處理的結果                |
| 剪貼簿寫入或觸發下載時拋錯               | 回報寫入失敗                   | 停止，保留已處理的結果                |

頁面層級的問題只影響該頁；操作層級的問題（共用 host 不見、輸出寫入失敗）停止整個操作。已觸發的下載無法撤回。預覽維持自己的錯誤警告或載入中佔位，不受匯出逾時影響。

## 逾時

| 階段                   | 上限     | 逾時後               |
| ---------------------- | -------- | -------------------- |
| HTML 載入              | 3000 ms  | `html-load-failed`   |
| Structured Layout 量測 | 5000 ms  | `measurement-failed` |
| PNG 產生               | 15000 ms | `capture-failed`     |

- PNG 的 15 秒是初始政策值，不是量測過的效能保證；從 PNG 產生開始計時，不含前面的載入與量測。
- Capture 準備另有安全上限，等於 HTML 載入上限 + paint 等待上限（1000 ms）+ 1000 ms 餘裕。背景分頁抑制 animation frame 時，adapter 最多等 1000 ms 就用已 commit 的 DOM 繼續。這個上限刻意大於 HTML 載入上限，讓 HTML 逾時先以 `html-load-failed` 回報為頁面問題，而不是整個操作失敗。
- 截圖函式庫無法保證取消。逾時後隔離舊頁的工作，丟棄它之後才回來的結果，不送進下載或剪貼簿；遲到的工作不得改動下一頁的 host、清掉較新操作的狀態，或釋放別的操作持有的互斥鎖。
- 這些上限不套用到預覽與剪貼簿寫入；剪貼簿在平台 promise 結束前保持忙碌。

## 操作行為

- Copy 與 batch 在開始時取得 Editing Session 的唯讀快照：Deck、Metric Input、選取的 Page ID 與 Deck ID。Stage context 由快照算出。之後的編輯、重排、刪頁或切換 Deck 不影響進行中的操作，結果標示原本的 Deck。
- HTML 檔在處理到該頁時才載入，不在快照內。
- Copy 與 batch 共用一把互斥鎖。忙碌中的請求直接回報 busy，不排隊、不覆蓋進行中的進度；UI 也會停用匯出按鈕。
- 工坊 unmount 時中止自己發出的 HTML 請求、移除 host、停止排程後續頁面與輸出，並抑制遲到的 state 更新。切換 Deck 不會中止進行中的操作。
- 每次 capture 都由 adapter 建立一個暫時的 React root，渲染既有的 `StageFrame`／`StageSlide`，結束時 unmount 並移除 host。選這個做法而不是 Provider 加 portal，是因為 Stage renderer 目前不依賴任何 Provider；出現真的 Provider 依賴時再重新評估。

## 結果呈現

Batch 的每個未隱藏頁恰好落入一種結果，四者加總等於快照中的未隱藏頁數：

| 結果                | 意義                                         |
| ------------------- | -------------------------------------------- |
| Downloads triggered | 下載 adapter 呼叫後沒有拋錯                  |
| Skipped             | gate 回報頁面問題（含 HTML 載入、量測、PNG） |
| Failed              | 發生操作層級失敗時正在處理的那一頁           |
| Not attempted       | 停止之後剩下的頁面                           |

- 用 `Downloads triggered` 而不是 `Files saved`：瀏覽器下載 adapter 無法確認檔案真的存下來了。全部略過或沒有可匯出頁時，明確說沒有觸發任何下載。
- 輸出寫入失敗加上 `Download trigger failed:`（batch）或 `Clipboard write failed:`（Copy）前綴，避免被誤讀為頁面問題。
- 只保留目前或最近一次操作的結果；Copy 在剪貼簿寫入完成後才回報成功。
- Copy、batch 與 editor 摘要共用同一個 issue 措辭 formatter，各自保留自己的標題與脈絡：batch 加上 Page ID，Copy 標示目標頁與 Deck。

## 相關文件

- [Deck JSON 格式](deck-json-format.md)
- [HTML Page](html-page.md)
- [匯出 PNG 至團隊簡報](../how-to/export-slides-to-team-deck.md)
- [工坊架構](../explanation/workshop-architecture.md)
