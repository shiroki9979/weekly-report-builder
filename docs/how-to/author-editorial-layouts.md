# Author Editorial Layouts

建立日期：2026-09-10  
最後更新：2026-09-28

---

在 Workshop 新增、編輯與匯出 Overview、Evidence-backed Decision、Next Actions 與 Trend & Target。這些 Structured Layout 共用 Editorial Frame（eyebrow、headline、Frame Label、Page Position），並走與 Two-column 相同的 Save／Copy／batch 規則。首次安裝可從公開的虛構 Demo Deck Set 直接查看示例。

## 新增

1. 解鎖 **Edit**
2. 在 **Add page** 選擇 **Overview**、**Evidence-backed Decision**、**Next Actions** 或 **Trend & Target**
3. 點 **Add page**

新頁插在目前選取頁之後。內容為空白 Draft Page，可 Save，但填完前不能 Copy 或進入批次匯出。

## 編輯

- **Overview**：一個 Lead Outcome 與 1–3 個 Supporting Outcomes。Supporting 可 Add／Move／Remove／Make lead。
- **Evidence-backed Decision**：Verdict、1–2 個 Comparison Metric、1–2 則 interpretation。Metric 數值可留空（`null`）；非法非空輸入會擋 Save／Copy，batch 略過該頁。
- **Next Actions**：2–4 個 Commitment。新增頁預設 Rows；既有未記錄 variant 的頁面維持 Columns。使用 **Composition** 在 Rows／Columns 間切換，內容與順序不變。畫面上的 01／02… 編號隨順序派生，不寫進 JSON。

右側 16:9 預覽即時同步。Canonical overflow 以 1280 × 720 capture Stage 為準。

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

## 分享前檢查

先以口頭報告的節奏看一遍：標題能否直接說出結論，目標線、最新週狀態與下一步能否迅速辨識。再假設收件者沒有講者說明，核對日期範圍、Missing 缺口、原始數值比較、Measurement Context，以及每項 Commitment 的 outcome／checkpoint 是否足以自行理解。這兩種檢查都需要真人閱讀；Copy 成功與 PNG 截圖只能證明畫面能輸出。公開 Demo 數值全為虛構，對外分享真實報告時請替換數值與來源說明。

## 相關文件

- [新增、刪除與重排頁面](add-delete-reorder-pages.md)
- [編輯並儲存週次](edit-and-save-a-deck.md)
- [匯出 PNG 至團隊簡報](export-slides-to-team-deck.md)
- [Layout 家族原型（歷史）](../explanation/layout-prototype.md)
