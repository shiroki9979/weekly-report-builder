# Layout 家族原型

建立日期：2026-09-09  
最後更新：2026-09-10

---

2026-09-09 曾用可拋棄的獨立 Vite 入口（`/prototype.html`、`src/prototype/`）檢驗三種溝通職能——Weekly Overview、Evidence-backed Decision、Next Actions——能否共用同一套編輯式外框。它驗證構圖與層級，不接 Week Document、Workshop editor 或 PNG export。

Production adoption 完成後，該入口與重複模型已移除。作者改從 Workshop 新增這三種 Structured Layout；見 [Author Editorial Layouts](../how-to/author-editorial-layouts.md)。

## 歷史驗證結果（2026-09-09）

在 focused Stage **800 × 450** 對三頁做目視與基線檢查。結論：**構圖與層級通過**，作為是否進生產的討論材料；當時**不是**生產就緒。

| 檢查                     | 結果                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 五秒內辨識職能與結論     | 通過。Overview 看「Delivery recovered…」與主導數字 5 days；Decision 看「Ship the candidate」與裁決條；Next Actions 看三欄承諾。 |
| 標題、主數字、檢查點可讀 | 通過。                                                                                                                          |
| 範例文案無溢出或怪異斷行 | 通過。                                                                                                                          |
| 同一編輯式家族、職能可辨 | 通過。共用 eyebrow／結論標題／細線／wash；Overview 不對稱、Decision 裁決+對照、Next Actions 三欄。                              |
| 每頁一個主導視覺錨點     | 通過。Overview：lead 5 days；Decision：裁決條；Next Actions：結論標題（三欄是支持元素，不是三個競爭錨點）。                     |
| 基線語意標記             | 通過。頁為 `article`，結論為 `h1`，成果／承諾為 `h2`，Next Actions 為編號 `ol`，比較圖有可讀 `aria-label`。                     |
| 基線對比                 | 通過（小字 AA 4.5:1）。狀態字當時僅在原型加深為 `--ok-ink`／`--warn-ink`；生產 Editorial Layout 現沿用同一對比 token。          |

## 後續已落地

- 真實週報長度與內容變異、中文與中英混排：各 layout 的 Playwright fixture
- schema 限制與編輯器操作：Workshop Add／edit／Save／reload
- PNG 匯出與 1280 × 720 overflow gate：Copy 與 batch export
- 生產樣式：`src/styles/editorial-layouts.css`，不從已刪除的 `src/prototype/` import

完整規格見 [Editorial Layout Family production adoption](../specs/editorial-layout-family.md)。

## 相關文件

- [Author Editorial Layouts](../how-to/author-editorial-layouts.md)
- [工坊架構](workshop-architecture.md)
