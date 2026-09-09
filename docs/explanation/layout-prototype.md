# Layout 家族原型

建立日期：2026-09-09  
最後更新：2026-09-09

---

Structured Layout 原型用來檢驗三種溝通職能——Weekly Overview、Evidence-backed Decision、Next Actions——能否共用同一套編輯式外框，同時在畫面上仍可分辨。它驗證的是構圖與層級，不是生產就緒。

## 它是什麼

可拋棄的獨立 Vite 入口，路徑為 `/prototype.html`。範例文案全部寫死。Gallery 縮圖與 focused 16:9 畫面沿用既有 Stage 色彩與字體 token。狀態小字為達到 AA 4.5:1，僅在原型使用加深的 `--ok-ink`／`--warn-ink`，不改生產 `stage.css`。

## 驗證結果（2026-09-09）

在 focused Stage **800 × 450** 對三頁做目視與基線檢查。結論：**構圖與層級通過**，可作為是否進生產的討論材料；**不是**生產就緒。

| 檢查                     | 結果                                                                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 五秒內辨識職能與結論     | 通過。Overview 看「Delivery recovered…」與主導數字 5 days；Decision 看「Ship the candidate」與裁決條；Next Actions 看三欄承諾。                                                                                                                              |
| 標題、主數字、檢查點可讀 | 通過。                                                                                                                                                                                                                                                       |
| 範例文案無溢出或怪異斷行 | 通過。                                                                                                                                                                                                                                                       |
| 同一編輯式家族、職能可辨 | 通過。共用 eyebrow／結論標題／細線／wash；Overview 不對稱、Decision 裁決+對照、Next Actions 三欄。                                                                                                                                                           |
| 每頁一個主導視覺錨點     | 通過。Overview：lead 5 days；Decision：裁決條；Next Actions：結論標題（三欄是支持元素，不是三個競爭錨點）。                                                                                                                                                  |
| 基線語意標記             | 通過。頁為 `article`，結論為 `h1`，成果／承諾為 `h2`，Next Actions 為編號 `ol`，比較圖有可讀 `aria-label`；Gallery 的命名按鈕與完整 Stage 縮圖分離。                                                                                                         |
| 基線對比                 | 通過（小字 AA 4.5:1）。標題與內文沿用 Stage token；Gallery 標籤與返回按鈕使用 `#1f5a8f`。狀態字 `On track`／`Improved`／`Watch` 在紙色與 wash 上，Stage `--ok`／`--warn` 不足 4.5:1，原型僅將這三個狀態字加深為 `#1f7a52`／`#8a5508`，未改生產 `stage.css`。 |

Gallery → focused 16:9 → Back to gallery 的行為由 `PrototypeApp` 測試覆蓋。工坊導覽沒有連到此入口。

## 視覺通過不代表什麼

原型視覺通過，並不授權下列事項：

- 新增生產用 `layout` 值，或改 Week Page schema
- 工坊編輯表單
- 這些頁面的 PNG 匯出
- 取代 `two-column`，或改動 HTML Page
- 中文或中英混排的排版驗證
- 第二套視覺主題

## 後續生產驗證清單

理想化英文稿刻意拿掉篇幅變異。若進生產，仍須另案驗證：

- 真實週報長度與內容變異
- 中文或中英混排
- schema 限制與編輯器操作
- PNG 匯出（含 800 × 450 截圖保真）
- 完整無障礙認證（對比已做基線；鍵盤焦點與讀屏流程未認證）

## 隔離

工坊殼沒有連到此原型。既有週次文件與生產 Stage layout 未改。是否接進生產，需在視覺驗證後另作決定。

## 相關文件

- [檢視 layout 原型](../how-to/review-layout-prototype.md)
- [工坊架構](workshop-architecture.md)
