# Author Editorial Layouts

建立日期：2026-09-10  
最後更新：2026-09-10

---

在 Workshop 新增、編輯與匯出 Weekly Overview、Evidence-backed Decision 與 Next Actions。Editorial Layout Family 共用 Editorial Frame（eyebrow、headline、Week Label、Page Position），並走與 Two-column 相同的 Save／Copy／batch 規則。

## 新增

1. 解鎖 **Edit**
2. 在 **Add page** 選擇 **Weekly Overview**、**Evidence-backed Decision** 或 **Next Actions**
3. 點 **Add page**

新頁插在目前選取頁之後。內容為空白 Draft Page，可 Save，但填完前不能 Copy 或進入批次匯出。

## 編輯

- **Weekly Overview**：一個 Lead Outcome 與 1–3 個 Supporting Outcomes。Supporting 可 Add／Move／Remove／Make lead。
- **Evidence-backed Decision**：Verdict、1–2 個 Comparison Metric、1–2 則 interpretation。Metric 數值可留空（`null`）；非法非空輸入會擋 Save／Copy，batch 略過該頁。
- **Next Actions**：2–4 個 Commitment。畫面上的 01／02… 編號隨順序派生，不寫進 JSON。

右側 16:9 預覽即時同步。Canonical overflow 以 1280 × 720 capture Stage 為準。

## 匯出

Copy 與 **Download PNGs** 只輸出 Content-complete 且不 overflow 的頁。Draft、overflow 與量測失敗會阻擋 Copy；batch 略過該頁並列出 Page ID 與原因。

## 相關文件

- [新增、刪除與重排頁面](add-delete-reorder-pages.md)
- [編輯並儲存週次](edit-and-save-a-week.md)
- [匯出 PNG 至團隊簡報](export-slides-to-team-deck.md)
- [Layout 家族原型（歷史）](../explanation/layout-prototype.md)
