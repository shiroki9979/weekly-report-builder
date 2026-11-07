# Author Editorial Layouts

建立日期：2026-09-10  
最後更新：2026-11-08

---

在 Workshop 新增、編輯與匯出 Cover、Closing、Side-by-side Comparison、Full-width Panel、Overview、Evidence-backed Decision、Next Actions 與 Trend & Target。Closing、Side-by-side Comparison、Full-width Panel 與既有 Editorial 版型共用 Editorial Frame（eyebrow、headline、Frame Label、Boundary Note、Deck Title 與 Page Position）；Cover 提供開場構圖，並走與 Two-column 相同的 Save／Copy／batch 規則。首次安裝可從公開的虛構 Demo Deck Set 直接查看示例。

## 新增

1. 解鎖 **Edit**
2. 在 **Add page** 選擇 **Cover**、**Closing**、**Side-by-side Comparison**、**Full-width Panel**、**Overview**、**Evidence-backed Decision**、**Next Actions** 或 **Trend & Target**
3. 點 **Add page**

新頁插在目前選取頁之後。內容為空白 Draft Page，可 Save，但填完前不能 Copy 或進入批次匯出。

## 編輯

- **Cover**：填入開場 Title，可選填 Subtitle 與 Byline。Deck 有期間時會顯示 Frame Label。Cover 計入 Page Position，但永遠不顯示頁碼；只有標題也可完成內容。建立 Deck Template 時保留 Byline，清空 Title 與 Subtitle。
- **Closing**：填入 Title，可加 0–4 個 Takeaway；每筆文字必填，Reference 可留空。使用 Add takeaway／Move up／Move down／Remove 維護順序。Eyebrow 預設顯示 Closing，可改為其他職能標籤；Closing line 緊接 Takeaways 顯示聯絡或下一步，不貼齊頁底。建立 Deck Template 時保留 Closing line，清空其他 Closing 內容。
- **Side-by-side Comparison**：填入 Title、兩欄 Label 與各 1–4 個 Point。以 Add point／Move up／Move down／Remove 維護順序；可選定其中一欄為 Chosen，或保留開放比較。啟用 Tradeoff 時 Why 必填，Cost 可留空；不啟用 Tradeoff 也可匯出。Deck Template 保留各欄點數並清空文字、Chosen 與 Tradeoff。
- **Full-width Panel**：選擇 Table／Chart／Flow／Checklist，使用與 Two-column 相同的 panel 編輯器；頁面 Title 與 panel 內容須填妥，Panel title 可以留空。Table 的 Reference column 可選 None 或欄名，參照內容靠右且不換行；刪除該欄會清除設定，刪除之前的欄會調整索引。Observatory 的表格列索引只是顯示，不會改變資料欄編號。Deck Template 保留 panel 結構與參照欄，清空文案。
- **Overview**：一個 Lead Outcome 與 1–3 個 Supporting Outcomes。Supporting 可 Add／Move／Remove／Make lead。
- **Evidence-backed Decision**：Verdict、1–2 個 Comparison Metric、1–2 則 interpretation。Metric 數值可留空（`null`）；非法非空輸入會擋 Save／Copy，batch 略過該頁。
- **Next Actions**：2–4 個 Commitment。新增頁預設 Rows；既有未記錄 variant 的頁面維持 Columns。使用 **Composition** 在 Rows／Columns 間切換，內容與順序不變。畫面上的 01／02… 編號隨順序派生，不寫進 JSON。

右側 16:9 預覽即時同步。Canonical overflow 以 1280 × 720 capture Stage 為準。

## Boundary Note

Closing、Side-by-side Comparison、Full-width Panel、Overview、Evidence-backed Decision、Next Actions 與 Trend & Target 的共用編輯區有 **Boundary Note**，可填寫這頁結論成立的範圍、驗證方式或限制。內容出現在正文下方、頁尾上方；空白不影響內容完整性。以一行為目標，較長文字會換行，超出 1280 × 720 Stage 時會阻擋匯出，不會裁切或縮字。

Cover、HTML Page 與 Two-column 沒有此欄位。建立 Deck Template 或下一週時，Boundary Note 一律清空，避免沿用過期條件。

## 匯出

Copy 與 **Download PNGs** 只輸出 Content-complete 且不 overflow 的頁。Draft、overflow 與量測失敗會阻擋 Copy；batch 略過該頁並列出 Page ID 與原因。

## 編輯 Trend & Target

1. 解鎖 **Edit**，在 **Add page** 選 **Trend & Target** 並新增頁面。新頁預設八個未填週次。
2. 在 **Title** 寫結論、填入指標名稱，將 **Starting Monday** 設為真實的 `YYYY-MM-DD` 週一，再逐列填入有限數字。零是量測值；接受負數、小數及科學記號。沒有讀值時按該列 **No observation**；清空數值欄則是尚未完成的 Unfilled。按 **Enter value** 可把 Missing 改回空白輸入。切換狀態會清除該列舊數值與輸入錯誤。
3. 填入固定目標，選 **At most** 或 **At least**，並設定單位、位置、空格與小數位數。補上 **Interpretation** 和投影片可見的 **Measurement Context**，寫明來源、樣本或取得條件，以及量測時間。
4. 在 Stage 核對最新一週的數值與狀態、四捨五入造成歧義時的精確比較，以及觀測日期範圍。最後觀測週不得晚於 Deck 的報告週一。
5. 儲存頁面。Copy 與 batch 共用內容完整性和 Stage fit 判定；至少需要兩個已量測週次，其他週次可明確標記 Missing，但不可留 Unfilled。最後一週為 Missing 時摘要顯示 No data；目標判定使用原始數值，若畫面四捨五入後看似相等，Stage 會顯示 Exact 比較。尚未修正的無效數字或日期輸入會阻擋 Save／Copy，batch 則略過該頁。

跨週沿用時，原本的日期、量測、目標、格式與 Measurement Context 都會保留；結論與 Interpretation 會清空。手動按 **Add earlier week**／**Add later week** 加入未填週次，或按 **Remove earliest week**／**Remove latest week** 移除端點。保留的量測仍對應原日期；範圍限 2–12 週，滿 12 週時先自行移除端點再延伸，不會自動刪除舊資料。新增週次填妥結果與本週結論後，再儲存及匯出。

已輸入量測或 Missing 的序列若要更改 **Starting Monday**，先核對畫面列出的目前與提議日期範圍，再選 **Confirm new dates**；按 **Cancel date change** 保留原日期。清空已有內容的起始日期會保留原量測並阻擋 Save／Copy／batch，直到恢復有效日期或逐列清空所有觀測。

## Observatory 示範 Deck

首次安裝後在 Deck 選擇器選 **harbor-forecast**，可查看十頁虛構的 Harbor Forecast 試行回顧，涵蓋每一種版型：Cover、Overview、Evidence-backed Decision、Side-by-side Comparison、Trend & Target、Two-column（flow panel）、Full-width Panel 表格、HTML Page（只引用顏色角色與 `--blue*` 別名，因此跟著主題變色）、Next Actions 與 Closing。主題已設為 Observatory，頁尾共用 Deck Title，表格 Reference column 指向資料第三欄。示例來源為 [`demo/harbor-forecast.json`](../../demo/harbor-forecast.json)，可用一般 Preview、Copy 與 Download PNGs 流程驗證。Default 主題下的同一組版型見 **2026-01-05**。

既有 `decks/` 不會因 seed 再執行而被覆寫或混入新示例。

## 分享前檢查

先以口頭報告的節奏看一遍：標題能否直接說出結論，目標線、最新週狀態與下一步能否迅速辨識。再假設收件者沒有講者說明，核對日期範圍、Missing 缺口、原始數值比較、Measurement Context，以及每項 Commitment 的 outcome／checkpoint 是否足以自行理解。這兩種檢查都需要真人閱讀；Copy 成功與 PNG 截圖只能證明畫面能輸出。公開 Demo 數值全為虛構，對外分享真實報告時請替換數值與來源說明。

## 相關文件

- [新增、刪除與重排頁面](add-delete-reorder-pages.md)
- [編輯並儲存週次](edit-and-save-a-deck.md)
- [匯出 PNG 至團隊簡報](export-slides-to-team-deck.md)
- [Layout 家族原型（歷史）](../explanation/layout-prototype.md)
